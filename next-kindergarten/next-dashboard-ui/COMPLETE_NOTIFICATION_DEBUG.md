# 🔧 Complete Notification System Debugging

## What I've Added for Debugging

### 1. **Test Page** (`/test-notifications`)
- Interactive UI to test notifications
- Status display
- Troubleshooting guide

### 2. **Detailed Console Logs**
All messages prefixed for easy filtering:
- `[Notification]` - Notification system
- `[Sound]` - Audio playback
- `[ParentMessagesCard]` - Message checking

### 3. **NotificationTester Component**
- Check permission status
- Test sound
- Test notification
- View detailed logs

---

## Step-by-Step Debugging

### Step 1: Verify Browser Support

**URL**: `http://localhost:3000/test-notifications`

**Click**: "Check Permission" button

**Console should show**:
```
[Notification] Hook mounted
[Notification] Support check: true
[Notification] Current permission: default
[Notification] Requesting permission...
[Notification] Permission result: granted
```

**If you see**:
- ✅ `Permission result: granted` → Continue to Step 2
- ❌ `Current permission: denied` → Grant permission (see below)
- ❌ `Support check: false` → Browser not supported, try Chrome

---

### Step 2: Grant Permission (If Needed)

**If you see "denied"**:

1. Click 🔒 icon in address bar
2. Find "Notifications" dropdown
3. Select "Allow"
4. Press F5 to reload
5. Return to test page and click "Check Permission" again

---

### Step 3: Test Sound

**Click**: "Test Sound" button

**You should**:
- ✅ Hear a beep sound
- ✅ See `[Sound] Sound played successfully` in console

**If no sound**:
1. Check system volume (not muted)
2. Check browser volume (tab not muted)
3. Check console for `[Sound]` errors
4. Look for "Audio context suspended" message

**Fix audio context**:
```javascript
// Paste in console and press Enter:
const ctx = new AudioContext();
if (ctx.state === 'suspended') {
  ctx.resume().then(() => console.log('Audio context resumed'));
}
```

---

### Step 4: Test Notification Popup

**Click**: "Test Notification" button

**You should**:
- ✅ See notification popup in top-right corner
- ✅ See `[Notification] Notification shown successfully` in console

**If no popup**:
1. Check permission is "granted"
2. Look for notification in system tray
3. Check console for `[Notification]` errors
4. Try clicking button again

---

## Understanding the Logs

### Notification System Logs

**On hook mount**:
```
[Notification] Hook mounted
[Notification] Support check: true
[Notification] Current permission: default
```

**When requesting permission**:
```
[Notification] Requesting permission...
[Notification] Permission result: granted
```

**When sending notification**:
```
[Notification] Attempting to send notification: {title: "New Message from Mrs. Sharma", ...}
[Sound] Playing notification sound...
[Sound] Audio context created, state: running
[Sound] Sound played successfully
[Notification] Sending notification...
[Notification] Notification shown successfully
```

**When something fails**:
```
[Notification] Permission not granted: denied
[Notification] User has denied notifications. Cannot send.
```

---

### Sound System Logs

**Successful sound**:
```
[Sound] Playing notification sound...
[Sound] Audio context created, state: running
[Sound] Sound played successfully
```

**Suspended audio context**:
```
[Sound] Audio context created, state: suspended
[Sound] Audio context suspended, resuming...
[Sound] Audio context resumed
[Sound] Sound played successfully
```

**Audio error**:
```
[Sound] Failed to play notification sound: DOMException: play() failed
```

---

### Message Checking Logs

**Every 5 seconds in ParentMessagesCard**:
```
[ParentMessagesCard] Checking for new messages...
[ParentMessagesCard] Contacts fetched: 3 window focused: true
[ParentMessagesCard] Contact: Mrs. Sharma unreadCount: 0
[ParentMessagesCard] Contact: Admin unreadCount: 1
[ParentMessagesCard] Triggering notification for: Admin
```

---

## Common Problems and Solutions

### Problem 1: "Permission: denied"

**Cause**: You blocked notifications

**Solution**:
```
1. Lock icon 🔒 → Notifications → Allow
2. F5 refresh
3. Try again
```

---

### Problem 2: No Sound Plays

**Cause**: Audio context suspended or volume muted

**Solution**:
```javascript
// In console, paste and press Enter:
const ctx = new AudioContext();
ctx.resume().then(() => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 1000;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
  console.log('Sound test');
});
```

Check:
1. System volume up
2. Browser tab not muted
3. No "Audio context suspended" in logs

---

### Problem 3: No Notification Popup

**Cause**: Permission not granted or notification blocked

**Solution**:
1. Confirm permission is "granted" (not "default" or "denied")
2. Check top-right corner for popup
3. Try clicking "Test Notification" again
4. Check console for errors

---

### Problem 4: Message Notifications Not Working

**Cause**: Message checking not running or API failing

**Check**:
1. `[ParentMessagesCard]` logs should appear every 5 seconds
2. If no logs, user.id might be undefined
3. Check `/api/chat/contacts` API is working

**Test API**:
```javascript
// In console:
fetch('/api/chat/contacts?userId=YOUR_USER_ID')
  .then(r => r.json())
  .then(d => console.log('API response:', d))
  .catch(e => console.error('API error:', e));
```

---

## Advanced Debugging

### Check All Notifications API Features

```javascript
console.log('=== Notification API ===');
console.log('Supported:', 'Notification' in window);
console.log('Permission:', Notification.permission);
console.log('Close method:', typeof Notification.prototype.close);
console.log('Request method:', typeof Notification.requestPermission);
```

### Check Audio Context

```javascript
console.log('=== Audio Context ===');
const ctx = new (window.AudioContext || window.webkitAudioContext)();
console.log('Context state:', ctx.state);
console.log('Sample rate:', ctx.sampleRate);
console.log('Destination:', ctx.destination);
```

### Check All Cookies

```javascript
console.log('=== User Cookie ===');
const userCookie = document.cookie
  .split('; ')
  .find(row => row.startsWith('user='));
if (userCookie) {
  const user = JSON.parse(decodeURIComponent(userCookie.substring(5)));
  console.log('User:', user);
} else {
  console.log('No user cookie found');
}
```

---

## Files Created for Debugging

1. **`/test-notifications`** - Interactive test page
2. **`src/components/NotificationTester.tsx`** - Test component
3. **`src/hooks/useNotification.ts`** - Updated with logs
4. **`DEBUG_NOTIFICATIONS.md`** - This file
5. **`NOTIFICATION_QUICK_REFERENCE.md`** - Quick guide

---

## Integration Checklist

After debugging works:

- [ ] Test page working (`/test-notifications`)
- [ ] Permission shows "granted"
- [ ] Sound plays with "Test Sound"
- [ ] Notification appears with "Test Notification"
- [ ] ParentMessagesCard has message checking logs
- [ ] Real messages trigger notifications
- [ ] Notifications only show when window not focused
- [ ] Notification disappears after 5 seconds or on click

---

## Next Steps

1. ✅ Run through all 4 debugging steps
2. ✅ Verify each step works
3. ✅ Test with real messages
4. ⏳ Integrate into teacher dashboard
5. ⏳ Connect to Socket.IO for real-time (optional)

---

## Getting Help

If still not working, provide:

1. Browser type and version
2. OS (Windows/Mac/Linux)
3. Console error logs (copy full [Notification] or [Sound] lines)
4. Screenshot of test page result
5. Permission status from "Check Permission" button

Share these and we can pinpoint the exact issue!
