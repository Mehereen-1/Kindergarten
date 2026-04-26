'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Camera, RefreshCcw, Trash2, Upload } from 'lucide-react';
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

interface FacialEmbeddingItem {
  id: string;
  imageUrl: string;
  imageHash?: string;
  uploadedAt?: string | null;
  imageRef?: string;
  embeddingRef?: string;
}

interface FacialDataPayload {
  studentId: string;
  numberOfSamples: number;
  previewImageUrl?: string;
  isProcessed: boolean;
  confidence: number;
  embeddings: FacialEmbeddingItem[];
}

export default function TeacherStudentProfilePage() {
  const { user } = useAuth();
  const params = useParams<{ studentId: string }>();
  const searchParams = useSearchParams();
  const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear());

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [facialData, setFacialData] = useState<FacialDataPayload | null>(null);
  const [facialLoading, setFacialLoading] = useState(true);
  const [facialError, setFacialError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  const backendBaseUrl =
    (process.env.NEXT_PUBLIC_CCTV_BACKEND_URL || process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || '').replace(/\/+$/, '');

  const toAbsoluteImageUrl = (value: string) => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('/api/attendance/backend/')) return value;
    if (value.startsWith('/secure-face-image') && backendBaseUrl) return `${backendBaseUrl}${value}`;
    if (value.startsWith('/')) return value;
    return value;
  };

  useEffect(() => {
    const loadStudent = async () => {
      if (!user?.id || !params?.studentId) return;

      try {
        setLoading(true);
        setError('');
        const response = await fetch(
          `/api/teacher/students/${encodeURIComponent(params.studentId)}?teacherId=${encodeURIComponent(
            user.id
          )}&academicYear=${encodeURIComponent(academicYear)}`,
          { cache: 'no-store' }
        );
        const data = await response.json().catch(() => ({}));

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

    void loadStudent();
  }, [user?.id, params?.studentId, academicYear]);

  const loadFacialData = useCallback(async () => {
    if (!user?.id || !params?.studentId) return;

    try {
      setFacialLoading(true);
      setFacialError('');

      const response = await fetch(
        `/api/teacher/students/${encodeURIComponent(params.studentId)}/facial-data?teacherId=${encodeURIComponent(
          user.id
        )}&academicYear=${encodeURIComponent(academicYear)}`,
        { cache: 'no-store' }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load facial data');
      }

      setFacialData(data?.facialData || null);
    } catch (err: any) {
      setFacialError(err?.message || 'Failed to load facial data');
      setFacialData(null);
    } finally {
      setFacialLoading(false);
    }
  }, [user?.id, params?.studentId, academicYear]);

  useEffect(() => {
    void loadFacialData();
  }, [loadFacialData]);

  const handleAddImages = async (files: FileList | null) => {
    if (!files?.length || !user?.id || !params?.studentId) return;

    const formData = new FormData();
    formData.append('teacherId', user.id);
    formData.append('academicYear', academicYear);
    Array.from(files).forEach((file) => formData.append('files', file));

    try {
      setUploading(true);
      const response = await fetch(`/api/teacher/students/${encodeURIComponent(params.studentId)}/facial-data`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to upload images');
      }
      setFacialData(data?.facialData || facialData);
      await loadFacialData();
    } catch (err: any) {
      alert(err?.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleReplaceImage = async (item: FacialEmbeddingItem, file: File | null) => {
    if (!file || !user?.id || !params?.studentId) return;

    const formData = new FormData();
    formData.append('teacherId', user.id);
    formData.append('academicYear', academicYear);
    if (item.imageRef) formData.append('replaceImageRef', item.imageRef);
    if (item.imageHash) formData.append('replaceImageSha256', item.imageHash);
    if (item.embeddingRef) formData.append('replaceEmbeddingRef', item.embeddingRef);
    formData.append('files', file);

    try {
      setReplacingId(item.id);
      const response = await fetch(`/api/teacher/students/${encodeURIComponent(params.studentId)}/facial-data`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to replace image');
      }
      setFacialData(data?.facialData || facialData);
      await loadFacialData();
    } catch (err: any) {
      alert(err?.message || 'Failed to replace image');
    } finally {
      setReplacingId(null);
    }
  };

  const handleDeleteImage = async (item: FacialEmbeddingItem) => {
    if (!user?.id || !params?.studentId) return;
    const canDelete = Boolean(item.imageRef || item.imageHash || item.embeddingRef);
    if (!canDelete) {
      alert('Delete is unavailable for this image source.');
      return;
    }
    const confirmed = window.confirm('Delete this facial image?');
    if (!confirmed) return;

    try {
      setDeletingId(item.id);
      const response = await fetch(`/api/teacher/students/${encodeURIComponent(params.studentId)}/facial-data`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user.id,
          academicYear,
          embeddingId: item.id,
          imageRef: item.imageRef || '',
          imageSha256: item.imageHash || '',
          embeddingRef: item.embeddingRef || '',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete image');
      }
      setFacialData(data?.facialData || facialData);
      await loadFacialData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete image');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <TeacherTopBar />

      <main className="flex-1 bg-[#fff7d6] p-5 lg:p-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <Link
              href="/teacher/classes"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f6843] hover:text-[#3a3927] mb-2"
            >
              <ArrowLeft size={16} /> Back to Classes
            </Link>
            <h1 className="text-3xl font-black text-[#3a3927]">Student Profile</h1>
            <p className="text-[#3a3927]/60 text-sm mt-1">View-only student details with facial sample management.</p>
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
            <div className="space-y-6">
              <div className="bg-[#fefade] border-2 border-[#d6d2b5] rounded-[24px_48px_16px_40px] shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                  <Field label="Name" value={student.name} />
                  <Field label="Email" value={student.email || '-'} />
                  <Field label="Phone" value={student.phone || '-'} />
                  <Field label="Gender" value={student.sex || '-'} />
                  <Field label="Blood Group" value={student.bloodGroup || '-'} />
                  <Field
                    label="Date of Birth"
                    value={student.birthday ? new Date(student.birthday).toLocaleDateString() : '-'}
                  />
                  <Field label="Class" value={student.className || '-'} />
                  <Field label="Class ID" value={student.classId || '-'} />
                  <Field label="Grade" value={student.grade || '-'} />
                  <Field label="Roll No" value={student.rollNo || '-'} />
                  <Field label="Academic Year" value={student.academicYear || academicYear} />
                  <Field label="Address" value={student.address || '-'} />
                </div>
              </div>

              <section className="bg-[#fefade] border-2 border-[#d6d2b5] rounded-[32px_18px_24px_40px] shadow-sm p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl font-black text-[#3a3927]">Facial Database</h2>
                    <p className="text-xs text-[#676551] mt-1">View, replace, or delete face sample images.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void loadFacialData()}
                      className="inline-flex items-center gap-1 rounded-full border border-[#5f6843]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#4f5838]"
                    >
                      <RefreshCcw size={14} />
                      Refresh
                    </button>
                    <label className="inline-flex items-center gap-1 rounded-full bg-[#5f6843] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer">
                      <Upload size={14} />
                      {uploading ? 'Uploading...' : 'Add Image'}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={uploading}
                        onChange={(event) => {
                          void handleAddImages(event.target.files);
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>

                {facialError && (
                  <div className="mb-4 rounded-xl border border-[#a14a2f]/30 bg-[#f5e7e2] text-[#8b3c25] px-4 py-3 text-sm">
                    {facialError}
                  </div>
                )}

                <div className="mb-4 text-xs text-[#5f6843] font-semibold">
                  Samples: {facialData?.numberOfSamples || 0}
                </div>

                {facialLoading ? (
                  <div className="text-center py-6 text-[#676551] text-sm">Loading facial samples...</div>
                ) : facialData?.embeddings?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {facialData.embeddings.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-[#d6d2b5] bg-white p-3">
                        {(() => {
                          const canDelete = Boolean(item.imageRef || item.imageHash || item.embeddingRef);
                          return (
                            <>
                        <div className="aspect-square rounded-xl overflow-hidden bg-[#edf3dd] border border-[#d6d2b5]">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={toAbsoluteImageUrl(item.imageUrl)}
                              alt="Facial sample"
                              className="w-full h-full object-cover"
                              onError={(event) => {
                                const target = event.currentTarget;
                                if (!target.dataset.fallbackApplied) {
                                  target.dataset.fallbackApplied = '1';
                                  target.src = '/avatar.png';
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#5f6843]">
                              <Camera size={24} />
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-[11px] text-[#676551]">
                          {item.uploadedAt ? new Date(item.uploadedAt).toLocaleString() : 'No timestamp'}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <label className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-[#5f6843]/35 bg-[#f8faef] px-2 py-1.5 text-xs font-semibold text-[#4f5838] cursor-pointer">
                            <RefreshCcw size={13} />
                            {replacingId === item.id ? 'Replacing...' : 'Replace'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={replacingId === item.id}
                              onChange={(event) => {
                                const file = event.target.files?.[0] || null;
                                void handleReplaceImage(item, file);
                                event.currentTarget.value = '';
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => void handleDeleteImage(item)}
                            disabled={deletingId === item.id || !canDelete}
                            title={canDelete ? 'Delete image' : 'Delete unavailable for this source'}
                            className="inline-flex items-center justify-center rounded-md border border-[#b64f2f]/40 bg-[#fdf0eb] px-2 py-1.5 text-xs font-semibold text-[#8b3c25]"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                            </>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-[#d6d2b5] bg-[#f8faef] px-4 py-8 text-center text-[#676551] text-sm">
                    No facial images found for this student.
                  </div>
                )}
              </section>
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
