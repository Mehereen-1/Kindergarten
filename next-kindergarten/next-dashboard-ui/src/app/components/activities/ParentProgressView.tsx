"use client";

export type ParentActivityProgressItem = {
  activityId: string;
  title: string;
  subject: string;
  date: string;
  performanceLevel: 'Excellent' | 'Good' | 'Needs Practice';
  remarks?: string;
};

type Props = {
  items: ParentActivityProgressItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

const emojiMap = {
  Excellent: '🌟',
  Good: '👍',
  'Needs Practice': '📘',
} as const;

function formatDate(dateString: string) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString();
}

export default function ParentProgressView({ items, isLoading, error, onRetry }: Props) {
  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6">Loading progress...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="mb-3">{error}</p>
        <button className="rounded bg-red-600 px-3 py-2 text-white" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
        No activity progress has been recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Activity</th>
            <th className="px-4 py-3 font-semibold">Subject</th>
            <th className="px-4 py-3 font-semibold">Result</th>
            <th className="px-4 py-3 font-semibold">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.activityId}-${item.date}`} className="border-t border-slate-100">
              <td className="px-4 py-3 text-slate-700">{formatDate(item.date)}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{item.title}</td>
              <td className="px-4 py-3 text-slate-700">{item.subject}</td>
              <td className="px-4 py-3 text-slate-700">
                <span className="mr-2">{emojiMap[item.performanceLevel]}</span>
                <span>{item.performanceLevel}</span>
              </td>
              <td className="px-4 py-3 text-slate-600">{item.remarks || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
