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
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      <TeacherTopBar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">View and update your personal information</p>
        </div>

        {userId && <ProfileView userId={userId} />}
      </div>
    </div>
  );
}
