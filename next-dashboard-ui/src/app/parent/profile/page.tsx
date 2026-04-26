'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProfileView from '@/app/components/ProfileView';
import ParentTopBar from '@/app/components/ParentTopBar';

export default function ParentProfilePage() {
  const { user } = useAuth();
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-[var(--parent-main-bg)] overflow-y-auto">
      <ParentTopBar />

      <div className="max-w-6xl mx-auto px-4 py-8 lg:py-10">
        <div className="mb-8 rounded-2xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] bg-[var(--color-surface-low)] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">Parent Panel</p>
          <h1 className="text-3xl font-black text-[var(--color-on-surface)] mt-1">My Profile</h1>
          <p className="text-[var(--color-on-surface-variant)] mt-2">Review and update your personal details with the same visual style as the rest of your portal.</p>
        </div>

        {userId && <ProfileView userId={userId} theme="parent" />}
      </div>
    </div>
  );
}
