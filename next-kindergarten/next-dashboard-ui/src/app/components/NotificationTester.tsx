'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/hooks/useNotification';
import { Bell, Volume2 } from 'lucide-react';

/**
 * Test component to verify notifications are working
 * Add this to a page temporarily to test
 */
export function NotificationTester() {
  const { sendMessageNotification, playSound, notificationSupported, permissionGranted } = useNotification();
  const [status, setStatus] = useState<string>('Initializing...');

  useEffect(() => {
    if (!notificationSupported) {
      setStatus('❌ Notifications not supported in this browser');
    } else if (permissionGranted) {
      setStatus('✅ Notifications enabled and ready');
    } else {
      setStatus('⏳ Waiting for permission...');
    }
  }, [notificationSupported, permissionGranted]);

  const testSound = () => {
    console.log('[Test] Testing sound...');
    setStatus('🔊 Playing sound...');
    playSound();
    setTimeout(() => setStatus('✅ Sound played'), 500);
  };

  const testNotification = () => {
    console.log('[Test] Testing notification...');
    if (permissionGranted) {
      setStatus('📢 Sending test notification...');
      sendMessageNotification('Test User', 'This is a test message notification');
      setTimeout(() => setStatus('✅ Notification sent'), 500);
    } else {
      setStatus('❌ Permission not granted');
      console.error('Notification permission not granted');
    }
  };

  const checkPermission = () => {
    console.log('[Test] Checking permission status...');
    console.log('- Support:', 'Notification' in window);
    console.log('- Permission:', 'Notification' in window ? Notification.permission : 'N/A');
    console.log('- Hook permissionGranted:', permissionGranted);
    setStatus(`Permission: ${Notification.permission}`);
  };

  return (
    <div className="bg-white border-2 border-amber-200 rounded-lg p-6 max-w-md">
      <h3 className="text-lg font-bold mb-4">Notification Tester</h3>
      
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm font-mono">{status}</p>
      </div>

      <div className="space-y-2">
        <button
          onClick={checkPermission}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition flex items-center justify-center gap-2"
        >
          <Bell size={18} />
          Check Permission
        </button>

        <button
          onClick={testSound}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition flex items-center justify-center gap-2"
        >
          <Volume2 size={18} />
          Test Sound
        </button>

        <button
          onClick={testNotification}
          className="w-full px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition flex items-center justify-center gap-2"
        >
          <Bell size={18} />
          Test Notification
        </button>
      </div>

      <div className="mt-4 p-3 bg-gray-100 rounded text-xs font-mono max-h-32 overflow-y-auto">
        <p>Open browser console (F12) to see detailed logs</p>
      </div>
    </div>
  );
}

export default NotificationTester;
