# ═══════════════════════════════════════════════════════
# main.py — FastAPI Entry Point
# ═══════════════════════════════════════════════════════
#
# Usage:
#   uvicorn main:app --reload
#   python main.py
# ═══════════════════════════════════════════════════════


# =========================
# IMPORTS
# =========================

# Standard library
import os
import tempfile
import threading
import time
import glob
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List

# Third-party
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId

# Local modules
from config.settings import (
    RECOG_THRESHOLD,
    SLIDING_WINDOW_SIZE,
    MIN_CONFIRMATIONS,
)
from database.mongo_service import db
from recognition.face_engine import FaceEngine
from recognition.recognizer import recognition_thread
from tracking.tracker import SlidingWindowTracker, BoundingBoxSmoother
from video.frame_buffer import (
    video_state,
    video_analytics,
    extracted_faces,
    results_lock,
    faces_lock,
    analytics_lock,
)
from video.camera_stream import playback_thread, stream_frames
from attendance.attendance_manager import save_attendance, clear_attendance_timestamps
from attendance.attendance_logic import get_attendance as get_attendance_logic, clear_attendance as clear_attendance_logic
from visualization.drawer import draw_boxes, extract_and_store_face
from utils.image_utils import decode_image


# =========================
# APP LIFESPAN
# =========================

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting...")
    yield
    print("🛑 Shutting down...")
    video_state["stop_event"].set()


# =========================
# APP INITIALIZATION
# =========================

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# GLOBAL INSTANCES
# =========================

engine = FaceEngine(db=db, model_name="buffalo_l")
attendance_tracker = SlidingWindowTracker()
bbox_smoother = BoundingBoxSmoother()


# =========================
# UTILITY FUNCTIONS
# =========================

def _embedding_count():
    return 0 if engine.known_embeddings is None else len(engine.known_embeddings)


def _save_attendance_wrapper(name: str, student_id):
    save_attendance(db, name, student_id)


def _extract_face_wrapper(frame, bbox, name, student_id, score, frame_num, is_confirmed):
    extract_and_store_face(frame, bbox, name, student_id, score, frame_num, is_confirmed,
                           extracted_faces, faces_lock)


def _draw_boxes_wrapper(frame, results, orig_w, orig_h, current_frame):
    return draw_boxes(frame, results, orig_w, orig_h, current_frame, bbox_smoother)


def _stop_and_clear():
    video_state["stop_event"].set()
    video_state["is_running"] = False
    video_state["frame_queue"].clear()
    video_state["recognition_queue"].clear()
    with results_lock:
        video_state["latest_results"] = []
    with faces_lock:
        extracted_faces["faces"] = []
    attendance_tracker.reset()
    bbox_smoother.reset()
    time.sleep(0.3)


# =========================
# API — VIDEO STREAMING
# =========================

@app.get("/video-stream-processed")
def video_stream_processed():
    return StreamingResponse(
        stream_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# =========================
# API — VIDEO PROCESSING
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

    with analytics_lock:
        video_analytics.update({
            "total_frames": 0, "processed_frames": 0,
            "faces_detected": 0, "matched_faces": 0, "unknown_faces": 0,
            "scores": [], "fps": 0, "video_duration": 0,
            "start_time": None, "processing_time": 0,
        })

    threading.Thread(target=playback_thread, args=(tmp_path, _draw_boxes_wrapper), daemon=True).start()
    threading.Thread(target=recognition_thread, args=(
        video_state, video_analytics, analytics_lock, results_lock,
        engine, attendance_tracker, _save_attendance_wrapper, _extract_face_wrapper
    ), daemon=True).start()
    return {"success": True}


@app.post("/stop-processing")
def stop_processing():
    _stop_and_clear()
    return {"success": True, "detections": len(video_state["detections"]),
            "confirmed": attendance_tracker.get_status()["confirmed"]}


# =========================
# API — ATTENDANCE & DETECTIONS
# =========================

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


# =========================
# API — FACIAL ENROLLMENT & MANAGEMENT
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


# =========================
# API — ANALYTICS & DEBUG
# =========================

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


# =========================
# ENTRYPOINT
# =========================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
