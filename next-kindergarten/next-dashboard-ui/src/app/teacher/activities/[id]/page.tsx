"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TeacherTopBar from '@/app/components/TeacherTopBar';
import StudentPerformanceTable, {
  StudentPerformanceRow,
} from '@/app/components/activities/StudentPerformanceTable';

type ActivityDetails = {
  _id: string;
  title: string;
  description: string;
  subject: string;
  date: string;
  classId?: { _id: string; name?: string; grade?: string } | string;
};

export default function ActivityDetailsPage({ params }: { params: { id: string } }) {
  const [activity, setActivity] = useState<ActivityDetails | null>(null);
  const [students, setStudents] = useState<StudentPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [activityRes, studentsRes] = await Promise.all([
          fetch(`/api/activities/${params.id}`, { cache: 'no-store' }),
          fetch('/api/admin/students', { cache: 'no-store' }),
        ]);

        const activityBody = await activityRes.json().catch(() => ({}));
        if (!activityRes.ok) throw new Error(activityBody.error || 'Failed to load activity');
        setActivity(activityBody);

        const studentsBody = await studentsRes.json().catch(() => ({}));
        if (studentsRes.ok) {
          const list = Array.isArray(studentsBody.students) ? studentsBody.students : [];
          setStudents(
            list.map((s: { _id: string; name: string }) => ({
              studentId: s._id,
              studentName: s.name,
            }))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id]);

  return (
    <>
      <TeacherTopBar />

      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6 lg:p-10">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-5xl font-black text-slate-900 mb-2">
                Activity Details 📋
              </h1>
              <p className="text-slate-600 text-lg">
                View activity info and record student performance
              </p>
            </div>
            <Link
              href="/teacher/activities"
              className="px-4 py-2.5 rounded-lg border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-all self-start"
            >
              ← Back to Activities
            </Link>
          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-white rounded-xl shadow-sm p-6 text-slate-600">
              Loading activity...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 mb-6">
              {error}
            </div>
          )}

          {/* Activity Info Card */}
          {activity && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{activity.title}</h2>
              <p className="text-slate-600 mb-4">{activity.description}</p>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-sm">
                  📚 {activity.subject}
                </span>
                <span className="px-4 py-2 rounded-lg bg-amber-50 text-amber-700 font-semibold text-sm">
                  📅 {new Date(activity.date).toLocaleDateString()}
                </span>
                {activity.classId && typeof activity.classId === 'object' && (
                  <span className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-sm">
                    🏫 {activity.classId.name} — Grade {activity.classId.grade}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Performance Table */}
          {students.length > 0 ? (
            <StudentPerformanceTable activityId={params.id} students={students} />
          ) : (
            !loading && (
              <div className="bg-white rounded-xl shadow-sm p-6 text-slate-600">
                No students found in the database.
              </div>
            )
          )}
        </div>
      </main>
    </>
  );
}
