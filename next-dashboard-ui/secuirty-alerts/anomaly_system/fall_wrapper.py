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
        self._ema_confidence: Optional[float] = None
        self._active = False
        self._on_streak = 0
        self._off_streak = 0

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
        confidence, temporal_detected, temporal_meta = self._apply_temporal_confirmation(confidence)
        metadata["adapter"] = self.artifact.metadata if self.artifact else {}
        metadata.update(temporal_meta)
        # Final detected flag requires temporal activation plus confidence over
        # the model threshold to avoid low-confidence carryover false positives.
        detected = bool(temporal_detected and confidence >= self.config.threshold)
        return [self._build_result(context, label=label, confidence=confidence, detected=detected, metadata=metadata)]

    def reset_state(self) -> None:
        self._ema_confidence = None
        self._active = False
        self._on_streak = 0
        self._off_streak = 0

    def _apply_temporal_confirmation(self, confidence: float) -> tuple[float, bool, dict]:
        alpha = float(self.config.adapter_kwargs.get("ema_alpha", 0.55))
        alpha = min(0.95, max(0.05, alpha))
        on_margin = max(0.0, float(self.config.adapter_kwargs.get("hysteresis_on_margin", 0.08)))
        off_margin = max(0.0, float(self.config.adapter_kwargs.get("hysteresis_off_margin", 0.18)))
        min_on_frames = max(1, int(self.config.adapter_kwargs.get("min_on_frames", 2)))
        min_off_frames = max(1, int(self.config.adapter_kwargs.get("min_off_frames", 3)))
        maybe_margin = max(0.0, float(self.config.adapter_kwargs.get("maybe_margin", 0.10)))

        if self._ema_confidence is None:
            self._ema_confidence = confidence
        else:
            self._ema_confidence = alpha * confidence + (1.0 - alpha) * self._ema_confidence

        smoothed_conf = float(self._ema_confidence)
        on_threshold = max(0.01, self.config.threshold - on_margin)
        off_threshold = max(0.01, self.config.threshold - off_margin)

        if smoothed_conf >= on_threshold:
            self._on_streak += 1
            self._off_streak = 0
        elif smoothed_conf < off_threshold:
            self._off_streak += 1
            self._on_streak = 0

        if not self._active and self._on_streak >= min_on_frames:
            self._active = True
        elif self._active and self._off_streak >= min_off_frames:
            self._active = False

        maybe_detected = (not self._active) and smoothed_conf >= max(0.01, self.config.threshold - maybe_margin)
        metadata = {
            "raw_confidence": float(confidence),
            "smoothed_confidence": smoothed_conf,
            "temporal_active": bool(self._active),
            "maybe_detected": bool(maybe_detected),
        }
        return smoothed_conf, self._active, metadata
