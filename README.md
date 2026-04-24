# Kindergarten Full System README

This repository is a multi-service kindergarten platform composed of:

- `next-dashboard-ui`: main web app (admin + teacher + parent) with API routes and real-time features
- `next-dashboard-ui/attendance_cctv/backend`: Python attendance and facial-recognition backend
- `next-dashboard-ui/secuirty-alerts`: Python anomaly/security-alert inference service
- `document-intake-lab`: standalone review-first document intake and OCR pipeline

The codebase supports school operations (people/classes/subjects/results), AI-assisted learning analytics, facial attendance, anomaly detection, messaging, notifications, and document ingestion.

---

## 1) System at a Glance

### Core product capabilities

1. Role-based school management for Admin, Teacher, Parent
2. Authentication with sign-in, sign-out, forgot/reset/change password flows
3. Student/teacher/parent lifecycle management including data import paths
4. Class, subject, timetable/event, notice, assignment, and result workflows
5. Real-time chat with delivery/read status and attachment support
6. Attendance management:
   - manual teacher entry
   - CCTV/face-recognition sync
   - facial embedding upload/training
7. ILDCE (Intelligent Learning Dynamics and Content Engine):
   - AI-assisted content processing
   - quiz pipelines
   - student/class metrics
   - predictive and research-grade analytics
8. Security anomaly pipeline for classroom safety (video/audio/stream)
9. Parent learning access to child performance, content, and alerts
10. Browser push notification support
11. Storage/asset retrieval route for uploaded content
12. Separate document-intake assistant for onboarding documents

---

## 2) Repository Structure

```text
Kindergarten/
  README.md                                  # this file
  next-dashboard-ui/                         # main product (Next.js + API)
    src/app/                                 # App Router pages and API routes
    src/lib/                                 # models, controllers, services
    attendance_cctv/backend/                 # face-recognition FastAPI service
    secuirty-alerts/                         # anomaly detection FastAPI service
    ai_calling/                              # Twilio calling helper package
    server.js                                # custom Next + Socket.IO server
    scripts/dev-with-attendance.js           # dev orchestration script
  document-intake-lab/                       # isolated OCR + quality-assessment service
```

---

## 3) Technology and Tooling Inventory

This section lists the concrete technologies and packages used by the code.

### A. Frontend + Web API (`next-dashboard-ui`)

#### Runtime platform

- Node.js
- Next.js 14 (App Router + API route handlers)
- React 18
- TypeScript
- Tailwind CSS + PostCSS

#### Data/database/auth/integration

- MongoDB
- Mongoose
- Cookie-based session handling in middleware and API routes
- dotenv for env loading

#### Realtime and communication

- Socket.IO + socket.io-client
- Nodemailer (email flows)
- Twilio (calling/messaging integrations)
- web-push (browser push notifications)

#### AI/ML and document/content processing in Node layer

- OpenAI SDK
- Google Generative AI SDK
- Hugging Face Inference SDK
- ONNX Runtime (Node)
- Tesseract.js
- pdf-parse
- fast-xml-parser
- xlsx

#### UI and validation libraries

- react-hook-form + @hookform/resolvers
- zod
- recharts
- react-big-calendar
- react-calendar
- lucide-react
- moment
- uuid
- axios

#### Build/dev/lint typing tools

- ESLint + eslint-config-next
- @types/* packages
- node-loader

### B. Attendance Python service (`next-dashboard-ui/attendance_cctv/backend`)

- Python
- FastAPI
- Uvicorn
- OpenCV
- NumPy
- ONNX Runtime
- InsightFace
- Pillow
- PyMongo
- python-dotenv
- pandas
- openpyxl
- python-multipart

### C. Security anomaly Python service (`next-dashboard-ui/secuirty-alerts`)

- Python
- FastAPI
- Uvicorn
- OpenCV
- NumPy
- ONNX Runtime
- PyTorch + torchvision + timm
- TensorFlow + TensorFlow Hub (version-gated)
- librosa + soundfile
- requests
- pydantic
- python-multipart

### D. Document intake service (`document-intake-lab`)

- Python
- FastAPI
- Uvicorn
- OpenCV
- NumPy
- Pillow
- Pydantic
- Jinja2
- python-multipart
- pytesseract
- Optional EasyOCR backend

---

## 4) Architecture and Runtime Flow

### Main web runtime

1. `server.js` starts Next.js and Socket.IO in one Node process.
2. It connects to MongoDB via Mongoose.
3. It runs a periodic event-reminder scheduler (`/api/events/reminders/run`).
4. Web UI pages consume API routes under `src/app/api/**`.
5. Some API routes proxy or orchestrate Python microservices:
   - attendance backend
   - anomaly service

### Development orchestration

- `npm run dev` executes `scripts/dev-with-attendance.js`.
- That script attempts to start:
  - Attendance FastAPI backend
  - Next.js dev server
- It also detects if either service is already running and reuses it.

### Security anomaly orchestration

- The Node layer has a `securityAlertServiceManager` utility that can:
  - check service health
  - auto-start the Python anomaly service locally (optional via env)
  - stop it and track recent logs

### Document intake isolation

- `document-intake-lab` is intentionally separate from the dashboard runtime.
- This allows safe document-processing experiments without changing the core app path.

---

## 5) Feature Inventory (Complete Domain Coverage)

The following list maps implemented capabilities from routes, modules, and docs.

### A. Identity, sessions, and access control

1. Sign-in, sign-out
2. Forgot password and reset password flows
3. Change password endpoint
4. Cookie/session extraction helpers
5. Route-level role authorization middleware (admin/teacher/parent)
6. Protected API responses for unauthorized/forbidden requests

### B. Admin operations

1. User/teacher/student/parent management
2. Teacher and student import workflows (including XML import routes)
3. Resend passwords and cleanup routes for expired records
4. Classes and class-teacher assignment
5. Subjects and class-subject assignments
6. Events and notices management
7. Exam cycle and subject setup configuration
8. Marksheet batches, auditing, and admin approval/review paths
9. Result and report-card template/assessment management
10. Attendance audit endpoints

### C. Teacher operations

1. Class roster and student views
2. Attendance marking (single/bulk patterns)
3. Attendance reports and related views
4. Assignment creation/list/update and submission review/issue handling
5. Teacher-parent messaging
6. Teacher events and notices access
7. Marks entry, marksheet creation/submission, and result workflows
8. Result-card assessment entry and report-card generation support
9. Teacher settings/profile pages
10. Teacher security-alert interface pages and APIs

### D. Parent operations

1. Parent child profile and children list access
2. Parent-side attendance and results endpoints
3. Parent chat/messages with teachers
4. Parent events and notices views
5. Parent class-content browsing
6. Parent AI helper endpoint (`/api/parent/ask-ai`)
7. Parent report-card views
8. Parent settings and profile updates

### E. Student and shared academic features

1. Student content retrieval endpoints
2. Shared events and notices feeds
3. Assignment lifecycle:
   - create/list assignments
   - submission upload/review/issue tracking
4. Results storage and retrieval with summaries and report formats

### F. ILDCE learning intelligence system

1. Topic creation and content ingestion
2. AI-derived summary, concepts, and quiz generation patterns
3. Quiz attempt submission and scoring
4. Student metrics tracking:
   - mastery
   - learning velocity
   - engagement
   - concept performance
5. Class/topic metrics:
   - class-topic overviews
   - knowledge decay
6. Advanced analytics endpoints:
   - learning velocity
   - engagement
   - alerts
   - performance comparison
   - concept heatmap
   - class entropy
7. Predictive endpoints:
   - revision schedule
   - performance forecast
8. Research-grade extensions in math engine docs:
   - personalized forgetting rates
   - topic volatility index
   - composite intelligence score
   - IRT support
   - Bayesian knowledge tracing
   - significance testing and longitudinal trend modeling

### G. Attendance with facial recognition and CCTV

1. Manual attendance submission endpoints from web app
2. Upload student facial images
3. CCTV sync endpoints in web app
4. Python backend features:
   - live video stream processing
   - browser camera frame processing
   - face recognition inference
   - liveness checks
   - attendance event tracking
   - extracted-face management
   - analytics/debug/tracker status
   - embedding reload
   - daily/monthly export and export file download

### H. Security alerts and anomaly detection

1. Video anomaly analysis route
2. NDJSON progress streaming for long video analysis
3. Audio anomaly analysis route
4. Stream/RTSP/webcam analysis route
5. Model registry and multi-model fusion engine
6. Optional ingest notification to main app (`/api/security-alerts/ingest`)
7. Main app control endpoints for service start/status/stop
8. Main app inference endpoints under `/api/security-alerts/*`

### I. Real-time communication and notifications

1. Chat contacts/history/read/send/upload APIs
2. Socket events:
   - room join by role/user
   - typing start/stop
   - messages read/seen updates
   - private message dispatch with delivery states
3. Push subscription endpoint
4. Notification sound endpoint

### J. Calling/voice/test utilities

1. STT/TTS/LLM test routes
2. Conversation/call test endpoints
3. Twilio helper package under `ai_calling`

### K. Document intake lab features (separate service)

1. Document image upload and API analysis endpoint
2. Health endpoint
3. OCR backend auto-selection and warmup
4. Page detection and perspective flattening
5. Image quality scoring:
   - blur
   - brightness
   - glare
   - edge density
   - page coverage
6. OCR enhancement pipeline and fallback variant reading
7. Document-type detection and field extraction
8. Decision statuses:
   - `rejected`
   - `review_required`
   - `high_confidence_prefill`
9. HTML UI for quick manual testing
10. CLI mode for local single-image analysis

---

## 6) API Surface (Grouped)

The project has an extensive API map. Grouped prefixes below represent implemented route handlers under `src/app/api/**`.

### Core/web

- `/api/health`
- `/api/profile/get`, `/api/profile/update`
- `/api/storage/[assetId]`

### Auth

- `/api/auth/signin`
- `/api/auth/signout`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`
- `/api/auth/change-password`

### Admin

- `/api/admin/users`
- `/api/admin/classes` + `/assign-teacher`
- `/api/admin/subjects`
- `/api/admin/class-subject-assignments`
- `/api/admin/assign-teachers`
- `/api/admin/students` + imports
- `/api/admin/teachers` + imports + resend/delete-expired
- `/api/admin/parents` + imports + resend/delete-expired
- `/api/admin/events`
- `/api/admin/notices`
- `/api/admin/exam-config/cycles`
- `/api/admin/exam-config/subject-setups`
- `/api/admin/marksheets` + audit routes
- `/api/admin/results`
- `/api/admin/results/card`
- `/api/admin/result-card-template`
- `/api/admin/result-card-assessments`
- `/api/admin/attendance-audit`

### Teacher

- `/api/teacher/classes`
- `/api/teacher/classes/[classId]/students`
- `/api/teacher/students/[studentId]`
- `/api/teacher/attendance`
- `/api/teacher/attendance/bulk`
- `/api/teacher/messages`
- `/api/teacher/parents`
- `/api/teacher/events`
- `/api/teacher/marks-entry`
- `/api/teacher/marksheets/create`
- `/api/teacher/marksheets/[batchId]`
- `/api/teacher/marksheets/[batchId]/entries`
- `/api/teacher/marksheets/[batchId]/submit`
- `/api/teacher/results`
- `/api/teacher/results/card`
- `/api/teacher/result-card-assessments`

### Parent

- `/api/parent/children`
- `/api/parent/child`
- `/api/parent/attendance`
- `/api/parent/results`
- `/api/parent/results/card`
- `/api/parent/events`
- `/api/parent/notices`
- `/api/parent/messages`
- `/api/parent/teachers`
- `/api/parent/class-subjects`
- `/api/parent/class-content`
- `/api/parent/class-content/[topicId]`
- `/api/parent/ask-ai`

### Assignments and messaging

- `/api/assignments`
- `/api/assignments/[assignmentId]`
- `/api/assignments/[assignmentId]/submissions`
- `/api/assignments/submissions/[submissionId]/review`
- `/api/assignments/submissions/[submissionId]/issue`
- `/api/chat/contacts`
- `/api/chat/history`
- `/api/chat/read`
- `/api/chat/send`
- `/api/chat/upload`

### Events/notices/push

- `/api/events`
- `/api/events/[eventId]`
- `/api/events/import`
- `/api/events/reminders/run`
- `/api/notices`
- `/api/push/subscribe`
- `/api/notification/sound`

### Attendance + security + AI/calling

- `/api/attendance/students`
- `/api/attendance/facial-upload`
- `/api/attendance/cctv-sync`
- `/api/attendance/backend/[...path]` (proxy path)
- `/api/security-alerts/service/start`
- `/api/security-alerts/service/status`
- `/api/security-alerts/service/stop`
- `/api/security-alerts/analyze-video`
- `/api/security-alerts/analyze-video-progress`
- `/api/security-alerts/run-inference`
- `/api/security-alerts/ingest`
- `/api/ai/query`, `/api/ai/teacher`, `/api/ai/parent`
- `/api/calling/test-llm`, `/api/calling/test-stt`, `/api/calling/test-tts`
- `/api/startCall`, `/api/processSpeech`, `/api/testConversation`, `/api/research-test`

### ILDCE

- `/api/ildce/topics`
- `/api/ildce/topics/[topicId]`
- `/api/ildce/topics/[topicId]/quiz`
- `/api/ildce/quizzes/[id]`
- `/api/ildce/quiz-attempt`
- `/api/ildce/metrics/student`
- `/api/ildce/metrics/class-topics`
- `/api/ildce/metrics/knowledge-decay`
- `/api/ildce/analytics/learning-velocity`
- `/api/ildce/analytics/engagement`
- `/api/ildce/analytics/alerts`
- `/api/ildce/analytics/performance-comparison`
- `/api/ildce/analytics/concept-heatmap`
- `/api/ildce/analytics/class-entropy`
- `/api/ildce/predictions/revision-schedule`
- `/api/ildce/predictions/performance-forecast`

---

## 7) Data Model Inventory (Main App)

Models under `src/lib/models` include:

- Activity
- Announcement
- Assignment
- AssignmentSubmission
- Attendance
- AttendanceAuditLog
- AuditLog
- ChatMessage
- Class
- ClassSubjectAssignment
- Event
- ExamCycle
- ExamSubjectSetup
- FacialDatabase
- MarkEntry
- MarksheetBatch
- Message
- Notice
- Observation
- ParentProfile
- PushSubscription
- Result
- ResultCardAssessment
- ResultCardTemplate
- ResultSummary
- Student
- StudentClassHistory
- Subject
- TeacherClassAssignment
- TeacherProfile
- User
- ILDCE-specific: Topic, Quiz, StudentQuizAttempt, StudentMetrics, TopicMetrics

---

## 8) Services and Ports

Typical local ports:

- Main Next app: `3000` (dev)
- Attendance backend: `8000`
- Security anomaly service: `8010`
- Document intake lab: `8020`

Exact ports are configurable through environment variables.

---

## 9) Local Run Guide (Full Stack)

### A. Main web app

```bash
cd next-dashboard-ui
npm install
npm run dev
```

Notes:

- `npm run dev` uses `scripts/dev-with-attendance.js` and can start attendance backend automatically when possible.
- For web-only dev without orchestration, use `npm run dev:web`.

### B. Attendance backend (standalone)

```bash
cd next-dashboard-ui/attendance_cctv/backend
python -m pip install -r ../requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### C. Security anomaly service

```bash
cd next-dashboard-ui/secuirty-alerts
python -m pip install -r requirements.txt
python main.py --serve --port 8010
```

### D. Document intake lab

```bash
cd document-intake-lab
python -m pip install -r requirements.txt
python main.py --serve --port 8020
```

---

## 10) Environment Variables (Consolidated)

Important variables referenced in code/docs include:

### Main app

- `MONGODB_URI`
- `APP_URL`
- `HOSTNAME`
- `SOCKET_CORS_ORIGINS`
- `NEXT_PUBLIC_SOCKET_URL`
- `NEXT_PUBLIC_PYTHON_BACKEND_URL`
- `EVENT_REMINDER_INTERVAL_MS`
- `DNS_SERVERS`

### Attendance backend

- `MONGODB_URI`
- `DB_NAME`
- `HOST`, `PORT`
- `ALLOWED_ORIGINS`
- camera and stream tuning vars (camera source, fps, dimensions, thresholds)

### Security anomaly service

- `ANOMALY_SERVICE_URL`
- `ANOMALY_SERVICE_AUTO_START`
- `ANOMALY_SERVICE_HOST`
- `ANOMALY_SERVICE_PORT`
- `ANOMALY_SERVICE_PYTHON`
- `ANOMALY_NOTIFY_INGEST`
- `ANOMALY_INGEST_URL`
- `MODEL_ALERT_TOKEN`

### Document intake lab

- OCR backend preferences (auto/easyocr/tesseract)
- `TESSERACT_CMD` (if using pytesseract with local binary)

---

## 11) Deployment Notes

The repository includes dedicated deployment guides for:

- Azure web app and VM variants
- Vercel + local backend hybrid
- attendance backend deployment options
- marks system deployment

See the top-level markdown guides in `next-dashboard-ui/` (for example: `AZURE_DEPLOYMENT.md`, `ATTENDANCE_VM_DEPLOYMENT.md`, `VERCEL_WEBAPP_LOCAL_ATTENDANCE_GUIDE.md`, `MARKS_SYSTEM_DEPLOYMENT.md`).

---

## 12) Operational Considerations

1. Some services are optional and can be run independently.
2. AI-dependent routes require provider keys and network access.
3. Face/anomaly quality depends on model assets and runtime hardware.
4. Document intake is review-first by design and should remain human-in-the-loop.
5. Middleware currently contains a development bypass flag for some admin routes (`BYPASS_ADMIN_AUTH = true`). Remove/disable for production hardening.

---

## 13) How This README Was Built

This README is based directly on the current workspace code and existing technical docs, including:

- route handler inventory from `src/app/api/**`
- models/controllers and runtime scripts
- Python service source and requirements
- project and subsystem guides (`ATTENDANCE_*`, `ILDCE_*`, `RESEARCH_*`, `PARENT_ACCESS_GUIDE`, etc.)

If new routes or services are added, update this README by re-running a route/model inventory and expanding the relevant domain section.
