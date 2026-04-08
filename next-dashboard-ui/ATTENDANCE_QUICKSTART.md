# Attendance Backend Quick Start

This backend has three practical deployment modes:

- Local machine: upload-video mode and live camera mode
- Azure App Service: upload-video mode only
- Windows VM: upload-video mode and live camera mode

The active FastAPI app is [main.py](C:/system%20project/Kindergarten/next-dashboard-ui/attendance_cctv/backend/main.py), not `main_v2.py`.

## Local Or Windows VM Setup

From `next-dashboard-ui/attendance_cctv` in PowerShell:

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
pip install -r backend\requirements.txt
cd backend
..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Use the virtualenv Python explicitly on Windows. This avoids accidentally launching the global `uvicorn` from Python 3.14, which can cause reload/spawn errors.

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## Local Env Vars

Set these before starting the backend:

```powershell
$env:MONGODB_URI="your-mongodb-connection-string"
$env:DB_NAME="kindergarten"
$env:ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
$env:ENABLE_CAMERA="true"
```

Optional:

```powershell
$env:FACE_MODEL_NAME="buffalo_l"
$env:INSIGHTFACE_HOME="$PWD\.insightface"
$env:CAMERA_INDEX="0"
$env:CAMERA_BACKEND="dshow"
$env:CAMERA_WARMUP_FRAMES="10"
```

If your camera is exposed to the app as a URL instead of a numeric webcam index:

```powershell
$env:CAMERA_SOURCE="rtsp://user:password@camera-host/stream"
$env:CAMERA_BACKEND="ffmpeg"
```

## Local Checks

After startup:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/debug
```

Healthy upload-video mode should show:

- `mongodb_connected: true`
- `face_engine_ready: true`
- `ready: true` on `/health`

Then open:

```text
http://localhost:3000/teacher/video-attendance
http://localhost:3000/teacher/attendance
```

## Azure App Service Deployment

Deploy the folder `attendance_cctv/backend` as a Python App Service.

Startup command:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

App settings:

- `MONGODB_URI`
- `DB_NAME`
- `ALLOWED_ORIGINS=https://your-next-app.azurewebsites.net`
- `ENABLE_CAMERA=false`
- `INSIGHTFACE_HOME=/home/site/insightface`

Notes:

- Azure upload-video mode works.
- Azure live camera mode does not work, because App Service has no local webcam device.
- The backend now exposes `/health` for readiness checks.

## Windows VM Deployment

Use this mode when you need `POST /start-camera` to open the camera on the machine running the backend.

Recommended environment variables on the VM:

- `MONGODB_URI`
- `DB_NAME`
- `ALLOWED_ORIGINS=https://your-next-app-domain`
- `ENABLE_CAMERA=true`
- `CAMERA_INDEX=0`
- `CAMERA_BACKEND=dshow`
- `CAMERA_WARMUP_FRAMES=10`

Start the backend on the VM:

```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Important notes for VM camera mode:

- The camera must be visible to the Windows session running the backend.
- If you use webcam redirection over Remote Desktop, run the backend in the logged-in user session, not as a headless background service.
- Check `http://localhost:8000/health` and `http://localhost:8000/debug` on the VM before connecting the Next.js frontend.

## What Works Where

- `POST /process-video`: local and Azure
- `GET /video`, `GET /video-stream-processed`: local and Azure while a video is being processed
- `POST /upload-student-images`: local and Azure
- `POST /reload-embeddings`: local and Azure
- `POST /start-camera`: local and Windows VM

## Common Issues

- `Face engine not ready`: dependencies are missing, or InsightFace model download/cache is broken
- `MongoDB not connected`: `MONGODB_URI` is missing or inaccessible
- `Activate.ps1 cannot be loaded`: run the execution-policy command above for the current shell
- `Backend not running on port 8000`: check that you started `uvicorn main:app` from `attendance_cctv/backend`
