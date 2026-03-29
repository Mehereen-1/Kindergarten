# ═══════════════════════════════════════════════════════
# camera_stream.py — Video Streaming & Playback
# ═══════════════════════════════════════════════════════

import time
import cv2
import numpy as np
from typing import Optional

from config.settings import (
    DISPLAY_WIDTH,
    DISPLAY_HEIGHT,
    PROCESS_EVERY_N,
    JPEG_QUALITY,
    BOX_TTL,
)
from .frame_buffer import video_state, video_analytics, analytics_lock, results_lock


# =========================
# PLACEHOLDER
# =========================

def create_placeholder(text="Waiting for video...") -> Optional[bytes]:
    frame = np.full((DISPLAY_HEIGHT, DISPLAY_WIDTH, 3), 40, dtype=np.uint8)
    ts = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 2)[0]
    cv2.putText(frame, text,
                ((DISPLAY_WIDTH - ts[0]) // 2, (DISPLAY_HEIGHT + ts[1]) // 2),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (200, 200, 200), 2)
    ret, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
    return buf.tobytes() if ret else None


# =========================
# PLAYBACK THREAD
# =========================

def playback_thread(video_path: str, draw_boxes_func):
    """
    Reads video frames, draws latest boxes, encodes to JPEG, pushes bytes
    into frame_queue. Stream thread just passes bytes through — no extra work.

    KEY STABILITY DECISIONS:
    - Frames are encoded HERE so stream_frames() does zero encoding work
    - No back-pressure: recognition queue is simply capped at maxlen=5;
      stale frames are discarded rather than pausing playback
    - Single timing source: absolute-time scheduler prevents drift
    """
    cap = cv2.VideoCapture(video_path)
    fps = min(cap.get(cv2.CAP_PROP_FPS) or 30, 30)
    frame_delay = 1.0 / fps
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"🎬 {orig_w}x{orig_h} @ {fps:.1f} FPS, {total_frames} frames")

    with analytics_lock:
        video_analytics.update({
            "total_frames": total_frames, "fps": fps,
            "video_duration": total_frames / fps if fps > 0 else 0,
            "start_time": time.time(),
        })

    frame_number = 0
    next_frame_time = time.perf_counter()

    while cap.isOpened() and not video_state["stop_event"].is_set():
        ret, frame = cap.read()
        if not ret:
            break

        frame_number += 1
        video_state["current_frame_num"] = frame_number

        # Sample for recognition — if queue is full, the deque drops the oldest
        # No back-pressure, no pausing
        if frame_number % PROCESS_EVERY_N == 0:
            video_state["recognition_queue"].append((frame_number, frame.copy()))

        # Get latest recognition results and draw them
        with results_lock:
            current_results = list(video_state["latest_results"])

        # Keep boxes visible for BOX_TTL frames after detection
        active = [r for r in current_results
                  if frame_number - r["detected_at_frame"] <= BOX_TTL]

        # Debug: log when we have results
        if frame_number % 30 == 0 and current_results:
            print(f"🎯 Frame {frame_number}: {len(current_results)} results, {len(active)} active")

        display = cv2.resize(frame, (DISPLAY_WIDTH, DISPLAY_HEIGHT),
                             interpolation=cv2.INTER_AREA)
        annotated = draw_boxes_func(display, active, orig_w, orig_h, frame_number)

        # Encode here — stream_frames() just passes bytes through
        ret2, buf = cv2.imencode(".jpg", annotated,
                                 [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
        if ret2:
            video_state["frame_queue"].append(buf.tobytes())

        # Absolute-time scheduling — immune to per-frame jitter
        next_frame_time += frame_delay
        sleep_time = next_frame_time - time.perf_counter()
        if sleep_time > 0:
            time.sleep(sleep_time)
        elif sleep_time < -frame_delay:
            next_frame_time = time.perf_counter()  # resync if too far behind

    with analytics_lock:
        t0 = video_analytics["start_time"]
        video_analytics["processing_time"] = time.time() - t0 if t0 else 0

    cap.release()
    video_state["is_running"] = False
    print(f"🎬 Playback done: {frame_number} frames")


# =========================
# STREAM FRAMES
# =========================

def stream_frames():
    """
    Yields JPEG frames at a steady pace.

    KEY FIX: Instead of draining the queue as fast as possible (which
    empties it and triggers placeholder flicker), we pace output to
    ~30 FPS.  When the queue is temporarily empty we re-send the last
    real frame so the video stays stable.  A placeholder is only shown
    once at the very start before any frame has arrived.
    """
    STREAM_FPS = 30
    frame_interval = 1.0 / STREAM_FPS
    last_jpeg: bytes | None = None          # last real frame for hold-repeat
    idle_since: float | None = None         # when queue first went empty

    try:
        while True:
            t0 = time.perf_counter()

            if not video_state["frame_queue"]:
                # ── queue is empty ──
                if video_state["stop_event"].is_set() and not video_state["is_running"]:
                    p = create_placeholder("Processing complete")
                    if p:
                        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + p + b"\r\n"
                    break

                if last_jpeg is not None:
                    # Hold the last real frame — no flicker
                    yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + last_jpeg + b"\r\n"
                else:
                    # No frame yet — show placeholder only at the very start
                    if idle_since is None:
                        idle_since = time.perf_counter()
                    p = create_placeholder("Starting video processing...")
                    if p:
                        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + p + b"\r\n"
            else:
                # ── queue has frames — pop the latest available ──
                idle_since = None
                try:
                    jpeg_bytes = video_state["frame_queue"].popleft()
                    last_jpeg = jpeg_bytes
                except IndexError:
                    jpeg_bytes = last_jpeg

                if jpeg_bytes:
                    yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg_bytes + b"\r\n"

            # Pace at STREAM_FPS so we don't drain faster than playback fills
            elapsed = time.perf_counter() - t0
            sleep = frame_interval - elapsed
            if sleep > 0:
                time.sleep(sleep)

    except GeneratorExit:
        pass
