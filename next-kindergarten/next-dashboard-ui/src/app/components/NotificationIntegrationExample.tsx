'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/hooks/useNotification';
import { Bell, Volume2 } from 'lucide-react';

/**
 * Example component showing how to integrate push notifications
 * This can be integrated into ParentMessagesCard, TeacherRecentActivity, or any component
 * that receives new messages
 */
export function NotificationIntegrationExample() {
  const { sendMessageNotification, sendNotification, notificationSupported, permissionGranted } = useNotification();
  const [showExample, setShowExample] = useState(false);

  // Example: Listen for new messages and trigger notification
  useEffect(() => {
    // This would be integrated with your Socket.IO connection
    // Example:
    // const socket = io();
    // socket.on('new-message', (messageData) => {
    //   if (!document.hasFocus()) {
    //     sendMessageNotification(messageData.senderName, messageData.message);
    //   }
    // });
    //
    // return () => socket.disconnect();
  }, [sendMessageNotification]);

  return (
    <div className="flex items-center gap-2">
      {notificationSupported && !permissionGranted && (
        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          Enable notifications for new messages
        </div>
      )}
    </div>
  );
}

export default NotificationIntegrationExample;
