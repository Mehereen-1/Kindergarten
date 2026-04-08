# Attendance Azure Deployment

Deploy `next-dashboard-ui/attendance_cctv/backend` as a separate Python App Service.

## Startup Command

```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

## Required Files

- `requirements.txt`
- `runtime.txt`
- `main.py`
- `face_engine.py`

These now live in `attendance_cctv/backend`.

## App Settings

- `MONGODB_URI`
- `DB_NAME`
- `ALLOWED_ORIGINS=https://your-next-app.azurewebsites.net`
- `ENABLE_CAMERA=false`
- `INSIGHTFACE_HOME=/home/site/insightface`

Optional:

- `FACE_MODEL_NAME=buffalo_l`
- `ATTENDANCE_TMP_DIR=/tmp`

## Health Check

Use:

```text
/health
```

Ready means:

- MongoDB is connected
- InsightFace initialized
- embeddings can be loaded

## Supported Azure Features

- Upload a video and process attendance
- Upload student facial images
- Reload embeddings from MongoDB
- Stream processed frames while a video is running

## Not Supported On Azure App Service

- `POST /start-camera`
- any workflow that expects a machine-local webcam

For live camera mode, run the backend on a Windows VM or local machine with `ENABLE_CAMERA=true`.
See [ATTENDANCE_VM_DEPLOYMENT.md](C:/system%20project/Kindergarten/next-dashboard-ui/ATTENDANCE_VM_DEPLOYMENT.md).
