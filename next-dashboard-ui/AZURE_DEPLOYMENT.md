# Azure Deployment Guide

This repo contains three runtime pieces:

1. The Next.js dashboard app
2. The CCTV face-recognition backend in `attendance_cctv/backend`
3. The security-alert anomaly service in `secuirty-alerts`

To keep every feature working on Azure, deploy them as separate services and connect them with environment variables.

## 1. Deploy the Next.js app

Use an Azure App Service on Linux for `next-dashboard-ui`.

Startup command:

```bash
npm run start
```

Build command:

```bash
npm run build
```

Set these app settings:

- `APP_URL` = your public dashboard URL
- `NEXT_PUBLIC_APP_URL` = your public dashboard URL
- `NEXT_PUBLIC_SOCKET_URL` = leave empty for same-origin sockets, or set your public dashboard URL
- `MONGODB_URI` = your MongoDB connection string
- `PYTHON_BACKEND_URL` = public URL of the CCTV backend
- `NEXT_PUBLIC_PYTHON_BACKEND_URL` = public URL of the CCTV backend
- `NEXT_PUBLIC_CCTV_BACKEND_URL` = public URL of the CCTV backend
- `ANOMALY_SERVICE_URL` = public URL of the security-alert service
- `ANOMALY_SERVICE_AUTO_START` = `false`
- `SMTP_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `AI_PROVIDER`, and related AI settings

Health check path:

```text
/api/health
```

## 2. Deploy the CCTV backend

Deploy `attendance_cctv/backend` as a Python web app.

Startup command:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Set these app settings:

- `MONGODB_URI`
- `DB_NAME` if you want to override the default database name
- Any model or camera-related env vars already used by the backend

Make sure the public URL of this service is copied into the Next.js app settings above.

## 3. Deploy the security-alert service

Deploy `secuirty-alerts` as a Python web app.

Startup command:

```bash
python main.py --serve --host 0.0.0.0 --port 8010
```

Set these app settings:

- `MONGODB_URI`
- `ANOMALY_SERVICE_HOST=0.0.0.0`
- `ANOMALY_SERVICE_PORT=8010`

Do not enable local auto-start on Azure. Keep:

- `ANOMALY_SERVICE_AUTO_START=false`

## 4. Why this setup

- The dashboard uses a custom Node server, Socket.IO, and MongoDB, so it should run as a full Node app.
- The CCTV attendance features depend on Python services, so those stay separate.
- The security-alert features already support a remote service URL, so Azure can point to a deployed Python service cleanly.

## 5. Local development

For local development you can still run the dashboard with:

```bash
npm run dev
```

And keep the Python services on their local ports:

- CCTV backend on `http://localhost:8000`
- Security-alert service on `http://127.0.0.1:8010`
