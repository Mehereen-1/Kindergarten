'use client';

import { ReactNode, useEffect } from 'react';
import { addToast } from '@/app/components/ToastNotification';

export function NotificationProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const getCookie = (name: string): string => {
      const pair = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`));
      return pair ? decodeURIComponent(pair.split('=')[1]) : '';
    };

    const role = getCookie('userRole') || 'all';
    const seenKey = `seen-normal-notice-ids-${role}`;

    const getSeen = (): Set<string> => {
      try {
        const raw = localStorage.getItem(seenKey);
        return new Set(raw ? JSON.parse(raw) : []);
      } catch {
        return new Set();
      }
    };

    const setSeen = (set: Set<string>) => {
      try {
        localStorage.setItem(seenKey, JSON.stringify(Array.from(set).slice(-500)));
      } catch {
        /* ignore storage errors */
      }
    };

    const checkNotices = async () => {
      try {
        const response = await fetch(`/api/notices?role=${role}&limit=50`, { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return;

        const notices: any[] = Array.isArray(data?.notices) ? data.notices : [];
        const seen = getSeen();

        for (const notice of notices) {
          const id = String(notice?._id || '');
          if (!id || seen.has(id)) continue;

          const type = String(notice?.type || 'notice');
          if (!['notice', 'event-reminder', 'anomaly-alert'].includes(type)) continue;

          addToast(
            notice?.title || 'Notification',
            notice?.description || 'You have a new update.',
            type === 'anomaly-alert' ? 'sound' : 'notification'
          );
          seen.add(id);
        }

        setSeen(seen);
      } catch {
        /* ignore polling errors */
      }
    };

    void checkNotices();
    const timer = window.setInterval(checkNotices, 30000);
    return () => window.clearInterval(timer);
  }, []);

  return <>{children}</>;
}
