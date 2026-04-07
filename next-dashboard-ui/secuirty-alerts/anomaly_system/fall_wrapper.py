from __future__ import annotations

from typing import Any, List, Optional

from anomaly_system.base import BaseAnomalyWrapper, FrameContext
from anomaly_system.config import ModelAdapterConfig
from anomaly_system.loaders import LoadedTorchArtifact, load_torch_checkpoint, tensor_to_numpy
from anomaly_system.preprocess import clip_to_ncthw
from anomaly_system.schemas import ModelResult
from anomaly_system.video_buffer import RollingFrameBuffer


class FallDetectionWrapper(BaseAnomalyWrapper):
    def __init__(self, config: ModelAdapterConfig) -> None:
        super().__init__(config)
        self.artifact: Optional[LoadedTorchArtifact] = None

    def load(self) -> None:
        self.artifact = load_torch_checkpoint(self.config)

    def preprocess(self, frame: np.ndarray, context: FrameContext, buffer: RollingFrameBuffer) -> Any:
        clip = buffer.get_clip(self.config.clip_length, self.config.clip_stride)
        if not clip:
            return None

        # Checkpoint adapter section:
        # If the fall model was trained with a different clip sampler, this is the only
        # place that should change for checkpoint-specific preprocessing.
        clip_array = clip_to_ncthw(
            clip,
            size=self.config.input_size,
            mean=self.config.normalization_mean,
            std=self.config.normalization_std,
        )
        return self.artifact.torch.from_numpy(clip_array).to(self.artifact.device)  # type: ignore[union-attr]

    def infer(self, model_input: Any, context: FrameContext) -> Any:
        assert self.artifact is not None
        with self.artifact.torch.no_grad():
            return self.artifact.model(model_input)

    def postprocess(self, raw_output: Any, context: FrameContext) -> List[ModelResult]:
        output = tensor_to_numpy(raw_output)
        label, confidence, detected, metadata = self._classify(output)
        metadata["adapter"] = self.artifact.metadata if self.artifact else {}
        return [self._build_result(context, label=label, confidence=confidence, detected=detected, metadata=metadata)]
