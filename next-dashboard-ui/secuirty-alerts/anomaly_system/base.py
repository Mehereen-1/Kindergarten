from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

from anomaly_system.config import ModelAdapterConfig
from anomaly_system.schemas import ModelInfo, ModelResult
from anomaly_system.utils import get_logger, sigmoid, softmax
from anomaly_system.video_buffer import RollingFrameBuffer


@dataclass
class FrameContext:
    source: str
    frame_index: int
    timestamp: float
    fps: float
    width: int
    height: int
    camera_name: Optional[str] = None
    class_name: Optional[str] = None


class BaseAnomalyWrapper(ABC):
    def __init__(self, config: ModelAdapterConfig) -> None:
        self.config = config
        self.logger = get_logger(f"security_alerts.anomaly.{config.name}")
        self.loaded = False
        self.load_attempted = False
        self.load_error: Optional[str] = None

    @property
    def name(self) -> str:
        return self.config.name

    @property
    def event_type(self) -> str:
        return self.config.event_type

    @property
    def enabled(self) -> bool:
        return self.config.enabled

    def should_run(self, frame_index: int) -> bool:
        return frame_index % max(1, self.config.run_every_n_frames) == 0

    def ensure_loaded(self) -> None:
        if self.loaded or not self.enabled:
            return
        if self.load_attempted and self.load_error:
            raise RuntimeError(self.load_error)
        self.load_attempted = True
        try:
            self.load()
            self.loaded = True
            self.load_error = None
            self.logger.info("Loaded checkpoint: %s", self.config.checkpoint_path)
        except Exception as exc:
            self.loaded = False
            self.load_error = str(exc)
            raise

    @abstractmethod
    def load(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def preprocess(self, frame: np.ndarray, context: FrameContext, buffer: RollingFrameBuffer) -> Any:
        raise NotImplementedError

    @abstractmethod
    def infer(self, model_input: Any, context: FrameContext) -> Any:
        raise NotImplementedError

    @abstractmethod
    def postprocess(self, raw_output: Any, context: FrameContext) -> List[ModelResult]:
        raise NotImplementedError

    def predict(self, frame: np.ndarray, context: FrameContext, buffer: RollingFrameBuffer) -> List[ModelResult]:
        if not self.enabled or not self.should_run(context.frame_index):
            return []
        self.ensure_loaded()
        model_input = self.preprocess(frame, context, buffer)
        if model_input is None:
            return []
        raw_output = self.infer(model_input, context)
        return self.postprocess(raw_output, context)

    def reset_state(self) -> None:
        return None

    def info(self) -> ModelInfo:
        return ModelInfo(
            name=self.name,
            event_type=self.event_type,
            enabled=self.enabled,
            loaded=self.loaded,
            framework=self.config.framework,
            temporal=self.config.temporal,
            checkpoint_path=str(self.config.checkpoint_path),
            threshold=self.config.threshold,
            extra={"load_error": self.load_error, **self.config.adapter_kwargs},
        )

    def _build_result(
        self,
        context: FrameContext,
        *,
        label: str,
        confidence: float,
        detected: bool,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ModelResult:
        return ModelResult(
            model_name=self.name,
            event_type=self.event_type,
            label=label,
            confidence=float(confidence),
            detected=bool(detected),
            frame_index=context.frame_index,
            timestamp=float(context.timestamp),
            metadata=metadata or {},
        )

    def _extract_scores(self, raw_output: Any) -> Tuple[np.ndarray, Dict[str, Any]]:
        payload = raw_output
        metadata: Dict[str, Any] = {}
        logits_key = self.config.adapter_kwargs.get("logits_key")

        if isinstance(payload, dict):
            metadata["raw_keys"] = sorted(payload.keys())
            if logits_key and logits_key in payload:
                payload = payload[logits_key]
            elif "logits" in payload:
                payload = payload["logits"]
            elif "scores" in payload:
                payload = payload["scores"]
            else:
                payload = next(iter(payload.values()))

        array = np.asarray(payload, dtype=np.float32).squeeze()
        if array.ndim == 0:
            return np.asarray([1.0 - float(sigmoid(array)[()]), float(sigmoid(array)[()])], dtype=np.float32), metadata
        if array.ndim > 1:
            array = array.reshape(-1)
        if array.size == 1:
            positive = float(sigmoid(array)[0])
            return np.asarray([1.0 - positive, positive], dtype=np.float32), metadata
        if np.min(array) < 0 or np.max(array) > 1:
            return softmax(array), metadata
        total = float(np.sum(array))
        return array / total if total > 0 else softmax(array), metadata

    def _classify(self, raw_output: Any) -> Tuple[str, float, bool, Dict[str, Any]]:
        scores, metadata = self._extract_scores(raw_output)
        if bool(self.config.adapter_kwargs.get("invert_binary_scores", False)) and scores.size == 2:
            scores = scores[::-1].copy()
            metadata["scores_inverted"] = True
        class_index = int(np.argmax(scores)) if scores.size else 0
        label = self.config.label_map.get(class_index, self.config.positive_label or self.event_type)
        positive_index = self.config.positive_class_id if self.config.positive_class_id is not None else class_index
        positive_confidence = float(scores[positive_index]) if positive_index < scores.size else float(scores[class_index])
        detected = label == (self.config.positive_label or self.event_type) or class_index == positive_index
        detected = detected and positive_confidence >= self.config.threshold
        metadata.update({"scores": scores.tolist(), "class_index": class_index, "positive_index": positive_index})
        return label, positive_confidence, detected, metadata


class BaseCrowdWrapper(ABC):
    @abstractmethod
    def predict(self, frame: np.ndarray, context: FrameContext, buffer: RollingFrameBuffer) -> List[ModelResult]:
        raise NotImplementedError
