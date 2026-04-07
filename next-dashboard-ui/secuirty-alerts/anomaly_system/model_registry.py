from __future__ import annotations

from typing import List, Sequence

import numpy as np

from anomaly_system.base import BaseAnomalyWrapper, FrameContext
from anomaly_system.config import ServiceConfig
from anomaly_system.crowd_motion import CrowdMotionWrapper
from anomaly_system.fall_wrapper import FallDetectionWrapper
from anomaly_system.fight_wrapper import FightDetectionWrapper
from anomaly_system.other_anomaly_wrapper import OtherAnomalyWrapper
from anomaly_system.schemas import ModelInfo, ModelResult
from anomaly_system.utils import get_logger
from anomaly_system.video_buffer import RollingFrameBuffer


class ModelRegistry:
    def __init__(self, settings: ServiceConfig) -> None:
        self.settings = settings
        self.logger = get_logger("security_alerts.anomaly.registry")
        self._wrappers: List[object] = self._build_wrappers()

    def _build_wrappers(self) -> List[object]:
        wrappers: List[object] = []
        wrappers.append(FightDetectionWrapper(self.settings.fight))
        wrappers.append(FallDetectionWrapper(self.settings.fall))
        wrappers.extend(OtherAnomalyWrapper(config) for config in self.settings.other_models)
        wrappers.append(CrowdMotionWrapper(self.settings.crowd_motion))
        return wrappers

    def load_all(self) -> None:
        for wrapper in self._wrappers:
            enabled = getattr(wrapper, "enabled", getattr(wrapper, "config", None).enabled if getattr(wrapper, "config", None) else True)
            if not enabled:
                continue
            if hasattr(wrapper, "ensure_loaded"):
                try:
                    wrapper.ensure_loaded()
                except Exception as exc:
                    if hasattr(wrapper, "load_error"):
                        wrapper.load_error = str(exc)
                    self.logger.exception("Failed to load %s", getattr(wrapper, "name", wrapper.__class__.__name__))

    def reset_stream_state(self) -> None:
        for wrapper in self._wrappers:
            if hasattr(wrapper, "reset_state"):
                wrapper.reset_state()

    def predict(self, frame: np.ndarray, context: FrameContext, buffer: RollingFrameBuffer) -> List[ModelResult]:
        outputs: List[ModelResult] = []
        for wrapper in self._wrappers:
            enabled = getattr(wrapper, "enabled", getattr(wrapper, "config", None).enabled if getattr(wrapper, "config", None) else True)
            if not enabled:
                continue
            if getattr(wrapper, "load_error", None):
                continue
            try:
                outputs.extend(wrapper.predict(frame, context, buffer))
            except Exception as exc:
                self.logger.exception("Inference failed for %s", getattr(wrapper, "name", wrapper.__class__.__name__))
        return outputs

    def active_model_names(self) -> List[str]:
        names: List[str] = []
        for wrapper in self._wrappers:
            enabled = getattr(wrapper, "enabled", getattr(wrapper, "config", None).enabled if getattr(wrapper, "config", None) else True)
            if enabled and not getattr(wrapper, "load_error", None):
                names.append(getattr(wrapper, "name", wrapper.__class__.__name__))
        return names

    def models_info(self) -> List[ModelInfo]:
        infos: List[ModelInfo] = []
        for wrapper in self._wrappers:
            if hasattr(wrapper, "info"):
                infos.append(wrapper.info())
        return infos
