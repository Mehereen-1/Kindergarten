'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProfileView from '@/app/components/ProfileView';
import TeacherTopBar from '@/app/components/TeacherTopBar';

export default function TeacherProfilePage() {
  const { user } = useAuth();
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-[var(--color-background)] overflow-y-auto teacher-attendance">
      <TeacherTopBar />

      <div className="max-w-6xl mx-auto px-4 py-8 lg:py-10">
        <div className="mb-8 rounded-2xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] bg-[var(--color-surface-low)] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">Teacher Panel</p>
          <h1 className="text-3xl font-black text-[var(--color-on-surface)] mt-1">My Profile</h1>
          <p className="text-[var(--color-on-surface-variant)] mt-2">Manage your profile with the same workspace style as the rest of the dashboard.</p>
        </div>

        {userId && <ProfileView userId={userId} />}
      </div>
    </div>
  );
}
