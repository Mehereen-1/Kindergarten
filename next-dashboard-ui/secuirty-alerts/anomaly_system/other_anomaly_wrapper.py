from __future__ import annotations

from typing import Any, List, Optional, Union

import numpy as np

from anomaly_system.base import BaseAnomalyWrapper, FrameContext
from anomaly_system.config import ModelAdapterConfig
from anomaly_system.loaders import (
    LoadedOnnxArtifact,
    LoadedTorchArtifact,
    load_onnx_checkpoint,
    load_torch_checkpoint,
    tensor_to_numpy,
)
from anomaly_system.preprocess import adapt_numpy_to_onnx_shape, clip_to_ncthw, frame_to_nchw
from anomaly_system.schemas import ModelResult
from anomaly_system.video_buffer import RollingFrameBuffer


class OtherAnomalyWrapper(BaseAnomalyWrapper):
    def __init__(self, config: ModelAdapterConfig) -> None:
        super().__init__(config)
        self.artifact: Optional[Union[LoadedOnnxArtifact, LoadedTorchArtifact]] = None

    def load(self) -> None:
        if self.config.framework == "onnx":
            self.artifact = load_onnx_checkpoint(self.config)
            return
        if self.config.framework == "torch":
            self.artifact = load_torch_checkpoint(self.config)
            return
        raise RuntimeError(f"Unsupported framework for {self.config.name}: {self.config.framework}")

    def preprocess(self, frame: np.ndarray, context: FrameContext, buffer: RollingFrameBuffer) -> Any:
        if self.config.temporal:
            clip = buffer.get_clip(self.config.clip_length, self.config.clip_stride)
            if not clip:
                return None
            prepared = clip_to_ncthw(
                clip,
                size=self.config.input_size,
                mean=self.config.normalization_mean,
                std=self.config.normalization_std,
            )
        else:
            prepared = frame_to_nchw(
                frame,
                size=self.config.input_size,
                mean=self.config.normalization_mean,
                std=self.config.normalization_std,
            )

        # Checkpoint adapter section:
        # This generic wrapper is the plug-in point for fire/smoke/intrusion style checkpoints.
        # Override only this conversion if a particular checkpoint expects a different tensor layout.
        if isinstance(self.artifact, LoadedTorchArtifact):
            return self.artifact.torch.from_numpy(prepared).to(self.artifact.device)
        if isinstance(self.artifact, LoadedOnnxArtifact):
            return adapt_numpy_to_onnx_shape(prepared, self.artifact.expected_rank)
        return prepared

    def infer(self, model_input: Any, context: FrameContext) -> Any:
        assert self.artifact is not None
        if isinstance(self.artifact, LoadedTorchArtifact):
            with self.artifact.torch.no_grad():
                return self.artifact.model(model_input)
        outputs = self.artifact.session.run(self.artifact.output_names, {self.artifact.input_name: model_input})
        if len(outputs) == 1:
            return outputs[0]
        return {name: value for name, value in zip(self.artifact.output_names, outputs)}

    def postprocess(self, raw_output: Any, context: FrameContext) -> List[ModelResult]:
        output = tensor_to_numpy(raw_output) if not isinstance(raw_output, dict) else raw_output
        if self.config.framework == "onnx":
            parsed_detection = self._parse_detection_output(output)
            if parsed_detection is not None:
                label, confidence, detected, metadata = parsed_detection
                metadata["adapter"] = getattr(self.artifact, "metadata", {})
                return [self._build_result(context, label=label, confidence=confidence, detected=detected, metadata=metadata)]
        label, confidence, detected, metadata = self._classify(output)
        metadata["adapter"] = getattr(self.artifact, "metadata", {})
        return [self._build_result(context, label=label, confidence=confidence, detected=detected, metadata=metadata)]

    def _parse_detection_output(self, raw_output: Any) -> Optional[tuple[str, float, bool, dict]]:
        array = None
        if isinstance(raw_output, dict):
            values = list(raw_output.values())
            if values:
                array = np.asarray(values[0], dtype=np.float32)
        else:
            array = np.asarray(raw_output, dtype=np.float32)

        if array is None or array.size == 0:
            return None

        predictions = self._extract_detection_rows(array)
        if not predictions:
            return None

        positive_class = self.config.positive_class_id if self.config.positive_class_id is not None else 0
        best_class_id, best_score = max(predictions, key=lambda item: item[1])
        label = self.config.label_map.get(best_class_id, self.config.positive_label or self.event_type)
        detected = best_class_id == positive_class and best_score >= self.config.threshold
        metadata = {"detections": [{"class_id": class_id, "score": score} for class_id, score in predictions[:10]]}
        return label, float(best_score), detected, metadata

    def _extract_detection_rows(self, array: np.ndarray) -> List[tuple[int, float]]:
        if array.ndim == 3 and array.shape[0] == 1:
            array = array[0]

        detections: List[tuple[int, float]] = []
        if array.ndim == 2 and array.shape[-1] >= 6:
            rows = array
        elif array.ndim == 2 and array.shape[0] >= 6:
            rows = array.T
        else:
            return detections

        for row in rows:
            row = np.asarray(row, dtype=np.float32).reshape(-1)
            if row.size < 6:
                continue
            if row.size == 6:
                detections.append((int(row[5]), float(row[4])))
                continue
            objectness = float(row[4])
            class_scores = row[5:]
            if class_scores.size == 0:
                continue
            class_id = int(np.argmax(class_scores))
            score = float(objectness * class_scores[class_id]) if class_scores.size > 1 else float(objectness)
            detections.append((class_id, score))
        return detections
