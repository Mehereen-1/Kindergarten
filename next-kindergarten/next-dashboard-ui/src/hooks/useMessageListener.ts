import { useEffect, useCallback } from 'react';
import { useNotification } from './useNotification';

export interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export function useMessageListener(currentUserId?: string) {
  const { sendMessageNotification } = useNotification();

  const handleNewMessage = useCallback(
    (messageData: Message) => {
      // Only notify if the message is for the current user and we're not focused
      if (messageData.receiverId === currentUserId && !document.hasFocus()) {
        sendMessageNotification(messageData.senderName, messageData.message);
      }
    },
    [currentUserId, sendMessageNotification]
  );

  // Listen for messages via polling or WebSocket
  useEffect(() => {
    if (!currentUserId) return;

    // You can integrate this with Socket.IO or use polling
    // For now, this is a placeholder for integration with your socket server
    // Example with Socket.IO:
    // const socket = io();
    // socket.on('new-message', handleNewMessage);
    // return () => socket.off('new-message', handleNewMessage);
  }, [currentUserId, handleNewMessage]);

  return { handleNewMessage };
}
