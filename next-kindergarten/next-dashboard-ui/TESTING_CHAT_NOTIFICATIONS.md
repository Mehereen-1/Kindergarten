# Testing Chat Notifications

## Step 1: Open Test Page
Go to: `http://localhost:3000/test-notifications`

## Step 2: Test API Connection
1. Look for "Chat API Debugger" box (middle of page)
2. Click "Test API" button
3. Check if you see message contacts in the response

**If API returns error**:
- Make sure you're logged in as a parent user
- Check browser console for error details
- API needs userId cookie or query param

## Step 3: Check Notification Logs
1. Open browser console (F12)
2. Look for `[ParentMessagesCard]` logs
3. You should see "Checking for new messages..." every 3 seconds
4. If you see API error, check the response in Chat API Debugger

## Step 4: Send Test Message
To test with real messages:

1. **Open two browser windows** (or tabs in different profiles)
2. **Window 1**: Parent logged in
3. **Window 2**: Teacher logged in
4. **From teacher**: Send message to parent
5. **Check Window 1**: 
   - Console shows new notification trigger
   - Toast popup appears in top-right

## Step 5: Monitor Console

Look for these logs in order:
```
[ParentMessagesCard] Checking for new messages...
[ParentMessagesCard] Contacts fetched: X
[ParentMessagesCard] Contact: [Name], unreadCount: 1
[ParentMessagesCard] Triggering notification for: [Name]
[Notification] Attempting to send notification...
[Sound] Sound played successfully
[Notification] Notification shown successfully
```

## Troubleshooting

### API returns "Unauthorized"
- Make sure you're logged in
- Check that user cookie is set

### No contacts returned
- You haven't chatted with anyone yet
- Or chat API has no matching messages

### Notification doesn't trigger
- Check if `unreadCount` is greater than 0
- Check if notification was already shown (uses deduplication)
- Try sending a new message from another account

### Still not working?
1. Check Chat API Debugger response
2. Look at console logs for errors
3. Make sure messages API has unread messages
4. Verify you're testing with two different user accounts

---

**Note**: The system checks for new messages every 3 seconds and deduplicates to avoid showing same notification twice.
