from __future__ import annotations

from typing import List, Tuple

import cv2
import numpy as np

from anomaly_system.base import BaseCrowdWrapper, FrameContext
from anomaly_system.config import CrowdMotionConfig, ModelAdapterConfig
from anomaly_system.crowd_motion.analyzer import CrowdMotionAnalyzer
from anomaly_system.crowd_motion.tracker import CentroidTracker
from anomaly_system.crowd_motion.zones import Zone, ZoneManager
from anomaly_system.schemas import ModelInfo, ModelResult
from anomaly_system.utils import get_logger
from anomaly_system.video_buffer import RollingFrameBuffer


class CrowdMotionWrapper(BaseCrowdWrapper):
    def __init__(self, config: CrowdMotionConfig) -> None:
        self.config = config
        self.logger = get_logger("security_alerts.anomaly.crowd_motion")
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        self.zone_manager = ZoneManager(
            [
                Zone("center", *config.center_zone),
                Zone("left", *config.left_zone),
                Zone("right", *config.right_zone),
            ]
        )
        self.tracker = CentroidTracker(
            max_distance_px=config.tracker_max_distance_px,
            max_missing_frames=config.tracker_max_missing_frames,
            history_size=config.track_history_size,
        )
        self.analyzer = CrowdMotionAnalyzer(config, self.zone_manager)
        self.loaded = True

    @property
    def name(self) -> str:
        return "crowd_motion"

    def info(self) -> ModelInfo:
        return ModelInfo(
            name=self.name,
            event_type="crowd_motion",
            enabled=self.config.enabled,
            loaded=self.loaded,
            framework="opencv_hog",
            temporal=False,
            checkpoint_path="opencv-default-people-detector",
            threshold=self.config.running_ratio_threshold,
            extra={"run_every_n_frames": self.config.run_every_n_frames},
        )

    def reset_state(self) -> None:
        self.tracker.reset()
        self.analyzer.reset()

    def should_run(self, frame_index: int) -> bool:
        return frame_index % max(1, self.config.run_every_n_frames) == 0

    def _detect_people(self, frame: np.ndarray) -> List[Tuple[int, int, int, int]]:
        h, w = frame.shape[:2]
        scale = min(1.0, self.config.resize_width / max(1, w))
        resized = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LINEAR) if scale < 1.0 else frame
        boxes, _ = self.hog.detectMultiScale(resized, winStride=(8, 8), padding=(8, 8), scale=1.05)
        results: List[Tuple[int, int, int, int]] = []
        inv_scale = 1.0 / scale
        for (x, y, bw, bh) in boxes:
            results.append((int(x * inv_scale), int(y * inv_scale), int(bw * inv_scale), int(bh * inv_scale)))
        return results

    def predict(self, frame: np.ndarray, context: FrameContext, buffer: RollingFrameBuffer) -> List[ModelResult]:
        if not self.config.enabled or not self.should_run(context.frame_index):
            return []

        boxes = self._detect_people(frame)
        tracks = self.tracker.update(boxes, context.frame_index, context.timestamp)
        events = self.analyzer.analyze(tracks, context.width, context.height)

        outputs: List[ModelResult] = []
        for event in events:
            outputs.append(
                ModelResult(
                    model_name=self.name,
                    event_type=event.event_type,
                    label=event.event_type,
                    confidence=float(event.confidence),
                    detected=True,
                    frame_index=context.frame_index,
                    timestamp=context.timestamp,
                    metadata={
                        **event.metadata,
                        "tracked_people": len([track for track in tracks if track.missed_frames == 0]),
                        "detected_boxes": len(boxes),
                    },
                )
            )
        return outputs
