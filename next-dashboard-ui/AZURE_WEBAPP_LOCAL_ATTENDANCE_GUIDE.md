# Azure Web App + Local Attendance Server Guide

This guide is for the deployment model that best fits your project when the camera must stay on a school machine:

1. Deploy the Next.js app to Azure App Service
2. Run the attendance Python backend on a local school PC
3. Expose the local attendance backend to the internet through a secure tunnel
4. Point the Azure web app at that public attendance URL

This keeps the camera local while still letting other users open the web app from different PCs.

## 1. Recommended Architecture

Use this setup:

- Azure App Service (Linux): runs `next-dashboard-ui`
- Local school Windows PC: runs `attendance_cctv/backend`
- Cloudflare Tunnel: exposes the local attendance backend as HTTPS
- MongoDB: shared by both the Azure web app and the local attendance backend

Traffic flow:

- Browser -> Azure Next.js app
- Browser -> Cloudflare Tunnel hostname for the attendance backend
- Azure Next.js app -> MongoDB
- local attendance backend -> MongoDB

Why this setup works well:

- the camera stays on the school PC
- the full web app is available from other PCs
- no Azure Windows VM is required for the attendance backend
- no router port-forwarding is required if you use Cloudflare Tunnel

## 2. Important Constraint In Your Current Code

The attendance UI calls the Python backend from the browser through `NEXT_PUBLIC_CCTV_BACKEND_URL`.

That means:

- the attendance backend must be reachable from the browser
- a local LAN-only URL like `http://192.168.1.50:8000` will not work if the Next.js app is hosted on the internet and users are outside that LAN
- if the web app is HTTPS, the attendance backend also needs HTTPS or the browser will block the requests as mixed content

Because of that, the clean production solution is:

- Azure App Service for the web app
- Cloudflare Tunnel for the local attendance backend

## 3. What You Need Before Starting

Prepare these first:

- Azure subscription
- MongoDB connection string
- school PC that will always run the attendance backend
- Python 3.10 on the school PC
- Cloudflare account
- one domain managed in Cloudflare for production tunnel use
- GitHub repository for the web app, or a local machine that can run Azure CLI for deployment

If you do not have a Cloudflare-managed domain yet:

- you can use a quick tunnel only for testing
- use a named tunnel with your own domain for real deployment

## 4. Phase A: Prepare and Test the Attendance Backend Locally

Do this on the school PC.

### 4.1 Install Python 3.10

Install Python 3.10, then confirm:

```powershell
py -0p
```

You should see a `3.10` runtime.

### 4.2 Create the Virtual Environment

From the project root on the school PC:

```powershell
cd C:\path\to\next-dashboard-ui\attendance_cctv
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

### 4.3 Create `attendance_cctv/backend/.env`

Create `next-dashboard-ui\attendance_cctv\backend\.env` with:

```env
MONGODB_URI=YOUR_MONGODB_URI
DB_NAME=kindergarten
ALLOWED_ORIGINS=https://YOUR_WEB_APP.azurewebsites.net

ENABLE_CAMERA=true
CAMERA_INDEX=0
CAMERA_BACKEND=dshow
CAMERA_WARMUP_FRAMES=10
CAMERA_OPEN_TIMEOUT_SECONDS=8

INSIGHTFACE_HOME=C:\attendance-cache\.insightface
```

Replace:

- `YOUR_MONGODB_URI`
- `YOUR_WEB_APP.azurewebsites.net`

If you use an RTSP/IP camera instead of a redirected webcam, replace the camera section with:

```env
ENABLE_CAMERA=true
CAMERA_SOURCE=rtsp://user:password@camera-host/stream
CAMERA_BACKEND=ffmpeg
```

### 4.4 Start the Attendance Backend

```powershell
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4.5 Verify It Locally

In PowerShell:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/debug
Invoke-RestMethod -Method Post http://localhost:8000/start-camera
```

Do not continue until this works locally.

## 5. Phase B: Expose the Local Attendance Backend Securely

Because the Azure frontend is HTTPS, the attendance backend must also be reachable through HTTPS.

The easiest production path is Cloudflare Tunnel.

### 5.1 Create a Cloudflare Tunnel

In Cloudflare:

1. Log in to Cloudflare Dashboard
2. Go to `Zero Trust`
3. Go to `Networks` or `Networking` -> `Tunnels`
4. Click `Create tunnel`
5. Choose `Cloudflared`
6. Give it a name like `school-attendance`
7. Choose `Windows`
8. Cloudflare will show a token-based install command for `cloudflared`

### 5.2 Install `cloudflared` on the School PC

Follow the Windows install steps from the Cloudflare tunnel setup page.

Then install the tunnel service with the token Cloudflare gives you.

Cloudflare’s current docs use this pattern:

```powershell
cloudflared.exe service install <TUNNEL_TOKEN>
```

### 5.3 Add a Public Hostname Route

Still in the Cloudflare tunnel page:

1. Open your tunnel
2. Go to `Routes`
3. Click `Add route`
4. Choose `Published application`
5. Enter a hostname like:
   - subdomain: `attendance`
   - domain: `yourdomain.com`
6. Set the service URL to:

```text
http://localhost:8000
```

7. Save the route

Now your public attendance backend URL becomes:

```text
https://attendance.yourdomain.com
```

### 5.4 Test the Public Attendance URL

From any browser:

```text
https://attendance.yourdomain.com/health
```

Do not move on until this opens successfully.

### 5.5 Temporary Testing Without a Domain

For testing only, Cloudflare supports quick tunnels:

```powershell
cloudflared tunnel --url http://localhost:8000
```

This gives you a temporary `trycloudflare.com` URL.

Do not use it as your final production URL because:

- it is temporary
- Cloudflare documents a 200 concurrent request limit
- it is intended for testing

## 6. Phase C: Create the Azure Web App

You are deploying only the Next.js web app to Azure.

### 6.1 Create the App Service

In the Azure Portal:

1. Search for `App Services`
2. Click `Create`
3. Choose `Web App`

Set:

- Publish: `Code`
- Runtime stack: Node.js LTS available in the portal
- Operating system: `Linux`
- Region: choose the closest reasonable region

Pricing recommendation:

- use `Free F1` only for testing
- use `Basic B1` or above for real use

Why:

- your app uses a custom Node server and Socket.IO
- Azure documents that Linux Free plan supports WebSockets but only up to five concurrent connections

### 6.2 Note the Azure URL

After creation, your app URL will be something like:

```text
https://your-web-app.azurewebsites.net
```

You will use that exact URL in:

- the attendance backend `ALLOWED_ORIGINS`
- the web app public URL settings

## 7. Phase D: Configure App Settings in Azure

Before deployment, add the app settings in Azure App Service.

In the Azure Portal:

1. Open your App Service
2. Go to `Settings` -> `Environment variables`
3. Under `App settings`, add these:

```text
PORT=8080
APP_URL=https://your-web-app.azurewebsites.net
NEXT_PUBLIC_APP_URL=https://your-web-app.azurewebsites.net
NEXT_PUBLIC_SOCKET_URL=
MONGODB_URI=YOUR_MONGODB_URI
DNS_SERVERS=8.8.8.8,1.1.1.1
PYTHON_BACKEND_URL=https://attendance.yourdomain.com
NEXT_PUBLIC_PYTHON_BACKEND_URL=https://attendance.yourdomain.com
NEXT_PUBLIC_CCTV_BACKEND_URL=https://attendance.yourdomain.com
ANOMALY_SERVICE_AUTO_START=false
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

Notes:

- `PORT=8080` is optional if Azure already injects `PORT`, but keeping it explicit is fine
- `SCM_DO_BUILD_DURING_DEPLOYMENT=true` tells App Service to run build automation during zip deploy
- `NEXT_PUBLIC_*` must be set correctly before the build that produces your deployed frontend

If you use email, push notifications, or AI providers, also add the relevant keys from `.env.example`.

## 8. Phase E: Set the Startup Command in Azure

In the same App Service:

1. Go to `Settings` -> `Configuration` or `General settings`
2. Find `Startup Command`
3. Set it to:

```text
npm start
```

Why this works:

- your `package.json` has a valid `start` script
- your custom server already listens on the Azure `PORT` variable

## 9. Phase F: Deploy the Next.js App to Azure

There are two practical deployment methods.

### Option 1: Zip Deploy From Your Machine

This is the easiest way to avoid build-time environment mismatches.

From your local machine at `next-dashboard-ui`:

1. Make sure the Azure App Service app settings are already saved
2. Create a ZIP of the project root contents
3. Deploy with Azure CLI:

```bash
az login
az webapp deploy --resource-group <RESOURCE_GROUP> --name <APP_NAME> --src-path <ZIP_FILE>
```

Because `SCM_DO_BUILD_DURING_DEPLOYMENT=true` is set, App Service will build on Azure during deployment.

### Option 2: GitHub Deployment

This is good if you want automatic redeploys on push.

But be careful:

- your `NEXT_PUBLIC_*` values are build-sensitive
- the build environment must know the same values you want in production

If you use GitHub Actions, make sure those public environment values are available in the workflow build step, or you may accidentally bake `localhost` fallbacks into the client bundle.

If you want the safest first deployment, use Option 1 first.

## 10. Phase G: Verify the Azure Web App

After deployment:

1. Open:

```text
https://your-web-app.azurewebsites.net/api/health
```

2. Open:

```text
https://your-web-app.azurewebsites.net
```

3. Sign in and load:

```text
https://your-web-app.azurewebsites.net/teacher/attendance
```

If the attendance backend URL is correct, the page should call the Cloudflare tunnel hostname instead of `localhost`.

## 11. Phase H: Final End-to-End Smoke Test

Run this full test:

1. Open the Azure web app
2. Sign in as a teacher
3. Open the attendance page
4. Upload face samples for one student
5. Confirm the upload succeeds
6. Open the known-faces list through the attendance UI
7. Start the camera
8. Confirm detections appear
9. Open attendance reports
10. Export one daily report

This proves:

- browser -> Azure web app
- browser -> Cloudflare tunnel -> local attendance backend
- web app -> MongoDB
- attendance backend -> MongoDB

## 12. Making the Local Attendance Backend Persistent

On the school PC, keep both of these persistent:

- the attendance backend
- the Cloudflare tunnel service

### 12.1 Attendance Backend Startup

Create a file like:

`C:\attendance\start-attendance-backend.bat`

```bat
@echo off
cd /d C:\path\to\next-dashboard-ui\attendance_cctv
call .venv\Scripts\activate.bat
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Create a Scheduled Task:

- trigger: At log on
- user: the staff account that will stay signed in on the school PC
- action: run the batch file
- option: Run only when user is logged on

If you depend on webcam redirection or a local interactive session, keep the backend in a logged-in session.

### 12.2 Cloudflare Tunnel Startup

Cloudflare’s service install command sets `cloudflared` up as a Windows service.

Confirm it is running after reboot.

## 13. Troubleshooting

### 13.1 Azure Web App Loads but Attendance Fails

Check these first:

- `NEXT_PUBLIC_CCTV_BACKEND_URL`
- `NEXT_PUBLIC_PYTHON_BACKEND_URL`
- `PYTHON_BACKEND_URL`
- whether `https://attendance.yourdomain.com/health` opens in a browser

### 13.2 Mixed Content Errors

If the Azure site is:

```text
https://your-web-app.azurewebsites.net
```

then the attendance backend must also be HTTPS:

```text
https://attendance.yourdomain.com
```

Do not use an `http://` attendance URL with an HTTPS Azure web app.

### 13.3 CORS Errors

Set:

```env
ALLOWED_ORIGINS=https://your-web-app.azurewebsites.net
```

Restart the local attendance backend after changing it.

### 13.4 Build Succeeds But Browser Still Uses `localhost`

That means the deployed frontend was built with the wrong public values.

Check:

- `NEXT_PUBLIC_CCTV_BACKEND_URL`
- `NEXT_PUBLIC_PYTHON_BACKEND_URL`

Then redeploy the web app so the correct values are used during the build.

### 13.5 Attendance Tunnel Works Sometimes, Then Changes

That happens with quick tunnels.

Use a named tunnel with your own domain for the real deployment.

### 13.6 Socket.IO Limits on Free App Service

Azure documents that Linux Free App Service supports WebSockets, but only up to five concurrent connections.

If you expect real multi-user usage, move the web app to at least Basic B1.

## 14. Final Checklist

Before calling the deployment finished, confirm all of these:

- `https://your-web-app.azurewebsites.net/api/health` works
- `https://attendance.yourdomain.com/health` works
- teacher attendance page loads
- face upload works
- known faces appear
- live camera starts
- detections appear
- attendance reports export correctly

If all of that passes, your hybrid deployment is running correctly.
