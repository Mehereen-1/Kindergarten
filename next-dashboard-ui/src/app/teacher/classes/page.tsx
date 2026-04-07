'use client';

import { useEffect, useMemo, useState } from 'react';
import TeacherTopBar from '@/app/components/TeacherTopBar';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

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

      <main className="flex-1 bg-[#fff7d6]">
        <div className="p-5 lg:p-10">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#5f6843] uppercase tracking-wider">Teaching</p>
              <h1 className="text-3xl lg:text-4xl font-black text-[#3a3927]">My Classes</h1>
              <p className="text-[#3a3927]/60 text-sm mt-1">View your assigned classes and enrolled students by academic year.</p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="teacher-classes-year" className="text-xs font-semibold text-[#352f00]/70">
                Academic Year
              </label>
              <select
                id="teacher-classes-year"
                value={academicYear}
                onChange={(event) => setAcademicYear(event.target.value)}
                className="border-2 border-[#5f6843]/70 rounded-full px-3 py-1.5 text-sm bg-[#fefade] text-[#3a3927] font-medium focus:outline-none focus:ring-2 focus:ring-[#5f6843]"
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
            <div className="mb-4 p-3 rounded-lg border-2 border-[#a14a2f]/30 bg-[#f5e7e2] text-[#8b3c25] text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-[#352f00]/50">Loading classes...</div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-[#5f6843]/30 rounded-[32px_12px_24px_40px] text-[#3a3927]/60 bg-[#eaf0dd]">
              <div className="text-4xl mb-2">📚</div>
              <p className="font-semibold">No classes assigned</p>
              <p className="text-xs mt-1">No active class assignment found for {academicYear}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {classes.map((classDoc) => (
                <div 
                  key={classDoc._id} 
                  className="bg-gradient-to-br from-[#eef3de] to-[#e4ebd3] rounded-[24px_48px_16px_40px] overflow-hidden shadow-[0_8px_24px_rgba(58,57,39,0.08)] hover:shadow-[0_14px_30px_rgba(58,57,39,0.12)] transition-all border-2 border-[#5f6843]/35"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-[#5f6843] to-[#6b744a] px-4 py-3 text-white relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-white/15" />
                    <div className="absolute -bottom-7 right-10 h-12 w-12 rounded-full bg-white/10" />
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold relative z-10">{classDoc.name}</h2>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{classDoc.classId || 'Class'}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <p className="text-white/80 text-xs">Grade: {classDoc.grade || '-'}</p>
                      <p className="text-white/80 text-xs">Students: {classDoc.studentCount}</p>
                    </div>
                    <p className="text-white/70 text-xs mt-1">
                      Subjects: {classDoc.subjects?.length ? classDoc.subjects.join(', ') : 'No subject assigned'}
                    </p>
                    <div className="mt-2">
                      <Link
                        href={`/teacher/attendance?classId=${encodeURIComponent(classDoc._id)}&academicYear=${encodeURIComponent(academicYear)}`}
                        className="inline-flex items-center rounded-full bg-[#fefcf5] text-[#5f6843] px-3 py-1 text-xs font-bold hover:bg-[#ffffff] transition"
                      >
                        Take Attendance
                      </Link>
                    </div>
                  </div>

                  {/* Student Table */}
                  <div className="p-3">
                    {classDoc.students?.length ? (
                      <div className="max-h-48 overflow-auto rounded-lg border border-[#5f6843]/25 bg-[#f9fbf2]">
                        <table className="w-full text-xs">
                          <thead className="bg-[#f1f6e4] sticky top-0">
                            <tr className="border-b border-[#5f6843]/20">
                              <th className="text-left px-2 py-1.5 font-semibold text-[#3a3927]">Roll</th>
                              <th className="text-left px-2 py-1.5 font-semibold text-[#3a3927]">Student Name</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classDoc.students.map((student) => (
                              <tr key={student.id} className="border-t border-[#5f6843]/10 hover:bg-[#eef4df]/60 transition-colors">
                                <td className="px-2 py-1.5 text-[#3a3927]/60">{student.rollNo || '-'}</td>
                                <td className="px-2 py-1.5 font-medium text-[#3a3927]">{student.name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-[#3a3927]/50 text-center py-4">No students found in this class for {academicYear}.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&family=Be+Vietnam+Pro:wght@400;500;600&family=Caveat:wght@400;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        
        .font-accent {
          font-family: 'Caveat', cursive;
        }
        
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          vertical-align: middle;
        }
        
        .blob-container {
          border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
        }
      `}</style>
    </>
  );
}