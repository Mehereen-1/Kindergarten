# 🚀 ATTENDANCE SYSTEM - QUICK START

## Step-by-Step Setup

### 1. Python Backend
```bash
cd attendance_cctv
venv310\Scripts\activate
cd backend
uvicorn main_v2:app --reload

# Verify dependencies installed

python -c "import fastapi, cv2, insightface; print('✅ All dependencies ready')"

# Start the server
python main_v2.py

# Expected output:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# ✅ MongoDB connected successfully
```

### 2. Test Backend
Open in browser or use curl:
```bash
http://localhost:8000/debug
```

Expected response:
```json
{
  "webcam_available": true,
  "opencv_version": "4.x.x",
  "mongodb_connected": true,
  "message": "System ready!"
}
```

### 3. Access Frontend
```
http://localhost:3000/teacher/attendance
```

## Integration Points

### React Component ↔ Backend API Mapping

| Frontend Tab | API Endpoint | Python Backend |
|---|---|---|
| Manual Entry | `/api/teacher/attendance/bulk` | ❌ (Next.js handles) |
| CCTV Feed | Display: `http://localhost:8000/video` | ✅ `GET /video` |
| CCTV Sync | `/api/attendance/cctv-sync` | ✅ `GET /attendance` |
| Upload Images | `/api/attendance/facial-upload` | ✅ `POST /upload-student-images` |

## File Structure

```
next-kindergarten/next-dashboard-ui/
├── attendance_cctv/
│   ├── backend/
│   │   ├── main.py (original - local JSON storage)
│   │   ├── main_v2.py (new - MongoDB + CCTV feed)
│   │   ├── face_engine.py (enhanced with student_id tracking)
│   │   ├── dataset/ (training images)
│   │   └── attendance.json (local fallback)
│   ├── frontend/ (HTML5 streaming client)
│   └── venv310/ (Python virtual environment)
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── attendance/
│   │   │       ├── facial-upload/route.ts (NEW)
│   │   │       └── cctv-sync/route.ts (NEW)
│   │   └── teacher/
│   │       └── attendance/
│   │           └── page.tsx (ENHANCED)
│   └── lib/
│       ├── models/
│       │   └── FacialDatabase.ts (NEW)
│       └── controllers/
│           └── attendanceController.ts
│
└── public/
    └── facial-data/ (uploaded images stored here)
```

## Key Changes Made

### 1. MongoDB Models
- **FacialDatabase.ts**: Store facial embeddings and training images
- Enhanced **Attendance.ts**: Now tracks source (CCTV/manual)

### 2. Python Backend
- **main_v2.py**: MongoDB integration + image upload API
- **face_engine.py**: Enhanced with student_id tracking + DB loading

### 3. Frontend
- **Teacher Attendance Page**: Three tabs (Manual/CCTV/Upload)
- **Facial Upload Component**: Drag-drop multi-image upload
- **CCTV Viewer**: Live feed with sync button

### 4. APIs
- `POST /api/attendance/facial-upload`: Bulk image upload
- `GET /api/attendance/cctv-sync`: Sync CCTV attendance to DB
- `POST /api/teacher/attendance/bulk`: Manual attendance save

## Testing Workflow

### Test 1: System Check
```bash
curl http://localhost:8000/debug

# Should return: webcam_available=true, mongodb_connected=true
```

### Test 2: Facial Database
```bash
# Check if student has facial samples
curl http://localhost:8000/student-facial-samples/STUDENT_ID
```

### Test 3: Manual Upload
```bash
# Via UI: Go to "📸 Facial Data" tab → Select student → Upload 5-10 photos
```

### Test 4: CCTV Sync
```bash
# Via UI: Go to "🎥 CCTV Feed" tab → Click "🔄 Sync CCTV Attendance"
```

## Troubleshooting

### ❌ "Cannot connect to feed"
```bash
# Check Python backend
curl http://localhost:8000/video

# If fails:
# 1. Python backend not running
# 2. Webcam not accessible
# 3. CORS not enabled
```

### ❌ Faces not recognized
```bash
# Check uploaded samples
curl http://localhost:8000/student-facial-samples/STUDENT_ID

# Solution: Upload more training images (need 5+)
# Try different angles and lighting
```

### ❌ MongoDB connection error
```bash
# Verify MongoDB running
# Ensure MONGODB_URI environment variable is set:
echo $MONGODB_URI

# Should output: mongodb://localhost:27017 (or your connection string)
```

## Performance Monitoring

### Check Backend Logs
```bash
# Watch Python server logs for errors
# Look for lines like:
# ✅ Loaded 45 embeddings from database
# Error processing image: ...
```

### Database Size
```bash
# Review MongoDB collections
# attendance: ~100-200 bytes per record
# facial_database: ~1KB per student (with embeddings)
# facial_embedding: ~2KB per image
```

## Next Steps

1. ✅ Install Python dependencies (in progress)
2. ✅ Start Python backend: `python main_v2.py`
3. ✅ Access UI: `http://localhost:3000/teacher/attendance`
4. ✅ Upload student photos via "📸 Facial Data" tab
5. ✅ Test CCTV stream: Click "🎥 CCTV Feed" tab
6. ✅ Sync attendance: Click "🔄 Sync" button
7. ✅ View database: Check MongoDB for records

## Important Notes

- **First time setup**: Upload at least 5 photos per student for accuracy
- **Lighting matters**: Good lighting = better recognition
- **Consistency**: Keep photos recent (within semester)
- **Threshold tuning**: Adjust `0.4` value in face_engine.py if needed
- **Local development**: CORS is wide open, restrict in production

## Additional Commands

```bash
# Test individual endpoints
python -c "from main_v2 import engine; print(engine.known_embeddings)"

# Clear attendance
curl -X POST http://localhost:8000/clear-attendance

# Get all attendance
curl http://localhost:8000/attendance

# Retrain model
curl -X POST http://localhost:8000/retrain-facial-model
```
