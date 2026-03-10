'use client';

import { ReactNode, useEffect } from 'react';
import { useNotification } from '@/hooks/useNotification';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { sendNotification } = useNotification();

  useEffect(() => {
    const getCookieValue = (name: string): string => {
      const pair = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`));
      return pair ? decodeURIComponent(pair.split('=')[1]) : '';
    };

    const role = getCookieValue('userRole') || 'all';
    const seenKey = 'seen-event-reminder-ids';

    const getSeen = (): Set<string> => {
      try {
        const raw = localStorage.getItem(seenKey);
        if (!raw) return new Set<string>();
        const parsed = JSON.parse(raw);
        return new Set(Array.isArray(parsed) ? parsed : []);
      } catch {
        return new Set<string>();
      }
    };

    const setSeen = (set: Set<string>) => {
      localStorage.setItem(seenKey, JSON.stringify(Array.from(set).slice(-500)));
    };

    const checkNotices = async () => {
      try {
        const response = await fetch(`/api/notices?role=${role}&limit=50`);
        const data = await response.json();
        if (!response.ok) return;

        const seen = getSeen();
        const notices = Array.isArray(data.notices) ? data.notices : [];

        for (const notice of notices) {
          if (notice?.type !== 'event-reminder') continue;
          const id = String(notice?._id || '');
          if (!id || seen.has(id)) continue;

          sendNotification({
            title: notice.title || 'Event Reminder',
            body: notice.description || 'You have an upcoming school event.',
            tag: `event-reminder-${id}`,
          });

          seen.add(id);
        }

        setSeen(seen);
      } catch {
        // Intentionally ignore polling errors.
      }
    };

    checkNotices();
    const timer = setInterval(checkNotices, 60000);
    return () => clearInterval(timer);
  }, [sendNotification]);

  return <>{children}</>;
}
