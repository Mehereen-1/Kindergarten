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
import hashlib
from typing import List, Optional
from dotenv import load_dotenv
import threading
from collections import deque
import time
import signal
import sys

# =========================
# GRACEFUL SHUTDOWN
# =========================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Server starting...")
    yield
    # Shutdown
    print("🛑 Server shutting down...")
    video_state["stop_event"].set()
    video_state["is_running"] = False
    video_state["frame_queue"].clear()
    video_state["recognition_queue"].clear()
    print("✅ Cleanup complete")

app = FastAPI(lifespan=lifespan)

# =========================
# CONFIG (CPU OPTIMIZED)
# =========================

DISPLAY_WIDTH = 854          # Downscaled from 1280
DISPLAY_HEIGHT = 480
RECOG_WIDTH = 640            # Match det_size for better accuracy
RECOG_HEIGHT = 480           # Larger = better face detection
PROCESS_EVERY_N_FRAMES = 8   # Recognition sampling
JPEG_QUALITY = 55
FRAME_QUEUE_SIZE = 120
RECOG_QUEUE_SIZE = 10

# =========================
# GLOBAL STATE
# =========================

results_lock = threading.Lock()

video_state = {
    "is_running": False,
    "stop_event": threading.Event(),
    "frame_queue": deque(maxlen=FRAME_QUEUE_SIZE),
    "recognition_queue": deque(maxlen=RECOG_QUEUE_SIZE),
    "latest_results": [],   # store latest boxes
    "detections": deque(maxlen=1000),
    "video_path": None
}

# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# DATABASE
# =========================

load_dotenv()
MONGO_URL = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "test")

try:
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    db = client[DB_NAME]
    print("✅ MongoDB connected")
except:
    db = None
    print("⚠️ MongoDB not connected")

engine = FaceEngine(db=db, model_name="buffalo_s")

# =========================
# UTILITIES
# =========================

def save_attendance(name, student_id):
    if db is None:
        return
    db["attendance"].insert_one({
        "name": name,
        "student_id": student_id,
        "timestamp": datetime.now()
    })

# =========================
# THREAD 1: PLAYBACK
# =========================

def playback_thread(video_path):

    cap = cv2.VideoCapture(video_path)
    frame_number = 0

    # Get video FPS for proper playback timing
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30  # Default
    frame_delay = 1.0 / fps

    print(f"🎬 Playback started: {video_path}")
    print(f"🎬 Video FPS: {fps}, Resolution: {int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}")

    last_frame_time = time.time()

    while cap.isOpened() and not video_state["stop_event"].is_set():

        ret, frame = cap.read()
        if not ret:
            break

        frame_number += 1

        # Draw latest detection boxes (thread-safe copy)
        with results_lock:
            current_results = list(video_state["latest_results"])
        
        # Log when we have results to draw
        if current_results and frame_number % 30 == 0:
            print(f"📺 Frame {frame_number}: Drawing {len(current_results)} boxes")
        
        for result in current_results:
            x1, y1, x2, y2 = result["bbox"]
            name = result["name"]

            if name == "Unknown":
                color = (0, 0, 255)  # Red (BGR)
            else:
                color = (0, 255, 0)  # Green (BGR)

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(
                frame,
                name,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2
            )

        # Downscale after drawing
        display_frame = cv2.resize(frame, (DISPLAY_WIDTH, DISPLAY_HEIGHT))

        ret2, buffer = cv2.imencode(
            '.jpg',
            display_frame,
            [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
        )

        if ret2:
            video_state["frame_queue"].append(buffer.tobytes())

        # Sample for recognition
        if frame_number % PROCESS_EVERY_N_FRAMES == 0:
            if len(video_state["recognition_queue"]) < RECOG_QUEUE_SIZE:
                video_state["recognition_queue"].append(frame.copy())

        # Frame rate throttling - play at real-time speed
        elapsed = time.time() - last_frame_time
        sleep_time = frame_delay - elapsed
        if sleep_time > 0:
            time.sleep(sleep_time)
        last_frame_time = time.time()

    cap.release()
    video_state["is_running"] = False
    print(f"🎬 Playback finished after {frame_number} frames")

# =========================
# THREAD 2: RECOGNITION
# =========================

def recognition_thread():

    recognition_counts = {}
    saved_students = set()
    frame_count = 0

    print("🔍 Recognition thread started")

    while not video_state["stop_event"].is_set():

        try:
            # Thread-safe check and pop
            frame = None
            try:
                if len(video_state["recognition_queue"]) > 0:
                    frame = video_state["recognition_queue"].popleft()
            except IndexError:
                pass

            if frame is not None:
                frame_count += 1
                small = cv2.resize(frame, (RECOG_WIDTH, RECOG_HEIGHT))
                results = engine.recognize(small)

                if results:
                    print(f"🎯 Frame {frame_count}: Detected {len(results)} face(s)")

                scale_x = frame.shape[1] / RECOG_WIDTH
                scale_y = frame.shape[0] / RECOG_HEIGHT

                scaled_results = []

                for bbox, name, student_id in results:

                    x1, y1, x2, y2 = bbox
                    x1 = int(x1 * scale_x)
                    x2 = int(x2 * scale_x)
                    y1 = int(y1 * scale_y)
                    y2 = int(y2 * scale_y)

                    # Add to detections for API
                    video_state["detections"].append({
                        "name": name,
                        "student_id": student_id,
                        "timestamp": datetime.now().isoformat()
                    })

                    if name != "Unknown":
                        recognition_counts[student_id] = recognition_counts.get(student_id, 0) + 1
                        print(f"   ✅ Recognized: {name} (count: {recognition_counts[student_id]})")

                        if student_id not in saved_students and recognition_counts[student_id] >= 3:
                            save_attendance(name, student_id)
                            saved_students.add(student_id)
                            print(f"   💾 Saved attendance for: {name}")
                    else:
                        print(f"   ❓ Unknown face at ({x1},{y1})-({x2},{y2})")

                    scaled_results.append({
                        "bbox": (x1, y1, x2, y2),
                        "name": name
                    })

                with results_lock:
                    video_state["latest_results"] = scaled_results

            else:
                time.sleep(0.01)
        except Exception as e:
            print(f"❌ Recognition error: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(0.01)

    print("🔍 Recognition thread stopped")

# =========================
# STREAM
# =========================

def stream_frames():
    try:
        while not video_state["stop_event"].is_set():
            if video_state["frame_queue"]:
                try:
                    frame = video_state["frame_queue"].popleft()
                    yield (
                        b'--frame\r\n'
                        b'Content-Type: image/jpeg\r\n\r\n' +
                        frame +
                        b'\r\n'
                    )
                except IndexError:
                    pass
            else:
                time.sleep(0.01)
    except GeneratorExit:
        # Client disconnected - this is normal
        pass

@app.get("/video-stream-processed")
def video_stream_processed():
    return StreamingResponse(
        stream_frames(),
        media_type='multipart/x-mixed-replace; boundary=frame'
    )

# =========================
# PROCESS VIDEO
# =========================

@app.post("/process-video")
async def process_video(video: UploadFile = File(...)):

    stop_processing()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(await video.read())
        tmp_path = tmp.name

    video_state["video_path"] = tmp_path
    video_state["frame_queue"].clear()
    video_state["recognition_queue"].clear()
    video_state["detections"].clear()
    with results_lock:
        video_state["latest_results"] = []
    video_state["stop_event"].clear()
    video_state["is_running"] = True

    t1 = threading.Thread(target=playback_thread, args=(tmp_path,), daemon=True)
    t2 = threading.Thread(target=recognition_thread, daemon=True)

    t1.start()
    t2.start()

    return {"success": True}

# =========================
# STOP
# =========================

@app.post("/stop-processing")
def stop_processing():

    video_state["stop_event"].set()
    video_state["is_running"] = False

    video_state["frame_queue"].clear()
    video_state["recognition_queue"].clear()
    with results_lock:
        video_state["latest_results"] = []

    return {"success": True}

# =========================
# DETECTIONS
# =========================

@app.get("/video-detections")
def get_video_detections():
    return {
        "detections": list(video_state["detections"]),
        "is_processing": video_state["is_running"]
    }

# =========================
# ATTENDANCE
# =========================

@app.get("/attendance")
def get_attendance(limit: int = 100):
    if db is None:
        return []
    records = list(db["attendance"].find().sort("timestamp", -1).limit(limit))
    for r in records:
        r["_id"] = str(r["_id"])
    return records

@app.post("/clear-attendance")
def clear_attendance():
    if db:
        db["attendance"].delete_many({})
    return {"success": True}

# =========================
# DEBUG & RELOAD
# =========================

@app.get("/debug")
def debug_status():
    embedding_count = 0
    student_count = 0
    student_names = []
    
    if engine.known_embeddings is not None:
        embedding_count = len(engine.known_embeddings)
    if engine.student_ids:
        student_count = len(set(engine.student_ids))
    if engine.known_names:
        student_names = list(set(engine.known_names))
    
    return {
        "mongodb_connected": db is not None,
        "embeddings_loaded": embedding_count,
        "unique_students": student_count,
        "student_names": student_names,
        "is_processing": video_state["is_running"],
        "frame_queue_size": len(video_state["frame_queue"]),
        "recognition_queue_size": len(video_state["recognition_queue"]),
        "detections_count": len(video_state["detections"])
    }

@app.post("/reload-embeddings")
def reload_embeddings():
    if db is None:
        return {"success": False, "error": "MongoDB not connected"}
    
    engine.load_embeddings_from_db(db)
    
    embedding_count = 0
    if engine.known_embeddings is not None:
        embedding_count = len(engine.known_embeddings)
    
    return {
        "success": True,
        "embeddings_loaded": embedding_count,
        "unique_students": len(set(engine.student_ids)) if engine.student_ids else 0,
        "student_names": list(set(engine.known_names)) if engine.known_names else []
    }

# =========================
# TEST RECOGNITION
# =========================

@app.post("/test-recognition")
async def test_recognition(file: UploadFile = File(...)):
    """
    Test recognition on a single uploaded image.
    Returns detailed matching scores for debugging.
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Could not decode image"}
        
        print(f"🧪 Testing recognition on image: {img.shape}")
        
        # Detect faces
        faces = engine.app.get(img)
        
        if not faces:
            return {
                "error": "No face detected in image",
                "image_shape": img.shape
            }
        
        results = []
        
        for i, face in enumerate(faces):
            embedding = face.embedding.astype(np.float32)
            embedding /= (np.linalg.norm(embedding) + 1e-6)
            
            if engine.known_embeddings is None or len(engine.known_embeddings) == 0:
                results.append({
                    "face_index": i,
                    "bbox": face.bbox.astype(int).tolist(),
                    "error": "No known embeddings loaded"
                })
                continue
            
            # Calculate similarity with ALL known embeddings
            similarities = np.dot(engine.known_embeddings, embedding)
            
            # Get top 5 matches
            top_indices = np.argsort(similarities)[::-1][:5]
            
            matches = []
            for idx in top_indices:
                matches.append({
                    "name": engine.known_names[idx],
                    "student_id": engine.student_ids[idx],
                    "score": float(similarities[idx])
                })
            
            results.append({
                "face_index": i,
                "bbox": face.bbox.astype(int).tolist(),
                "top_matches": matches,
                "best_match": matches[0] if matches else None,
                "would_recognize": matches[0]["score"] > 0.35 if matches else False
            })
        
        return {
            "faces_detected": len(faces),
            "known_embeddings_count": len(engine.known_embeddings) if engine.known_embeddings is not None else 0,
            "known_students": list(set(engine.known_names)) if engine.known_names else [],
            "results": results
        }
        
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

# =========================
# UPLOAD STUDENT IMAGES
# =========================

@app.post("/upload-student-images")
async def upload_student_images(
    student_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Upload images for a student and extract facial embeddings.
    Saves embeddings to MongoDB facial_database collection.
    """
    if db is None:
        return {"error": "MongoDB not connected", "success": False}
    
    if not files:
        return {"error": "No files provided", "success": False}
    
    print(f"📤 Received {len(files)} images for student {student_id}")
    
    embeddings_created = 0
    files_processed = 0
    errors = []
    
    for file in files:
        try:
            # Read image bytes
            contents = await file.read()
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                errors.append(f"Could not decode image: {file.filename}")
                continue
            
            files_processed += 1
            
            # Detect faces and extract embeddings
            faces = engine.app.get(img)
            
            if not faces:
                print(f"   ⚠️ No face detected in {file.filename}")
                errors.append(f"No face detected in {file.filename}")
                continue
            
            # Use the first (largest) face
            face = faces[0]
            embedding = face.embedding.tolist()
            
            print(f"   ✅ Extracted embedding from {file.filename} (dim: {len(embedding)})")
            
            # Save embedding to MongoDB
            facial_db = db["facial_database"]
            
            # Find or create record for this student
            existing = facial_db.find_one({"student_id": student_id})
            
            embedding_doc = {
                "embedding": embedding,
                "filename": file.filename,
                "created_at": datetime.now()
            }
            
            if existing:
                # Add to existing embeddings list
                facial_db.update_one(
                    {"student_id": student_id},
                    {"$push": {"embeddings": embedding_doc}}
                )
            else:
                # Create new record
                facial_db.insert_one({
                    "student_id": student_id,
                    "embeddings": [embedding_doc],
                    "created_at": datetime.now()
                })
            
            embeddings_created += 1
            
        except Exception as e:
            print(f"   ❌ Error processing {file.filename}: {e}")
            errors.append(f"Error processing {file.filename}: {str(e)}")
    
    # Reload embeddings into the engine
    engine.load_embeddings_from_db(db)
    
    result = {
        "success": True,
        "files_processed": files_processed,
        "embeddings_created": embeddings_created,
        "errors": errors if errors else None,
        "total_embeddings": len(engine.known_embeddings) if engine.known_embeddings is not None else 0
    }
    
    print(f"📊 Upload complete: {embeddings_created}/{files_processed} embeddings created")
    
    return result

# =========================
# RUN
# =========================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)