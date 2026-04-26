'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProfileView from '@/app/components/ProfileView';
import ParentTopBar from '@/app/components/ParentTopBar';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface ChildProfile {
  _id: string;
  name: string;
  email?: string;
  grade?: string;
  roll?: string;
}

export default function ParentChildProfilePage() {
  const { user } = useAuth();
  const [userId, setUserId] = useState<string>('');
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
      fetchChildren(user.id);
    }
  }, [user]);

  const fetchChildren = async (parentId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/parent/children?parentId=${parentId}`);
      
      if (response.ok) {
        const data = await response.json();
        setChildren(data.children || []);
        if (data.children?.length > 0) {
          setSelectedChildId(data.children[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--parent-main-bg)] overflow-y-auto">
      <ParentTopBar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8 rounded-2xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] bg-[var(--color-surface-low)] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
          <p className="text-xs font-black tracking-[0.14em] uppercase text-[var(--color-on-surface-variant)]">Parent Access</p>
          <h1 className="text-3xl font-black text-[var(--color-on-surface)] mt-1">Child&apos;s Profile</h1>
          <p className="text-[var(--color-on-surface-variant)] mt-2">View each child&apos;s profile and update basic information only. Academic details are managed by school administration.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin">
              <div className="w-8 h-8 border-4 border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] border-t-[var(--color-primary)] rounded-full"></div>
            </div>
          </div>
        ) : children.length === 0 ? (
          <div className="bg-[var(--color-surface-low)] rounded-2xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] shadow-sm p-8 text-center">
            <p className="text-[var(--color-on-surface-variant)] mb-4">No children found in the system.</p>
            <Link
              href="/parent/child"
              className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:text-[var(--color-primary-dim)] font-semibold"
            >
              Manage Children
              <ChevronRight size={18} />
            </Link>
          </div>
        ) : (
          <>
            {/* Children List */}
            {children.length > 1 && (
              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children.map((child) => (
                  <button
                    key={child._id}
                    onClick={() => setSelectedChildId(child._id)}
                    className={`p-4 rounded-2xl border-2 text-left transition shadow-sm ${
                      selectedChildId === child._id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)]'
                        : 'border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] bg-[var(--color-surface-low)] hover:border-[color:color-mix(in_srgb,var(--color-outline-variant)_45%,transparent)]'
                    }`}
                  >
                    <p className="font-semibold text-[var(--color-on-surface)]">{child.name}</p>
                    {child.grade && (
                      <p className="text-sm text-[var(--color-on-surface-variant)]">Grade: {child.grade}</p>
                    )}
                    {child.roll && (
                      <p className="text-sm text-[var(--color-on-surface-variant)]">Roll: {child.roll}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Profile View */}
            {selectedChildId && userId && (
              <ProfileView
                userId={userId}
                childId={selectedChildId}
                profileType="student"
                theme="parent"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
