# Push Notification Debugging Guide

## Quick Start

1. **Navigate to test page**: Go to `http://localhost:3000/test-notifications`
2. **Open browser console**: Press `F12` and go to Console tab
3. **Follow the instructions** on the page

## Common Issues and Fixes

### Issue 1: "Notifications not supported" Message

**Cause**: Browser doesn't support the Notification API

**Solution**:
- Use Chrome, Firefox, Safari, or Edge (latest versions)
- Check browser version (most updated versions support it)

**Debug**: 
```javascript
// In browser console:
console.log('Notification' in window);  // Should be true
```

---

### Issue 2: Permission Shows "denied"

**Cause**: You previously blocked notifications

**Solution**:
1. Click the 🔒 lock icon in address bar
2. Find "Notifications" setting
3. Change from "Block" to "Allow"
4. Refresh the page
5. Click "Check Permission" again

**Debug**:
```javascript
// In browser console:
console.log(Notification.permission);  // Should be "granted"
```

---

### Issue 3: No Sound Playing

**Cause**: Audio context issue or speaker muted

**Solution**:
1. Check speaker volume (system and browser)
2. Unmute browser tab (right-click tab → Unmute)
3. Check if AudioContext is suspended

**Debug**:
```javascript
// In browser console:
const ctx = new AudioContext();
console.log(ctx.state);  // Should be "running", not "suspended"

// Resume if suspended:
ctx.resume().then(() => console.log('Audio context resumed'));
```

---

### Issue 4: No Notification Popup Appears

**Cause**: Multiple possible reasons

**Solution**:
1. **Permission not granted**: Ensure permission is "granted" (not "default")
2. **Notification hidden**: Check system notification panel (top-right corner)
3. **Browser setting**: Check browser notification settings
4. **Console errors**: Look for errors in console (F12)

**Debug**:
```javascript
// In browser console:
console.log(Notification.permission);  // Must be "granted"
console.log(new Notification('Test', { body: 'Test message' }));  // Should work
```

---

## Testing Steps

### Step 1: Verify Support
```
Click: "Check Permission" button
Expected: "Permission: granted" status
If not: See "Issue 2" above
```

### Step 2: Test Sound
```
Click: "Test Sound" button
Expected: Hear a beep sound
If not: See "Issue 3" above
```

### Step 3: Test Notification
```
Click: "Test Notification" button
Expected: Browser notification popup in top-right
If not: See "Issue 4" above
```

---

## Reading Console Logs

The system logs with prefixes for easy filtering:

```
[Notification] - Notification system logs
[Sound] - Audio/sound logs
[ParentMessagesCard] - Message checking logs
[Test] - Test component logs
```

### Example Good Logs:
```
[Notification] Hook mounted
[Notification] Support check: true
[Notification] Current permission: default
[Notification] Requesting permission...
[Notification] Permission result: granted ✅
```

### Example Problem Logs:
```
[Notification] Hook mounted
[Notification] Support check: true
[Notification] Current permission: denied ❌
[Notification] User has denied notifications. Cannot send.
```

---

## Manual Testing in Console

### Test 1: Send Direct Notification
```javascript
// Copy and paste in console:
if (Notification.permission === 'granted') {
  new Notification('Test', {
    body: 'This is a test notification',
    icon: '/logo.png'
  });
} else {
  console.log('Permission not granted:', Notification.permission);
}
```

### Test 2: Play Sound Directly
```javascript
// Copy and paste in console:
const ctx = new AudioContext();
if (ctx.state === 'suspended') ctx.resume();

const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);

osc.frequency.value = 1000;
gain.gain.setValueAtTime(0.3, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

osc.start(ctx.currentTime);
osc.stop(ctx.currentTime + 0.3);
console.log('Sound played');
```

### Test 3: Check User ID
```javascript
// Copy and paste in console:
const userCookie = document.cookie
  .split('; ')
  .find(row => row.startsWith('user='));
  
if (userCookie) {
  const userData = JSON.parse(decodeURIComponent(userCookie.substring(5)));
  console.log('Current user:', userData);
} else {
  console.log('No user cookie found');
}
```

---

## Browser-Specific Issues

### Chrome
- Most reliable
- Check: Settings → Privacy → Notifications
- Allow notifications for localhost

### Firefox
- Works well
- Check: Preferences → Privacy & Security → Permissions → Notifications
- May show notification differently

### Safari (macOS)
- Requires macOS 13+
- Check: System Preferences → Notifications → Browser
- Limited background notification support

### Edge
- Same as Chrome
- Check: Settings → Privacy → Website permissions → Notifications

---

## Network Issues

If API call fails (`/api/chat/contacts`):

```javascript
// Test API in console:
fetch('/api/chat/contacts?userId=YOUR_USER_ID')
  .then(r => r.json())
  .then(data => console.log('API response:', data))
  .catch(err => console.error('API error:', err));
```

---

## Next Steps

Once notifications are working:

1. ✅ Verify sound plays with "Test Sound"
2. ✅ Verify popup shows with "Test Notification"  
3. ✅ Check "ParentMessagesCard" logs every 5 seconds
4. ✅ Test with actual messages from another user
5. ⏳ Monitor console for any errors

---

## Getting Help

If still not working, check:

1. **Console logs** - Look for [Notification] prefixed messages
2. **Browser support** - Try in Chrome first
3. **Permissions** - Ensure permission is "granted"
4. **Volume** - Check speaker and browser volume
5. **API response** - Is `/api/chat/contacts` working?

Share the console error messages for better debugging!
