# Push Notification Integration Guide

## Overview
This guide explains how to integrate push notifications with sound for new messages in both parent and teacher dashboards.

## Components Created

### 1. **useNotification Hook** (`src/hooks/useNotification.ts`)
Main hook for managing notifications and sound playback.

**Features:**
- Requests browser notification permission automatically
- Plays notification sound using Web Audio API
- Sends system notifications
- Handles notification click events

**Usage:**
```tsx
import { useNotification } from '@/hooks/useNotification';

function MyComponent() {
  const { 
    sendMessageNotification,     // Send message-specific notification
    sendNotification,             // Send custom notification
    playSound,                    // Play just the sound
    notificationSupported,        // Check if browser supports notifications
    permissionGranted             // Check if user granted permission
  } = useNotification();

  // Send a message notification
  const handleNewMessage = (senderName: string, message: string) => {
    sendMessageNotification(senderName, message);
  };

  return (
    // Component JSX
  );
}
```

### 2. **useMessageListener Hook** (`src/hooks/useMessageListener.ts`)
Hook for listening to new messages and triggering notifications.

**Usage:**
```tsx
import { useMessageListener } from '@/hooks/useMessageListener';

function ChatComponent() {
  const { handleNewMessage } = useMessageListener(currentUserId);
  
  // This hook will automatically handle notifications when new messages arrive
}
```

### 3. **NotificationProvider** (`src/app/providers/NotificationProvider.tsx`)
Wraps the app to initialize the notification system globally.

Already integrated into root layout.

## Integration Steps

### Step 1: Basic Integration in Chat Component
```tsx
'use client';

import { useEffect } from 'react';
import { useNotification } from '@/hooks/useNotification';
import { useAuth } from '@/hooks/useAuth';

export function ChatComponent() {
  const { user } = useAuth();
  const { sendMessageNotification } = useNotification();
  
  useEffect(() => {
    // Listen for new messages via Socket.IO or API polling
    const socket = io(); // Your socket connection
    
    socket.on('new-message', (messageData) => {
      // Only notify if window is not focused and message is for current user
      if (!document.hasFocus() && messageData.receiverId === user?.id) {
        sendMessageNotification(messageData.senderName, messageData.message);
      }
    });
    
    return () => socket.disconnect();
  }, [user?.id, sendMessageNotification]);
  
  return (
    // Component JSX
  );
}
```

### Step 2: Integration in Parent Messages Card
```tsx
// src/app/components/ParentMessagesCard.tsx
'use client';

import { useEffect } from 'react';
import { useNotification } from '@/hooks/useNotification';
import { useAuth } from '@/hooks/useAuth';

export default function ParentMessagesCard() {
  const { user } = useAuth();
  const { sendMessageNotification } = useNotification();

  useEffect(() => {
    // Fetch initial messages and set up listener
    const setupMessageListener = async () => {
      // Your message fetching logic
      
      // Set up Socket.IO listener or polling
      const checkNewMessages = setInterval(async () => {
        const response = await fetch(`/api/chat/contacts?userId=${user?.id}`);
        const data = await response.json();
        
        // Check for unread messages and notify
        data.forEach((contact) => {
          if (contact.unreadCount > 0) {
            sendMessageNotification(contact.name, contact.lastMessage?.message);
          }
        });
      }, 5000); // Check every 5 seconds
      
      return () => clearInterval(checkNewMessages);
    };
    
    if (user?.id) {
      setupMessageListener();
    }
  }, [user?.id, sendMessageNotification]);

  return (
    // Component JSX
  );
}
```

### Step 3: Integration in Teacher Messages
```tsx
// src/app/components/TeacherRecentActivity.tsx
'use client';

import { useEffect } from 'react';
import { useNotification } from '@/hooks/useNotification';
import { useAuth } from '@/hooks/useAuth';

export default function TeacherRecentActivity() {
  const { user } = useAuth();
  const { sendMessageNotification } = useNotification();

  useEffect(() => {
    // Similar to parent implementation
    if (!user?.id) return;
    
    // Set up message listener for teacher
    const checkMessages = setInterval(async () => {
      try {
        const response = await fetch(`/api/chat/contacts?userId=${user.id}`);
        const contacts = await response.json();
        
        contacts.forEach((contact) => {
          if (contact.unreadCount > 0 && !document.hasFocus()) {
            sendMessageNotification(
              contact.name, 
              contact.lastMessage?.message || 'New message'
            );
          }
        });
      } catch (error) {
        console.error('Failed to check messages:', error);
      }
    }, 5000);
    
    return () => clearInterval(checkMessages);
  }, [user?.id, sendMessageNotification]);

  return (
    // Component JSX
  );
}
```

## Notification Behavior

### When Notifications Trigger:
1. **New message arrives** for the current user
2. **Browser window is NOT focused** (user is on another tab/window)
3. **Notification permission is granted** by the user

### What Users See:
1. **Browser notification** with:
   - Sender name in title
   - Message preview in body
   - App icon
   
2. **Sound notification**:
   - 1000 Hz beep tone
   - 300ms duration
   - Volume: 30%

3. **Auto-dismissal**:
   - Notification closes after 5 seconds
   - User can click to focus the app

## Advanced Features

### Custom Notifications
```tsx
const { sendNotification } = useNotification();

sendNotification({
  title: 'Important Alert',
  body: 'Something important happened',
  icon: '/custom-icon.png',
  requireInteraction: true, // Don't auto-dismiss
  tag: 'important-alert', // Prevents duplicates with same tag
});
```

### Sound Only (No Notification)
```tsx
const { playSound } = useNotification();

// Play sound without showing notification
playSound();
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Notifications API | ✅ | ✅ | ✅ | ✅ |
| Web Audio API | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ⚠️ | ✅ |

## Testing

1. **Request Notification Permission:**
   - App automatically requests on first load
   - User can grant/deny in browser prompt

2. **Test Notification:**
   - Open two browser windows
   - Log in as different users
   - Send a message from one to the other
   - Switch to the window not focused
   - Should see notification + hear sound

3. **Check Permission Status:**
   ```tsx
   const { notificationSupported, permissionGranted } = useNotification();
   console.log('Notifications supported:', notificationSupported);
   console.log('Permission granted:', permissionGranted);
   ```

## Troubleshooting

### Notifications Not Working:
1. Check browser notification permission in settings
2. Ensure `useNotification` hook is being used
3. Verify window.Notification is supported
4. Check browser console for errors

### Sound Not Playing:
1. Check browser volume settings
2. Verify Web Audio API is supported
3. Check browser console for audio context errors
4. Some browsers require user interaction before audio plays

### Permission Requests Not Showing:
1. Clear browser cache
2. Go to Site Settings > Notifications
3. Reset permission to "Ask"
4. Reload the page

## Files Created/Modified

- ✅ `src/hooks/useNotification.ts` - Main notification hook
- ✅ `src/hooks/useMessageListener.ts` - Message listener hook
- ✅ `src/app/providers/NotificationProvider.tsx` - Global provider
- ✅ `src/app/layout.tsx` - Updated to include provider
- ✅ `src/app/api/notification/sound/route.ts` - Sound generation endpoint
- ✅ `src/app/components/NotificationIntegrationExample.tsx` - Example component

## Next Steps

1. Integrate `useNotification` into `ParentMessagesCard.tsx`
2. Integrate `useNotification` into your teacher message component
3. Set up Socket.IO listeners or API polling for new messages
4. Test across different browsers
5. Adjust notification frequency based on user preferences

## Questions?

For Socket.IO integration, ensure your server emits 'new-message' events with:
```typescript
{
  _id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  message: string;
  timestamp: Date;
  read: boolean;
}
```
