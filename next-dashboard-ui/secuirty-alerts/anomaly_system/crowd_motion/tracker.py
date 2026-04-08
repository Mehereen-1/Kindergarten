from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, Iterable, List, Tuple

import math


def _center(box: Tuple[int, int, int, int]) -> Tuple[float, float]:
    x, y, w, h = box
    return x + (w / 2.0), y + (h / 2.0)


@dataclass
class Track:
    track_id: int
    bbox: Tuple[int, int, int, int]
    last_frame_index: int
    missed_frames: int = 0
    centers: Deque[Tuple[float, float, float]] = field(default_factory=lambda: deque(maxlen=24))

    def update(self, bbox: Tuple[int, int, int, int], frame_index: int, timestamp: float) -> None:
        self.bbox = bbox
        self.last_frame_index = frame_index
        self.missed_frames = 0
        self.centers.append((*_center(bbox), timestamp))

    def mark_missed(self) -> None:
        self.missed_frames += 1

    def current_center(self) -> Tuple[float, float]:
        return _center(self.bbox)

    def speed_pixels_per_second(self) -> float:
        if len(self.centers) < 2:
            return 0.0
        x1, y1, t1 = self.centers[0]
        x2, y2, t2 = self.centers[-1]
        dt = max(1e-6, t2 - t1)
        return math.hypot(x2 - x1, y2 - y1) / dt


class CentroidTracker:
    def __init__(self, max_distance_px: float, max_missing_frames: int, history_size: int) -> None:
        self.max_distance_px = max_distance_px
        self.max_missing_frames = max_missing_frames
        self.history_size = history_size
        self._next_track_id = 1
        self._tracks: Dict[int, Track] = {}

    def reset(self) -> None:
        self._next_track_id = 1
        self._tracks.clear()

    def update(
        self,
        detections: Iterable[Tuple[int, int, int, int]],
        frame_index: int,
        timestamp: float,
    ) -> List[Track]:
        dets = list(detections)
        unmatched_tracks = set(self._tracks.keys())
        assigned_detections = set()

        for det_index, det in enumerate(dets):
            det_center = _center(det)
            best_track_id = None
            best_distance = float("inf")
            for track_id in list(unmatched_tracks):
                distance = math.hypot(
                    det_center[0] - self._tracks[track_id].current_center()[0],
                    det_center[1] - self._tracks[track_id].current_center()[1],
                )
                if distance < best_distance and distance <= self.max_distance_px:
                    best_distance = distance
                    best_track_id = track_id
            if best_track_id is not None:
                track = self._tracks[best_track_id]
                if track.centers.maxlen != self.history_size:
                    track.centers = deque(track.centers, maxlen=self.history_size)
                track.update(det, frame_index, timestamp)
                unmatched_tracks.discard(best_track_id)
                assigned_detections.add(det_index)

        for det_index, det in enumerate(dets):
            if det_index in assigned_detections:
                continue
            track = Track(
                track_id=self._next_track_id,
                bbox=det,
                last_frame_index=frame_index,
                centers=deque(maxlen=self.history_size),
            )
            track.update(det, frame_index, timestamp)
            self._tracks[self._next_track_id] = track
            self._next_track_id += 1

        expired = []
        for track_id in unmatched_tracks:
            track = self._tracks[track_id]
            track.mark_missed()
            if track.missed_frames > self.max_missing_frames:
                expired.append(track_id)

        for track_id in expired:
            self._tracks.pop(track_id, None)

        return list(self._tracks.values())
