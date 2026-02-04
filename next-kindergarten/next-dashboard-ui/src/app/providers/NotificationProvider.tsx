'use client';

import { ReactNode } from 'react';
import { useNotification } from '@/hooks/useNotification';

export function NotificationProvider({ children }: { children: ReactNode }) {
  // This component initializes the notification system
  useNotification();

  return <>{children}</>;
}
