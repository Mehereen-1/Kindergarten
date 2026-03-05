from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import cv2
import numpy as np
from datetime import datetime
from face_engine import FaceEngine
import os
import tempfile
from pymongo import MongoClient
from bson import ObjectId
from typing import List, Optional
from dotenv import load_dotenv
import threading
from collections import deque
import time

# =========================
# LIFESPAN
# =========================

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting...")
    yield
    print("🛑 Shutting down...")
    video_state["stop_event"].set()

app = FastAPI(lifespan=lifespan)

# =========================
# CONFIG
# =========================

DISPLAY_WIDTH   = 854
DISPLAY_HEIGHT  = 480
RECOG_WIDTH     = 640
RECOG_HEIGHT    = 480
PROCESS_EVERY_N = 4       # run recognition every Nth frame
JPEG_QUALITY    = 65
RECOG_THRESHOLD = 0.4

# How many display frames to keep a box visible after the last recognition.
# At 30 FPS with recognition every 4 frames, recognition fires ~7x/sec.
# BOX_TTL = 12 means boxes stay visible for ~0.4s between updates.
BOX_TTL = 12

# Multi-frame confirmation config
SLIDING_WINDOW_SIZE = 20    # number of recent frames to consider
MIN_CONFIRMATIONS = 5       # minimum detections needed within window
CONFIRMATION_THRESHOLD = 0.4  # higher threshold for reliable recognition

# =========================
# SLIDING WINDOW TRACKER
# =========================

class SlidingWindowTracker:
    """
    Tracks student detections over a sliding window of frames.
    Only confirms attendance when a student is detected MIN_CONFIRMATIONS
    times within the last SLIDING_WINDOW_SIZE frames.
    """
    def __init__(self, window_size: int = SLIDING_WINDOW_SIZE, 
                 min_confirmations: int = MIN_CONFIRMATIONS):
        self.window_size = window_size
        self.min_confirmations = min_confirmations
        # Per-student tracking: student_id -> deque of (frame_num, score)
        self.detections: dict[str, deque] = {}
        # Already confirmed this session
        self.confirmed_this_session: set = set()
        self._lock = threading.Lock()
    
    def add_detection(self, student_id: str, frame_num: int, score: float) -> bool:
        """
        Add a detection and return True if attendance should be confirmed.
        Returns False if already confirmed or not enough detections yet.
        """
        with self._lock:
            if student_id in self.confirmed_this_session:
                return False
            
            if student_id not in self.detections:
                self.detections[student_id] = deque(maxlen=self.window_size)
            
            self.detections[student_id].append((frame_num, score))
            
            # Count detections within the window
            count = len([d for d in self.detections[student_id] 
                        if frame_num - d[0] <= self.window_size])
            
            if count >= self.min_confirmations:
                self.confirmed_this_session.add(student_id)
                print(f"✅ CONFIRMED: {student_id} ({count}/{self.min_confirmations} in window)")
                return True
            
            return False
    
    def get_pending_count(self, student_id: str, current_frame: int) -> int:
        """Get current detection count for a student within the window."""
        with self._lock:
            if student_id not in self.detections:
                return 0
            return len([d for d in self.detections[student_id] 
                       if current_frame - d[0] <= self.window_size])
    
    def is_confirmed(self, student_id: str) -> bool:
        """Check if student has been confirmed this session."""
        with self._lock:
            return student_id in self.confirmed_this_session
    
    def reset(self):
        """Reset tracker for new video session."""
        with self._lock:
            self.detections.clear()
            self.confirmed_this_session.clear()
    
    def get_status(self) -> dict:
        """Get tracker status for debugging."""
        with self._lock:
            return {
                "confirmed": list(self.confirmed_this_session),
                "pending": {k: len(v) for k, v in self.detections.items() 
                          if k not in self.confirmed_this_session}
            }

# Global tracker instance
attendance_tracker = SlidingWindowTracker()

# =========================
# STATE
# =========================

results_lock = threading.Lock()
faces_lock = threading.Lock()
analytics_lock = threading.Lock()

video_state = {
    "is_running":        False,
    "stop_event":        threading.Event(),
    # Each item: (frame_bytes, frame_number)
    "frame_queue":       deque(maxlen=120),
    "recognition_queue": deque(maxlen=5),
    # Each item: {"bbox", "name", "detected_at_frame"}
    "latest_results":    [],
    "current_frame_num": 0,   # updated by playback thread
    "detections":        deque(maxlen=1000),
    "video_path":        None,
}

# Video analytics tracking
video_analytics = {
    "total_frames": 0,
    "processed_frames": 0,
    "faces_detected": 0,
    "matched_faces": 0,
    "unknown_faces": 0,
    "scores": [],  # List of all recognition scores
    "fps": 0,
    "video_duration": 0,
    "start_time": None,
    "processing_time": 0,
}

# Store extracted face images for display
extracted_faces = {
    "faces": [],  # List of {"id", "image_b64", "name", "student_id", "score", "is_match", "frame_num", "confirmed"}
    "max_faces": 48,  # Maximum faces to keep in memory
}

# =========================
# CORS / DB
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()
try:
    client = MongoClient(os.getenv("MONGODB_URI"), serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    db = client[os.getenv("DB_NAME", "test")]
    print("✅ MongoDB connected")
except Exception as e:
    db = None
    print(f"⚠️ MongoDB not connected: {e}")

engine = FaceEngine(db=db, model_name="buffalo_l")

ATTENDANCE_COOLDOWN = 60
_attendance_ts: dict = {}

# =========================
# UTILITIES
# =========================

def _embedding_count():
    return 0 if engine.known_embeddings is None else len(engine.known_embeddings)


def save_attendance(name: str, student_id):
    if db is None:
        return
    now = datetime.now()
    last = _attendance_ts.get(student_id)
    if last and (now - last).total_seconds() < ATTENDANCE_COOLDOWN:
        return
    db["attendance"].insert_one({
        "name": name,
        "student_id": student_id,
        "timestamp": now,
        "datetime_str": now.strftime("%Y-%m-%d %H:%M:%S"),
    })
    _attendance_ts[student_id] = now
    print(f"💾 Attendance: {name}")


def draw_boxes(frame: np.ndarray, results: list, orig_w: int, orig_h: int) -> np.ndarray:
    """
    Draw bounding boxes on a display-sized frame.
    Boxes are stored in original-video coordinates and must be scaled
    down to DISPLAY coordinates before drawing.
    """
    sx = DISPLAY_WIDTH  / orig_w
    sy = DISPLAY_HEIGHT / orig_h

    for r in results:
        x1 = int(r["bbox"][0] * sx)
        y1 = int(r["bbox"][1] * sy)
        x2 = int(r["bbox"][2] * sx)
        y2 = int(r["bbox"][3] * sy)
        name = r["name"]

        color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        lw, lh = cv2.getTextSize(name, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
        cv2.rectangle(frame, (x1, y1 - 22), (x1 + lw, y1), color, -1)
        cv2.putText(frame, name, (x1, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    return frame


import base64
import uuid

def extract_and_store_face(frame: np.ndarray, bbox: tuple, name: str, student_id: str, 
                           score: float, frame_num: int, is_confirmed: bool):
    """
    Extract face crop from frame and store it in extracted_faces.
    """
    h, w = frame.shape[:2]
    x1, y1, x2, y2 = bbox
    
    # Add padding around face
    pad_x = int((x2 - x1) * 0.2)
    pad_y = int((y2 - y1) * 0.2)
    x1 = max(0, x1 - pad_x)
    y1 = max(0, y1 - pad_y)
    x2 = min(w, x2 + pad_x)
    y2 = min(h, y2 + pad_y)
    
    # Extract face crop
    face_crop = frame[y1:y2, x1:x2]
    if face_crop.size == 0:
        return
    
    # Resize to consistent size
    face_crop = cv2.resize(face_crop, (100, 100))
    
    # Encode as base64 JPEG
    ret, buf = cv2.imencode(".jpg", face_crop, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ret:
        return
    
    image_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
    
    face_data = {
        "id": str(uuid.uuid4())[:8],
        "image_b64": image_b64,
        "name": name,
        "student_id": str(student_id) if student_id else None,
        "score": round(score, 3),
        "is_match": name != "Unknown",
        "frame_num": frame_num,
        "confirmed": is_confirmed,
        "timestamp": datetime.now().isoformat(),
    }
    
    with faces_lock:
        extracted_faces["faces"].append(face_data)
        # Keep only the most recent faces
        if len(extracted_faces["faces"]) > extracted_faces["max_faces"]:
            extracted_faces["faces"] = extracted_faces["faces"][-extracted_faces["max_faces"]:]


# =========================
# THREAD 1 — PLAYBACK
# =========================

def playback_thread(video_path: str):
    """
    Reads frames, encodes them WITHOUT boxes, and pushes
    (raw_frame, frame_number, encoded_no_box) into frame_queue.

    The stream generator draws boxes at serve time so that the
    latest recognition results are always applied to the freshest frame.
    """
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_delay = 1.0 / fps
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"🎬 {orig_w}x{orig_h} @ {fps:.1f} FPS, {total_frames} total frames")

    # Update analytics
    with analytics_lock:
        video_analytics["total_frames"] = total_frames
        video_analytics["fps"] = fps
        video_analytics["video_duration"] = total_frames / fps if fps > 0 else 0
        video_analytics["start_time"] = time.time()

    frame_number = 0
    last_time = time.time()

    while cap.isOpened() and not video_state["stop_event"].is_set():
        ret, frame = cap.read()
        if not ret:
            break

        frame_number += 1
        video_state["current_frame_num"] = frame_number

        # Downscale for display — no boxes yet
        display = cv2.resize(frame, (DISPLAY_WIDTH, DISPLAY_HEIGHT),
                             interpolation=cv2.INTER_LINEAR)

        # Queue: (display_frame_ndarray, frame_number, orig_w, orig_h)
        # We queue the ndarray so stream_generator can draw boxes on it
        video_state["frame_queue"].append((display, frame_number, orig_w, orig_h))

        # Sample original frame for recognition
        if frame_number % PROCESS_EVERY_N == 0:
            video_state["recognition_queue"].append((frame_number, frame.copy()))

        elapsed = time.time() - last_time
        wait = frame_delay - elapsed
        if wait > 0:
            time.sleep(wait)
        last_time = time.time()

    # Update final analytics
    with analytics_lock:
        video_analytics["processing_time"] = time.time() - video_analytics["start_time"] if video_analytics["start_time"] else 0

    cap.release()
    video_state["is_running"] = False
    print(f"🎬 Playback done: {frame_number} frames")


# =========================
# THREAD 2 — RECOGNITION
# =========================

def recognition_thread():
    """
    Runs inference on sampled frames.
    Stores results in original-video coordinates tagged with frame_number.
    Uses SlidingWindowTracker for multi-frame attendance confirmation.
    """
    print("🔍 Recognition thread started (multi-frame confirmation enabled)")
    print(f"   Window: {SLIDING_WINDOW_SIZE}, Min confirmations: {MIN_CONFIRMATIONS}, Threshold: {CONFIRMATION_THRESHOLD}")

    while not video_state["stop_event"].is_set():
        frame_data = None
        try:
            # Always process the latest, discard stale
            while len(video_state["recognition_queue"]) > 1:
                video_state["recognition_queue"].popleft()
            if video_state["recognition_queue"]:
                frame_data = video_state["recognition_queue"].popleft()
        except IndexError:
            pass

        if frame_data is None:
            time.sleep(0.01)
            continue

        frame_num, frame = frame_data

        # Update processed frames counter
        with analytics_lock:
            video_analytics["processed_frames"] += 1

        try:
            orig_h, orig_w = frame.shape[:2]
            small = cv2.resize(frame, (RECOG_WIDTH, RECOG_HEIGHT))
            sx = orig_w / RECOG_WIDTH
            sy = orig_h / RECOG_HEIGHT

            # Use higher threshold for more reliable recognition
            results = engine.recognize(small, threshold=CONFIRMATION_THRESHOLD)

            # Update analytics for this frame
            with analytics_lock:
                video_analytics["faces_detected"] += len(results)
                for _, name, _, score in results:
                    video_analytics["scores"].append(round(score, 4))
                    if name != "Unknown":
                        video_analytics["matched_faces"] += 1
                    else:
                        video_analytics["unknown_faces"] += 1

            scaled = []
            for bbox, name, student_id, score in results:
                # Get pending confirmation count for display
                pending_count = 0
                is_confirmed = False
                if name != "Unknown" and student_id:
                    pending_count = attendance_tracker.get_pending_count(str(student_id), frame_num)
                    is_confirmed = attendance_tracker.is_confirmed(str(student_id))
                    
                    # Show status in name label
                    if is_confirmed:
                        display_name = f"✓ {name}"
                    else:
                        display_name = f"{name} ({pending_count}/{MIN_CONFIRMATIONS})"
                else:
                    display_name = name
                
                # Scale bbox back to original frame coordinates
                scaled_bbox = (
                    int(bbox[0] * sx),
                    int(bbox[1] * sy),
                    int(bbox[2] * sx),
                    int(bbox[3] * sy),
                )
                
                scaled.append({
                    "bbox": scaled_bbox,
                    "name": display_name,
                    "detected_at_frame": frame_num,
                })
                
                # Extract and store face crop for visualization
                extract_and_store_face(
                    frame, scaled_bbox, name, student_id, score, frame_num, is_confirmed
                )

                video_state["detections"].append({
                    "name": name,
                    "student_id": str(student_id) if student_id else None,
                    "timestamp": datetime.now().isoformat(),
                    "frame_num": frame_num,
                    "score": score,
                })

                # Multi-frame confirmation logic
                if name != "Unknown" and student_id:
                    should_save = attendance_tracker.add_detection(
                        str(student_id), frame_num, score
                    )
                    if should_save:
                        save_attendance(name, student_id)

            with results_lock:
                video_state["latest_results"] = scaled

        except Exception as e:
            print(f"❌ Recognition error: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(0.01)

    print("🔍 Recognition thread stopped")


# =========================
# STREAM — boxes drawn here
# =========================

def create_placeholder_frame(text: str = "Waiting for video..."):
    """Create a placeholder frame with text message."""
    frame = np.zeros((DISPLAY_HEIGHT, DISPLAY_WIDTH, 3), dtype=np.uint8)
    frame[:] = (40, 40, 40)  # Dark gray background
    
    # Add text
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1.0
    thickness = 2
    text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
    text_x = (DISPLAY_WIDTH - text_size[0]) // 2
    text_y = (DISPLAY_HEIGHT + text_size[1]) // 2
    cv2.putText(frame, text, (text_x, text_y), font, font_scale, (200, 200, 200), thickness)
    
    ret, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
    return buf.tobytes() if ret else None


def stream_frames():
    """
    Pops display frames from queue, draws the latest boxes on them,
    then encodes and yields.

    Drawing happens HERE (not in playback_thread) so we always use
    the most up-to-date recognition results at the moment of serving,
    not the moment the frame was captured.

    Boxes are hidden after BOX_TTL frames with no new recognition
    to avoid stale boxes lingering at scene cuts.
    """
    placeholder_sent = False
    last_frame_time = time.time()
    
    try:
        while True:
            # Check if we should exit (only when stop is set AND we've been idle)
            if video_state["stop_event"].is_set() and not video_state["frame_queue"]:
                # Send one final placeholder before exiting
                placeholder = create_placeholder_frame("Processing complete")
                if placeholder:
                    yield (b"--frame\r\n"
                           b"Content-Type: image/jpeg\r\n\r\n" +
                           placeholder + b"\r\n")
                break
            
            if not video_state["frame_queue"]:
                # Send placeholder while waiting
                if not placeholder_sent or time.time() - last_frame_time > 1.0:
                    placeholder = create_placeholder_frame("Processing video...")
                    if placeholder:
                        yield (b"--frame\r\n"
                               b"Content-Type: image/jpeg\r\n\r\n" +
                               placeholder + b"\r\n")
                    placeholder_sent = True
                    last_frame_time = time.time()
                time.sleep(0.05)
                continue
            
            placeholder_sent = False

            try:
                display, frame_num, orig_w, orig_h = video_state["frame_queue"].popleft()
            except (IndexError, ValueError):
                continue

            # Get latest results; filter out stale ones past TTL
            with results_lock:
                raw_results = list(video_state["latest_results"])

            active = [
                r for r in raw_results
                if frame_num - r["detected_at_frame"] <= BOX_TTL
            ]

            # Draw on display frame (already downscaled)
            annotated = draw_boxes(display.copy(), active, orig_w, orig_h)

            ret, buf = cv2.imencode(".jpg", annotated,
                                    [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
            if ret:
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n" +
                       buf.tobytes() + b"\r\n")

    except GeneratorExit:
        pass


@app.get("/video-stream-processed")
def video_stream_processed():
    return StreamingResponse(
        stream_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# =========================
# PROCESS / STOP
# =========================

@app.post("/process-video")
async def process_video(video: UploadFile = File(...)):
    _stop_and_clear()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(await video.read())
        tmp_path = tmp.name

    video_state["video_path"] = tmp_path
    video_state["stop_event"].clear()
    video_state["is_running"] = True

    # Reset analytics for new video
    with analytics_lock:
        video_analytics["total_frames"] = 0
        video_analytics["processed_frames"] = 0
        video_analytics["faces_detected"] = 0
        video_analytics["matched_faces"] = 0
        video_analytics["unknown_faces"] = 0
        video_analytics["scores"] = []
        video_analytics["fps"] = 0
        video_analytics["video_duration"] = 0
        video_analytics["start_time"] = None
        video_analytics["processing_time"] = 0

    threading.Thread(target=playback_thread, args=(tmp_path,), daemon=True).start()
    threading.Thread(target=recognition_thread, daemon=True).start()

    return {"success": True}


def _stop_and_clear():
    video_state["stop_event"].set()
    video_state["is_running"] = False
    video_state["frame_queue"].clear()
    video_state["recognition_queue"].clear()
    with results_lock:
        video_state["latest_results"] = []
    with faces_lock:
        extracted_faces["faces"] = []  # Clear extracted faces
    attendance_tracker.reset()  # Reset multi-frame tracker
    time.sleep(0.3)


@app.post("/stop-processing")
def stop_processing():
    _stop_and_clear()
    return {
        "success": True, 
        "detections": len(video_state["detections"]),
        "confirmed_students": attendance_tracker.get_status()["confirmed"]
    }


# =========================
# EXTRACTED FACES API
# =========================

@app.get("/extracted-faces")
def get_extracted_faces():
    """Get all extracted face crops from the current video processing session."""
    with faces_lock:
        return {
            "faces": list(extracted_faces["faces"]),
            "total": len(extracted_faces["faces"]),
            "is_processing": video_state["is_running"],
        }


@app.post("/clear-extracted-faces")
def clear_extracted_faces():
    """Clear all extracted face crops."""
    with faces_lock:
        extracted_faces["faces"] = []
    return {"success": True}


import glob

@app.get("/known-faces")
def get_known_faces():
    """Get information about known faces in database (for display in sidebar)."""
    print("[known-faces] Starting endpoint...")
    if db is None:
        print("[known-faces] db is None!")
        return {"faces": [], "total": 0}
    
    # Path to facial-data folder (Next.js public folder)
    FACIAL_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "public", "facial-data")
    
    faces = []
    try:
        print(f"[known-faces] Querying facial_database collection...")
        facial_records = list(db["facial_database"].find())
        print(f"[known-faces] Found {len(facial_records)} records in facial_database")
        
        if not facial_records:
            print("[known-faces] No records found - returning empty")
            return {"faces": [], "total": 0}
        
        students_collection = db.get_collection("students")
        
        for i, record in enumerate(facial_records):
            print(f"[known-faces] Processing record {i}: {record.keys()}")
            student_id = record.get("student_id")
            # Count actual embeddings instead of relying on number_of_samples field
            embeddings = record.get("embeddings", [])
            num_samples = len(embeddings) if embeddings else record.get("number_of_samples", 0)
            
            # Get first image URL from embeddings if available
            image_url = None
            # Search for actual image file in facial-data folder
            if os.path.exists(FACIAL_DATA_DIR):
                pattern = os.path.join(FACIAL_DATA_DIR, f"{student_id}_*.jpg")
                matches = glob.glob(pattern)
                if matches:
                    # Use the first matching image
                    filename = os.path.basename(matches[0])
                    image_url = f"/facial-data/{filename}"
            
            print(f"[known-faces] Record {i}: student_id={student_id}, embeddings={num_samples}, image_url={image_url}")
            
            # Get student name
            student_name = str(student_id)
            if students_collection is not None:
                try:
                    # Convert string student_id to ObjectId for query
                    oid = ObjectId(student_id) if isinstance(student_id, str) else student_id
                    student = students_collection.find_one({"_id": oid})
                    if student and student.get("name"):
                        student_name = student["name"]
                except Exception as name_err:
                    print(f"[known-faces] Error getting student name: {name_err}")
            
            faces.append({
                "student_id": str(student_id),
                "name": student_name,
                "num_samples": num_samples,
                "image_url": image_url,
            })
        
        print(f"[known-faces] Returning {len(faces)} faces")
    except Exception as e:
        print(f"[known-faces] ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    return {
        "faces": faces,
        "total": len(faces),
    }


@app.get("/analytics")
def get_analytics():
    """Get video processing analytics."""
    with analytics_lock:
        analytics = {**video_analytics}
    
    # Calculate additional metrics
    if analytics["processed_frames"] > 0:
        analytics["match_rate"] = (analytics["matched_faces"] / max(1, analytics["faces_detected"])) * 100
    else:
        analytics["match_rate"] = 0
    
    # Get score statistics
    if analytics["scores"]:
        scores = analytics["scores"]
        analytics["score_stats"] = {
            "min": min(scores),
            "max": max(scores),
            "avg": sum(scores) / len(scores),
            "count": len(scores),
        }
    else:
        analytics["score_stats"] = {"min": 0, "max": 0, "avg": 0, "count": 0}
    
    # Current processing state
    analytics["current_frame"] = video_state["current_frame_num"]
    analytics["is_processing"] = video_state["is_running"]
    
    return analytics


# =========================
# DETECTIONS / ATTENDANCE
# =========================

@app.get("/video-detections")
def get_video_detections():
    return {
        "detections": list(video_state["detections"]),
        "is_processing": video_state["is_running"],
    }


@app.get("/attendance")
def get_attendance(limit: int = 100):
    if db is None:
        return []
    records = list(db["attendance"].find().sort("timestamp", -1).limit(limit))
    for r in records:
        r["_id"] = str(r["_id"])
        if "timestamp" in r:
            r["timestamp"] = r["timestamp"].isoformat()
    return records


@app.post("/clear-attendance")
def clear_attendance():
    if db:
        db["attendance"].delete_many({})
    _attendance_ts.clear()
    return {"success": True}


# =========================
# DEBUG / RELOAD
# =========================

@app.get("/debug")
def debug_status():
    return {
        "mongodb_connected":      db is not None,
        "embeddings_loaded":      _embedding_count(),
        "unique_students":        engine.student_count,
        "student_names":          list(set(engine.known_names)),
        "is_processing":          video_state["is_running"],
        "frame_queue_size":       len(video_state["frame_queue"]),
        "recognition_queue_size": len(video_state["recognition_queue"]),
        "detections_count":       len(video_state["detections"]),
        "model":                  "buffalo_l",
        "threshold":              CONFIRMATION_THRESHOLD,
        "multiframe_config": {
            "window_size":       SLIDING_WINDOW_SIZE,
            "min_confirmations": MIN_CONFIRMATIONS,
        },
    }


@app.get("/tracker-status")
def tracker_status():
    """Get current state of the multi-frame attendance tracker."""
    status = attendance_tracker.get_status()
    return {
        "is_processing": video_state["is_running"],
        "confirmed_students": status["confirmed"],
        "pending_students": status["pending"],
        "config": {
            "window_size": SLIDING_WINDOW_SIZE,
            "min_confirmations": MIN_CONFIRMATIONS,
            "threshold": CONFIRMATION_THRESHOLD,
        }
    }


@app.post("/reload-embeddings")
def reload_embeddings():
    if db is None:
        return {"success": False, "error": "MongoDB not connected"}
    engine.load_embeddings_from_db(db)
    return {
        "success": True,
        "embeddings_loaded": _embedding_count(),
        "unique_students": engine.student_count,
    }


# =========================
# TEST RECOGNITION
# =========================

@app.post("/test-recognition")
async def test_recognition(file: UploadFile = File(...)):
    try:
        img = cv2.imdecode(np.frombuffer(await file.read(), np.uint8), cv2.IMREAD_COLOR)
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
            out.append({
                "face": i,
                "bbox": face.bbox.astype(int).tolist(),
                "top_matches": matches,
                "would_recognize_at_0.4": bool(matches[0]["score"] >= 0.4),
            })

        return {
            "known_students": list(set(engine.known_names)),
            "embeddings_loaded": _embedding_count(),
            "results": out,
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


# =========================
# ENROLL
# =========================

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
            img = cv2.imdecode(np.frombuffer(await file.read(), np.uint8), cv2.IMREAD_COLOR)
            if img is None:
                errors.append(f"Cannot decode {file.filename}")
                continue

            files_processed += 1
            faces = engine.app.get(img)

            if not faces:
                errors.append(f"No face in {file.filename}")
                continue

            face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))
            # Generate image URL path (matches Next.js format)
            image_url = f"/facial-data/{student_id}_{file.filename}"
            db["facial_database"].update_one(
                {"student_id": student_id},
                {
                    "$push": {"embeddings": {
                        "student_id": ObjectId(student_id),
                        "embedding": face.embedding.tolist(),
                        "filename": file.filename,
                        "image_url": image_url,
                        "uploaded_at": datetime.now(),
                    }},
                    "$set": {"last_updated": datetime.now()},
                    "$inc": {"number_of_samples": 1},
                },
                upsert=True,
            )
            embeddings_created += 1

        except Exception as e:
            errors.append(f"Error on {file.filename}: {e}")

    if embeddings_created > 0:
        engine.load_embeddings_from_db(db)

    return {
        "success": True,
        "files_processed": files_processed,
        "embeddings_created": embeddings_created,
        "total_embeddings_in_memory": _embedding_count(),
        "errors": errors or None,
    }


@app.get("/student-facial-samples/{student_id}")
def get_student_facial_samples(student_id: str):
    if db is None:
        return {"error": "Database not connected"}
    record = db["facial_database"].find_one({"student_id": student_id})
    if not record:
        return {"student_id": student_id, "number_of_samples": 0}
    return {"student_id": student_id, "number_of_samples": record.get("number_of_samples", 0)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)