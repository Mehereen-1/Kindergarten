# 🏗️ SYSTEM ARCHITECTURE & INTEGRATION GUIDE

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONT-END LAYER (Next.js)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │     Teacher Attendance UI (React Component)        │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │ │ Manual   │  │  CCTV    │  │  Upload  │          │    │
│  │ │ Entry    │  │  Feed    │  │ Faculty  │          │    │
│  │ └──────────┘  └──────────┘  └──────────┘          │    │
│  └────────────────────────────────────────────────────┘    │
│                         ↓ (HTTP API)                       │
├─────────────────────────────────────────────────────────────┤
│                 API LAYER (Next.js Routes)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ facial-upload   │  │  cctv-sync   │  │  async save  │  │
│  │ POST            │  │  GET         │  │ attendance   │  │
│  └────────┬────────┘  └──────┬───────┘  └──────┬───────┘  │
│           │                   │                 │           │
└─────────────────────────────────────────────────────────────┘
           │                   │                 │
           ↓                   ↓                 ↓
┌─────────────────────────────────────────────────────────────┐
│           DATA ACCESS LAYER (MongoDB)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌────────────────┐                  │
│  │   FacialDB       │  │  Attendance    │                  │
│  │   Collection     │  │  Collection    │                  │
│  │ - embeddings     │  │ - student_id   │                  │
│  │ - student_id     │  │ - status       │                  │
│  │ - image_count    │  │ - date         │                  │
│  │ - confidence     │  │ - remarks      │                  │
│  └──────────────────┘  └────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           ↑                   ↑                 ↑
           │                   │                 │
           ↓                   ↓                 ↓
┌─────────────────────────────────────────────────────────────┐
│          PYTHON BACKEND (FastAPI Server)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │         Face Recognition Engine                   │      │
│  │  (InsightFace - buffalo_l model)                  │      │
│  │  - Facial embedding extraction (512-dim)         │      │
│  │  - Real-time face detection                      │      │
│  │  - Student matching via cosine similarity        │      │
│  └──────────────────────────────────────────────────┘      │
│           ↓ (faces detected)        ↑ (embeddings)         │
│  ┌──────────────────────────────────────────────────┐      │
│  │         CCTV Feed Processing                      │      │
│  │  - Webcam stream capture (OpenCV)                │      │
│  │  - Frame-by-frame analysis                       │      │
│  │  - MJPEG streaming to browser                    │      │
│  │  - Attendance logging                            │      │
│  └──────────────────────────────────────────────────┘      │
│           ↓ (images uploaded)                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │      Bulk Image Processing                        │      │
│  │  - File upload handling                          │      │
│  │  - Batch embedding generation                    │      │
│  │  - Deduplication (MD5 hashing)                   │      │
│  │  - Database persistence                          │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           ↑                   ↑
           │                   │
           └───────────────────┘
                (cameras/files)
```

## Data Flow Sequences

### Sequence 1: Manual Attendance Entry
```
User selects date and marks attendance
         ↓
React Component updates state
         ↓
User clicks "Save Attendance"
         ↓
POST /api/teacher/attendance/bulk
         ↓
Next.js API Route validates data
         ↓
Save to Attendance Collection (MongoDB)
         ↓
Return success response
         ↓
UI shows confirmation message
```

### Sequence 2: CCTV Real-Time Detection
```
Webcam/CCTV captures video frames
         ↓
Python backend (main_v2.py) receives frames
         ↓
FaceEngine processes: detect → embed → match
         ↓
Known student detected
         ↓
save_attendance_to_db() logs to Attendance Collection
         ↓
Browser displays updated MJPEG stream
         ↓
(Optional) Teacher clicks "Sync" button
         ↓
GET /api/attendance/cctv-sync fetches today's records
         ↓
Returns synced count and details
```

### Sequence 3: Bulk Facial Training Upload
```
Teacher selects student
         ↓
Drag-drops 5-10 photo files
         ↓
React validates files (image types)
         ↓
FormData prepared with student_id + files
         ↓
POST /api/attendance/facial-upload
         ↓
Next.js saves files to public/facial-data/
         ↓
Creates/updates FacialDatabase record
         ↓
Stores URLs and hashes
         ↓
Python backend can reload via /retrain-facial-model
         ↓
UI updates student's image count
         ↓
Shows success message
```

## Request/Response Examples

### Example 1: Upload Facial Images
```
POST /api/attendance/facial-upload
Content-Type: multipart/form-data

studentId: "607f1f77bcf86cd799439011"
files: [john_face_1.jpg, john_face_2.jpg, ...]

Response (200 OK):
{
  "success": true,
  "message": "Successfully uploaded 5 images for John Doe",
  "studentId": "607f1f77bcf86cd799439011",
  "studentName": "John Doe",
  "uploadedCount": 5,
  "imageUrls": [
    "/facial-data/607f1f77bcf86cd799439011_1707745200000_uuid1.jpg",
    "/facial-data/607f1f77bcf86cd799439011_1707745201000_uuid2.jpg",
    ...
  ],
  "facialRecordId": "65c8a9b0c3f1a2b3c4d5e6f7"
}
```

### Example 2: Get Debug Info
```
GET http://localhost:8000/debug

Response (200 OK):
{
  "webcam_available": true,
  "opencv_version": "4.13.0",
  "mongodb_connected": true,
  "message": "System ready!"
}
```

### Example 3: Sync CCTV Attendance
```
GET /api/attendance/cctv-sync?date=2025-02-12&classId=65c8a9b0c3f1a2b3c4d5e6f7

Response (200 OK):
{
  "success": true,
  "date": "2025-02-12",
  "count": 23,
  "records": [
    {
      "_id": "65c8a9c0c3f1a2b3c4d5e6f8",
      "studentId": {
        "_id": "607f1f77bcf86cd799439011",
        "name": "John Doe"
      },
      "status": "present",
      "date": "2025-02-12T00:00:00Z",
      "remarks": "cctv detection"
    },
    ...
  ]
}
```

## Database Relationships

```
Student (existing)
  ├── _id: ObjectId
  ├── name: String
  ├── classId: ObjectId
  └── ...

FacialDatabase (new)
  ├── _id: ObjectId
  ├── studentId: ObjectId → Student._id
  ├── classId: ObjectId → Class._id
  ├── embeddings: [
  │   ├── embedding: [512 numbers]
  │   ├── imageUrl: String
  │   └── uploadedAt: Date
  │ ]
  └── numberOfSamples: Number

Attendance (enhanced)
  ├── _id: ObjectId
  ├── studentId: ObjectId → Student._id
  ├── classId: ObjectId → Class._id
  ├── date: Date
  ├── status: String (present/absent/late)
  └── remarks: String (source: CCTV/manual)
```

## Component Interactions

```
┌──────────────────────────────────────────────────┐
│     React: Teacher Attendance Component          │
│                                                  │
│  useState:                                       │
│  - activeTab: "manual" | "cctv" | "upload"      │
│  - students: []                                  │
│  - attendance: { studentId: status }            │
│  - selectedDate: string                         │
│  - message: string                              │
│  - loading: boolean                             │
│                                                  │
│  Handlers:                                       │
│  - loadStudents()      → GET /api/admin/students│
│  - handleStatusChange()→ Update state            │
│  - submitAttendance()  → POST bulk API           │
│  - handleBulkImageUpload() → POST upload API    │
│  - syncCCTVAttendance() → GET cctv-sync API     │
│                                                  │
│  Renders:                                        │
│  - Tab navigation (3 tabs)                      │
│  - Manual: Date + Status table                  │
│  - CCTV: Video feed + Sync button                │
│  - Upload: Student selector + Drag area         │
└──────────────────────────────────────────────────┘
```

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Face detection per frame | 100-150ms | CPU-based, ~10-15 FPS |
| Cosine similarity matching | 10-50ms | 512-dim vectors |
| Single image processing | 2-3sec | Embedding generation |
| Batch image upload (10 images) | 20-30sec | Sequential processing |
| Database query (studentId) | <50ms | Indexed field |
| API response time | 50-200ms | Including DB round-trip |
| CCTV stream latency | 1-2sec | MJPEG format |

## Scalability Considerations

### Current Capacity
- ✅ 100-500 students per school
- ✅ 5-10 training images per student
- ✅ Daily attendance for ~30 classes
- ✅ Single webcam/CCTV stream

### Future Scaling
- 🔄 Multiple CCTV streams (parallel processing)
- 🔄 GPU acceleration (10x faster recognition)
- 🔄 Redis caching for embeddings (50x faster queries)
- 🔄 Distributed worker nodes (batch processing)
- 🔄 GraphQL for complex queries

## Security Best Practices

1. **Facial Data**
   - Embeddings only (not raw images)
   - Encrypted at rest (optional)
   - Access-controlled API endpoints

2. **Attendance Records**
   - Teacher/Admin only access
   - Audit logging enabled
   - Parent notification (optional)

3. **API Security**
   - HTTPS in production
   - JWT/token-based auth
   - Rate limiting
   - Input validation

4. **Database**
   - MongoDB authentication
   - Network isolation
   - Regular backups
   - Encryption keys managed securely

## Monitoring & Alerts

### Key Metrics to Track
- Face recognition accuracy (%)
- CCTV uptime (%)
- API response times (ms)
- Database query performance
- Storage usage (GB)

### Alerts to Configure
- 🚨 MongoDB connection lost
- 🚨 CCTV feed unavailable >5 min
- 🚨 Face recognition confidence <70%
- 🚨 API error rate >5%
- 🚨 Storage usage >80%

## Deployment Checklist

- [ ] Python environment fully configured
- [ ] MongoDB running and accessible
- [ ] Environment variables set (MONGODB_URI)
- [ ] SSL certificates installed (if HTTPS)
- [ ] Rate limiting configured
- [ ] CORS settings reviewed
- [ ] Backup strategy implemented
- [ ] Monitoring alerts active
- [ ] Documentation reviewed
- [ ] Test coverage adequate
- [ ] UAT completed successfully

---

For detailed setup instructions, see [ATTENDANCE_QUICKSTART.md](./ATTENDANCE_QUICKSTART.md)
