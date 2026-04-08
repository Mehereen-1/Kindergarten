# ═══════════════════════════════════════════════════════════════════════════════
#                              MAIN APPLICATION
# ═══════════════════════════════════════════════════════════════════════════════
#
# FastAPI Server with Face Recognition Attendance System
#
# Usage:
#   uvicorn main:app --reload
#   python main.py
#
# ═══════════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════
# IMPORTS
# ═══════════════════════════════════════════════════════

# Standard library
import os
import tempfile
import threading
import time
import glob
import uuid
import base64
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional
from collections import deque

# Third-party
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, Query
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import ObjectId

# Local module
from face_engine import FaceEngine
from liveness_engine import LivenessEngine
from attendance_export import export_daily_attendance, export_monthly_attendance, EXPORT_DIR


# ═══════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════

# Display
DISPLAY_WIDTH        = 854
DISPLAY_HEIGHT       = 480

# Recognition
RECOG_WIDTH          = 640
RECOG_HEIGHT         = 480
PROCESS_EVERY_N      = 1        # recognition every frame for better accuracy
RECOG_THRESHOLD      = 0.4
SYNC_BACKLOG_HIGH    = 3        # start throttling earlier when recognition lags
SYNC_WAIT_STEP       = 0.005
SYNC_WAIT_MAX        = 0.25

# Encoding
JPEG_QUALITY         = 80

# Bounding Box
BOX_TTL              = 60       # Boxes stay visible this many frames after last detection
BBOX_SMOOTHING_ALPHA = 0.3
BBOX_MAX_JUMP        = 100

# Attendance Tracking
SLIDING_WINDOW_SIZE  = 20
MIN_CONFIRMATIONS    = 5
ATTENDANCE_COOLDOWN  = 60


# ═══════════════════════════════════════════════════════
# DATABASE CONNECTION
# ═══════════════════════════════════════════════════════

# Load env from backend context first, then project root .env.local used by Next.js.
load_dotenv()
root_env_local = Path(__file__).resolve().parents[2] / ".env.local"
if root_env_local.exists():
    load_dotenv(dotenv_path=root_env_local)

db = None
client = None

try:
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        raise RuntimeError("MONGODB_URI is not set. Add it to attendance_cctv/backend/.env or project root .env.local")

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    db = client[os.getenv("DB_NAME", "test")]
    print("✅ MongoDB connected")
except Exception as e:
    db = None
    print(f"⚠️ MongoDB not connected: {e}")


# ═══════════════════════════════════════════════════════
# GLOBAL LOCKS
# ═══════════════════════════════════════════════════════

results_lock   = threading.Lock()
faces_lock     = threading.Lock()
analytics_lock = threading.Lock()


# ═══════════════════════════════════════════════════════
# VIDEO STATE
# ═══════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════
# VIDEO ANALYTICS
# ═══════════════════════════════════════════════════════

video_analytics = {
    "total_frames": 0, "processed_frames": 0,
    "faces_detected": 0, "matched_faces": 0, "unknown_faces": 0,
    "scores": [], "fps": 0, "video_duration": 0,
    "start_time": None, "processing_time": 0,
}


# ═══════════════════════════════════════════════════════
# EXTRACTED FACES
# ═══════════════════════════════════════════════════════

extracted_faces = {"faces": [], "max_faces": 48}


# ═══════════════════════════════════════════════════════
# SLIDING WINDOW TRACKER
# ═══════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════
# BOUNDING BOX SMOOTHER
# ═══════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════
# ATTENDANCE MANAGER
# ═══════════════════════════════════════════════════════

_attendance_ts: dict = {}
_student_name_cache: dict = {}


def _resolve_student_name(database, student_id, fallback_name: str):
    if not student_id:
        return fallback_name

    sid = str(student_id)
    if sid in _student_name_cache:
        return _student_name_cache[sid]

    resolved = fallback_name
    if database is not None:
        try:
            students_coll = database.get_collection("students")
            lookup_id = student_id
            if isinstance(student_id, str) and ObjectId.is_valid(student_id):
                lookup_id = ObjectId(student_id)

            student_doc = students_coll.find_one({"_id": lookup_id}, {"name": 1})
            if student_doc and student_doc.get("name"):
                resolved = student_doc["name"]
        except Exception:
            pass

    _student_name_cache[sid] = resolved
    return resolved


def save_attendance(database, name: str, student_id):
    if database is None:
        return
    now = datetime.now()
    last = _attendance_ts.get(student_id)
    if last and (now - last).total_seconds() < ATTENDANCE_COOLDOWN:
        return
    database["attendance"].insert_one({
        "name": name, "student_id": student_id,
        "timestamp": now, "datetime_str": now.strftime("%Y-%m-%d %H:%M:%S"),
    })
    _attendance_ts[student_id] = now
    print(f"💾 Attendance: {name}")


def clear_attendance_timestamps():
    _attendance_ts.clear()
    _student_name_cache.clear()


def get_attendance_logic(database, limit: int = 100):
    if database is None:
        return []
    records = list(database["attendance"].find().sort("timestamp", -1).limit(limit))
    for r in records:
        r["_id"] = str(r["_id"])
        if "timestamp" in r:
            r["timestamp"] = r["timestamp"].isoformat()
    return records


def clear_attendance_logic(database):
    if database:
        database["attendance"].delete_many({})
    clear_attendance_timestamps()
    return {"success": True}


# ═══════════════════════════════════════════════════════
# IMAGE UTILITIES
# ═══════════════════════════════════════════════════════

def decode_image(file_bytes: bytes):
    """Decode image bytes to OpenCV format."""
    return cv2.imdecode(np.frombuffer(file_bytes, np.uint8), cv2.IMREAD_COLOR)


# ═══════════════════════════════════════════════════════
# DRAW BOXES
# ═══════════════════════════════════════════════════════

def draw_boxes(frame: np.ndarray, results: list,
               orig_w: int, orig_h: int, current_frame: int,
               bbox_smoother) -> np.ndarray:
    """
    Draw smoothed boxes on an already-display-sized frame.
    Calls bbox_smoother.smooth() ONCE per box — avoids double-EMA bug.
    
    Colors:
        - Red (0,0,255): Unknown face
        - Green (0,200,0): Recognized face
    """
    if not results:
        return frame
    
    sx = DISPLAY_WIDTH  / max(1, orig_w)
    sy = DISPLAY_HEIGHT / max(1, orig_h)

    for r in results:
        raw_x1, raw_y1, raw_x2, raw_y2 = r["bbox"]
        name = r.get("name", "Unknown")
        base_name = name.replace("✓ ", "").split(" [")[0].split(" (")[0]

        # Skip invalid boxes early; avoids drawing failures on malformed detections.
        if raw_x2 <= raw_x1 or raw_y2 <= raw_y1:
            continue

        # Single smooth call — convert original coords to smoothed original coords
        smoothed = bbox_smoother.smooth(
            base_name, (raw_x1, raw_y1, raw_x2, raw_y2), current_frame
        )

        # Scale to display size after smoothing
        x1 = int(smoothed[0] * sx)
        y1 = int(smoothed[1] * sy)
        x2 = int(smoothed[2] * sx)
        y2 = int(smoothed[3] * sy)

        # Keep coordinates inside frame bounds to avoid intermittent off-screen draws.
        x1 = max(0, min(DISPLAY_WIDTH - 1, x1))
        y1 = max(0, min(DISPLAY_HEIGHT - 1, y1))
        x2 = max(0, min(DISPLAY_WIDTH - 1, x2))
        y2 = max(0, min(DISPLAY_HEIGHT - 1, y2))
        if x2 <= x1 or y2 <= y1:
            continue

        # Determine color based on recognition status
        if "Unknown" in name or "Spoof" in name:
            color = (0, 0, 255)      # Red for unknown
        else:
            color = (0, 200, 0)      # Green for recognized

        # Draw bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2, cv2.LINE_AA)

        # Draw label background and text
        (lw, lh), _ = cv2.getTextSize(name, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        label_y1 = max(0, y1 - lh - 8)
        cv2.rectangle(frame, (x1, label_y1), (x1 + lw + 6, y1), color, -1, cv2.LINE_AA)
        cv2.putText(frame, name, (x1 + 3, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
    
    return frame


# ═══════════════════════════════════════════════════════
# EXTRACT AND STORE FACE
# ═══════════════════════════════════════════════════════

def extract_and_store_face(frame, bbox, name, student_id, score, frame_num, is_confirmed,
                           extracted_faces_dict, faces_lock_obj):
    h, w = frame.shape[:2]
    x1, y1, x2, y2 = bbox
    pad_x = int((x2 - x1) * 0.2); pad_y = int((y2 - y1) * 0.2)
    x1 = max(0, x1 - pad_x); y1 = max(0, y1 - pad_y)
    x2 = min(w, x2 + pad_x); y2 = min(h, y2 + pad_y)
    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return
    crop = cv2.resize(crop, (100, 100))
    ret, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ret:
        return
    with faces_lock_obj:
        extracted_faces_dict["faces"].append({
            "id": str(uuid.uuid4())[:8],
            "image_b64": base64.b64encode(buf.tobytes()).decode(),
            "name": name,
            "student_id": str(student_id) if student_id else None,
            "score": round(score, 3),
            "is_match": name not in ("Unknown", "Spoof"),
            "frame_num": frame_num,
            "confirmed": is_confirmed,
            "timestamp": datetime.now().isoformat(),
        })
        if len(extracted_faces_dict["faces"]) > extracted_faces_dict["max_faces"]:
            extracted_faces_dict["faces"] = extracted_faces_dict["faces"][-extracted_faces_dict["max_faces"]:]


# ═══════════════════════════════════════════════════════
# PLACEHOLDER
# ═══════════════════════════════════════════════════════

def create_placeholder(text="Waiting for video...") -> Optional[bytes]:
    frame = np.full((DISPLAY_HEIGHT, DISPLAY_WIDTH, 3), 40, dtype=np.uint8)
    ts = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 2)[0]
    cv2.putText(frame, text,
                ((DISPLAY_WIDTH - ts[0]) // 2, (DISPLAY_HEIGHT + ts[1]) // 2),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (200, 200, 200), 2)
    ret, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
    return buf.tobytes() if ret else None


# ═══════════════════════════════════════════════════════
# PLAYBACK THREAD
# ═══════════════════════════════════════════════════════

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
    fps = min(cap.get(cv2.CAP_PROP_FPS) or 20, 20)
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

        backlog_waited = 0.0
        while (len(video_state["recognition_queue"]) >= SYNC_BACKLOG_HIGH
               and not video_state["stop_event"].is_set()
               and backlog_waited < SYNC_WAIT_MAX):
            time.sleep(SYNC_WAIT_STEP)
            backlog_waited += SYNC_WAIT_STEP

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
        next_frame_time += frame_delay + backlog_waited
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


def camera_playback_thread(camera_index: int, draw_boxes_func):
    """
    Reads frames from a live camera, draws latest boxes, and pushes encoded JPEGs.
    """
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        print(f"❌ Failed to open camera index {camera_index}")
        video_state["is_running"] = False
        video_state["stop_event"].set()
        return

    fps_raw = cap.get(cv2.CAP_PROP_FPS)
    fps = min(fps_raw if fps_raw and fps_raw > 0 else 20, 20)
    frame_delay = 1.0 / fps
    orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or RECOG_WIDTH
    orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or RECOG_HEIGHT
    print(f"📷 Camera {camera_index} opened at {orig_w}x{orig_h} @ {fps:.1f} FPS")

    with analytics_lock:
        video_analytics.update({
            "total_frames": 0,
            "fps": fps,
            "video_duration": 0,
            "start_time": time.time(),
        })

    frame_number = 0
    next_frame_time = time.perf_counter()

    while cap.isOpened() and not video_state["stop_event"].is_set():
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.01)
            continue

        frame_number += 1
        video_state["current_frame_num"] = frame_number

        if frame_number % PROCESS_EVERY_N == 0:
            video_state["recognition_queue"].append((frame_number, frame.copy()))

        backlog_waited = 0.0
        while (len(video_state["recognition_queue"]) >= SYNC_BACKLOG_HIGH
               and not video_state["stop_event"].is_set()
               and backlog_waited < SYNC_WAIT_MAX):
            time.sleep(SYNC_WAIT_STEP)
            backlog_waited += SYNC_WAIT_STEP

        with results_lock:
            current_results = list(video_state["latest_results"])

        active = [r for r in current_results
                  if frame_number - r["detected_at_frame"] <= BOX_TTL]

        display = cv2.resize(frame, (DISPLAY_WIDTH, DISPLAY_HEIGHT),
                             interpolation=cv2.INTER_AREA)
        annotated = draw_boxes_func(display, active, orig_w, orig_h, frame_number)

        ok, buf = cv2.imencode(".jpg", annotated,
                               [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
        if ok:
            video_state["frame_queue"].append(buf.tobytes())

        next_frame_time += frame_delay + backlog_waited
        sleep_time = next_frame_time - time.perf_counter()
        if sleep_time > 0:
            time.sleep(sleep_time)
        elif sleep_time < -frame_delay:
            next_frame_time = time.perf_counter()

    with analytics_lock:
        t0 = video_analytics["start_time"]
        video_analytics["processing_time"] = time.time() - t0 if t0 else 0

    cap.release()
    video_state["is_running"] = False
    print(f"📷 Camera stopped after {frame_number} frames")


# ═══════════════════════════════════════════════════════
# STREAM FRAMES
# ═══════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════
# RECOGNITION THREAD
# ═══════════════════════════════════════════════════════

def recognition_thread(video_state_dict, video_analytics_dict, analytics_lock_obj, results_lock_obj,
                       engine, attendance_tracker, save_attendance_func, extract_and_store_face_func):
    """
    Pulls latest frame from recognition_queue, runs InsightFace,
    stores results. engine.recognize() returns (bbox, name, student_id) — 3 values.
    """
    print(f"🔍 Recognition started  window={SLIDING_WINDOW_SIZE} "
          f"min={MIN_CONFIRMATIONS} threshold={RECOG_THRESHOLD}")
    liveness_engine = LivenessEngine()

    while not video_state_dict["stop_event"].is_set():
        frame_data = None
        try:
            # Drain stale frames — always process the most recent
            while len(video_state_dict["recognition_queue"]) > 1:
                video_state_dict["recognition_queue"].popleft()
            if video_state_dict["recognition_queue"]:
                frame_data = video_state_dict["recognition_queue"].popleft()
        except IndexError:
            pass

        if frame_data is None:
            time.sleep(0.01)
            continue

        frame_num, frame = frame_data

        with analytics_lock_obj:
            video_analytics_dict["processed_frames"] += 1

        try:
            orig_h, orig_w = frame.shape[:2]
            small = cv2.resize(frame, (RECOG_WIDTH, RECOG_HEIGHT))
            sx = orig_w / RECOG_WIDTH
            sy = orig_h / RECOG_HEIGHT

            # Supports both 3-tuple and 4-tuple results from engine.recognize().
            raw_results = engine.recognize(small, threshold=RECOG_THRESHOLD)
            
            # Debug: always log detection results
            if raw_results:
                print(f"👁️  Frame {frame_num}: Detected {len(raw_results)} face(s)")

            with analytics_lock_obj:
                video_analytics_dict["faces_detected"] += len(raw_results)

            scaled = []
            for result in raw_results:
                if len(result) >= 4:
                    bbox, name, student_id, score = result[:4]
                elif len(result) == 3:
                    bbox, name, student_id = result
                    score = 0.0
                else:
                    continue

                x1 = max(0, int(bbox[0]))
                y1 = max(0, int(bbox[1]))
                x2 = min(RECOG_WIDTH, int(bbox[2]))
                y2 = min(RECOG_HEIGHT, int(bbox[3]))

                face_crop = small[y1:y2, x1:x2]
                sid = str(student_id) if student_id else None
                if sid:
                    face_id = sid
                else:
                    cx = (x1 + x2) // 2
                    cy = (y1 + y2) // 2
                    face_id = f"u_{cx // 32}_{cy // 32}"

                is_live = liveness_engine.check_liveness(face_crop, face_id)
                if not is_live:
                    orig_bbox = (
                        int(bbox[0] * sx), int(bbox[1] * sy),
                        int(bbox[2] * sx), int(bbox[3] * sy),
                    )
                    if orig_bbox[2] <= orig_bbox[0] or orig_bbox[3] <= orig_bbox[1]:
                        continue

                    scaled.append({
                        "bbox": orig_bbox,
                        "name": "Spoof",
                        "student_id": None,
                        "detected_at_frame": frame_num,
                    })

                    video_state_dict["detections"].append({
                        "name": "Spoof",
                        "student_name": "Spoof",
                        "student_id": None,
                        "timestamp": datetime.now().isoformat(),
                        "frame_num": frame_num,
                    })

                    with analytics_lock_obj:
                        video_analytics_dict["unknown_faces"] += 1

                    extract_and_store_face_func(
                        frame,
                        orig_bbox,
                        "Spoof",
                        None,
                        0.0,
                        frame_num,
                        False,
                    )
                    continue

                is_confirmed = False
                display_name = name
                resolved_name = name

                if name != "Unknown" and student_id:
                    sid = str(student_id)
                    resolved_name = _resolve_student_name(db, student_id, name)
                    pending = attendance_tracker.get_pending_count(sid, frame_num)
                    is_confirmed = attendance_tracker.is_confirmed(sid)
                    display_name = f"{resolved_name} [{sid}]"
                    with analytics_lock_obj:
                        video_analytics_dict["matched_faces"] += 1

                    should_save = attendance_tracker.add_detection(sid, frame_num, score)
                    if should_save:
                        save_attendance_func(resolved_name, student_id)
                else:
                    with analytics_lock_obj:
                        video_analytics_dict["unknown_faces"] += 1

                orig_bbox = (
                    int(bbox[0] * sx), int(bbox[1] * sy),
                    int(bbox[2] * sx), int(bbox[3] * sy),
                )
                if orig_bbox[2] <= orig_bbox[0] or orig_bbox[3] <= orig_bbox[1]:
                    continue

                scaled.append({
                    "bbox": orig_bbox,
                    "name": display_name,
                    "student_id": str(student_id) if student_id else None,
                    "detected_at_frame": frame_num,  # will be rebased below
                })

                video_state_dict["detections"].append({
                    "name": resolved_name,
                    "student_name": resolved_name,
                    "student_id": str(student_id) if student_id else None,
                    "timestamp": datetime.now().isoformat(),
                    "frame_num": frame_num,
                })

                extract_and_store_face_func(frame, orig_bbox, name, student_id,
                                       0.0, frame_num, is_confirmed)

            # Rebase detected_at_frame to the CURRENT playback position.
            # Recognition is slow; by the time we get here, playback is
            # far ahead of `frame_num`.  Without rebasing, the BOX_TTL
            # filter in playback_thread would discard every result as stale.
            current_playback = video_state_dict["current_frame_num"]
            for item in scaled:
                item["detected_at_frame"] = current_playback

            # Merge with previous results so briefly missed faces do not blink out.
            with results_lock_obj:
                previous = list(video_state_dict["latest_results"])

            def _iou(box_a, box_b):
                ax1, ay1, ax2, ay2 = box_a
                bx1, by1, bx2, by2 = box_b
                ix1, iy1 = max(ax1, bx1), max(ay1, by1)
                ix2, iy2 = min(ax2, bx2), min(ay2, by2)
                iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
                inter = iw * ih
                if inter == 0:
                    return 0.0
                area_a = max(1, (ax2 - ax1) * (ay2 - ay1))
                area_b = max(1, (bx2 - bx1) * (by2 - by1))
                return inter / float(area_a + area_b - inter)

            merged = list(scaled)
            for old in previous:
                old_seen = old.get("detected_at_frame", 0)
                if current_playback - old_seen > BOX_TTL:
                    continue

                old_sid = old.get("student_id")
                if old_sid:
                    already_updated = any(n.get("student_id") == old_sid for n in scaled)
                    if already_updated:
                        continue
                else:
                    # For unknown faces, spatial match avoids duplicate ghost boxes.
                    matched_unknown = any(
                        n.get("student_id") is None and _iou(old["bbox"], n["bbox"]) >= 0.2
                        for n in scaled
                    )
                    if matched_unknown:
                        continue

                merged.append(old)

            with results_lock_obj:
                video_state_dict["latest_results"] = merged

            if scaled:
                print(f"📦 Recognition done: {len(scaled)} face(s) on recog-frame {frame_num}, "
                      f"tagged at playback-frame {current_playback}")

        except Exception as e:
            print(f"❌ Recognition error: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(0.01)

    print("🔍 Recognition stopped")


# ═══════════════════════════════════════════════════════
# APP LIFESPAN
# ═══════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting...")
    yield
    print("🛑 Shutting down...")
    video_state["stop_event"].set()


# ═══════════════════════════════════════════════════════
# APP INITIALIZATION
# ═══════════════════════════════════════════════════════

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════
# GLOBAL INSTANCES
# ═══════════════════════════════════════════════════════

engine = FaceEngine(db=db, model_name="buffalo_l")
attendance_tracker = SlidingWindowTracker()
bbox_smoother = BoundingBoxSmoother()


# ═══════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════

def _embedding_count():
    return 0 if engine.known_embeddings is None else len(engine.known_embeddings)


def _save_attendance_wrapper(name: str, student_id):
    save_attendance(db, name, student_id)


def _extract_face_wrapper(frame, bbox, name, student_id, score, frame_num, is_confirmed):
    extract_and_store_face(frame, bbox, name, student_id, score, frame_num, is_confirmed,
                           extracted_faces, faces_lock)


def _draw_boxes_wrapper(frame, results, orig_w, orig_h, current_frame):
    return draw_boxes(frame, results, orig_w, orig_h, current_frame, bbox_smoother)


def _start_processing_threads(playback_target, playback_args):
    threading.Thread(target=playback_target, args=playback_args, daemon=True).start()
    threading.Thread(target=recognition_thread, args=(
        video_state, video_analytics, analytics_lock, results_lock,
        engine, attendance_tracker, _save_attendance_wrapper, _extract_face_wrapper
    ), daemon=True).start()


def _stop_and_clear():
    video_state["stop_event"].set()
    video_state["is_running"] = False
    video_state["frame_queue"].clear()
    video_state["recognition_queue"].clear()
    video_state["detections"].clear()
    with results_lock:
        video_state["latest_results"] = []
    with faces_lock:
        extracted_faces["faces"] = []
    attendance_tracker.reset()
    bbox_smoother.reset()
    time.sleep(0.3)


# ═══════════════════════════════════════════════════════
# API — VIDEO STREAMING
# ═══════════════════════════════════════════════════════

@app.get("/video-stream-processed")
def video_stream_processed():
    return StreamingResponse(
        stream_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/video")
def video_stream_live_alias():
    # Frontend live tab expects /video; keep it as an alias to the processed stream.
    return StreamingResponse(
        stream_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# ═══════════════════════════════════════════════════════
# API — VIDEO PROCESSING
# ═══════════════════════════════════════════════════════

@app.post("/process-video")
async def process_video(video: UploadFile = File(...)):
    _stop_and_clear()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(await video.read())
        tmp_path = tmp.name

    video_state["video_path"] = tmp_path
    video_state["stop_event"].clear()
    video_state["is_running"] = True

    with analytics_lock:
        video_analytics.update({
            "total_frames": 0, "processed_frames": 0,
            "faces_detected": 0, "matched_faces": 0, "unknown_faces": 0,
            "scores": [], "fps": 0, "video_duration": 0,
            "start_time": None, "processing_time": 0,
        })

    _start_processing_threads(playback_thread, (tmp_path, _draw_boxes_wrapper))
    return {"success": True}


@app.post("/start-camera")
def start_camera(camera_index: int = 0):
    _stop_and_clear()

    test_cap = cv2.VideoCapture(camera_index)
    opened = test_cap.isOpened()
    if opened:
        test_cap.release()
    else:
        return {"success": False, "error": f"Camera index {camera_index} not accessible"}

    video_state["video_path"] = f"camera:{camera_index}"
    video_state["stop_event"].clear()
    video_state["is_running"] = True

    with analytics_lock:
        video_analytics.update({
            "total_frames": 0, "processed_frames": 0,
            "faces_detected": 0, "matched_faces": 0, "unknown_faces": 0,
            "scores": [], "fps": 0, "video_duration": 0,
            "start_time": None, "processing_time": 0,
        })

    _start_processing_threads(camera_playback_thread, (camera_index, _draw_boxes_wrapper))
    return {"success": True, "camera_index": camera_index}


@app.post("/stop-camera")
def stop_camera():
    _stop_and_clear()
    return {"success": True}


@app.post("/stop-processing")
def stop_processing():
    _stop_and_clear()
    return {"success": True, "detections": len(video_state["detections"]),
            "confirmed": attendance_tracker.get_status()["confirmed"]}


# ═══════════════════════════════════════════════════════
# API — ATTENDANCE & DETECTIONS
# ═══════════════════════════════════════════════════════

@app.get("/attendance")
def get_attendance(limit: int = 100):
    return get_attendance_logic(db, limit)


@app.post("/clear-attendance")
def clear_attendance():
    return clear_attendance_logic(db)


@app.get("/video-detections")
def get_video_detections():
    return {"detections": list(video_state["detections"]),
            "is_processing": video_state["is_running"]}


# ═══════════════════════════════════════════════════════
# API — FACIAL ENROLLMENT & MANAGEMENT
# ═══════════════════════════════════════════════════════

@app.post("/upload-student-images")
async def upload_student_images(
    student_id: str = Form(...),
    files: List[UploadFile] = File(...),
):
    if db is None:
        return {"error": "MongoDB not connected", "success": False}

    embeddings_created = 0
    files_processed = 0
    errors = []

    for file in files:
        try:
            img = decode_image(await file.read())
            if img is None:
                errors.append(f"Cannot decode {file.filename}"); continue
            files_processed += 1
            faces = engine.app.get(img)
            if not faces:
                errors.append(f"No face in {file.filename}"); continue
            face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))
            db["facial_database"].update_one(
                {"student_id": student_id},
                {"$push": {"embeddings": {
                    "embedding": face.embedding.tolist(),
                    "filename": file.filename,
                    "image_url": f"/facial-data/{student_id}_{file.filename}",
                    "uploaded_at": datetime.now(),
                }},
                 "$set": {"last_updated": datetime.now()},
                 "$inc": {"number_of_samples": 1}},
                upsert=True,
            )
            embeddings_created += 1
        except Exception as e:
            errors.append(f"Error on {file.filename}: {e}")

    if embeddings_created > 0:
        engine.load_embeddings_from_db(db)

    return {"success": True, "files_processed": files_processed,
            "embeddings_created": embeddings_created,
            "total_embeddings_in_memory": _embedding_count(),
            "errors": errors or None}


@app.get("/student-facial-samples/{student_id}")
def get_student_facial_samples(student_id: str):
    if db is None:
        return {"error": "Database not connected"}
    record = db["facial_database"].find_one({"student_id": student_id})
    if not record:
        return {"student_id": student_id, "number_of_samples": 0}
    return {"student_id": student_id, "number_of_samples": record.get("number_of_samples", 0)}


@app.get("/known-faces")
def get_known_faces():
    if db is None:
        return {"faces": [], "total": 0}
    FACIAL_DATA_DIR = os.path.join(
        os.path.dirname(__file__), "..", "public", "facial-data")
    faces = []
    try:
        records = list(db["facial_database"].find())
        students_coll = db.get_collection("students")
        for record in records:
            student_id = record.get("student_id")
            embeddings = record.get("embeddings", [])
            num_samples = len(embeddings) or record.get("number_of_samples", 0)
            image_url = None
            if os.path.exists(FACIAL_DATA_DIR):
                matches = glob.glob(os.path.join(FACIAL_DATA_DIR, f"{student_id}_*.jpg"))
                if matches:
                    image_url = f"/facial-data/{os.path.basename(matches[0])}"
            student_name = str(student_id)
            if students_coll:
                try:
                    oid = ObjectId(student_id) if isinstance(student_id, str) else student_id
                    s = students_coll.find_one({"_id": oid})
                    if s and s.get("name"):
                        student_name = s["name"]
                except Exception:
                    pass
            faces.append({"student_id": str(student_id), "name": student_name,
                           "num_samples": num_samples, "image_url": image_url})
    except Exception as e:
        print(f"[known-faces] Error: {e}")
    return {"faces": faces, "total": len(faces)}


@app.post("/test-recognition")
async def test_recognition(file: UploadFile = File(...)):
    try:
        img = decode_image(await file.read())
        if img is None:
            return {"error": "Could not decode image"}
        faces = engine.app.get(img)
        if not faces:
            return {"error": "No face detected"}
        out = []
        for i, face in enumerate(faces):
            emb = face.embedding.astype(np.float32)
            emb /= np.linalg.norm(emb) + 1e-6
            if engine.known_embeddings is None:
                out.append({"face": i, "error": "No embeddings loaded"})
                continue
            sims = engine.known_embeddings @ emb
            top = np.argsort(sims)[::-1][:5]
            matches = [{"name": engine.known_names[j], "score": float(sims[j])} for j in top]
            out.append({"face": i, "bbox": face.bbox.astype(int).tolist(),
                        "top_matches": matches,
                        "would_recognize_at_0.4": bool(matches[0]["score"] >= 0.4)})
        return {"known_students": list(set(engine.known_names)),
                "embeddings_loaded": _embedding_count(), "results": out}
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


# ═══════════════════════════════════════════════════════
# API — ANALYTICS & DEBUG
# ═══════════════════════════════════════════════════════

@app.get("/analytics")
def get_analytics():
    with analytics_lock:
        a = {**video_analytics}
    a["match_rate"] = (a["matched_faces"] / max(1, a["faces_detected"])) * 100
    scores = a.get("scores", [])
    a["score_stats"] = ({
        "min": min(scores), "max": max(scores),
        "avg": sum(scores) / len(scores), "count": len(scores),
    } if scores else {"min": 0, "max": 0, "avg": 0, "count": 0})
    a["current_frame"] = video_state["current_frame_num"]
    a["is_processing"] = video_state["is_running"]
    return a


@app.get("/extracted-faces")
def get_extracted_faces():
    with faces_lock:
        return {
            "faces": list(extracted_faces["faces"]),
            "total": len(extracted_faces["faces"]),
            "is_processing": video_state["is_running"],
        }


@app.post("/clear-extracted-faces")
def clear_extracted_faces_ep():
    with faces_lock:
        extracted_faces["faces"] = []
    return {"success": True}


@app.get("/debug")
def debug_status():
    return {
        "mongodb_connected": db is not None,
        "embeddings_loaded": _embedding_count(),
        "unique_students": engine.student_count,
        "student_names": list(set(engine.known_names)),
        "is_processing": video_state["is_running"],
        "frame_queue_size": len(video_state["frame_queue"]),
        "recognition_queue_size": len(video_state["recognition_queue"]),
        "model": "buffalo_l",
        "threshold": RECOG_THRESHOLD,
        "multiframe": {"window": SLIDING_WINDOW_SIZE, "min": MIN_CONFIRMATIONS},
    }


@app.get("/tracker-status")
def tracker_status():
    status = attendance_tracker.get_status()
    return {
        "is_processing": video_state["is_running"],
        "confirmed_students": status["confirmed"],
        "pending_students": status["pending"],
        "config": {"window_size": SLIDING_WINDOW_SIZE,
                   "min_confirmations": MIN_CONFIRMATIONS,
                   "threshold": RECOG_THRESHOLD},
    }


@app.post("/reload-embeddings")
def reload_embeddings():
    if db is None:
        return {"success": False, "error": "MongoDB not connected"}
    engine.load_embeddings_from_db(db)
    return {"success": True, "embeddings_loaded": _embedding_count(),
            "unique_students": engine.student_count}


# ═══════════════════════════════════════════════════════
# API — EXPORTS
# ═══════════════════════════════════════════════════════

@app.get("/export/daily")
def export_daily(class_name: str = Query(..., alias="class"), date: str = Query(...)):
    if db is None:
        return {"error": "MongoDB not connected", "success": False}

    try:
        # Validate date format strictly (YYYY-MM-DD)
        datetime.strptime(date, "%Y-%m-%d")
        file_path = export_daily_attendance(db, class_name, date)
        return FileResponse(
            path=str(file_path),
            filename=file_path.name,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD", "success": False}
    except Exception as e:
        return {"error": str(e), "success": False}


@app.get("/export/monthly")
def export_monthly(class_name: str = Query(..., alias="class"), month: int = Query(...), year: int = Query(...)):
    if db is None:
        return {"error": "MongoDB not connected", "success": False}

    try:
        if month < 1 or month > 12:
            return {"error": "Month must be between 1 and 12", "success": False}
        if year < 2000 or year > 2100:
            return {"error": "Year must be between 2000 and 2100", "success": False}

        file_path = export_monthly_attendance(db, class_name, month, year)
        return FileResponse(
            path=str(file_path),
            filename=file_path.name,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception as e:
        return {"error": str(e), "success": False}


@app.get("/export/files")
def list_export_files(kind: str = "all"):
    try:
        if not EXPORT_DIR.exists():
            return {"files": []}

        files = []
        for p in sorted(EXPORT_DIR.glob("attendance_*.xlsx"), reverse=True):
            name = p.name
            if kind == "daily" and len(name.split("_")) != 2:
                continue
            if kind == "monthly" and len(name.split("_")) != 3:
                continue
            stat = p.stat()
            files.append({
                "filename": name,
                "size": stat.st_size,
                "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            })

        return {"files": files}
    except Exception as e:
        return {"error": str(e), "files": []}


@app.get("/export/download")
def download_export_file(filename: str):
    safe_name = Path(filename).name
    file_path = EXPORT_DIR / safe_name
    if not file_path.exists() or not file_path.is_file() or not safe_name.endswith(".xlsx"):
        return {"error": "File not found", "success": False}

    return FileResponse(
        path=str(file_path),
        filename=safe_name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


# ═══════════════════════════════════════════════════════
# ENTRYPOINT
# ═══════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
