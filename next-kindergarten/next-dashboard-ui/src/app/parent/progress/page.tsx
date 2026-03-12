"use client";

import { useEffect, useState } from 'react';
import ParentTopBar from '@/app/components/ParentTopBar';
import ParentProgressView, {
  ParentActivityProgressItem,
} from '@/app/components/activities/ParentProgressView';

interface Child {
  _id: string;
  name: string;
}

export default function ParentProgressPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [items, setItems] = useState<ParentActivityProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Resolve parentId from cookie then fetch children
  useEffect(() => {
    const userCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('user='));

    if (!userCookie) {
      setError('Not logged in');
      setIsLoading(false);
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
      fetchChildren(user.id);
    } catch {
      setError('Failed to read user session');
      setIsLoading(false);
    }
  }, []);

  async function fetchChildren(parentId: string) {
    try {
      const res = await fetch(`/api/parent/child?parentId=${encodeURIComponent(parentId)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to load children');

      const list: Child[] = data.children || [];
      setChildren(list);

      if (list.length > 0) {
        setSelectedChildId(list[0]._id);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load children');
      setIsLoading(false);
    }
  }

  // 2. Fetch activities whenever the selected child changes
  useEffect(() => {
    if (selectedChildId) fetchProgress(selectedChildId);
  }, [selectedChildId]);

  async function fetchProgress(studentId: string) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/students/${studentId}/activities`, {
        cache: 'no-store',
      });
      const body = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(body?.error || 'Failed to load child activity progress');
      }

      setItems(Array.isArray(body) ? body : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <ParentTopBar />

      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6 lg:p-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-black text-slate-900 mb-2">
              Activity Progress 🌟
            </h1>
            <p className="text-slate-600 text-lg">
              View your child&apos;s activity history and performance results
            </p>
          </div>

          {/* Child selector (shown when parent has multiple children) */}
          {children.length > 1 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Child
              </label>
              <select
                value={selectedChildId || ''}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {children.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Progress View */}
          <ParentProgressView
            items={items}
            isLoading={isLoading}
            error={error}
            onRetry={() => selectedChildId && fetchProgress(selectedChildId)}
          />
        </div>
      </main>
    </>
  );
}
