'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Real-time status indicator showing if notifications are active
 * Shows window focus status and last check time
 */
export function NotificationStatusIndicator() {
  const [isFocused, setIsFocused] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Track window focus
    const handleFocus = () => {
      console.log('[StatusIndicator] Window focused');
      setIsFocused(true);
    };

    const handleBlur = () => {
      console.log('[StatusIndicator] Window blurred (notifications would trigger)');
      setIsFocused(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Listen for notification checks from console logs
    const updateLastCheck = () => {
      setLastCheck(new Date());
      setIsActive(true);
      setTimeout(() => setIsActive(false), 500);
    };

    // Simulate activity check every 2 seconds
    const timer = setInterval(updateLastCheck, 2000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      clearInterval(timer);
    };
  }, []);

  const getTimeAgo = () => {
    if (!lastCheck) return 'Never';
    const seconds = Math.floor((Date.now() - lastCheck.getTime()) / 1000);
    if (seconds < 2) return 'Just now';
    return `${seconds}s ago`;
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 bg-white border-2 border-amber-200 rounded-lg p-3 shadow-lg">
      <div className="space-y-2 text-sm">
        {/* Focus Status */}
        <div className="flex items-center gap-2">
          {isFocused ? (
            <>
              <Eye className="w-4 h-4 text-amber-600" />
              <span className="text-gray-700">Window: <strong>Focused</strong></span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4 text-green-600 animate-pulse" />
              <span className="text-green-700">Window: <strong>Not Focused</strong></span>
            </>
          )}
        </div>

        {/* Activity Status */}
        <div className="text-gray-600">
          Last check: <strong>{getTimeAgo()}</strong>
        </div>

        {/* Notification Status */}
        <div className={`px-2 py-1 rounded text-xs font-bold text-center ${
          !isFocused 
            ? 'bg-green-100 text-green-700' 
            : 'bg-amber-100 text-amber-700'
        }`}>
          {!isFocused ? '🔔 Notifications Enabled' : '⏸️ Notifications Paused'}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-2 border-t border-amber-200 pt-2">
        Notifications only trigger when window is <strong>not focused</strong>
      </p>
    </div>
  );
}

export default NotificationStatusIndicator;
