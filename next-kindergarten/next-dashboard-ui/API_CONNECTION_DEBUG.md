# 🔍 API CONNECTION TROUBLESHOOTING GUIDE

## Problem
"Unable to load students" message appears with retry button

## Root Causes

### 1. **Server Not Running** (Most Common)
**Symptoms:**
- Error shows on page load
- Console shows connection timeout

**Fix:**
```bash
# Terminal 1: Start Next.js server
cd next-dashboard-ui
npm run dev

# Should see: "Local: http://localhost:3000"
```

### 2. **Wrong API Endpoint**
**Symptoms:**
- Error: "404 Not Found"

**Check:**
```javascript
// In browser console (F12 → Console):
fetch('/api/admin/students').then(r => {
  console.log('Status:', r.status);
  return r.json();
}).then(console.log)
```

**Should return:**
- Status: 200
- Data: Array of students

**If 404:**
- Check if route exists: `src/app/api/admin/students/route.ts`
- Check if file has `export async function GET() {...}`

### 3. **MongoDB Not Connected**
**Symptoms:**
- Server running but API returns error
- Console shows: "MongoDB connection failed"

**Fix:**
```bash
# Start MongoDB
# Windows:
mongod

# Mac:
brew services start mongodb-community

# Check connection:
mongo --version  # Should show version
```

### 4. **No Students in Database**
**Symptoms:**
- Students array is empty
- UI shows "0 available"

**Fix:**
```bash
# Check if students exist in MongoDB
# Open MongoDB Compass or mongo shell:
db.students.find()

# Should return array of student documents
# If empty, you need to create/import students first
```

### 5. **Network/CORS Issues**
**Symptoms:**
- Error shows CORS-related message
- Network tab shows: "failed to fetch"

**Fix:**
```javascript
// Check CORS in browser console:
fetch('/api/admin/students', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
}).then(r => r.json()).then(console.log)
```

---

## Step-by-Step Diagnosis

### Step 1: Check Server Status
```bash
# Can you reach the server?
# Open in browser: http://localhost:3000

# Expected: Page loads (may have errors in components, but page exists)
# If: Connection refused → Server not running
```

### Step 2: Check API Directly
```bash
# In browser address bar:
http://localhost:3000/api/admin/students

# Expected: JSON array of students (or error if none)
# If blank page: Route might not exist
# If: Connection refused → Server not running
```

### Step 3: Check Browser Console
```javascript
// F12 → Console tab
// Will automatically log:
// - "🔄 Fetching students..."
// - "✅ API Response: [...]" OR error details

// If nothing logged: Hook isn't running
// Page might not be loading component correctly
```

### Step 4: Check Network Tab
```
F12 → Network tab
Reload page
Look for: "students"
Click the request
Check:
- Status: Should be 200
- Response: Should show JSON array
- Size: Should be >0

If 404: Endpoint doesn't exist
If timeout: Server too slow or not responding
If error in response: Check MongoDB
```

### Step 5: Check API Route File
```bash
# File should exist:
src/app/api/admin/students/route.ts

# Should have:
export async function GET(req: NextRequest) {
  // ... logic
  return NextResponse.json(students)
}

# If missing: Create the file
```

---

## Common Error Messages

### "API Error: 404 Not Found"
**Cause:** Route doesn't exist  
**Fix:** Check if `src/app/api/admin/students/route.ts` exists

### "API Error: 500 Internal Server Error"
**Cause:** Error in the API handler  
**Fix:** Check server logs for error details

### "API request timed out (>10s)"
**Cause:** Server not responding  
**Fix:** 
- Restart Next.js: `npm run dev`
- Check if server is stuck/frozen

### "Network error"
**Cause:** Can't connect to server at all  
**Fix:**
- Verify server running at http://localhost:3000
- Check firewall settings
- Try different browser

---

## Full Debugging Flow

```
1. Open http://localhost:3000/teacher/attendance
   ↓
2. Click "📸 Facial Data" tab
   ↓
3. See error message?
   ├─ YES → Continue below
   └─ NO → Students loaded successfully!
   ↓
4. Open dev tools (F12)
   ↓
5. Go to Console tab
   ├─ See "🔄 Fetching students..."?
   │  ├─ YES → API was called
   │  └─ NO → Component didn't load
   ├─ See "✅ API Response: [...]"?
   │  ├─ YES → Data received, check response format
   │  └─ NO → API failed, see error details
   ├─ See error message?
   │  ├─ YES → Note the error type:
   │  │   ├─ Timeout → Server slow
   │  │   ├─ 404 → Route missing
   │  │   ├─ 500 → Server error
   │  │   └─ Network error → Connection issue
   │  └─ NO → Check Network tab
   ↓
6. Go to Network tab
   ├─ Can you see "/students" request?
   │  ├─ YES → Check status and response
   │  └─ NO → Reload page, look again
   ├─ Status 200?
   │  ├─ YES → Check response JSON format
   │  └─ NO → See error status, check API logs
   ├─ Has JSON response?
   │  ├─ YES → Check if it's array or object
   │  └─ NO → Empty response, check API code
   ↓
7. Still not working? Check:
   ├─ Server running? (npm run dev)
   ├─ MongoDB running?
   ├─ Students table has data?
   ├─ Route file exists?
   ├─ Browser cache cleared? (Ctrl+Shift+R)
   ├─ Console clear of CORS errors?
   └─ Port 3000 actually running Next.js?
```

---

## Quick Fixes (Try These First)

### Fix #1: Restart Server
```bash
# In terminal where npm is running:
Ctrl+C  (stop server)
npm run dev  (restart)

# Wait for: "ready - started server on"
```

### Fix #2: Clear Cache
```
Ctrl+Shift+R  (hard refresh)
OR
Press F12 → Network tab → Check "Disable cache"
OR
Ctrl+Shift+Delete → Clear browsing data
```

### Fix #3: Check Server is Actually Running
```bash
# Open new terminal, check if port 3000 is in use:
netstat -ano | findstr :3000  (Windows)
lsof -i :3000  (Mac/Linux)

# Should show node.exe using port 3000
# If empty: Server not running, start with: npm run dev
```

### Fix #4: Check MongoDB
```bash
# Verify MongoDB running:
mongo --version

# If not installed:
# Windows: Download from mongodb.com
# Mac: brew install mongodb-community

# Start MongoDB:
mongod
```

### Fix #5: Verify Students Table
```bash
# Connect to MongoDB:
# Use: MongoDB Compass (GUI)
# Or:  mongo shell

# Query:
db.students.countDocuments()

# Should return: number > 0
# If 0: No students in database, import or create test data
```

---

## Testing the API Manually

### Test via Browser
```
1. Open: http://localhost:3000/api/admin/students
2. Should see: JSON array like [{"_id":"...", "name":"...", ...}]
3. If: Error message or blank → API has problem
4. If: HTML error page → Route doesn't exist
```

### Test via Terminal
```bash
# Windows PowerShell:
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/students"

# Mac/Linux curl:
curl http://localhost:3000/api/admin/students

# Should return JSON array
```

### Test via Browser Console
```javascript
// Paste this in F12 → Console:
fetch('/api/admin/students')
  .then(r => {
    console.log('Status:', r.status)
    if (!r.ok) throw new Error(r.status + ' ' + r.statusText)
    return r.json()
  })
  .then(data => {
    console.log('✅ Success! Students:', data)
  })
  .catch(err => {
    console.error('❌ Error:', err)
  })

// Will show:
// - Status code
// - Success or error
// - Student data if successful
```

---

## If You Still Can't Solve It

**Provide this information:**

1. **Server Status:**
   ```bash
   # What does console show?
   npm run dev
   # Look for: "ready - started server on"
   ```

2. **API Response:**
   ```javascript
   // F12 → Console:
   fetch('/api/admin/students').then(r => r.text()).then(console.log)
   // What does it print?
   ```

3. **Error Message:**
   ```
   - What's the exact error shown on the page?
   - What's in the red box?
   ```

4. **File Check:**
   ```bash
   # Does this file exist?
   ls src/app/api/admin/students/route.ts
   ```

5. **MongoDB Status:**
   ```bash
   # Is MongoDB running?
   mongo --version
   ```

---

## Prevention

### For Future Issues:

1. **Keep Server Running**
   - Always start with: `npm run dev`
   - Don't close the terminal

2. **Keep MongoDB Running**
   - Start before using app: `mongod`
   - Or use MongoDB Atlas (cloud)

3. **Check Before Coding**
   - Verify API works: `curl http://localhost:3000/api/admin/students`
   - Verify data exists: MongoDB Compass

4. **Monitor Logs**
   - Keep terminal visible
   - Watch for errors while using app
   - Check browser console (F12) regularly

---

**You can now click "🔄 Retry Loading Students" button and follow the console logs to see exactly where the issue is!** 🎯
