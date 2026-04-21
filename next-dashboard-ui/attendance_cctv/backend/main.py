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
import builtins
import os
import sys
import tempfile
import threading
import time
import uuid
import base64
from pathlib import Path
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime
from typing import List, Optional
from collections import deque
from contextvars import ContextVar
import re

# Third-party
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, Query
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import ObjectId

os.environ.setdefault("PYTHONUTF8", "1")
os.environ.setdefault("PYTHONIOENCODING", "utf-8")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

try:
    from dns import resolver as dns_resolver
except Exception:
    dns_resolver = None

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Load backend env first, then project env, then local overrides.
load_dotenv(dotenv_path=BACKEND_DIR / ".env")
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")
load_dotenv(dotenv_path=PROJECT_ROOT / ".env.local", override=True)

# Local module
from face_engine import FaceEngine
from liveness_engine import LivenessEngine
from attendance_export import export_daily_attendance, export_monthly_attendance, EXPORT_DIR
from storage_backend import AttendanceStorage


def print(*args, **kwargs):
    """Windows-safe logging that falls back to ASCII if the console encoding cannot print emojis."""
    try:
        builtins.print(*args, **kwargs)
    except UnicodeEncodeError:
        safe_args = []
        for arg in args:
            text = str(arg)
            safe_args.append(text.encode("ascii", "replace").decode("ascii"))
        builtins.print(*safe_args, **kwargs)


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


def parse_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def parse_int(value: Optional[str], default: int = 0) -> int:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default


def parse_float(value: Optional[str], default: float = 0.0) -> float:
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return default


def parse_csv(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


# Uploaded-video stability tuning
RECOGNITION_QUEUE_MAXLEN = max(8, parse_int(os.getenv("RECOGNITION_QUEUE_MAXLEN"), default=24))
UPLOAD_SYNC_BACKLOG_TARGET = max(
    1,
    min(
        RECOGNITION_QUEUE_MAXLEN - 1,
        parse_int(os.getenv("UPLOAD_SYNC_BACKLOG_TARGET"), default=2),
    ),
)
UPLOAD_SYNC_WAIT_MAX = max(0.25, parse_float(os.getenv("UPLOAD_SYNC_WAIT_MAX"), default=1.0))
FACE_RETENTION_DAYS = max(
    0,
    parse_int(os.getenv("ATTENDANCE_FACE_RETENTION_DAYS"), default=0),
)


IS_AZURE = any(os.getenv(key) for key in ("WEBSITE_INSTANCE_ID", "WEBSITE_SITE_NAME"))
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT") or os.getenv("WEBSITES_PORT") or "8000")
TMP_UPLOAD_DIR = os.getenv("ATTENDANCE_TMP_DIR") or None
FACE_MODEL_NAME = os.getenv("FACE_MODEL_NAME", "buffalo_l")
CAMERA_ENABLED = parse_bool(os.getenv("ENABLE_CAMERA"), default=not IS_AZURE)
DEFAULT_CAMERA_SOURCE = (os.getenv("CAMERA_SOURCE") or "").strip()
DEFAULT_CAMERA_INDEX = parse_int(os.getenv("CAMERA_INDEX"), default=0)
CAMERA_BACKEND = (os.getenv("CAMERA_BACKEND") or "auto").strip().lower()
CAMERA_OPEN_TIMEOUT_SECONDS = max(
    1.0, parse_float(os.getenv("CAMERA_OPEN_TIMEOUT_SECONDS"), default=8.0)
)
CAMERA_WARMUP_FRAMES = max(
    0, parse_int(os.getenv("CAMERA_WARMUP_FRAMES"), default=10)
)
CAMERA_FRAME_WIDTH = max(
    0, parse_int(os.getenv("CAMERA_FRAME_WIDTH"), default=0)
)
CAMERA_FRAME_HEIGHT = max(
    0, parse_int(os.getenv("CAMERA_FRAME_HEIGHT"), default=0)
)
CAMERA_FPS = max(0.0, parse_float(os.getenv("CAMERA_FPS"), default=0.0))
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
ALLOWED_ORIGINS = parse_csv(os.getenv("ALLOWED_ORIGINS")) or DEFAULT_ALLOWED_ORIGINS
ALLOW_ANY_ORIGIN = "*" in ALLOWED_ORIGINS
ALLOW_CREDENTIALS = parse_bool(os.getenv("ALLOW_CREDENTIALS"), default=not ALLOW_ANY_ORIGIN)
if ALLOW_ANY_ORIGIN and ALLOW_CREDENTIALS:
    print("⚠️ Disabling CORS credentials because ALLOWED_ORIGINS contains '*'.")
    ALLOW_CREDENTIALS = False

DNS_SERVERS = parse_csv(os.getenv("DNS_SERVERS")) or ["8.8.8.8", "1.1.1.1"]
if dns_resolver and DNS_SERVERS:
    try:
        dns_resolver.default_resolver = dns_resolver.Resolver(configure=False)
        dns_resolver.default_resolver.nameservers = DNS_SERVERS
        print(f"Using custom DNS servers: {', '.join(DNS_SERVERS)}")
    except Exception as exc:
        print(f"Failed to apply custom DNS servers: {exc}")


# ═══════════════════════════════════════════════════════
# STORAGE BACKEND
# ═══════════════════════════════════════════════════════

storage_error = None
try:
    storage = AttendanceStorage()
except Exception as exc:
    # Safe fallback for local/dev if cloud config is incomplete.
    storage_error = str(exc)
    print(f"⚠️ Storage backend init failed ({exc}); falling back to filesystem backend.")
    os.environ["ATTENDANCE_STORAGE_BACKEND"] = "filesystem"
    storage = AttendanceStorage()


# ═══════════════════════════════════════════════════════
# DATABASE CONNECTION
# ═══════════════════════════════════════════════════════

db = None
client = None
mongo_error = None

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
    mongo_error = str(e)
    print(f"⚠️ MongoDB not connected: {e}")


# ═══════════════════════════════════════════════════════
# GLOBAL LOCKS
# ═══════════════════════════════════════════════════════

results_lock   = threading.Lock()
faces_lock     = threading.Lock()
analytics_lock = threading.Lock()


# ═══════════════════════════════════════════════════════
# SESSION REGISTRY
# ═══════════════════════════════════════════════════════

SESSION_KEY_CONTEXT: ContextVar[str] = ContextVar("attendance_session_key", default="default")
SESSION_REGISTRY: dict[str, "AttendanceSession"] = {}
SESSION_REGISTRY_LOCK = threading.Lock()


def _normalize_session_key(session_key: Optional[str]) -> str:
    key = str(session_key or "default").strip()
    return key or "default"


@contextmanager
def _session_scope(session_key: Optional[str]):
    token = SESSION_KEY_CONTEXT.set(_normalize_session_key(session_key))
    try:
        yield
    finally:
        SESSION_KEY_CONTEXT.reset(token)


class AttendanceSession:
    def __init__(self):
        self.video_state = {
            "is_running": False,
            "stop_event": threading.Event(),
            "frame_queue": deque(maxlen=180),
            "recognition_queue": deque(maxlen=RECOGNITION_QUEUE_MAXLEN),
            "latest_results": [],
            "current_frame_num": 0,
            "detections": deque(maxlen=1000),
            "video_path": None,
            "temp_video_path": None,
            "source_mode": "idle",
            "camera_source": None,
            "camera_backend": None,
            "last_error": None,
        }
        self.video_analytics = {
            "total_frames": 0, "processed_frames": 0,
            "faces_detected": 0, "matched_faces": 0, "unknown_faces": 0,
            "scores": [], "fps": 0, "video_duration": 0,
            "start_time": None, "processing_time": 0,
        }
        self.extracted_faces = {"faces": [], "max_faces": 48}
        self.attendance_tracker = SlidingWindowTracker()
        self.bbox_smoother = BoundingBoxSmoother()
        self.browser_liveness_engine = LivenessEngine()


def _get_session(session_key: Optional[str] = None) -> AttendanceSession:
    key = _normalize_session_key(session_key or SESSION_KEY_CONTEXT.get())
    with SESSION_REGISTRY_LOCK:
        session = SESSION_REGISTRY.get(key)
        if session is None:
            session = AttendanceSession()
            SESSION_REGISTRY[key] = session
        return session


class SessionDictProxy:
    def __init__(self, attr_name: str):
        self._attr_name = attr_name

    def _target(self):
        return getattr(_get_session(), self._attr_name)

    def __getitem__(self, key):
        return self._target()[key]

    def __setitem__(self, key, value):
        self._target()[key] = value

    def __delitem__(self, key):
        del self._target()[key]

    def __contains__(self, key):
        return key in self._target()

    def __len__(self):
        return len(self._target())

    def __iter__(self):
        return iter(self._target())

    def get(self, key, default=None):
        return self._target().get(key, default)

    def update(self, *args, **kwargs):
        return self._target().update(*args, **kwargs)

    def clear(self):
        return self._target().clear()

    def setdefault(self, *args, **kwargs):
        return self._target().setdefault(*args, **kwargs)

    def keys(self):
        return self._target().keys()

    def values(self):
        return self._target().values()

    def items(self):
        return self._target().items()


class SessionObjectProxy:
    def __init__(self, attr_name: str):
        self._attr_name = attr_name

    def _target(self):
        return getattr(_get_session(), self._attr_name)

    def __getattr__(self, item):
        return getattr(self._target(), item)

    def __setattr__(self, key, value):
        if key.startswith("_"):
            object.__setattr__(self, key, value)
        else:
            setattr(self._target(), key, value)


video_state = SessionDictProxy("video_state")
video_analytics = SessionDictProxy("video_analytics")
extracted_faces = SessionDictProxy("extracted_faces")
attendance_tracker = SessionObjectProxy("attendance_tracker")
bbox_smoother = SessionObjectProxy("bbox_smoother")


def _current_browser_liveness_engine():
    return _get_session().browser_liveness_engine


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
        self.tracked: dict = {}  # track_key -> {"bbox": [x1,y1,x2,y2], "last_frame": int}

    def smooth(self, track_key: str, raw_bbox: tuple, frame_num: int) -> tuple:
        """Apply EMA smoothing. Called ONCE per box per frame."""
        with self._lock:
            x1, y1, x2, y2 = raw_bbox

            if track_key not in self.tracked:
                self.tracked[track_key] = {
                    "bbox": [float(x1), float(y1), float(x2), float(y2)],
                    "last_frame": frame_num
                }
                return raw_bbox

            prev = self.tracked[track_key]
            cx_new = (x1 + x2) / 2
            cy_new = (y1 + y2) / 2
            cx_old = (prev["bbox"][0] + prev["bbox"][2]) / 2
            cy_old = (prev["bbox"][1] + prev["bbox"][3]) / 2
            dist2 = (cx_new - cx_old) ** 2 + (cy_new - cy_old) ** 2

            # Reset on large jump or stale box
            if dist2 > self.max_jump ** 2 or frame_num - prev["last_frame"] > BOX_TTL:
                self.tracked[track_key] = {
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
            self.tracked[track_key] = {"bbox": s, "last_frame": frame_num}
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


def _persist_face_sample(student_id: str, filename: str, image_bytes: bytes, embedding: np.ndarray):
    return storage.save_sample(student_id, filename, image_bytes, embedding)


def _build_signed_face_url(image_ref: Optional[str]):
    return storage.build_image_url_from_ref(image_ref)


def _remove_face_file_if_exists(ref_value: Optional[str]):
    if not ref_value:
        return
    storage.delete_ref(ref_value)


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
        student_id = r.get("student_id")

        # Skip invalid boxes early; avoids drawing failures on malformed detections.
        if raw_x2 <= raw_x1 or raw_y2 <= raw_y1:
            continue

        # Use a per-face key for smoothing.
        # Root-cause fix: using only `name` caused all "Unknown"/"Spoof" detections
        # to share one track, blending boxes across different faces.
        if student_id:
            track_key = f"id:{student_id}"
        else:
            cx = (raw_x1 + raw_x2) / 2
            cy = (raw_y1 + raw_y2) / 2
            track_key = f"{base_name}@{int(cx // 80)}x{int(cy // 80)}"

        # Single smooth call — convert original coords to smoothed original coords
        smoothed = bbox_smoother.smooth(
            track_key, (raw_x1, raw_y1, raw_x2, raw_y2), current_frame
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

        # Uploaded videos prioritize accuracy/stability over raw playback speed.
        # Hold playback when recognition lags so sampled frames are not dropped.
        upload_sync_backlog = UPLOAD_SYNC_BACKLOG_TARGET
        upload_sync_wait_max = UPLOAD_SYNC_WAIT_MAX
        backlog_waited = 0.0
        while (len(video_state["recognition_queue"]) >= upload_sync_backlog
               and not video_state["stop_event"].is_set()
               and backlog_waited < upload_sync_wait_max):
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
        # Backlog wait already consumed wall-clock time above; don't add it again
        # here or playback gets noticeably slower than intended.
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
    if video_state.get("temp_video_path") == video_path:
        _cleanup_temp_video(video_path)
        video_state["temp_video_path"] = None
    if video_state.get("video_path") == video_path:
        video_state["video_path"] = None
    print(f"🎬 Playback done: {frame_number} frames")


def camera_playback_thread(camera_source, draw_boxes_func, preferred_backend: Optional[str] = None):
    """
    Reads frames from a live camera, draws latest boxes, and pushes encoded JPEGs.
    """
    cap, backend_name, open_error = _open_camera_capture(
        camera_source,
        forced_backend=preferred_backend,
    )
    camera_label = _camera_source_label(camera_source)
    video_state["camera_source"] = camera_label
    video_state["camera_backend"] = backend_name

    if cap is None:
        video_state["last_error"] = open_error
        print(f"❌ Failed to open camera source {camera_label}: {open_error}")
        video_state["is_running"] = False
        video_state["stop_event"].set()
        return

    video_state["last_error"] = None
    fps_raw = cap.get(cv2.CAP_PROP_FPS)
    fps = min(fps_raw if fps_raw and fps_raw > 0 else 20, 20)
    frame_delay = 1.0 / fps
    orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or RECOG_WIDTH
    orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or RECOG_HEIGHT
    print(
        f"📷 Camera {camera_label} opened via {backend_name or 'any'} "
        f"at {orig_w}x{orig_h} @ {fps:.1f} FPS"
    )

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
    video_state["video_path"] = None
    video_state["camera_source"] = None
    video_state["camera_backend"] = None
    print(f"📷 Camera stopped after {frame_number} frames")


# ═══════════════════════════════════════════════════════
# STREAM FRAMES
# ═══════════════════════════════════════════════════════

def stream_frames(session_key: Optional[str] = None):
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

    token = SESSION_KEY_CONTEXT.set(_normalize_session_key(session_key or SESSION_KEY_CONTEXT.get()))
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
    finally:
        SESSION_KEY_CONTEXT.reset(token)


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
            source_mode = video_state_dict.get("source_mode", "idle")
            # For live streams, process the freshest frame to keep latency low.
            # For uploaded videos, keep FIFO order for stable multi-frame confirmation.
            if source_mode != "upload":
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

            # Keep original recognition frame index. Rebasing to playback frame
            # causes temporal drift where boxes are drawn on a different face.
            reference_frame = frame_num

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
                if reference_frame - old_seen > BOX_TTL:
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
                      f"kept at recog-frame index")

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
    _stop_and_clear()
    if client is not None:
        client.close()


# ═══════════════════════════════════════════════════════
# APP INITIALIZATION
# ═══════════════════════════════════════════════════════

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════
# GLOBAL INSTANCES
# ═══════════════════════════════════════════════════════

engine = None
engine_error = None

try:
    engine = FaceEngine(db=db, model_name=FACE_MODEL_NAME)
except Exception as e:
    engine_error = str(e)
    print(f"⚠️ Face engine not ready: {e}")

attendance_tracker = SlidingWindowTracker()
bbox_smoother = BoundingBoxSmoother()


# ═══════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════

def _embedding_count():
    if engine is None or engine.known_embeddings is None:
        return 0
    return len(engine.known_embeddings)


def _student_count():
    if engine is None:
        return 0
    return engine.student_count


def _student_names():
    if engine is None:
        return []
    return list(set(engine.known_names))


def _service_ready():
    return db is not None and engine is not None and engine_error is None


def _processing_not_ready_response():
    issues = []
    if db is None:
        issues.append("MongoDB is not connected")
    if engine is None:
        issues.append("Face engine is not ready")

    message = ". ".join(issues) if issues else "Attendance backend is not ready"
    if engine_error:
        message = f"{message}. Engine error: {engine_error}"

    return JSONResponse(
        {
            "success": False,
            "error": message,
        },
        status_code=503,
    )


def _cleanup_expired_face_samples(retention_days: int):
    if retention_days <= 0 or db is None:
        return {"checked": 0, "deleted": 0, "records_updated": 0}

    cutoff = datetime.utcnow().timestamp() - (retention_days * 86400)
    records = list(db["facial_database"].find({}, {"embeddings": 1, "student_id": 1}))
    checked = 0
    deleted = 0
    records_updated = 0

    for record in records:
        embeddings = record.get("embeddings", []) or []
        kept = []
        removed_any = False

        for item in embeddings:
            checked += 1
            uploaded_at = item.get("uploaded_at")
            if isinstance(uploaded_at, datetime):
                ts = uploaded_at.timestamp()
            else:
                ts = datetime.utcnow().timestamp()

            if ts < cutoff:
                _remove_face_file_if_exists(item.get("embedding_file"))
                _remove_face_file_if_exists(item.get("image_file"))
                deleted += 1
                removed_any = True
            else:
                kept.append(item)

        if removed_any:
            records_updated += 1
            preview_path = record.get("preview_image_path")
            if preview_path and not any(x.get("image_file") == preview_path for x in kept):
                preview_path = kept[0].get("image_file") if kept else None

            db["facial_database"].update_one(
                {"_id": record["_id"]},
                {
                    "$set": {
                        "embeddings": kept,
                        "number_of_samples": len(kept),
                        "preview_image_path": preview_path,
                        "preview_image_url": _build_signed_face_url(preview_path) if preview_path else None,
                        "last_updated": datetime.now(),
                    }
                },
            )

    return {"checked": checked, "deleted": deleted, "records_updated": records_updated}


def _reset_video_analytics():
    with analytics_lock:
        video_analytics.update({
            "total_frames": 0,
            "processed_frames": 0,
            "faces_detected": 0,
            "matched_faces": 0,
            "unknown_faces": 0,
            "scores": [],
            "fps": 0,
            "video_duration": 0,
            "start_time": None,
            "processing_time": 0,
        })


def _cleanup_temp_video(path_to_remove: Optional[str]):
    if not path_to_remove:
        return
    try:
        if os.path.exists(path_to_remove):
            os.remove(path_to_remove)
            print(f"🧹 Removed temp video: {path_to_remove}")
    except OSError as exc:
        print(f"⚠️ Failed to remove temp video {path_to_remove}: {exc}")


def _normalize_camera_source(camera_index: Optional[int] = None,
                             camera_source: Optional[str] = None):
    raw_source = camera_source
    if raw_source is None or not str(raw_source).strip():
        raw_source = DEFAULT_CAMERA_SOURCE

    if raw_source and str(raw_source).strip():
        raw_source = str(raw_source).strip()
        if raw_source.lstrip("-").isdigit():
            return int(raw_source)
        return raw_source

    if camera_index is not None:
        return camera_index

    return DEFAULT_CAMERA_INDEX


def _camera_source_label(camera_source) -> str:
    return str(camera_source)


def _camera_backend_candidates(camera_source, forced_backend: Optional[str] = None):
    backend_map = {
        "any": getattr(cv2, "CAP_ANY", None),
        "dshow": getattr(cv2, "CAP_DSHOW", None),
        "msmf": getattr(cv2, "CAP_MSMF", None),
        "v4l2": getattr(cv2, "CAP_V4L2", None),
        "ffmpeg": getattr(cv2, "CAP_FFMPEG", None),
        "gstreamer": getattr(cv2, "CAP_GSTREAMER", None),
    }

    preferred = (forced_backend or CAMERA_BACKEND or "auto").lower()
    if preferred != "auto":
        names = [preferred, "any"]
    elif isinstance(camera_source, str) and "://" in camera_source:
        names = ["ffmpeg", "gstreamer", "any"]
    elif os.name == "nt":
        names = ["dshow", "msmf", "any"]
    else:
        names = ["v4l2", "any"]

    candidates = []
    seen = set()
    for name in names:
        backend_id = backend_map.get(name)
        if backend_id is None or name in seen:
            continue
        seen.add(name)
        candidates.append((name, backend_id))

    if not candidates:
        candidates.append(("any", cv2.CAP_ANY))

    return candidates


def _apply_camera_preferences(cap):
    if CAMERA_FRAME_WIDTH > 0:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_FRAME_WIDTH)
    if CAMERA_FRAME_HEIGHT > 0:
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_FRAME_HEIGHT)
    if CAMERA_FPS > 0:
        cap.set(cv2.CAP_PROP_FPS, CAMERA_FPS)


def _open_camera_capture(camera_source, forced_backend: Optional[str] = None):
    errors = []

    for backend_name, backend_id in _camera_backend_candidates(camera_source, forced_backend):
        cap = None
        try:
            cap = cv2.VideoCapture(camera_source, backend_id)
        except Exception as exc:
            errors.append(f"{backend_name}: {exc}")
            continue

        if not cap or not cap.isOpened():
            if cap is not None:
                cap.release()
            errors.append(f"{backend_name}: open failed")
            continue

        _apply_camera_preferences(cap)

        deadline = time.time() + CAMERA_OPEN_TIMEOUT_SECONDS
        received_frame = False
        while time.time() < deadline:
            ok, frame = cap.read()
            if ok and frame is not None and frame.size > 0:
                received_frame = True
                break
            time.sleep(0.1)

        if not received_frame:
            cap.release()
            errors.append(
                f"{backend_name}: no frames received within {CAMERA_OPEN_TIMEOUT_SECONDS:.1f}s"
            )
            continue

        for _ in range(CAMERA_WARMUP_FRAMES):
            ok, frame = cap.read()
            if not ok or frame is None or frame.size == 0:
                break

        return cap, backend_name, None

    if not errors:
        errors.append("camera open failed")
    return None, None, "; ".join(errors)


def _save_attendance_wrapper(name: str, student_id):
    save_attendance(db, name, student_id)


def _extract_face_wrapper(frame, bbox, name, student_id, score, frame_num, is_confirmed):
    extract_and_store_face(frame, bbox, name, student_id, score, frame_num, is_confirmed,
                           extracted_faces, faces_lock)


def _draw_boxes_wrapper(frame, results, orig_w, orig_h, current_frame):
    return draw_boxes(frame, results, orig_w, orig_h, current_frame, bbox_smoother)


def _start_processing_threads(playback_target, playback_args):
    session_key = _normalize_session_key(SESSION_KEY_CONTEXT.get())

    def run_in_session(target, args):
        token = SESSION_KEY_CONTEXT.set(session_key)
        try:
            target(*args)
        finally:
            SESSION_KEY_CONTEXT.reset(token)

    threading.Thread(target=run_in_session, args=(playback_target, playback_args), daemon=True).start()
    threading.Thread(target=run_in_session, args=(
        recognition_thread, (
            video_state, video_analytics, analytics_lock, results_lock,
            engine, attendance_tracker, _save_attendance_wrapper, _extract_face_wrapper
        )
    ), daemon=True).start()


def _stop_and_clear():
    temp_video_path = video_state.get("temp_video_path")
    was_running = video_state["is_running"]

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
    if temp_video_path and not was_running:
        _cleanup_temp_video(temp_video_path)
        video_state["temp_video_path"] = None
    video_state["source_mode"] = "idle"
    if not was_running:
        video_state["video_path"] = None
        video_state["camera_source"] = None
        video_state["camera_backend"] = None
    video_state["last_error"] = None
    time.sleep(0.3)


def _prepare_browser_camera_session():
    session = _get_session()

    _stop_and_clear()
    session.browser_liveness_engine = LivenessEngine()

    video_state["stop_event"].clear()
    video_state["is_running"] = True
    video_state["video_path"] = "browser-camera"
    video_state["temp_video_path"] = None
    video_state["source_mode"] = "browser"
    video_state["camera_source"] = "browser"
    video_state["camera_backend"] = "browser"
    video_state["current_frame_num"] = 0
    video_state["last_error"] = None
    _reset_video_analytics()


def _process_browser_frame(frame: np.ndarray, frame_num: int):
    if engine is None:
        raise RuntimeError("Face engine is not ready")

    browser_liveness_engine = _current_browser_liveness_engine()

    orig_h, orig_w = frame.shape[:2]
    small = cv2.resize(frame, (RECOG_WIDTH, RECOG_HEIGHT))
    sx = orig_w / RECOG_WIDTH
    sy = orig_h / RECOG_HEIGHT

    with analytics_lock:
        if video_analytics["start_time"] is None:
            video_analytics["start_time"] = time.time()
        video_analytics["total_frames"] += 1
        video_analytics["processed_frames"] += 1

    raw_results = engine.recognize(small, threshold=RECOG_THRESHOLD)

    with analytics_lock:
        video_analytics["faces_detected"] += len(raw_results)

    scaled_results = []
    frame_detections = []

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

        is_live = browser_liveness_engine.check_liveness(face_crop, face_id)
        if not is_live:
            orig_bbox = (
                int(bbox[0] * sx),
                int(bbox[1] * sy),
                int(bbox[2] * sx),
                int(bbox[3] * sy),
            )
            if orig_bbox[2] <= orig_bbox[0] or orig_bbox[3] <= orig_bbox[1]:
                continue

            scaled_results.append({
                "bbox": orig_bbox,
                "name": "Spoof",
                "student_id": None,
                "detected_at_frame": frame_num,
            })
            video_state["detections"].append({
                "name": "Spoof",
                "student_name": "Spoof",
                "student_id": None,
                "timestamp": datetime.now().isoformat(),
                "frame_num": frame_num,
            })
            with analytics_lock:
                video_analytics["unknown_faces"] += 1
            _extract_face_wrapper(frame, orig_bbox, "Spoof", None, 0.0, frame_num, False)
            frame_detections.append({
                "bbox": list(orig_bbox),
                "name": "Spoof",
                "student_name": "Spoof",
                "student_id": None,
                "score": 0.0,
                "confirmed": False,
            })
            continue

        is_confirmed = False
        resolved_name = name
        student_id_value = str(student_id) if student_id else None

        if name != "Unknown" and student_id:
            sid = str(student_id)
            resolved_name = _resolve_student_name(db, student_id, name)
            should_save = attendance_tracker.add_detection(sid, frame_num, score)
            is_confirmed = attendance_tracker.is_confirmed(sid)
            with analytics_lock:
                video_analytics["matched_faces"] += 1
                video_analytics["scores"].append(float(score))
            if should_save:
                _save_attendance_wrapper(resolved_name, student_id)
        else:
            with analytics_lock:
                video_analytics["unknown_faces"] += 1

        orig_bbox = (
            int(bbox[0] * sx),
            int(bbox[1] * sy),
            int(bbox[2] * sx),
            int(bbox[3] * sy),
        )
        if orig_bbox[2] <= orig_bbox[0] or orig_bbox[3] <= orig_bbox[1]:
            continue

        scaled_results.append({
            "bbox": orig_bbox,
            "name": resolved_name,
            "student_id": student_id_value,
            "detected_at_frame": frame_num,
        })
        video_state["detections"].append({
            "name": resolved_name,
            "student_name": resolved_name,
            "student_id": student_id_value,
            "timestamp": datetime.now().isoformat(),
            "frame_num": frame_num,
            "score": round(float(score), 3),
            "confirmed": is_confirmed,
        })
        _extract_face_wrapper(
            frame,
            orig_bbox,
            resolved_name,
            student_id,
            score,
            frame_num,
            is_confirmed,
        )
        frame_detections.append({
            "bbox": list(orig_bbox),
            "name": resolved_name,
            "student_name": resolved_name,
            "student_id": student_id_value,
            "score": round(float(score), 3),
            "confirmed": is_confirmed,
        })

    with results_lock:
        video_state["latest_results"] = scaled_results

    with analytics_lock:
        t0 = video_analytics["start_time"]
        video_analytics["processing_time"] = time.time() - t0 if t0 else 0

    return frame_detections


@app.get("/health")
def health_check():
    payload = {
        "status": "ok" if _service_ready() else "degraded",
        "ready": _service_ready(),
        "mongodb_connected": db is not None,
        "mongo_error": mongo_error,
        "face_engine_ready": engine is not None and engine_error is None,
        "face_engine_error": engine_error,
        "camera_enabled": CAMERA_ENABLED,
        "camera_default_source": _camera_source_label(_normalize_camera_source()),
        "camera_backend_setting": CAMERA_BACKEND,
        "camera_source_active": video_state["camera_source"],
        "camera_backend_active": video_state["camera_backend"],
        "camera_last_error": video_state["last_error"],
        "azure_detected": IS_AZURE,
        "embeddings_loaded": _embedding_count(),
        "is_processing": video_state["is_running"],
    }
    return JSONResponse(payload, status_code=200 if payload["ready"] else 503)


# ═══════════════════════════════════════════════════════
# API — VIDEO STREAMING
# ═══════════════════════════════════════════════════════

@app.get("/video-stream-processed")
def video_stream_processed(sessionKey: str = Query("default", alias="sessionKey")):
    return StreamingResponse(
        stream_frames(sessionKey),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/video")
def video_stream_live_alias(sessionKey: str = Query("default", alias="sessionKey")):
    # Frontend live tab expects /video; keep it as an alias to the processed stream.
    return StreamingResponse(
        stream_frames(sessionKey),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# ═══════════════════════════════════════════════════════
# API — VIDEO PROCESSING
# ═══════════════════════════════════════════════════════

@app.post("/process-video")
async def process_video(video: UploadFile = File(...), sessionKey: str = Query("default", alias="sessionKey")):
    with _session_scope(sessionKey):
        if not _service_ready():
            return _processing_not_ready_response()

        _stop_and_clear()

        temp_file_kwargs = {
            "delete": False,
            "suffix": ".mp4",
            "prefix": "attendance-upload-",
        }
        if TMP_UPLOAD_DIR:
            temp_file_kwargs["dir"] = TMP_UPLOAD_DIR

        with tempfile.NamedTemporaryFile(**temp_file_kwargs) as tmp:
            tmp.write(await video.read())
            tmp_path = tmp.name

        video_state["video_path"] = tmp_path
        video_state["temp_video_path"] = tmp_path
        video_state["source_mode"] = "upload"
        video_state["stop_event"].clear()
        video_state["is_running"] = True
        _reset_video_analytics()

        _start_processing_threads(playback_thread, (tmp_path, _draw_boxes_wrapper))
        return {"success": True}


@app.post("/start-camera")
def start_camera(camera_index: Optional[int] = None, camera_source: Optional[str] = None, sessionKey: str = Query("default", alias="sessionKey")):
    with _session_scope(sessionKey):
        if not CAMERA_ENABLED:
            return JSONResponse(
                {
                    "success": False,
                    "error": "Live camera mode is disabled for this deployment. Set ENABLE_CAMERA=true on the machine that should open the camera.",
                },
                status_code=400,
            )

        if not _service_ready():
            return _processing_not_ready_response()

        _stop_and_clear()

        resolved_camera_source = _normalize_camera_source(
            camera_index=camera_index,
            camera_source=camera_source,
        )
        source_label = _camera_source_label(resolved_camera_source)

        test_cap, backend_name, open_error = _open_camera_capture(resolved_camera_source)
        if test_cap is None:
            video_state["camera_source"] = source_label
            video_state["camera_backend"] = backend_name
            video_state["last_error"] = open_error
            return {
                "success": False,
                "error": f"Camera source {source_label} not accessible. {open_error}",
            }

        test_cap.release()

        video_state["video_path"] = f"camera:{source_label}"
        video_state["temp_video_path"] = None
        video_state["source_mode"] = "camera"
        video_state["stop_event"].clear()
        video_state["is_running"] = True
        video_state["camera_source"] = source_label
        video_state["camera_backend"] = backend_name
        video_state["last_error"] = None
        _reset_video_analytics()

        _start_processing_threads(
            camera_playback_thread,
            (resolved_camera_source, _draw_boxes_wrapper, backend_name),
        )
        return {
            "success": True,
            "camera_source": source_label,
            "camera_backend": backend_name,
        }


@app.post("/start-browser-camera")
def start_browser_camera(sessionKey: str = Query("default", alias="sessionKey")):
    with _session_scope(sessionKey):
        if not _service_ready():
            return _processing_not_ready_response()

        _prepare_browser_camera_session()
        return {
            "success": True,
            "camera_source": "browser",
            "camera_backend": "browser",
        }


@app.post("/process-browser-frame")
async def process_browser_frame(file: UploadFile = File(...), sessionKey: str = Query("default", alias="sessionKey")):
    with _session_scope(sessionKey):
        if not _service_ready():
            return _processing_not_ready_response()

        if not video_state["is_running"] or video_state.get("camera_source") != "browser":
            return JSONResponse(
                {
                    "success": False,
                    "error": "Browser camera session is not active. Call /start-browser-camera first.",
                },
                status_code=400,
            )

        image = decode_image(await file.read())
        if image is None:
            return JSONResponse(
                {
                    "success": False,
                    "error": "Could not decode browser camera frame.",
                },
                status_code=400,
            )

        frame_num = int(video_state.get("current_frame_num", 0)) + 1
        video_state["current_frame_num"] = frame_num

        try:
            detections = _process_browser_frame(image, frame_num)
        except Exception as exc:
            video_state["last_error"] = str(exc)
            return JSONResponse(
                {
                    "success": False,
                    "error": f"Browser frame processing failed: {exc}",
                },
                status_code=500,
            )

        return {
            "success": True,
            "frame_num": frame_num,
            "frame_width": int(image.shape[1]),
            "frame_height": int(image.shape[0]),
            "detections": detections,
            "confirmed": attendance_tracker.get_status()["confirmed"],
        }


@app.post("/stop-camera")
def stop_camera(sessionKey: str = Query("default", alias="sessionKey")):
    with _session_scope(sessionKey):
        _stop_and_clear()
        return {"success": True}


@app.post("/stop-processing")
def stop_processing(sessionKey: str = Query("default", alias="sessionKey")):
    with _session_scope(sessionKey):
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
def get_video_detections(sessionKey: str = Query("default", alias="sessionKey")):
    with _session_scope(sessionKey):
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
    if db is None or engine is None:
        return _processing_not_ready_response()

    embeddings_created = 0
    files_processed = 0
    errors = []
    image_urls = []

    for file in files:
        try:
            file_bytes = await file.read()
            img = decode_image(file_bytes)
            if img is None:
                errors.append(f"Cannot decode {file.filename}"); continue
            files_processed += 1
            faces = engine.app.get(img)
            if not faces:
                errors.append(f"No face in {file.filename}"); continue
            face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))
            persisted = _persist_face_sample(
                student_id=student_id,
                filename=file.filename or "sample.jpg",
                image_bytes=file_bytes,
                embedding=face.embedding,
            )
            signed_url = persisted["image_url"]
            db["facial_database"].update_one(
                {"student_id": student_id},
                {"$push": {"embeddings": {
                    "filename": file.filename,
                    "image_url": signed_url,
                    "image_file": persisted["image_ref"],
                    "embedding_file": persisted["embedding_ref"],
                    "image_sha256": persisted["image_sha256"],
                    "uploaded_at": datetime.now(),
                }},
                 "$set": {
                    "last_updated": datetime.now(),
                    "preview_image_url": signed_url,
                    "preview_image_path": persisted["image_ref"],
                 },
                 "$inc": {"number_of_samples": 1}},
                upsert=True,
            )
            image_urls.append(signed_url)
            embeddings_created += 1
        except Exception as e:
            errors.append(f"Error on {file.filename}: {e}")

    if embeddings_created > 0:
        engine.load_embeddings_from_db(db)

    return {"success": True, "files_processed": files_processed,
            "embeddings_created": embeddings_created,
            "total_embeddings_in_memory": _embedding_count(),
            "image_urls": image_urls,
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
    faces = []
    try:
        records = list(db["facial_database"].find())
        students_coll = db.get_collection("students")
        for record in records:
            student_id = record.get("student_id")
            embeddings = record.get("embeddings", [])
            num_samples = len(embeddings) or record.get("number_of_samples", 0)
            image_url = record.get("preview_image_url") or next(
                (item.get("image_url") for item in embeddings if item.get("image_url")),
                None,
            )
            if not image_url:
                preview_path = record.get("preview_image_path") or next(
                    (item.get("image_file") for item in embeddings if item.get("image_file")),
                    None,
                )
                if preview_path:
                    image_url = _build_signed_face_url(preview_path)
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


@app.get("/secure-face-image")
def get_secure_face_image(path: str, exp: int, sig: str):
    if not storage.verify_local_signature(path, int(exp), str(sig)):
        return JSONResponse({"error": "Invalid signature"}, status_code=403)

    try:
        abs_path = storage.resolve_local_file(path)
    except Exception:
        return JSONResponse({"error": "Invalid path"}, status_code=400)

    if not abs_path.exists() or not abs_path.is_file():
        return JSONResponse({"error": "File not found"}, status_code=404)

    return FileResponse(str(abs_path))


@app.post("/test-recognition")
async def test_recognition(file: UploadFile = File(...)):
    if engine is None:
        return _processing_not_ready_response()

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
def get_analytics(sessionKey: str = Query("default", alias="sessionKey")):
    with _session_scope(sessionKey):
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
def get_extracted_faces(sessionKey: str = Query("default", alias="sessionKey")):
    with _session_scope(sessionKey):
        with faces_lock:
            return {
                "faces": list(extracted_faces["faces"]),
                "total": len(extracted_faces["faces"]),
                "is_processing": video_state["is_running"],
            }


@app.post("/clear-extracted-faces")
def clear_extracted_faces_ep(sessionKey: str = Query("default", alias="sessionKey")):
    with _session_scope(sessionKey):
        with faces_lock:
            extracted_faces["faces"] = []
        return {"success": True}


@app.get("/debug")
def debug_status(sessionKey: str = Query("default", alias="sessionKey")):
    with _session_scope(sessionKey):
        multiframe_config = {"window": SLIDING_WINDOW_SIZE, "min": MIN_CONFIRMATIONS}
        return {
            "ready": _service_ready(),
            "mongodb_connected": db is not None,
            "mongo_error": mongo_error,
            "storage_backend": storage.cfg.backend,
            "storage_error": storage_error,
            "face_engine_ready": engine is not None and engine_error is None,
            "face_engine_error": engine_error,
            "embeddings_loaded": _embedding_count(),
            "unique_students": _student_count(),
            "student_names": _student_names(),
            "is_processing": video_state["is_running"],
            "frame_queue_size": len(video_state["frame_queue"]),
            "recognition_queue_size": len(video_state["recognition_queue"]),
            "model": FACE_MODEL_NAME,
            "threshold": RECOG_THRESHOLD,
            "camera_enabled": CAMERA_ENABLED,
            "camera_default_source": _camera_source_label(_normalize_camera_source()),
            "camera_backend_setting": CAMERA_BACKEND,
            "camera_backend_active": video_state["camera_backend"],
            "camera_source_active": video_state["camera_source"],
            "camera_last_error": video_state["last_error"],
            "camera_open_timeout_seconds": CAMERA_OPEN_TIMEOUT_SECONDS,
            "camera_warmup_frames": CAMERA_WARMUP_FRAMES,
            "azure_detected": IS_AZURE,
            "multiframe": multiframe_config,
            "multiframe_config": {
                "window_size": SLIDING_WINDOW_SIZE,
                "min_confirmations": MIN_CONFIRMATIONS,
            },
        }


@app.get("/tracker-status")
def tracker_status(sessionKey: str = Query("default", alias="sessionKey")):
    with _session_scope(sessionKey):
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
def reload_embeddings(sessionKey: str = Query("default", alias="sessionKey")):
    with _session_scope(sessionKey):
        if db is None or engine is None:
            return _processing_not_ready_response()
        engine.load_embeddings_from_db(db)
        return {"success": True, "embeddings_loaded": _embedding_count(),
                "unique_students": _student_count()}


@app.post("/maintenance/prune-facial-data")
def prune_facial_data(retentionDays: Optional[int] = Query(None, alias="retentionDays")):
    if db is None:
        return _processing_not_ready_response()

    days = FACE_RETENTION_DAYS if retentionDays is None else max(0, int(retentionDays))
    summary = _cleanup_expired_face_samples(days)

    if engine is not None:
        engine.load_embeddings_from_db(db)

    return {
        "success": True,
        "retention_days": days,
        **summary,
        "embeddings_loaded": _embedding_count(),
    }


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
        monthly_pattern = re.compile(r"^attendance_.+_\d{4}_\d{2}\.xlsx$")
        daily_pattern = re.compile(r"^attendance_.+_\d{4}-\d{2}-\d{2}\.xlsx$")
        for p in sorted(EXPORT_DIR.glob("attendance_*.xlsx"), reverse=True):
            name = p.name
            if kind == "daily" and not daily_pattern.match(name):
                continue
            if kind == "monthly" and not monthly_pattern.match(name):
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
    uvicorn.run(app, host=HOST, port=PORT)
