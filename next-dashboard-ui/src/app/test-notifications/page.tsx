'use client';

import { NotificationTester } from '@/app/components/NotificationTester';
import { ChatAPIDebugger } from '@/app/components/ChatAPIDebugger';
import { ToastContainer } from '@/app/components/ToastNotification';

export default function TestNotificationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <ToastContainer />
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-amber-900 mb-2">Notification Testing</h1>
        <p className="text-amber-700 mb-8">Use this page to test and debug notification functionality</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Test Component */}
          <div>
            <NotificationTester />
          </div>

          {/* Chat API Debugger */}
          <div>
            <ChatAPIDebugger />
          </div>

          {/* Instructions */}
          <div className="bg-white border-2 border-amber-200 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Instructions</h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-bold text-amber-900">Step 1: Check Permission</h4>
                <p className="text-gray-600">Click &quot;Check Permission&quot; button. You should see &quot;Permission: granted&quot;</p>
                <p className="text-xs text-amber-600 mt-2">If you see &quot;denied&quot;, go to browser settings and allow notifications</p>
              </div>

              <div>
                <h4 className="font-bold text-amber-900">Step 2: Test Sound</h4>
                <p className="text-gray-600">Click &quot;Test Sound&quot; button. You should hear a beep sound.</p>
                <p className="text-xs text-amber-600 mt-2">If no sound, check your speaker volume and browser settings</p>
              </div>

              <div>
                <h4 className="font-bold text-amber-900">Step 3: Test Notification</h4>
                <p className="text-gray-600">Click &quot;Test Notification&quot; button. You should see a browser notification popup.</p>
                <p className="text-xs text-amber-600 mt-2">The notification should appear in the top-right corner</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="font-bold text-blue-900 mb-2">Browser Console Logs</h4>
                <p className="text-xs text-gray-600">Press F12 to open Developer Tools → Console tab</p>
                <p className="text-xs text-gray-600 mt-1">You&apos;ll see detailed logs with [Notification] and [Sound] prefixes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="mt-8 bg-white border-2 border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-red-900 mb-4">Troubleshooting</h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-bold">❌ &quot;Notifications not supported&quot;</h4>
              <p className="text-gray-600">Your browser doesn&apos;t support notifications. Try Chrome, Firefox, or Edge.</p>
            </div>

            <div>
              <h4 className="font-bold">❌ &quot;Permission: denied&quot;</h4>
              <p className="text-gray-600">You blocked notifications. Fix it:</p>
              <ol className="list-decimal list-inside text-gray-600 mt-1 ml-2">
                <li>Click the lock icon in the address bar</li>
                <li>Find &quot;Notifications&quot; setting</li>
                <li>Change to &quot;Allow&quot;</li>
                <li>Reload the page</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold">❌ No sound playing</h4>
              <p className="text-gray-600">Check:</p>
              <ol className="list-decimal list-inside text-gray-600 mt-1 ml-2">
                <li>Speaker volume is up</li>
                <li>Browser volume not muted</li>
                <li>Open console (F12) for errors</li>
                <li>Check if AudioContext is suspended</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold">❌ No notification popup</h4>
              <p className="text-gray-600">Check:</p>
              <ol className="list-decimal list-inside text-gray-600 mt-1 ml-2">
                <li>Permission is &quot;granted&quot; (not &quot;default&quot; or &quot;denied&quot;)</li>
                <li>Check top-right corner of screen</li>
                <li>Notification might appear in system tray</li>
                <li>Open console (F12) for error logs</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
