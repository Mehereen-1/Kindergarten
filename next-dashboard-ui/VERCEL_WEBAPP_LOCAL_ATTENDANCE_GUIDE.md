# Vercel Web App + Local Attendance Backend Guide

This guide matches the codebase in its current Vercel-ready shape:

1. The Next.js web app deploys to Vercel
2. The attendance Python backend stays on a local school PC
3. The local attendance backend is exposed through a public HTTPS tunnel
4. MongoDB is shared by both parts

## 1. Current Status

The repo is now deployable to Vercel, but with some important behavior changes compared to the old custom-server version.

What changed:

- production no longer depends on `server.js`
- `npm start` now uses standard `next start`
- chat works through HTTP send plus polling instead of in-process Socket.IO
- uploaded files are stored in Mongo-backed storage and served from `/api/storage/[assetId]`
- reminder scheduling can run through `vercel.json` cron instead of the old server loop
- temporary audio files use the OS temp directory instead of writing into the app folder

What did not change:

- the attendance backend still stays separate
- live camera still belongs on the local school PC
- security-alert features still need their own external Python service if you use them

## 2. Architecture

Use this setup:

- Vercel: `next-dashboard-ui`
- School PC: `attendance_cctv/backend`
- Cloudflare Tunnel: HTTPS public URL for the attendance backend
- MongoDB: shared database

Traffic flow:

- Browser -> Vercel app
- Browser -> Cloudflare Tunnel -> local attendance backend
- Vercel functions -> MongoDB
- local attendance backend -> MongoDB

## 3. What Is Vercel-Safe Now

These parts are already adapted for Vercel:

- [package.json](C:/system%20project/Kindergarten/next-dashboard-ui/package.json)
  `start` now uses `next start`
- [Chat.tsx](C:/system%20project/Kindergarten/next-dashboard-ui/src/components/Chat.tsx)
  chat uses REST plus polling instead of requiring the in-process Socket.IO server
- [chat send route](C:/system%20project/Kindergarten/next-dashboard-ui/src/app/api/chat/send/route.ts)
  stores messages without the custom socket server
- [serverStorage.ts](C:/system%20project/Kindergarten/next-dashboard-ui/src/lib/serverStorage.ts)
  stores uploaded assets in Mongo GridFS-style storage
- [storage route](C:/system%20project/Kindergarten/next-dashboard-ui/src/app/api/storage/[assetId]/route.ts)
  serves uploaded assets back to the browser
- [attendance facial upload route](C:/system%20project/Kindergarten/next-dashboard-ui/src/app/api/attendance/facial-upload/route.ts)
  stores preview images in Mongo-backed storage instead of `public/facial-data`
- [chat upload route](C:/system%20project/Kindergarten/next-dashboard-ui/src/app/api/chat/upload/route.ts)
  no longer writes to `public/uploads/chat`
- [ILDCE topics route](C:/system%20project/Kindergarten/next-dashboard-ui/src/app/api/ildce/topics/route.ts)
  no longer writes topic files into `public/uploads`
- [processSpeech route](C:/system%20project/Kindergarten/next-dashboard-ui/src/app/api/processSpeech/route.ts)
  uses OS temp storage and cleanup
- [test-stt route](C:/system%20project/Kindergarten/next-dashboard-ui/src/app/api/calling/test-stt/route.ts)
  uses OS temp storage and cleanup
- [reminder route](C:/system%20project/Kindergarten/next-dashboard-ui/src/app/api/events/reminders/run/route.ts)
  supports cron-triggered GET requests with `CRON_SECRET`
- [vercel.json](C:/system%20project/Kindergarten/next-dashboard-ui/vercel.json)
  includes a default daily cron entry

## 4. Important Tradeoffs

You should know these before choosing Vercel:

### 4.1 Chat Is No Longer True Realtime By Default

The old version used:

- `server.js`
- Socket.IO

The current Vercel-safe version uses:

- REST send
- polling for new messages

That means:

- message delivery still works
- unread/read updates still work
- typing indicators are gone
- instant push-style chat updates are replaced with short polling

If you want full realtime later, add a hosted realtime service or separate socket server.

### 4.2 Reminder Cron Is Not Equivalent To The Old Always-On Server Loop

The old server loop could run hourly.

The Vercel version uses `vercel.json` cron. The included schedule is:

```json
{
  "path": "/api/events/reminders/run",
  "schedule": "0 0 * * *"
}
```

That is a safe default for deployment, but it is a downgrade if you need more frequent reminders.

### 4.3 Attendance Still Depends On A Separate Reachable Backend

The browser calls the attendance backend directly through:

- `NEXT_PUBLIC_CCTV_BACKEND_URL`

So your local attendance backend must be reachable from the browser over HTTPS.

## 5. When You Should Use Vercel

Vercel is a good fit if all of these are true:

- you want the web app hosted cheaply and simply
- you are okay with polling-based chat
- the attendance backend stays local
- you can expose the attendance backend through HTTPS
- you do not need the old custom server behavior

## 6. When You Should Not Use Vercel

Do not choose Vercel if any of these are must-haves right now:

- built-in Socket.IO realtime on the same host
- frequent always-on background jobs without paid cron or another scheduler
- a single-server deployment where the web app itself must own the camera
- local process spawning for the security-alert backend on the Vercel host

## 7. Recommended Deployment Model

For your project, the best Vercel model is:

1. Keep attendance on the school PC
2. Expose it with Cloudflare Tunnel
3. Deploy the web app to Vercel
4. Point the Vercel app at the tunnel URL

Example attendance URL:

```text
https://attendance.yourdomain.com
```

## 8. Required Vercel Environment Variables

At minimum, set these in Vercel Project Settings:

```env
APP_URL=https://your-project.vercel.app
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
MONGODB_URI=YOUR_MONGODB_URI

PYTHON_BACKEND_URL=https://attendance.yourdomain.com
NEXT_PUBLIC_PYTHON_BACKEND_URL=https://attendance.yourdomain.com
NEXT_PUBLIC_CCTV_BACKEND_URL=https://attendance.yourdomain.com

ANOMALY_SERVICE_AUTO_START=false
CRON_SECRET=YOUR_RANDOM_SECRET
TZ=Asia/Dhaka
```

Notes:

- `CRON_SECRET` protects the cron-triggered reminder route
- `TZ` keeps date-based reminder logic aligned with your local timezone
- if you use email, AI, push notifications, or Twilio, also add those existing env vars from your current setup

## 9. Local Attendance Backend Requirements

On the school PC:

1. Run the Python backend
2. Verify `http://localhost:8000/health`
3. Expose it through Cloudflare Tunnel
4. Verify `https://attendance.yourdomain.com/health`

Do not deploy the attendance backend to Vercel.

## 10. Vercel Deploy Steps

### Step 1

Push the repo to GitHub.

### Step 2

Open Vercel and import the repository.

### Step 3

Let Vercel detect it as a Next.js project.

### Step 4

Add the environment variables listed above.

### Step 5

Deploy.

### Step 6

After deployment, test:

- `/api/health`
- teacher attendance page
- facial upload
- known faces
- attendance reports
- chat send and refresh

## 11. Smoke Test Checklist

After deploy, confirm:

- `https://your-project.vercel.app/api/health` works
- `https://attendance.yourdomain.com/health` works
- teacher attendance page loads
- uploading face images works
- known faces show preview images
- attendance export links work
- chat send works
- chat refresh picks up new messages
- reminders can be triggered manually with a secure request

## 12. Bottom-Line Recommendation

Should you deploy this on Vercel?

- **Yes**, if you want the easiest cloud host for the web app and you accept polling-based chat plus a separate local attendance backend.
- **No**, if you want the old custom-server behavior unchanged, especially true realtime chat and always-on background scheduling on the same host.

For your current project shape, my recommendation is:

- **Vercel is acceptable and deployable now**
- **Vercel is not the best fit if realtime chat is a top priority**
