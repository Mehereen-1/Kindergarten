# ═══════════════════════════════════════════════════════
# tracker.py — Tracking Classes
# ═══════════════════════════════════════════════════════

import threading
from collections import deque

from config.settings import (
    SLIDING_WINDOW_SIZE,
    MIN_CONFIRMATIONS,
    BBOX_SMOOTHING_ALPHA,
    BBOX_MAX_JUMP,
    BOX_TTL,
)


# =========================
# SLIDING WINDOW TRACKER
# =========================

class SlidingWindowTracker:
    def __init__(self, window_size=SLIDING_WINDOW_SIZE, min_confirmations=MIN_CONFIRMATIONS):
        self.window_size = window_size
        self.min_confirmations = min_confirmations
        self.detections: dict = {}
        self.confirmed: set = set()
        self._lock = threading.Lock()

    def add_detection(self, student_id: str, frame_num: int, score: float) -> bool:
        with self._lock:
            if student_id in self.confirmed:
                return False
            if student_id not in self.detections:
                self.detections[student_id] = deque(maxlen=self.window_size * 2)
            self.detections[student_id].append((frame_num, score))
            count = sum(1 for f, _ in self.detections[student_id]
                        if frame_num - f <= self.window_size)
            if count >= self.min_confirmations:
                self.confirmed.add(student_id)
                print(f"✅ CONFIRMED: {student_id} ({count}/{self.min_confirmations})")
                return True
            return False

    def get_pending_count(self, student_id: str, current_frame: int) -> int:
        with self._lock:
            if student_id not in self.detections:
                return 0
            return sum(1 for f, _ in self.detections[student_id]
                       if current_frame - f <= self.window_size)

    def is_confirmed(self, student_id: str) -> bool:
        with self._lock:
            return student_id in self.confirmed

    def reset(self):
        with self._lock:
            self.detections.clear()
            self.confirmed.clear()

    def get_status(self) -> dict:
        with self._lock:
            return {
                "confirmed": list(self.confirmed),
                "pending": {k: len(v) for k, v in self.detections.items()
                            if k not in self.confirmed}
            }


# =========================
# BOUNDING BOX SMOOTHER
# =========================

class BoundingBoxSmoother:
    def __init__(self, alpha=BBOX_SMOOTHING_ALPHA, max_jump=BBOX_MAX_JUMP):
        self.alpha = alpha
        self.max_jump = max_jump
        self._lock = threading.Lock()
        self.tracked: dict = {}  # name -> {"bbox": [x1,y1,x2,y2], "last_frame": int}

    def smooth(self, name: str, raw_bbox: tuple, frame_num: int) -> tuple:
        """Apply EMA smoothing. Called ONCE per box per frame."""
        with self._lock:
            x1, y1, x2, y2 = raw_bbox

            if name not in self.tracked:
                self.tracked[name] = {
                    "bbox": [float(x1), float(y1), float(x2), float(y2)],
                    "last_frame": frame_num
                }
                return raw_bbox

            prev = self.tracked[name]
            cx_new = (x1 + x2) / 2
            cy_new = (y1 + y2) / 2
            cx_old = (prev["bbox"][0] + prev["bbox"][2]) / 2
            cy_old = (prev["bbox"][1] + prev["bbox"][3]) / 2
            dist2 = (cx_new - cx_old) ** 2 + (cy_new - cy_old) ** 2

            # Reset on large jump or stale box
            if dist2 > self.max_jump ** 2 or frame_num - prev["last_frame"] > BOX_TTL:
                self.tracked[name] = {
                    "bbox": [float(x1), float(y1), float(x2), float(y2)],
                    "last_frame": frame_num
                }
                return raw_bbox

            a = self.alpha
            s = [
                prev["bbox"][0] + a * (x1 - prev["bbox"][0]),
                prev["bbox"][1] + a * (y1 - prev["bbox"][1]),
                prev["bbox"][2] + a * (x2 - prev["bbox"][2]),
                prev["bbox"][3] + a * (y2 - prev["bbox"][3]),
            ]
            self.tracked[name] = {"bbox": s, "last_frame": frame_num}
            return (int(s[0]), int(s[1]), int(s[2]), int(s[3]))

    def reset(self):
        with self._lock:
            self.tracked.clear()
