'use client';

import { useEffect, useMemo, useState } from 'react';
import TeacherTopBar from '@/app/components/TeacherTopBar';
import { useAuth } from '@/hooks/useAuth';

interface ClassStudent {
  id: string;
  name: string;
  rollNo?: string;
}

interface TeacherClass {
  _id: string;
  classId?: string;
  name: string;
  grade?: string;
  capacity?: number;
  academicYear: string;
  studentCount: number;
  subjects?: string[];
  students: ClassStudent[];
}

export default function TeacherClassesPage() {
  const { user, loading: authLoading } = useAuth();
  const currentYear = new Date().getFullYear();

  const yearOptions = useMemo(
    () => [currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((year) => String(year)),
    [currentYear]
  );

  const [academicYear, setAcademicYear] = useState(String(currentYear));
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      setError('Could not identify teacher account');
      return;
    }

    const loadClasses = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `/api/teacher/classes?teacherId=${encodeURIComponent(user.id)}&academicYear=${encodeURIComponent(academicYear)}`,
          { cache: 'no-store' }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load classes');
        }

        setClasses(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load classes');
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, [user?.id, academicYear, authLoading]);

  return (
    <>
      <TeacherTopBar />

      <main className="flex-1 overflow-y-auto bg-white">
        <div className="p-6 lg:p-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider">Teaching</p>
              <h1 className="text-4xl lg:text-5xl font-black text-slate-900">My Classes</h1>
              <p className="text-slate-600 mt-2">View your assigned classes and enrolled students by academic year.</p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="teacher-classes-year" className="text-sm font-semibold text-slate-600">
                Academic Year
              </label>
              <select
                id="teacher-classes-year"
                value={academicYear}
                onChange={(event) => setAcademicYear(event.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading classes...</div>
          ) : classes.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl text-slate-500">
              <div className="text-4xl mb-2">📚</div>
              <p className="font-semibold">No classes assigned</p>
              <p className="text-sm mt-1">No active class assignment found for {academicYear}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {classes.map((classDoc) => (
                <div key={classDoc._id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <div className="bg-indigo-600 px-5 py-4 text-white">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">{classDoc.name}</h2>
                      <span className="text-xs bg-white/20 px-2 py-1 rounded">{classDoc.classId || 'Class'}</span>
                    </div>
                    <p className="text-indigo-100 text-sm mt-1">
                      Grade: {classDoc.grade || '-'} • Students: {classDoc.studentCount}
                    </p>
                    <p className="text-indigo-100 text-sm mt-1">
                      Subjects: {classDoc.subjects?.length ? classDoc.subjects.join(', ') : 'No subject assigned'}
                    </p>
                  </div>

                  <div className="p-4">
                    {classDoc.students?.length ? (
                      <div className="max-h-64 overflow-auto rounded border border-slate-200">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2 font-semibold text-slate-600">Roll</th>
                              <th className="text-left px-3 py-2 font-semibold text-slate-600">Student Name</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classDoc.students.map((student) => (
                              <tr key={student.id} className="border-t border-slate-100">
                                <td className="px-3 py-2 text-slate-500">{student.rollNo || '-'}</td>
                                <td className="px-3 py-2 font-medium text-slate-800">{student.name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No students found in this class for {academicYear}.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
