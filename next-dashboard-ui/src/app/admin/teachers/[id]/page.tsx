"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Mail, Phone, UserSquare2, CalendarDays, GraduationCap } from "lucide-react";

type TeacherDetails = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  teacherId?: string;
  subjects?: string[];
  classes?: string[];
  qualification?: string;
  joiningDate?: string | null;
  photo?: string;
};

const SingleTeacherPage = () => {
  const params = useParams<{ id: string }>();
  const teacherId = params?.id;

  const [teacher, setTeacher] = useState<TeacherDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!teacherId) return;

    const controller = new AbortController();

    const loadTeacher = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/admin/teachers/${teacherId}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setTeacher(null);
          setError(data?.error || "Failed to load teacher details");
          return;
        }

        setTeacher(data?.teacher || null);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setTeacher(null);
          setError("Failed to load teacher details");
        }
      } finally {
        setLoading(false);
      }
    };

    void loadTeacher();
    return () => controller.abort();
  }, [teacherId]);

  const joinedOn = useMemo(() => {
    if (!teacher?.joiningDate) return "-";
    const date = new Date(teacher.joiningDate);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  }, [teacher?.joiningDate]);

  if (loading) {
    return (
      <div className="flex-1 p-4">
        <div className="bg-white rounded-xl p-6 text-sm text-gray-600">Loading teacher details...</div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="flex-1 p-4">
        <div className="bg-white rounded-xl p-6 border border-red-200">
          <p className="text-red-700 font-medium">{error || "Teacher not found"}</p>
          <Link href="/admin/teachers" className="inline-block mt-3 text-sm text-blue-700 hover:underline">
            Back to all teachers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0">
            <Image
              src={teacher.photo || "/avatar.png"}
              alt={teacher.name || "Teacher"}
              width={140}
              height={140}
              className="w-36 h-36 rounded-full object-cover border border-gray-200"
            />
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#2f3640]">{teacher.name || "Unnamed Teacher"}</h1>
            <p className="text-sm text-gray-600 mt-1">Teacher ID: {teacher.teacherId || "-"}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>{teacher.email || "-"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{teacher.phone || "-"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <CalendarDays className="w-4 h-4 text-gray-500" />
                <span>Joined: {joinedOn}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <GraduationCap className="w-4 h-4 text-gray-500" />
                <span>{teacher.qualification || "Qualification not set"}</span>
              </div>
              <div className="flex items-start gap-2 text-gray-700 md:col-span-2">
                <UserSquare2 className="w-4 h-4 text-gray-500 mt-0.5" />
                <span>{teacher.address || "Address not set"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Subjects</h2>
            {teacher.subjects?.length ? (
              <div className="flex flex-wrap gap-2">
                {teacher.subjects.map((subject) => (
                  <span key={subject} className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs">
                    {subject}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No subjects assigned.</p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Classes</h2>
            {teacher.classes?.length ? (
              <div className="flex flex-wrap gap-2">
                {teacher.classes.map((className) => (
                  <span key={className} className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs">
                    {className}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No classes assigned.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleTeacherPage;

