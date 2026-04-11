# Azure Two-VM Deployment Guide

This guide deploys the project in the layout that matches the current codebase:

1. One Azure VM for the Next.js app
2. One Azure VM for the attendance Python backend
3. One shared MongoDB database

This is the recommended setup when you want:

- the main web app on one server
- the attendance backend on another server
- live camera support through the attendance VM

The guide is written to get the system running first, then make it stable.

## 1. Architecture

Use this layout:

- `web-vm`: Ubuntu VM, runs `next-dashboard-ui`
- `attendance-vm`: Windows VM, runs `attendance_cctv/backend`
- `MongoDB`: shared by both

Traffic flow:

- Browser -> Next.js web app on `web-vm`
- Browser -> attendance backend on `attendance-vm`
- Next.js server -> MongoDB
- attendance backend -> MongoDB

Important:

- The attendance frontend calls the Python backend from the browser using `NEXT_PUBLIC_CCTV_BACKEND_URL`.
- That means the attendance backend must be reachable from the browser.
- If the web app is served over HTTPS, the attendance backend must also be served over HTTPS to avoid mixed-content errors.

## 2. What Is Already Ready In Code

The repo is already prepared for split deployment in these areas:

- attendance backend URLs are environment-driven in `src/lib/clientConfig.ts` and `src/lib/serverConfig.ts`
- attendance report exports no longer hardcode `localhost`
- the custom Next.js server binds correctly for deployment
- the attendance backend supports environment-based camera config
- split deployment preview-image handling is fixed through MongoDB-backed `preview_image_url`

Current files involved:

- `server.js`
- `package.json`
- `src/lib/clientConfig.ts`
- `src/lib/serverConfig.ts`
- `src/app/api/attendance/facial-upload/route.ts`
- `src/app/components/AttendanceReportsPanel.tsx`
- `src/lib/models/FacialDatabase.ts`
- `attendance_cctv/backend/main.py`

## 3. Before You Start

Have these ready:

- Azure subscription
- one MongoDB connection string
- one Ubuntu VM hostname or public IP
- one Windows VM hostname or public IP
- a Windows machine you can use to RDP into the attendance VM
- Python 3.10 for the attendance VM
- Node.js 20 for the web VM

Decide your public names first:

- `WEB_HOST`
- `ATTENDANCE_HOST`

Examples:

- `web-vm.eastus.cloudapp.azure.com`
- `attendance-vm.eastus.cloudapp.azure.com`

## 4. Create Azure Resources

### 4.1 Create the Resource Group

Create one resource group in the Azure Portal.

Suggested name:

- `kindergarten-rg`

### 4.2 Create the Web VM

Create a Linux VM with these settings:

- OS: Ubuntu 22.04 LTS
- VM name: `web-vm`
- Public IP: yes
- NSG: allow SSH from your IP

For the first deployment, also allow inbound app traffic to port `3000`.

You can harden this later with a reverse proxy and TLS.

### 4.3 Create the Attendance VM

Create a Windows VM with these settings:

- OS: Windows Server 2022
- VM name: `attendance-vm`
- Public IP: yes
- NSG: allow RDP from your IP

For the first deployment, also allow inbound app traffic to port `8000`.

### 4.4 Notes About Camera Access

The attendance VM does not magically have a physical webcam.

Live camera mode works only when the backend can see a camera through one of these:

- webcam redirection in your RDP session
- an IP/RTSP stream passed through `CAMERA_SOURCE`

If you rely on RDP webcam redirection:

- keep the backend running in the logged-in desktop session
- do not run it as a headless background service

## 5. Deploy the Web App on the Ubuntu VM

### 5.1 Connect to the VM

SSH into the web VM:

```bash
ssh <your-user>@WEB_HOST
```

### 5.2 Install System Packages

```bash
sudo apt update
sudo apt install -y git curl build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Check versions:

```bash
node -v
npm -v
pm2 -v
```

### 5.3 Get the Project onto the VM

Clone or copy the repo, then go to the app:

```bash
cd ~
git clone <your-repo-url>
cd next-dashboard-ui
```

If the repo is already there:

```bash
cd ~/next-dashboard-ui
git pull
```

### 5.4 Create `.env.local`

Create `next-dashboard-ui/.env.local` with these values:

```env
PORT=3000
NODE_ENV=production

APP_URL=http://WEB_HOST:3000
NEXT_PUBLIC_APP_URL=http://WEB_HOST:3000
NEXT_PUBLIC_SOCKET_URL=

MONGODB_URI=YOUR_MONGODB_URI
DNS_SERVERS=8.8.8.8,1.1.1.1

PYTHON_BACKEND_URL=http://ATTENDANCE_HOST:8000
NEXT_PUBLIC_PYTHON_BACKEND_URL=http://ATTENDANCE_HOST:8000
NEXT_PUBLIC_CCTV_BACKEND_URL=http://ATTENDANCE_HOST:8000

ANOMALY_SERVICE_AUTO_START=false
```

Replace:

- `WEB_HOST`
- `ATTENDANCE_HOST`
- `YOUR_MONGODB_URI`

Notes:

- `NEXT_PUBLIC_*` values are baked into the frontend build
- if you change `NEXT_PUBLIC_*`, you must rebuild the Next.js app
- `server.js` explicitly loads `.env.local`, so this file is the right place to keep the VM config

### 5.5 Install Node Dependencies

```bash
npm ci
```

### 5.6 Build the App

```bash
npm run build
```

The build may print warnings from dynamic routes or optional AI paths, but the important thing is that it completes successfully.

### 5.7 Start the App

Run it with PM2:

```bash
pm2 start npm --name kindergarten-web -- start
pm2 save
pm2 startup
```

After `pm2 startup`, run the command PM2 prints to complete auto-start registration.

### 5.8 Verify the Web App

On the VM:

```bash
curl http://localhost:3000/api/health
```

From your browser:

```text
http://WEB_HOST:3000
```

If that works, the web server is up.

## 6. Deploy the Attendance Backend on the Windows VM

### 6.1 Connect to the VM

Use Remote Desktop to sign into the attendance VM.

If you need live webcam mode through RDP:

- enable webcam redirection in your RDP client before connecting

### 6.2 Install Python 3.10

Install Python 3.10 on the attendance VM.

After install, confirm:

```powershell
py -0p
```

You should see a `3.10` runtime available.

### 6.3 Get the Project onto the VM

Clone or copy the repo to the VM.

Then open PowerShell and go here:

```powershell
cd C:\path\to\next-dashboard-ui\attendance_cctv
```

### 6.4 Create the Virtual Environment

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
pip install -r backend\requirements.txt
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### 6.5 Create `attendance_cctv/backend/.env`

Create `next-dashboard-ui\attendance_cctv\backend\.env` with these values:

```env
MONGODB_URI=YOUR_MONGODB_URI
DB_NAME=kindergarten
ALLOWED_ORIGINS=http://WEB_HOST:3000

ENABLE_CAMERA=true
CAMERA_INDEX=0
CAMERA_BACKEND=dshow
CAMERA_WARMUP_FRAMES=10
CAMERA_OPEN_TIMEOUT_SECONDS=8

INSIGHTFACE_HOME=C:\attendance-cache\.insightface
```

Replace:

- `WEB_HOST`
- `YOUR_MONGODB_URI`

If you use an RTSP/IP camera instead of a redirected webcam, use this instead of the index-based camera settings:

```env
ENABLE_CAMERA=true
CAMERA_SOURCE=rtsp://user:password@camera-host/stream
CAMERA_BACKEND=ffmpeg
```

### 6.6 Start the Backend

```powershell
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Keep this window open while you test.

### 6.7 Verify the Backend

From PowerShell on the VM:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/debug
```

You want to see:

- MongoDB connected
- face engine ready
- `ready: true`
- camera enabled

Test camera startup:

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/start-camera
```

If this fails, see the troubleshooting section below.

## 7. Connect the Two Servers

Once both services are running:

1. confirm the web app `.env.local` points at the attendance VM
2. confirm the attendance backend `.env` allows the web app origin
3. restart the services if you changed any env value

Restart web app:

```bash
pm2 restart kindergarten-web
```

Restart attendance backend:

- stop the running `uvicorn` process
- run the `uvicorn` command again

Important:

- if you change `NEXT_PUBLIC_PYTHON_BACKEND_URL` or `NEXT_PUBLIC_CCTV_BACKEND_URL`, run `npm run build` again before restarting PM2

## 8. First End-to-End Smoke Test

Do this in order.

### 8.1 Web Health Check

Open:

```text
http://WEB_HOST:3000/api/health
```

### 8.2 Attendance Backend Health Check

Open:

```text
http://ATTENDANCE_HOST:8000/health
```

### 8.3 Teacher Attendance Page

Open:

```text
http://WEB_HOST:3000/teacher/attendance
```

### 8.4 Upload Face Samples

From the attendance page:

1. choose a class
2. open the upload tab
3. upload face images for a student
4. confirm the upload succeeds

This hits:

- the Next.js upload route
- the Python embedding route
- MongoDB for saved face metadata

### 8.5 Reload Embeddings

From the page or directly:

```text
POST http://ATTENDANCE_HOST:8000/reload-embeddings
```

### 8.6 Confirm Known Faces

Open:

```text
http://ATTENDANCE_HOST:8000/known-faces
```

You should see students and sample counts.

### 8.7 Start the Camera

From the attendance page, switch to live mode and start the camera.

Or test directly:

```text
POST http://ATTENDANCE_HOST:8000/start-camera
```

### 8.8 Check the Feed

The teacher attendance page should now display detections and live updates from the backend.

### 8.9 Export a Report

Open:

```text
http://WEB_HOST:3000/teacher/attendance-reports
```

Generate one daily report and one monthly report.

This confirms:

- browser -> attendance backend
- report endpoints
- export files listing
- download links

## 9. Make the Attendance Backend Re-Start Easily

For live-camera mode with RDP redirection, do not run the backend as a fully headless Windows service.

Use a login-triggered startup instead.

### 9.1 Create a Start Script

Create a file like `C:\attendance\start-attendance-backend.bat`:

```bat
@echo off
cd /d C:\path\to\next-dashboard-ui\attendance_cctv
call .venv\Scripts\activate.bat
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 9.2 Create a Scheduled Task

Create a Windows Scheduled Task with:

- trigger: At log on
- user: the account you use for the RDP session
- action: start `C:\attendance\start-attendance-backend.bat`
- option: Run only when user is logged on

That keeps camera access compatible with redirected webcam mode.

If you use an RTSP/IP camera instead of RDP webcam redirection, you can later convert this to a service-style startup if you want.

## 10. Optional Production Hardening

The steps above get the system running on public ports quickly.

For a more production-like setup, add:

- a reverse proxy on the web VM
- a reverse proxy on the attendance VM
- HTTPS certificates
- locked-down NSG rules
- custom domains

If you switch the web app to HTTPS, also switch the attendance backend to HTTPS before using the attendance pages in a browser.

## 11. Hardcoded and Deployment Caveats

### 11.1 What Will Not Break Split Deployment

These parts are already handled:

- attendance frontend/backend URL separation
- attendance report export URLs
- backend camera env configuration
- Next.js custom server startup
- preview image handling for newly uploaded attendance samples

### 11.2 Important Remaining Caveats

- The attendance backend is called directly by the browser, so it must be reachable from the browser.
- If the web app is HTTPS and the backend is HTTP, browser requests to the backend will be blocked.
- Security-alert features are separate from this two-server deployment. Those features still need the anomaly service if you use them.
- Some AI-related paths may still log warnings if external AI providers are not configured. That does not block the attendance deployment.

## 12. Troubleshooting

### 12.1 Next.js App Starts but Browser Pages Cannot Reach Attendance

Check:

- `NEXT_PUBLIC_CCTV_BACKEND_URL`
- `NEXT_PUBLIC_PYTHON_BACKEND_URL`
- NSG inbound rule for port `8000`
- whether the browser can open `http://ATTENDANCE_HOST:8000/health`

If the browser cannot open that URL, the attendance frontend will fail too.

### 12.2 CORS Errors

Check `ALLOWED_ORIGINS` in `attendance_cctv/backend/.env`.

It must match the exact origin of the web app, for example:

```env
ALLOWED_ORIGINS=http://WEB_HOST:3000
```

### 12.3 `start-camera` Fails

Check:

- is the camera visible inside the Windows session?
- did you enable webcam redirection before RDP login?
- are you using the right backend for Windows, usually `dshow`?
- does `GET /debug` show the camera settings you expect?

### 12.4 Python Dependency Install Fails

Use Python 3.10.

If you try 3.14 or another unsupported version, packages like `insightface` may try to build from source and fail.

### 12.5 Face Upload Works but Preview Images Look Wrong

New uploads are now stored with a MongoDB-backed preview image reference.

If you still see broken previews for older records created before this fix:

- re-upload one sample image for that student
- reload embeddings

### 12.6 `NEXT_PUBLIC_*` Changes Do Nothing

You must rebuild:

```bash
npm run build
pm2 restart kindergarten-web
```

### 12.7 `MONGODB_URI` Errors

Check:

- the URI is valid
- the DB/network allows connections from both Azure VMs
- DNS resolution works from both machines

## 13. Final Checklist

Before calling the deployment finished, confirm all of these:

- web app opens on `http://WEB_HOST:3000`
- `http://WEB_HOST:3000/api/health` works
- attendance backend opens on `http://ATTENDANCE_HOST:8000/health`
- teacher attendance page loads
- face upload works
- embeddings reload works
- known faces list works
- live camera starts
- detections appear
- attendance reports export correctly

If you want to keep this as a simple first deployment, stop here once everything passes.

If you want a tighter production setup next, the next step is to add HTTPS and proxy both services behind standard `80/443` endpoints.
