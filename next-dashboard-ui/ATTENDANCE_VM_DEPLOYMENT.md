# Attendance Windows VM Deployment

Use a Windows VM when you want the attendance backend to keep live camera mode after deployment.

## When This Works

`POST /start-camera` works when the camera is visible to the Windows session running the backend.

Examples:

- A webcam physically attached to the machine
- A redirected webcam in an active Remote Desktop session
- A camera stream exposed through `CAMERA_SOURCE`

## VM Backend Setup

From `next-dashboard-ui/attendance_cctv` on the VM:

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
pip install -r backend\requirements.txt
cd backend
```

## Required Environment Variables

```powershell
$env:MONGODB_URI="your-mongodb-connection-string"
$env:DB_NAME="kindergarten"
$env:ALLOWED_ORIGINS="https://your-next-app-domain"
$env:ENABLE_CAMERA="true"
```

## Recommended Camera Settings For Windows

```powershell
$env:CAMERA_INDEX="0"
$env:CAMERA_BACKEND="dshow"
$env:CAMERA_WARMUP_FRAMES="10"
$env:CAMERA_OPEN_TIMEOUT_SECONDS="8"
```

If you are using a stream URL instead of a numeric webcam:

```powershell
$env:CAMERA_SOURCE="rtsp://user:password@camera-host/stream"
$env:CAMERA_BACKEND="ffmpeg"
```

## Start Command

```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## Next.js Web VM Configuration

On the web app VM, point the frontend to the attendance backend VM:

```text
PYTHON_BACKEND_URL=http://your-attendance-vm:8000
NEXT_PUBLIC_PYTHON_BACKEND_URL=http://your-attendance-vm:8000
NEXT_PUBLIC_CCTV_BACKEND_URL=http://your-attendance-vm:8000
```

## Verification

Check the backend on the VM:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/debug
```

Healthy camera-capable setup should show:

- `camera_enabled: true`
- `ready: true`
- `camera_default_source` set to your camera index or stream URL

Then trigger the live feed from the frontend, or test directly:

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/start-camera
```

## Important Deployment Notes

- If you rely on Remote Desktop webcam redirection, keep the backend in the logged-in desktop session.
- Do not use Azure App Service for live camera mode.
- Open inbound access only for the ports you actually need.
