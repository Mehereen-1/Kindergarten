'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import TeacherTopBar from '@/app/components/TeacherTopBar';
import { useAuth } from '@/hooks/useAuth';

interface StudentProfile {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  bloodGroup?: string;
  birthday?: string;
  sex?: string;
  className?: string;
  classId?: string;
  grade?: string;
  rollNo?: string;
  academicYear?: string;
}

export default function TeacherStudentProfilePage() {
  const { user } = useAuth();
  const params = useParams<{ studentId: string }>();
  const searchParams = useSearchParams();
  const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear());

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStudent = async () => {
      if (!user?.id || !params?.studentId) return;

      try {
        setLoading(true);
        const response = await fetch(
          `/api/teacher/students/${encodeURIComponent(params.studentId)}?teacherId=${encodeURIComponent(user.id)}&academicYear=${encodeURIComponent(academicYear)}`,
          { cache: 'no-store' }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load student profile');
        }

        setStudent(data.student || null);
      } catch (err: any) {
        setError(err?.message || 'Failed to load student profile');
      } finally {
        setLoading(false);
      }
    };

    loadStudent();
  }, [user?.id, params?.studentId, academicYear]);

  return (
    <>
      <TeacherTopBar />

      <main className="flex-1 bg-[#fff7d6] p-5 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <Link
              href="/teacher/classes"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f6843] hover:text-[#3a3927] mb-2"
            >
              <ArrowLeft size={16} /> Back to Classes
            </Link>
            <h1 className="text-3xl font-black text-[#3a3927]">Student Profile</h1>
            <p className="text-[#3a3927]/60 text-sm mt-1">View-only student details for teachers.</p>
          </div>

          {error && (
            <div className="rounded-xl border border-[#a14a2f]/30 bg-[#f5e7e2] text-[#8b3c25] px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-10 text-[#676551]">Loading profile...</div>
          ) : !student ? (
            <div className="text-center py-10 text-[#676551]">Student not found.</div>
          ) : (
            <div className="bg-[#fefade] border-2 border-[#d6d2b5] rounded-[24px_48px_16px_40px] shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <Field label="Name" value={student.name} />
                <Field label="Email" value={student.email || '-'} />
                <Field label="Phone" value={student.phone || '-'} />
                <Field label="Gender" value={student.sex || '-'} />
                <Field label="Blood Group" value={student.bloodGroup || '-'} />
                <Field label="Date of Birth" value={student.birthday ? new Date(student.birthday).toLocaleDateString() : '-'} />
                <Field label="Class" value={student.className || '-'} />
                <Field label="Class ID" value={student.classId || '-'} />
                <Field label="Grade" value={student.grade || '-'} />
                <Field label="Roll No" value={student.rollNo || '-'} />
                <Field label="Academic Year" value={student.academicYear || academicYear} />
                <Field label="Address" value={student.address || '-'} />
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-[#676551] font-semibold">{label}</p>
      <p className="text-[#3a3927] font-medium mt-1 break-words">{value}</p>
    </div>
  );
}
