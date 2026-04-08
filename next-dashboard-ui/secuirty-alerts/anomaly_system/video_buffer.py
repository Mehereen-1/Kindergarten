from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Deque, List, Optional

import numpy as np


@dataclass
class FrameRecord:
    frame_index: int
    timestamp: float
    frame: np.ndarray


class RollingFrameBuffer:
    def __init__(self, max_frames: int) -> None:
        self.max_frames = max_frames
        self._frames: Deque[FrameRecord] = deque(maxlen=max_frames)

    def append(self, frame_index: int, timestamp: float, frame: np.ndarray) -> None:
        self._frames.append(FrameRecord(frame_index=frame_index, timestamp=timestamp, frame=frame.copy()))

    def clear(self) -> None:
        self._frames.clear()

    def __len__(self) -> int:
        return len(self._frames)

    def latest(self) -> Optional[FrameRecord]:
        return self._frames[-1] if self._frames else None

    def get_clip(self, clip_length: int, stride: int = 1) -> Optional[List[FrameRecord]]:
        required = max(1, clip_length) * max(1, stride)
        if len(self._frames) < required:
            return None
        sampled = list(self._frames)[-required:: max(1, stride)]
        if len(sampled) < clip_length:
            return None
        return sampled[-clip_length:]
