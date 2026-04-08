'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, UserCircle2 } from 'lucide-react';
import TeacherTopBar from '@/app/components/TeacherTopBar';
import { useAuth } from '@/hooks/useAuth';

interface TeacherClass {
  _id: string;
  name: string;
  classId: string;
  grade: string;
  academicYear: string;
}

interface ClassStudent {
  id: string;
  name: string;
  email?: string;
  rollNo?: string;
  grade?: string;
}

export default function TeacherClassStudentsPage() {
  const { user } = useAuth();
  const params = useParams<{ classId: string }>();
  const searchParams = useSearchParams();
  const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear());

  const [classInfo, setClassInfo] = useState<TeacherClass | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadClassStudents = async () => {
      if (!user?.id || !params?.classId) {
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `/api/teacher/classes/${encodeURIComponent(params.classId)}/students?teacherId=${encodeURIComponent(user.id)}&academicYear=${encodeURIComponent(academicYear)}`,
          { cache: 'no-store' }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load students');
        }

        setClassInfo(data.class || null);
        setStudents(Array.isArray(data.students) ? data.students : []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    loadClassStudents();
  }, [user?.id, params?.classId, academicYear]);

  return (
    <>
      <TeacherTopBar />

      <main className="flex-1 bg-[#fff7d6] p-5 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <Link
                href="/teacher/classes"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f6843] hover:text-[#3a3927] mb-2"
              >
                <ArrowLeft size={16} /> Back to My Classes
              </Link>
              <h1 className="text-3xl font-black text-[#3a3927]">
                {classInfo ? `${classInfo.name} Students` : 'Class Students'}
              </h1>
              <p className="text-[#3a3927]/60 text-sm mt-1">
                {classInfo ? `Class ID: ${classInfo.classId} • Grade: ${classInfo.grade || '-'} • Academic Year: ${classInfo.academicYear}` : 'View enrolled students'}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-[#a14a2f]/30 bg-[#f5e7e2] text-[#8b3c25] px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-10 text-[#676551]">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-[#5f6843]/30 rounded-[32px_12px_24px_40px] text-[#3a3927]/60 bg-[#eaf0dd]">
              <p className="font-semibold">No students enrolled in this class.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {students.map((student) => (
                <Link
                  key={student.id}
                  href={`/teacher/students/${encodeURIComponent(student.id)}?academicYear=${encodeURIComponent(academicYear)}`}
                  className="bg-[#fefade] border-2 border-[#d6d2b5] rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#d9a777]/30 flex items-center justify-center text-[#845c32]">
                      <UserCircle2 size={22} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-[#3a3927] truncate">{student.name}</h2>
                      <p className="text-xs text-[#676551] mt-1">Roll: {student.rollNo || '-'}</p>
                      {student.email && <p className="text-xs text-[#676551] truncate">{student.email}</p>}
                      <p className="text-xs mt-2 text-[#5f6843] font-semibold">View Profile</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
