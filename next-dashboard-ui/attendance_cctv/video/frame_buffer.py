# ═══════════════════════════════════════════════════════
# frame_buffer.py — Frame Buffer & Global State
# ═══════════════════════════════════════════════════════

import threading
from collections import deque


# =========================
# GLOBAL LOCKS
# =========================

results_lock   = threading.Lock()
faces_lock     = threading.Lock()
analytics_lock = threading.Lock()


# =========================
# VIDEO STATE
# =========================

video_state = {
    "is_running":        False,
    "stop_event":        threading.Event(),
    # Items: already-encoded JPEG bytes — stream just passes them through
    "frame_queue":       deque(maxlen=180),
    # Items: (frame_number, original_ndarray)
    "recognition_queue": deque(maxlen=5),
    # Items: {"bbox", "name", "detected_at_frame"}
    "latest_results":    [],
    "current_frame_num": 0,
    "detections":        deque(maxlen=1000),
    "video_path":        None,
}


# =========================
# VIDEO ANALYTICS
# =========================

video_analytics = {
    "total_frames": 0, "processed_frames": 0,
    "faces_detected": 0, "matched_faces": 0, "unknown_faces": 0,
    "scores": [], "fps": 0, "video_duration": 0,
    "start_time": None, "processing_time": 0,
}


# =========================
# EXTRACTED FACES
# =========================

extracted_faces = {"faces": [], "max_faces": 48}
