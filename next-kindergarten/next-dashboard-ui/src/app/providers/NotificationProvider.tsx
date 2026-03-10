'use client';

import { ReactNode, useEffect } from 'react';
import { useNotification } from '@/hooks/useNotification';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { sendNotification } = useNotification();

  useEffect(() => {
    const DEVICE_REMINDER_KEY = 'device-reminders-enabled';

    const getCookie = (name: string): string => {
      const pair = document.cookie.split('; ').find((r) => r.startsWith(name + '='));
      return pair ? decodeURIComponent(pair.split('=')[1]) : '';
    };

    const role = getCookie('userRole') || 'all';
    const seenKey = 'seen-event-reminder-ids';

    const getSeen = (): Set<string> => {
      try {
        const raw = localStorage.getItem(seenKey);
        return new Set(raw ? JSON.parse(raw) : []);
      } catch {
        return new Set();
      }
    };
    const setSeen = (set: Set<string>) =>
      localStorage.setItem(seenKey, JSON.stringify(Array.from(set).slice(-500)));

    // ── 1. Register service worker + subscribe to Web Push ──────────────────
    const setupPush = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      if (!VAPID_PUBLIC_KEY) return;

      const deviceRemindersEnabled = localStorage.getItem(DEVICE_REMINDER_KEY) === 'true';
      if (!deviceRemindersEnabled) return;

      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('[SW] Registered:', reg.scope);

        const permission = Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();

        if (permission !== 'granted') return;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }
        const json = sub.toJSON();
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        });
        console.log('[Push] Subscribed and saved');
      } catch (err) {
        console.error('[Push] Setup error:', err);
      }
    };

    const disablePush = async () => {
      if (!('serviceWorker' in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;

        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      } catch (err) {
        console.error('[Push] Disable error:', err);
      }
    };

    setupPush();

    const onDeviceReminderSettingChanged = () => {
      if (localStorage.getItem(DEVICE_REMINDER_KEY) === 'true') {
        setupPush();
      } else {
        disablePush();
      }
    };

    window.addEventListener('device-reminder-setting-changed', onDeviceReminderSettingChanged as EventListener);

    // ── 2. Poll for new notices → in-app toast ───────────────────────────────
    const checkNotices = async () => {
      try {
        const res = await fetch('/api/notices?role=' + role + '&limit=50');
        const data = await res.json();
        if (!res.ok) return;
        const seen = getSeen();
        const notices: any[] = Array.isArray(data.notices) ? data.notices : [];
        for (const notice of notices) {
          if (notice?.type !== 'event-reminder') continue;
          const id = String(notice?._id || '');
          if (!id || seen.has(id)) continue;
          sendNotification({
            title: notice.title || 'Event Reminder',
            body: notice.description || 'You have an upcoming school event.',
            tag: 'event-reminder-' + id,
          });
          seen.add(id);
        }
        setSeen(seen);
      } catch {
        /* ignore polling errors */
      }
    };

    checkNotices();
    const timer = setInterval(checkNotices, 30000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('device-reminder-setting-changed', onDeviceReminderSettingChanged as EventListener);
    };
  }, [sendNotification]);

  return <>{children}</>;
}
