"use client";

import Link from 'next/link';
import { useMemo } from 'react';

export type GroupByOption = 'none' | 'class' | 'subject' | 'date';

export type ActivityListItem = {
  _id: string;
  title: string;
  description: string;
  subject: string;
  date: string;
  classId?: {
    _id: string;
    name?: string;
    grade?: string;
  } | string;
  createdBy?: {
    _id: string;
    name?: string;
  } | string;
};

type ActivityListProps = {
  activities: ActivityListItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  groupBy?: GroupByOption;
};

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString();
}

function getClassName(classId: ActivityListItem['classId']) {
  if (!classId) return '—';
  if (typeof classId === 'string') return classId;
  return classId.name ? `${classId.name} (${classId.grade})` : classId._id;
}

function getGroupKey(activity: ActivityListItem, groupBy: GroupByOption): string {
  switch (groupBy) {
    case 'class':
      return getClassName(activity.classId);
    case 'subject':
      return activity.subject || 'Unknown';
    case 'date':
      return formatDate(activity.date);
    default:
      return '';
  }
}

const groupIcons: Record<GroupByOption, string> = {
  none: '',
  class: '🏫',
  subject: '📚',
  date: '📅',
};

function groupActivities(
  activities: ActivityListItem[],
  groupBy: GroupByOption
): Map<string, ActivityListItem[]> {
  const map = new Map<string, ActivityListItem[]>();
  for (const a of activities) {
    const key = getGroupKey(a, groupBy);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return map;
}

function ActivityCard({ activity }: { activity: ActivityListItem }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{activity.title}</h3>
          <p className="text-xs text-slate-500 line-clamp-2 mt-1">{activity.description}</p>
        </div>
        <Link
          href={`/teacher/activities/${activity._id}`}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Open
        </Link>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
          📚 {activity.subject}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          📅 {formatDate(activity.date)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          🏫 {getClassName(activity.classId)}
        </span>
      </div>
    </div>
  );
}

export default function ActivityList({
  activities,
  isLoading,
  error,
  onRetry,
  groupBy = 'none',
}: ActivityListProps) {
  const sortedActivities = useMemo(
    () =>
      [...activities].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [activities]
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">
        Loading activities...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="mb-3">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (sortedActivities.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">
        No activities found yet. Activities will appear here once the admin creates them.
      </div>
    );
  }

  /* ---- Grouped view ---- */
  if (groupBy !== 'none') {
    const groups = groupActivities(sortedActivities, groupBy);
    const icon = groupIcons[groupBy];

    return (
      <div className="space-y-8">
        {Array.from(groups.entries()).map(([groupName, items]) => (
          <div key={groupName}>
            <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span>{icon}</span> {groupName}
              <span className="ml-1 text-sm font-normal text-slate-500">
                ({items.length})
              </span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((activity) => (
                <ActivityCard key={activity._id} activity={activity} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ---- Default table view ---- */
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-4 py-3 font-semibold">Title</th>
            <th className="px-4 py-3 font-semibold">Subject</th>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Class</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedActivities.map((activity) => (
            <tr key={activity._id} className="border-t border-slate-100">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{activity.title}</p>
                <p className="line-clamp-1 text-xs text-slate-500">{activity.description}</p>
              </td>
              <td className="px-4 py-3 text-slate-700">{activity.subject}</td>
              <td className="px-4 py-3 text-slate-700">{formatDate(activity.date)}</td>
              <td className="px-4 py-3 text-slate-700">
                {getClassName(activity.classId)}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/teacher/activities/${activity._id}`}
                  className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
