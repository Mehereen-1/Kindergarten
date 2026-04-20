"use client";

import { useState } from 'react';

export type StudentPerformanceRow = {
  studentId: string;
  studentName: string;
};

type Props = {
  activityId: string;
  students: StudentPerformanceRow[];
};

type Level = 'Excellent' | 'Good' | 'Needs Practice';

const levelEmoji: Record<Level, string> = {
  Excellent: '🌟',
  Good: '👍',
  'Needs Practice': '📘',
};

export default function StudentPerformanceTable({ activityId, students }: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  async function savePerformance(studentId: string) {
    setMessage(null);
    setError(null);
    setSavingId(studentId);

    try {
      const performanceLevel = levels[studentId] || 'Good';
      const response = await fetch('/api/activities/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          activityId,
          performanceLevel,
          remarks: remarks[studentId] || '',
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || 'Failed to save performance');
      }

      setMessage(`Saved performance for student ${studentId}`);
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Something went wrong';
      setError(text);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Record Student Performance</h2>
      <p className="mb-4 mt-1 text-sm text-slate-600">
        Select a level and add optional remarks for each student.
      </p>

      {message && <p className="mb-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Student</th>
              <th className="px-3 py-2 font-semibold">Performance</th>
              <th className="px-3 py-2 font-semibold">Remarks</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const level = levels[student.studentId] || 'Good';
              return (
                <tr key={student.studentId} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-800">{student.studentName}</td>
                  <td className="px-3 py-2">
                    <label className="flex items-center gap-2">
                      <select
                        className="rounded border border-slate-300 px-2 py-1"
                        value={level}
                        onChange={(e) =>
                          setLevels((prev) => ({
                            ...prev,
                            [student.studentId]: e.target.value as Level,
                          }))
                        }
                      >
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Needs Practice">Needs Practice</option>
                      </select>
                      <span>{levelEmoji[level]}</span>
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      className="w-full rounded border border-slate-300 px-2 py-1"
                      placeholder="Optional remarks"
                      value={remarks[student.studentId] || ''}
                      onChange={(e) =>
                        setRemarks((prev) => ({
                          ...prev,
                          [student.studentId]: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => savePerformance(student.studentId)}
                      disabled={savingId === student.studentId}
                      className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      {savingId === student.studentId ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}