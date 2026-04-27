"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Camera, RefreshCcw, Trash2, Upload } from "lucide-react";

type StudentProfile = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  bloodGroup?: string;
  birthday?: string;
  sex?: string;
  profilePic?: string;
  currentClass?: {
    _id?: string;
    name?: string;
    classId?: string;
    grade?: string;
  } | null;
  academicYear?: string;
  rollNo?: string;
};

type ClassOption = {
  _id: string;
  name: string;
  classId?: string;
  grade?: string;
};

type FacialEmbeddingItem = {
  id: string;
  imageUrl: string;
  imageHash?: string;
  uploadedAt?: string | null;
  imageRef?: string;
  embeddingRef?: string;
};

type FacialDataPayload = {
  studentId: string;
  numberOfSamples: number;
  previewImageUrl?: string;
  isProcessed: boolean;
  confidence: number;
  embeddings: FacialEmbeddingItem[];
};

const isMongoObjectId = (value?: string) => Boolean(value && /^[a-f\d]{24}$/i.test(value));

export default function AdminStudentProfilePage() {
  const params = useParams<{ id: string }>();
  const currentYear = String(new Date().getFullYear());

  const [academicYear, setAcademicYear] = useState(currentYear);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [facialData, setFacialData] = useState<FacialDataPayload | null>(null);
  const [facialLoading, setFacialLoading] = useState(true);
  const [facialError, setFacialError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    bloodGroup: "",
    birthday: "",
    sex: "",
    classId: "",
    rollNo: "",
    academicYear: currentYear,
  });

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1, y + 2].map(String);
  }, []);

  const loadClasses = async (year: string) => {
    const response = await fetch(`/api/admin/classes?academicYear=${encodeURIComponent(year)}`);
    if (!response.ok) return [];
    const data = await response.json();
    const list = Array.isArray(data) ? data : Array.isArray(data?.classes) ? data.classes : [];
    return list as ClassOption[];
  };

  const loadStudent = useCallback(async (year: string) => {
    if (!params?.id) return;

    const response = await fetch(`/api/admin/students/${encodeURIComponent(params.id)}?academicYear=${encodeURIComponent(year)}`, {
      cache: "no-store",
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Failed to load student profile");
    }

    setStudent(data);
    setForm({
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      address: data.address || "",
      bloodGroup: data.bloodGroup || "",
      birthday: data.birthday ? new Date(data.birthday).toISOString().split("T")[0] : "",
      sex: data.sex || "",
      classId: data.currentClass?._id || "",
      rollNo: data.rollNo || "",
      academicYear: data.academicYear || year,
    });
  }, [params?.id]);

  const loadFacialData = useCallback(async () => {
    if (!params?.id) return;

    try {
      setFacialLoading(true);
      setFacialError("");
      const response = await fetch(`/api/admin/students/${encodeURIComponent(params.id)}/facial-data`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load facial images");
      }

      setFacialData(data?.facialData || null);
    } catch (err: any) {
      setFacialError(err?.message || "Failed to load facial images");
      setFacialData(null);
    } finally {
      setFacialLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    const boot = async () => {
      try {
        setLoading(true);
        setError("");
        const [classList] = await Promise.all([loadClasses(academicYear), loadStudent(academicYear)]);
        setClasses(classList);
      } catch (err: any) {
        setError(err?.message || "Failed to load student profile");
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, [academicYear, loadStudent]);

  useEffect(() => {
    void loadFacialData();
  }, [loadFacialData]);

  const handleSave = async () => {
    if (!params?.id) return;

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/admin/students/${encodeURIComponent(params.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          bloodGroup: form.bloodGroup || undefined,
          birthday: form.birthday || undefined,
          sex: form.sex || undefined,
          classId: form.classId || undefined,
          rollNo: form.rollNo || undefined,
          academicYear: form.academicYear,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to update student profile");
      }

      await loadStudent(form.academicYear);
    } catch (err: any) {
      setError(err?.message || "Failed to update student profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddImages = async (files: FileList | null) => {
    if (!files?.length || !params?.id) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    try {
      setUploading(true);
      const response = await fetch(`/api/admin/students/${encodeURIComponent(params.id)}/facial-data`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to upload facial images");
      }
      setFacialData(data?.facialData || facialData);
      await loadFacialData();
    } catch (err: any) {
      alert(err?.message || "Failed to upload facial images");
    } finally {
      setUploading(false);
    }
  };

  const handleReplaceImage = async (item: FacialEmbeddingItem, file: File | null) => {
    if (!file || !params?.id) return;

    const formData = new FormData();
    if (isMongoObjectId(item.id)) formData.append("replaceEmbeddingId", item.id);
    if (item.imageRef) formData.append("replaceImageRef", item.imageRef);
    if (item.imageHash) formData.append("replaceImageSha256", item.imageHash);
    if (item.embeddingRef) formData.append("replaceEmbeddingRef", item.embeddingRef);
    formData.append("files", file);

    try {
      setReplacingId(item.id);
      const response = await fetch(`/api/admin/students/${encodeURIComponent(params.id)}/facial-data`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to replace facial image");
      }
      setFacialData(data?.facialData || facialData);
      await loadFacialData();
    } catch (err: any) {
      alert(err?.message || "Failed to replace facial image");
    } finally {
      setReplacingId(null);
    }
  };

  const handleDeleteImage = async (item: FacialEmbeddingItem) => {
    if (!params?.id) return;

    const canDelete = Boolean(item.imageRef || item.imageHash || item.embeddingRef || isMongoObjectId(item.id));
    if (!canDelete) {
      alert("Delete is unavailable for this image source.");
      return;
    }

    const confirmed = window.confirm("Delete this facial image?");
    if (!confirmed) return;

    try {
      setDeletingId(item.id);
      const response = await fetch(`/api/admin/students/${encodeURIComponent(params.id)}/facial-data`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeddingId: item.id,
          imageRef: item.imageRef || "",
          imageSha256: item.imageHash || "",
          embeddingRef: item.embeddingRef || "",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete facial image");
      }
      setFacialData(data?.facialData || facialData);
      await loadFacialData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete facial image");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 bg-[#fff7e0]">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link href="/admin/students" className="text-sm text-[#5f6843] font-medium hover:underline">
              Back to Students
            </Link>
            <h1 className="text-2xl font-black text-[#3a3927] mt-1">Student Profile Management</h1>
            <p className="text-sm text-[#5b6146] mt-1">Admin can update complete student details and academic assignment.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#5a6142] font-medium">Academic Year</label>
            <select
              value={academicYear}
              onChange={(event) => setAcademicYear(event.target.value)}
              className="border border-[#c8c39d] bg-[#fefade] rounded px-3 py-2 text-sm text-[#3a3927]"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-[#a14a2f]/30 bg-[#f5e7e2] text-[#8b3c25] px-4 py-3 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading profile...</div>
        ) : !student ? (
          <div className="text-center py-10 text-gray-500">Student not found.</div>
        ) : (
          <div className="space-y-5">
            <div className="bg-[#fffdf6] border border-[#d6d2b5] rounded-xl p-5 md:p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" value={form.name} onChange={(v) => setForm((prev) => ({ ...prev, name: v }))} />
              <Input label="Email" value={form.email} onChange={(v) => setForm((prev) => ({ ...prev, email: v }))} />
              <Input label="Phone" value={form.phone} onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))} />
              <Input label="Address" value={form.address} onChange={(v) => setForm((prev) => ({ ...prev, address: v }))} />
              <Input label="Blood Group" value={form.bloodGroup} onChange={(v) => setForm((prev) => ({ ...prev, bloodGroup: v }))} />
              <Input label="Date of Birth" type="date" value={form.birthday} onChange={(v) => setForm((prev) => ({ ...prev, birthday: v }))} />
              <Select
                label="Gender"
                value={form.sex}
                options={["", "male", "female"]}
                onChange={(v) => setForm((prev) => ({ ...prev, sex: v }))}
              />
              <Select
                label="Class"
                value={form.classId}
                options={["", ...classes.map((c) => c._id)]}
                optionLabel={(value) => {
                  if (!value) return "Select class";
                  const cls = classes.find((c) => c._id === value);
                  return cls ? `${cls.name} (${cls.classId || '-'})` : value;
                }}
                onChange={(v) => setForm((prev) => ({ ...prev, classId: v }))}
              />
              <Input label="Roll No" value={form.rollNo} onChange={(v) => setForm((prev) => ({ ...prev, rollNo: v }))} />
              <Select
                label="Academic Year"
                value={form.academicYear}
                options={yearOptions}
                onChange={(v) => setForm((prev) => ({ ...prev, academicYear: v }))}
              />

              <div className="md:col-span-2 pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-[#5f6843] text-white text-sm font-semibold hover:bg-[#4f5838] disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Student Profile"}
                </button>
              </div>
            </div>

            <section className="bg-[#fffdf6] border border-[#d6d2b5] rounded-xl p-5 md:p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-black text-[#3a3927]">Facial Images</h2>
                  <p className="text-sm text-[#5b6146] mt-1">Images are loaded from the real facial database/storage for this student.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void loadFacialData()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#c8c39d] bg-[#fefade] px-3 py-2 text-xs font-semibold text-[#4f5838]"
                  >
                    <RefreshCcw size={14} />
                    Refresh
                  </button>
                  <label className="inline-flex items-center gap-1.5 rounded-lg bg-[#5f6843] px-3 py-2 text-xs font-semibold text-white cursor-pointer">
                    <Upload size={14} />
                    {uploading ? "Uploading..." : "Add Images"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploading}
                      className="hidden"
                      onChange={(event) => {
                        void handleAddImages(event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              {facialError && (
                <div className="mb-4 rounded-lg border border-[#a14a2f]/30 bg-[#f5e7e2] text-[#8b3c25] px-4 py-3 text-sm">
                  {facialError}
                </div>
              )}

              <div className="mb-4 text-xs text-[#5f6843] font-semibold">
                Samples: {facialData?.numberOfSamples || 0}
              </div>

              {facialLoading ? (
                <div className="text-center py-8 text-[#676551] text-sm">Loading facial images...</div>
              ) : facialData?.embeddings?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {facialData.embeddings.map((item) => {
                    const canDelete = Boolean(item.imageRef || item.imageHash || item.embeddingRef || isMongoObjectId(item.id));
                    return (
                      <div key={item.id} className="rounded-xl border border-[#d6d2b5] bg-white p-3">
                        <div className="aspect-square rounded-lg overflow-hidden bg-[#edf3dd] border border-[#d6d2b5]">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt="Facial sample"
                              className="w-full h-full object-cover"
                              onError={(event) => {
                                const target = event.currentTarget;
                                if (!target.dataset.fallbackApplied) {
                                  target.dataset.fallbackApplied = "1";
                                  target.src = "/avatar.png";
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#5f6843]">
                              <Camera size={26} />
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-[11px] text-[#676551]">
                          {item.uploadedAt ? new Date(item.uploadedAt).toLocaleString() : "No timestamp"}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <label className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-[#5f6843]/35 bg-[#f8faef] px-2 py-1.5 text-xs font-semibold text-[#4f5838] cursor-pointer">
                            <RefreshCcw size={13} />
                            {replacingId === item.id ? "Replacing..." : "Replace"}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={replacingId === item.id}
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0] || null;
                                void handleReplaceImage(item, file);
                                event.currentTarget.value = "";
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => void handleDeleteImage(item)}
                            disabled={deletingId === item.id || !canDelete}
                            title={canDelete ? "Delete image" : "Delete unavailable for this source"}
                            className="inline-flex items-center justify-center rounded-md border border-[#b64f2f]/40 bg-[#fdf0eb] px-2 py-1.5 text-xs font-semibold text-[#8b3c25] disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-[#d6d2b5] bg-[#f8faef] px-4 py-8 text-center text-[#676551] text-sm">
                  No facial images found for this student.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[#6c7352] mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-[#c8c39d] bg-[#fefade] rounded-lg px-3 py-2 text-sm text-[#3a3927]"
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  optionLabel,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  optionLabel?: (value: string) => string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[#6c7352] mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-[#c8c39d] bg-[#fefade] rounded-lg px-3 py-2 text-sm text-[#3a3927]"
      >
        {options.map((opt) => (
          <option key={opt || "empty"} value={opt}>
            {optionLabel ? optionLabel(opt) : opt || "Select"}
          </option>
        ))}
      </select>
    </div>
  );
}
