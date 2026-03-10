import { useEffect, useCallback } from 'react';
import { addToast } from '@/app/components/ToastNotification';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export function useNotification() {
  const isBrowser = typeof window !== 'undefined';

  // Request notification permission on mount
  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    console.log('[Notification] Hook mounted');
    console.log('[Notification] Support check:', 'Notification' in window);
    console.log('[Notification] Current permission:', 'Notification' in window ? Notification.permission : 'N/A');
    
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        console.log('[Notification] Requesting permission...');
        Notification.requestPermission().then((permission) => {
          console.log('[Notification] Permission result:', permission);
        });
      } else {
        console.log('[Notification] Permission already set to:', Notification.permission);
      }
    } else {
      console.error('[Notification] Notifications not supported in this browser');
    }
  }, []);

  const playSound = useCallback(() => {
    if (!isBrowser) {
      return;
    }

    try {
      console.log('[Sound] Playing notification sound...');
      // Use Web Audio API to generate a notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('[Sound] Audio context created, state:', audioContext.state);
      
      // Resume audio context if suspended (required on user interaction)
      if (audioContext.state === 'suspended') {
        console.log('[Sound] Audio context suspended, resuming...');
        audioContext.resume().then(() => {
          console.log('[Sound] Audio context resumed');
        });
      }
      
      // Create oscillator for beep sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set frequency and duration
      oscillator.frequency.value = 1000; // 1000 Hz beep
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      console.log('[Sound] Sound played successfully');
    } catch (error) {
      console.error('[Sound] Failed to play notification sound:', error);
    }
  }, []);

  const sendNotification = useCallback(
    (options: NotificationOptions) => {
      if (!isBrowser) {
        return;
      }

      console.log('[Notification] Attempting to send notification:', options);
      
      if (!('Notification' in window)) {
        console.error('[Notification] Notifications not supported in this browser');
        return;
      }

      if (Notification.permission !== 'granted') {
        console.warn('[Notification] Permission not granted:', Notification.permission);
        console.log('[Notification] Current permission:', Notification.permission);
        if (Notification.permission === 'denied') {
          console.error('[Notification] User has denied notifications. Cannot send.');
        }
        return;
      }

      try {
        console.log('[Notification] Sending notification...');
        console.log('[Notification] Notification options:', options);
        
        // Play sound
        playSound();

        // Show notification
        console.log('[Notification] Creating Notification object...');
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/logo.png',
          badge: options.badge || '/logo.png',
          tag: options.tag || 'default',
          requireInteraction: options.requireInteraction || false,
          dir: 'ltr',
        });
        
        console.log('[Notification] Notification object created:', notification);
        console.log('[Notification] Notification shown successfully');

        // Click handler
        notification.onclick = () => {
          console.log('[Notification] User clicked notification');
          window.focus();
          notification.close();
        };

        // Also show as toast for better visibility
        addToast(options.title, options.body, 'notification');

        // Auto close after 5 seconds if not requiring interaction
        if (!options.requireInteraction) {
          setTimeout(() => {
            notification.close();
            console.log('[Notification] Auto-closed after 5 seconds');
          }, 5000);
        }
      } catch (error) {
        console.error('[Notification] Failed to send notification:', error);
      }
    },
    [playSound]
  );

  const sendMessageNotification = useCallback(
    (senderName: string, message: string) => {
      sendNotification({
        title: `New Message from ${senderName}`,
        body: message.substring(0, 100),
        tag: `message-${senderName}`,
      });
    },
    [sendNotification]
  );

  return {
    sendNotification,
    sendMessageNotification,
    playSound,
    notificationSupported: isBrowser && 'Notification' in window,
    permissionGranted: isBrowser && 'Notification' in window && Notification.permission === 'granted',
  };
}
