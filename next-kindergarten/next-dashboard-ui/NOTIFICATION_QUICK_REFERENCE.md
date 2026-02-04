# 🔔 Push Notifications - Quick Debugging Checklist

## ✅ Do This First

1. **Go to test page**: Open `http://localhost:3000/test-notifications` in your browser
2. **Open console**: Press `F12` → go to "Console" tab
3. **Click "Check Permission"** button
   - ✅ Should show: "Permission: granted"
   - ❌ If shows "denied": See Browser Settings below

4. **Click "Test Sound"** button
   - ✅ Should hear a beep
   - ❌ No sound? Check volume or Issue #3 below

5. **Click "Test Notification"** button
   - ✅ Should see popup in top-right
   - ❌ No popup? Check Issue #4 below

---

## 🔴 Permission Issues

### Problem: "Permission: denied"

**Fix it:**
1. Click 🔒 lock icon in address bar
2. Click "Notifications" → "Allow"
3. Hit F5 to refresh
4. Try "Check Permission" again

---

## 🔴 Sound Issues

### Problem: No beep sound

**Fix it:**
1. Check speaker volume (system level)
2. Right-click browser tab → "Unmute"
3. Reload page and try again
4. Check console for "Audio context suspended" message

**If shows "Audio context suspended":**
```javascript
// Paste in console:
const ctx = new AudioContext();
ctx.resume().then(() => console.log('Audio resumed'));
```

---

## 🔴 Notification Popup Issues

### Problem: No notification appears

**Checklist:**
1. Permission is "granted" (not "default" or "denied")
2. Try clicking "Test Notification" again
3. Look in top-right corner of screen
4. Check if browser is muted (see Sound Issues)
5. Open console (F12) and look for errors with [Notification] prefix

---

## 📊 Console Log Reading

Look for these logs when you click buttons:

**Good logs:**
```
✅ [Notification] Permission result: granted
✅ [Sound] Sound played successfully
✅ [Notification] Notification shown successfully
```

**Bad logs:**
```
❌ [Notification] Permission not granted: denied
❌ [Sound] Failed to play notification sound: NotAllowedError
❌ [Notification] Notifications not supported in this browser
```

---

## 🧪 Real Messaging Test

After verification, test with real messages:

1. Go to parent dashboard
2. Open console (F12)
3. Look for `[ParentMessagesCard]` logs
4. Should see: "Checking for new messages..." every 5 seconds
5. Have someone send you a message
6. Switch to another tab (window NOT focused)
7. Should hear beep and see notification popup

---

## 🛠️ Browser-Specific Help

### Chrome
- Settings → Privacy → Notifications → Add localhost to "Allowed"
- Make sure notifications are not muted in system

### Firefox  
- Preferences → Privacy & Security → Permissions → Notifications → Allow

### Safari (Mac)
- System Preferences → Notifications → Find your browser → Allow

### Edge
- Settings → Privacy → Website permissions → Notifications → Allow

---

## 🎯 Quick Tests

### Test 1: Check if supported
```javascript
console.log('Supported:', 'Notification' in window);
```

### Test 2: Check permission
```javascript
console.log('Permission:', Notification.permission);
```

### Test 3: Send manual notification
```javascript
if (Notification.permission === 'granted') {
  new Notification('Test Title', { body: 'Test body' });
}
```

---

## 📱 What Should Happen

1. **First visit**: Browser asks "Allow notifications?" → Click "Allow"
2. **"Check Permission"**: Shows "Permission: granted"
3. **"Test Sound"**: You hear a beep sound
4. **"Test Notification"**: Popup appears in top-right corner

---

## ❓ Still Not Working?

Check in this order:
1. Permission is "granted" (not denied)
2. Volume is ON (system and browser)
3. Browser supports notifications (Chrome/Firefox/Edge)
4. Console has no error logs
5. Try in Incognito mode (clears cache/settings)

Copy any `[Notification]` or `[Sound]` error logs from console and share them!
