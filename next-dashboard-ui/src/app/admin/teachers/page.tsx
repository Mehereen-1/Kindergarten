"use client";

import FormModal from "@/app/components/FormModal";
import Pagination from "@/app/components/Pagination";
import Table from "@/app/components/Table";
import TableSearch from "@/app/components/TableSearch";
import { role } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdvancedSearch } from "@/hooks/useAdvancedSearch";

type Teacher = {
  _id: string;
  teacherId?: string;
  name?: string;
  email?: string;
  photo?: string;
  phone?: string;
  subjects?: string[];
  classes?: string[];
  address?: string;
};

const columns = [
  {
    header: "Info",
    accessor: "info",
  },
  {
    header: "Teacher ID",
    accessor: "teacherId",
    className: "hidden md:table-cell",
  },
  {
    header: "Subjects",
    accessor: "subjects",
    className: "hidden md:table-cell",
  },
  {
    header: "Classes",
    accessor: "classes",
    className: "hidden md:table-cell",
  },
  {
    header: "Phone",
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: "Address",
    accessor: "address",
    className: "hidden lg:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

const TeacherListPage = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadError, setLoadError] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    teacherId: '',
    subjects: '',
  });

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    filteredItems: filteredTeachers,
    suggestions: searchSuggestions,
  } = useAdvancedSearch({
    items: teachers,
    fields: ["name", "email", "teacherId", "subjects", "classes", "phone", "address"],
    suggestionField: "name",
  });

  useEffect(() => {
    const controller = new AbortController();

    const loadTeachers = async () => {
      try {
        setLoadError('');
        const response = await fetch("/api/admin/teachers", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          setLoadError(errorBody?.error || "Failed to load teachers");
          setTeachers([]);
          return;
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.teachers) ? data.teachers : [];
        setTeachers(list);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load teachers", error);
          setLoadError("Failed to load teachers");
        }
      }
    };

    loadTeachers();

    return () => controller.abort();
  }, []);

  const openEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setTeacherForm({
      name: teacher.name || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      address: teacher.address || '',
      teacherId: teacher.teacherId || '',
      subjects: teacher.subjects?.join(', ') || '',
    });
  };

  const closeEditTeacher = () => {
    setEditingTeacher(null);
    setTeacherForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      teacherId: '',
      subjects: '',
    });
  };

  const handleSaveTeacher = async () => {
    if (!editingTeacher) return;

    try {
      setSavingTeacher(true);
      const response = await fetch(`/api/admin/teachers/${encodeURIComponent(editingTeacher._id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherForm),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update teacher');
      }

      const nextSubjects = teacherForm.subjects
        .split(',')
        .map((subject) => subject.trim())
        .filter(Boolean);

      setTeachers((prev) =>
        prev.map((teacher) =>
          teacher._id === editingTeacher._id
            ? {
                ...teacher,
                name: teacherForm.name,
                email: teacherForm.email,
                phone: teacherForm.phone,
                address: teacherForm.address,
                teacherId: teacherForm.teacherId,
                subjects: nextSubjects,
              }
            : teacher
        )
      );
      closeEditTeacher();
    } catch (error: any) {
      alert(error?.message || 'Failed to update teacher');
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleDeleteTeacher = async (teacher: Teacher) => {
    const confirmed = window.confirm(`Delete ${teacher.name || 'this teacher'}?`);
    if (!confirmed) return;

    try {
      setDeletingTeacherId(teacher._id);
      const response = await fetch(`/api/admin/teachers/${encodeURIComponent(teacher._id)}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete teacher');
      }

      setTeachers((prev) => prev.filter((row) => row._id !== teacher._id));
    } catch (error: any) {
      alert(error?.message || 'Failed to delete teacher');
    } finally {
      setDeletingTeacherId(null);
    }
  };

  const renderRow = (item: Teacher) => (
    <tr
      key={item._id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={item.photo || "/avatar.png"}
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name || "Unnamed"}</h3>
          <p className="text-xs text-gray-500">{item?.email}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.teacherId || "-"}</td>
      <td className="hidden md:table-cell">{item.subjects?.join(",") || "-"}</td>
      <td className="hidden md:table-cell">{item.classes?.join(",") || "-"}</td>
      <td className="hidden md:table-cell">{item.phone || "-"}</td>
      <td className="hidden md:table-cell">{item.address || "-"}</td>
      <td>
        <div className="flex items-center gap-2">
          <Link href={`/admin/teachers/${item._id}`}>
            <button
              className="h-8 px-2 flex items-center gap-1 justify-center rounded-md bg-lamaSky text-[#1f3c4f]"
              title="View teacher details"
              aria-label="View teacher details"
            >
              <Image src="/view.png" alt="View" width={16} height={16} />
              <span className="text-xs font-medium">View</span>
            </button>
          </Link>
          {role === "admin" && (
            <>
              <button
                type="button"
                onClick={() => openEditTeacher(item)}
                className="h-8 px-2 flex items-center gap-1 justify-center rounded-md bg-[#f5efd8] text-[#4f4727] border border-[#d8d3b3]"
                title="Edit teacher"
                aria-label="Edit teacher"
              >
                <Image src="/edit.png" alt="Edit" width={16} height={16} />
                <span className="text-xs font-semibold">Edit</span>
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteTeacher(item)}
                disabled={deletingTeacherId === item._id}
                className="h-8 px-2 flex items-center gap-1 justify-center rounded-md bg-[#fdf0eb] text-[#8b3c25] border border-[#b64f2f]/40 disabled:opacity-50"
                title="Delete teacher"
                aria-label="Delete teacher"
              >
                <Image src="/delete.png" alt="Delete" width={16} height={16} />
                <span className="text-xs font-semibold">
                  {deletingTeacherId === item._id ? 'Deleting...' : 'Delete'}
                </span>
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-[#fffdf6] border border-[#d6d2b5]/70 p-4 md:p-5 rounded-2xl flex-1 m-4 mt-0 shadow-sm">
      {/* TOP */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-[#6d7750]">Admin Panel</p>
          <h1 className="hidden md:block text-2xl font-black text-[#3a3927]">All Teachers</h1>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            suggestions={searchSuggestions}
            onSuggestionSelect={setSearchQuery}
            placeholder="Search teacher, subject, class..."
          />
          <div className="flex items-center gap-4 self-end">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5efd8]"
              title="Filter"
              aria-label="Filter"
            >
              <Image src="/filter.png" alt="Filter" width={14} height={14} />
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5efd8]"
              title="Sort"
              aria-label="Sort"
            >
              <Image src="/sort.png" alt="Sort" width={14} height={14} />
            </button>
            {role === "admin" && (
              // <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              //   <Image src="/plus.png" alt="" width={14} height={14} />
              // </button>
              <FormModal table="teacher" type="create"/>
            )}
          </div>
        </div>
      </div>
      {loadError && (
        <div className="mt-4 rounded-lg border border-[#a14a2f]/30 bg-[#f5e7e2] text-[#8b3c25] text-sm px-3 py-2">
          {loadError}
        </div>
      )}
      {!!searchQuery && (
        <div className="mt-3 text-xs text-[#5a6142]">
          {filteredTeachers.length} result{filteredTeachers.length === 1 ? '' : 's'} found
        </div>
      )}
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={filteredTeachers} />
      {/* PAGINATION */}
      <Pagination />

      {editingTeacher && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center px-4">
          <div className="bg-[#fffdf6] border border-[#d6d2b5] rounded-xl w-full max-w-lg p-5 shadow-xl">
            <h2 className="text-lg font-bold text-[#3a3927] mb-4">Edit Teacher</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <EditInput label="Name" value={teacherForm.name} onChange={(value) => setTeacherForm((prev) => ({ ...prev, name: value }))} />
              <EditInput label="Email" value={teacherForm.email} onChange={(value) => setTeacherForm((prev) => ({ ...prev, email: value }))} />
              <EditInput label="Phone" value={teacherForm.phone} onChange={(value) => setTeacherForm((prev) => ({ ...prev, phone: value }))} />
              <EditInput label="Teacher ID" value={teacherForm.teacherId} onChange={(value) => setTeacherForm((prev) => ({ ...prev, teacherId: value }))} />
              <EditInput label="Subjects" value={teacherForm.subjects} onChange={(value) => setTeacherForm((prev) => ({ ...prev, subjects: value }))} />
              <EditInput label="Address" value={teacherForm.address} onChange={(value) => setTeacherForm((prev) => ({ ...prev, address: value }))} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditTeacher}
                disabled={savingTeacher}
                className="px-4 py-2 rounded-lg border border-[#c8c39d] text-[#4f4727] hover:bg-[#f8f3e1]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveTeacher()}
                disabled={savingTeacher}
                className="px-4 py-2 rounded-lg bg-[#5f6843] text-white font-semibold disabled:opacity-50"
              >
                {savingTeacher ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function EditInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[#6c7352] mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-[#c8c39d] bg-[#fefade] rounded-lg px-3 py-2 text-sm text-[#3a3927]"
      />
    </div>
  );
}

export default TeacherListPage;
