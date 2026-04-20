"use client";

import { useCallback, useEffect, useState } from 'react';
import TeacherTopBar from '../../../components/TeacherTopBar';
import ActivityList, { ActivityListItem, GroupByOption } from '../../../components/activities/ActivityList';

export default function TeacherActivitiesPage() {
  const [activities, setActivities] = useState<ActivityListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/activities', { cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to fetch activities');
      }
      const data = await response.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return (
    <>
      <TeacherTopBar />

      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6 lg:p-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-black text-slate-900 mb-2">
              Activities 🎯
            </h1>
            <p className="text-slate-600 text-lg">
              View assigned activities and record student performance
            </p>
          </div>

          {/* Action Bar */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm text-slate-600">
              {isLoading
                ? 'Loading activities...'
                : `${activities.length} activit${activities.length === 1 ? 'y' : 'ies'} found`}
            </p>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600 font-medium">Group by:</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">None</option>
                <option value="class">Class</option>
                <option value="subject">Subject</option>
                <option value="date">Date</option>
              </select>
              <button
                onClick={fetchActivities}
                className="px-4 py-2.5 rounded-lg border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-all"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Activity List */}
          <ActivityList
            activities={activities}
            isLoading={isLoading}
            error={error}
            onRetry={fetchActivities}
            groupBy={groupBy}
          />
        </div>
      </main>
    </>
  );
}