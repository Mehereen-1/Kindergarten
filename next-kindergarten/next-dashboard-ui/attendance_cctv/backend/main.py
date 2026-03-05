from fastapi import FastAPI, File, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import json
from datetime import datetime
from face_engine import FaceEngine
import os
import tempfile

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = FaceEngine()

attendance_file = "attendance.json"

def save_attendance(name):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        with open(attendance_file, "r") as f:
            data = json.load(f)
    except:
        data = []

    if name not in [d["name"] for d in data]:
        data.append({"name": name, "time": now})

        with open(attendance_file, "w") as f:
            json.dump(data, f, indent=4)

def generate_frames():
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("ERROR: Cannot open webcam!")
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + b'\r\n')
        return

    while True:
        success, frame = cap.read()
        if not success:
            print("ERROR: Cannot read frame from webcam!")
            break

        results = engine.recognize(frame)

        for bbox, name, student_id in results:
            x1, y1, x2, y2 = bbox
            cv2.rectangle(frame, (x1,y1), (x2,y2), (0,255,0), 2)
            cv2.putText(frame, name, (x1,y1-10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0,255,0), 2)

            if name != "Unknown":
                save_attendance(name)

        ret, buffer = cv2.imencode('.jpg', frame)
        if ret:
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.get("/video")
def video_feed():
    return StreamingResponse(generate_frames(),
                             media_type='multipart/x-mixed-replace; boundary=frame')

@app.get("/debug")
def debug_info():
    """Check system and webcam status"""
    cap = cv2.VideoCapture(0)
    is_open = cap.isOpened()
    
    info = {
        "webcam_available": is_open,
        "opencv_version": cv2.__version__,
        "message": "Webcam is working!" if is_open else "Webcam NOT detected!"
    }
    
    if is_open:
        cap.release()
    
    return info

@app.get("/attendance")
def get_attendance():
    try:
        with open(attendance_file) as f:
            return json.load(f)
    except:
        return []
@app.post("/process-video")
async def process_video(video: UploadFile = File(...)):
    """Process uploaded video file for attendance"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_file:
            contents = await video.read()
            tmp_file.write(contents)
            tmp_path = tmp_file.name

        # Process video
        cap = cv2.VideoCapture(tmp_path)
        detected_count = 0

        if not cap.isOpened():
            return {"error": "Cannot open video file", "detected_faces": 0}

        frame_count = 0
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            # Process every 5th frame to speed up processing
            frame_count += 1
            if frame_count % 5 != 0:
                continue

            results = engine.recognize(frame)

            for bbox, name, student_id in results:
                if name != "Unknown":
                    save_attendance(name)
                    detected_count += 1

        cap.release()
        os.remove(tmp_path)

        return {"success": True, "detected_faces": detected_count}

    except Exception as e:
        print(f"Error processing video: {e}")
        return {"error": str(e), "detected_faces": 0}

@app.post("/clear-attendance")
def clear_attendance():
    """Clear all attendance records"""
    try:
        with open(attendance_file, "w") as f:
            json.dump([], f, indent=4)
        return {"success": True, "message": "Attendance records cleared"}
    except Exception as e:
        return {"error": str(e)}