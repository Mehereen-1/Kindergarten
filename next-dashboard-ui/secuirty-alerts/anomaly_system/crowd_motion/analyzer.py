from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Deque, Dict, List, Union

from anomaly_system.config import CrowdMotionConfig
from anomaly_system.crowd_motion.tracker import Track
from anomaly_system.crowd_motion.zones import ZoneManager


@dataclass
class CrowdEvent:
    event_type: str
    confidence: float
    metadata: Dict[str, Union[float, int, Dict[str, int]]]


class CrowdMotionAnalyzer:
    def __init__(self, config: CrowdMotionConfig, zone_manager: ZoneManager) -> None:
        self.config = config
        self.zone_manager = zone_manager
        self.person_counts: Deque[int] = deque(maxlen=config.density_window)

    def reset(self) -> None:
        self.person_counts.clear()

    def analyze(self, tracks: List[Track], width: int, height: int) -> List[CrowdEvent]:
        active_tracks = [track for track in tracks if track.missed_frames == 0]
        count = len(active_tracks)
        self.person_counts.append(count)

        if count == 0:
            return []

        centers = [track.current_center() for track in active_tracks]
        occupancy = self.zone_manager.occupancy(centers, width, height)
        speeds = [track.speed_pixels_per_second() for track in active_tracks]
        fast_tracks = [speed for speed in speeds if speed >= self.config.running_speed_px_per_sec]
        fast_ratio = len(fast_tracks) / max(1, count)
        rolling_mean = (sum(self.person_counts) / len(self.person_counts)) if self.person_counts else 0.0

        events: List[CrowdEvent] = []

        if count >= self.config.density_min_people and fast_ratio >= self.config.running_ratio_threshold:
            confidence = min(0.99, 0.55 + fast_ratio * 0.4)
            events.append(
                CrowdEvent(
                    event_type="running_surge",
                    confidence=confidence,
                    metadata={"people_count": count, "fast_ratio": round(fast_ratio, 3), "occupancy": occupancy},
                )
            )

        density_ratio = (count / rolling_mean) if rolling_mean > 0 else 1.0
        if count >= self.config.density_min_people and density_ratio >= self.config.density_spike_multiplier:
            confidence = min(0.99, 0.5 + min(density_ratio, 3.0) * 0.15)
            events.append(
                CrowdEvent(
                    event_type="density_spike",
                    confidence=confidence,
                    metadata={
                        "people_count": count,
                        "density_ratio": round(density_ratio, 3),
                        "occupancy": occupancy,
                    },
                )
            )

        center_count = occupancy.get("center", 0)
        center_ratio = center_count / max(1, count)
        if count >= self.config.convergence_min_people and center_ratio >= self.config.convergence_zone_ratio:
            confidence = min(0.99, 0.55 + center_ratio * 0.35)
            events.append(
                CrowdEvent(
                    event_type="sudden_gathering",
                    confidence=confidence,
                    metadata={
                        "people_count": count,
                        "center_ratio": round(center_ratio, 3),
                        "occupancy": occupancy,
                    },
                )
            )

        dominant_zone, dominant_count = max(occupancy.items(), key=lambda item: item[1])
        dominant_ratio = dominant_count / max(1, count)
        if dominant_zone != "center" and count >= self.config.convergence_min_people and dominant_ratio >= self.config.convergence_zone_ratio:
            confidence = min(0.99, 0.5 + dominant_ratio * 0.4)
            events.append(
                CrowdEvent(
                    event_type="rush_to_zone",
                    confidence=confidence,
                    metadata={
                        "people_count": count,
                        "dominant_zone": dominant_zone,
                        "dominant_ratio": round(dominant_ratio, 3),
                        "occupancy": occupancy,
                    },
                )
            )

        return events
