'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {classes.map((classDoc) => (
                <Link
                  key={classDoc._id} 
                  href={`/teacher/classes/${encodeURIComponent(classDoc._id)}?academicYear=${encodeURIComponent(academicYear)}`}
                  className="group relative overflow-hidden rounded-3xl border border-[#5f6843]/25 bg-[#f8faef] shadow-[0_8px_22px_rgba(58,57,39,0.08)] hover:shadow-[0_14px_28px_rgba(58,57,39,0.14)] hover:-translate-y-0.5 transition-all"
                >
                  <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[#dfe9c6]/60" />
                  <div className="absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-[#e8efd6]/70" />

                  <div className="relative px-5 py-4 border-b border-[#5f6843]/20 bg-gradient-to-r from-[#f2f7e3] via-[#edf4dc] to-[#f7faef]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-[22px] leading-tight font-extrabold tracking-tight text-[#384128]">{classDoc.name}</h2>
                        <p className="text-xs mt-1 text-[#4e5837]/80 font-medium">Academic Year {academicYear}</p>
                      </div>
                      <span className="text-[11px] font-bold bg-[#5f6843] text-white px-2.5 py-1 rounded-full shadow-sm">
                        {classDoc.classId || 'Class'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#e2ebcb] text-[#3c4529]">
                        Grade: {classDoc.grade || '-'}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#e2ebcb] text-[#3c4529]">
                        Students: {classDoc.studentCount}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#edf3dd] text-[#51613e]">
                        {classDoc.subjects?.length ? `${classDoc.subjects.length} subject${classDoc.subjects.length > 1 ? 's' : ''}` : 'No subject'}
                      </span>
                    </div>

                    <p className="text-[#4f5838]/80 text-xs mt-2 line-clamp-1">
                      {classDoc.subjects?.length ? classDoc.subjects.join(' • ') : 'No subject assigned yet'}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        onClick={(event) => event.preventDefault()}
                        className="inline-flex items-center rounded-full border border-[#5f6843]/35 bg-white text-[#4f5838] px-3 py-1 text-xs font-bold"
                      >
                        View Students
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          router.push(`/teacher/attendance?classId=${encodeURIComponent(classDoc._id)}&academicYear=${encodeURIComponent(academicYear)}`);
                        }}
                        className="inline-flex items-center rounded-full bg-[#5f6843] text-white px-3 py-1 text-xs font-bold hover:bg-[#4f5838] transition"
                      >
                        Take Attendance
                      </button>
                    </div>
                  </div>

                  <div className="relative p-4">
                    {classDoc.students?.length ? (
                      <div className="rounded-2xl border border-[#5f6843]/20 bg-white/85 backdrop-blur-sm overflow-hidden">
                        <div className="px-3 py-2 text-[11px] font-bold tracking-wide uppercase text-[#546043] bg-[#eef4de] border-b border-[#5f6843]/15">
                          Enrolled Students
                        </div>
                        <ul className="max-h-52 overflow-auto divide-y divide-[#5f6843]/10">
                          {classDoc.students.map((student) => (
                            <li key={student.id} className="px-3 py-2.5 flex items-center justify-between hover:bg-[#f5f8ea] transition-colors">
                              <span className="text-xs font-semibold text-[#3d452c] truncate pr-2">{student.name}</span>
                              <span className="text-[11px] text-[#5a6442] font-medium bg-[#ecf2da] rounded-full px-2 py-0.5">
                                Roll {student.rollNo || '-'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-[#4f5838]/60 text-center py-5 rounded-2xl border border-dashed border-[#5f6843]/25 bg-[#f3f7e6]">
                        No students found in this class for {academicYear}.
                      </p>
                    )}
                  </div>
                </Link>
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