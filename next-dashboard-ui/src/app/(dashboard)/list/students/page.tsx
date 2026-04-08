"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/app/components/FormModal";
import Pagination from "@/app/components/Pagination";
import Table from "@/app/components/Table";
import TableSearch from "@/app/components/TableSearch";
import { role } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ClassOption = {
  _id: string;
  classId?: string;
  name: string;
  grade?: string;
};

type Student = {
  id: string;
  name: string;
  email?: string;
  photo: string;
  phone?: string;
  grade?: string;
  classId?: string;
  className?: string;
  classRefId?: string;
  rollNo?: string;
  address?: string;
};

const columns = [
  {
    header: "Info",
    accessor: "info",
  },
  {
    header: "Student ID",
    accessor: "studentId",
    className: "hidden md:table-cell",
  },
  {
    header: "Class",
    accessor: "className",
    className: "hidden md:table-cell",
  },
  {
    header: "Grade",
    accessor: "grade",
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

const StudentListPage = () => {
  const searchParams = useSearchParams();
  const classIdParam = searchParams.get("classId") || "";
  const academicYearParam = searchParams.get("academicYear") || String(new Date().getFullYear());
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [academicYear, setAcademicYear] = useState(academicYearParam);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editClassId, setEditClassId] = useState("");
  const [editAcademicYear, setEditAcademicYear] = useState(academicYearParam);
  const [editRollNo, setEditRollNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingClassChanges, setPendingClassChanges] = useState<Record<string, string>>({});
  const [savingAllChanges, setSavingAllChanges] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState(classIdParam);
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('all');
  const [loadError, setLoadError] = useState('');

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1, current + 2].map((year) => String(year));
  }, []);

  useEffect(() => {
    setAcademicYear(academicYearParam);
  }, [academicYearParam]);

  useEffect(() => {
    setSelectedClassFilter(classIdParam || 'all');
  }, [classIdParam]);

  useEffect(() => {
    setPendingClassChanges({});
  }, [academicYear]);

  const loadClasses = async () => {
    try {
      const response = await fetch(`/api/admin/classes?academicYear=${academicYear}`);
      if (!response.ok) return;
      const data = await response.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.classes)
          ? data.classes
          : [];

      setClasses(
        list.map((cls: any) => ({
          _id: cls._id,
          classId: cls.classId,
          name: cls.name,
          grade: cls.grade,
        }))
      );
    } catch (error) {
      console.error("Failed to load classes", error);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadStudents = async () => {
      try {
        setLoadError('');
        const response = await fetch(`/api/admin/students?academicYear=${academicYear}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          setLoadError(errorBody?.error || 'Failed to load students');
          setStudents([]);
          return;
        }

        const data = await response.json();
        const rawStudents = Array.isArray(data?.students) ? data.students : [];
        const mapped = rawStudents.map((student: any) => ({
          id: student._id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          address: student.address,
          photo: student.profilePic || "/avatar.png",
          classRefId: student.currentClass?._id || "",
          classId: student.currentClass?.classId || "",
          className: student.currentClass?.name || "",
          grade: student.currentClass?.grade || "",
          rollNo: student.rollNo || "",
        }));

        const filtered = classIdParam
          ? mapped.filter((student) => student.classId === classIdParam || student.classRefId === classIdParam)
          : mapped;

        setStudents(filtered);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load students", error);
          setLoadError('Failed to load students');
        }
      }
    };

    loadStudents();
    loadClasses();

    return () => controller.abort();
  }, [academicYear, classIdParam]);

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setEditClassId(student.classRefId || "");
    setEditAcademicYear(academicYear);
    setEditRollNo(student.rollNo || "");
  };

  const closeEditModal = () => {
    setEditingStudent(null);
    setEditClassId("");
    setEditAcademicYear(academicYear);
    setEditRollNo("");
  };

  const handleSaveAssignment = async () => {
    if (!editingStudent || !editClassId || !editAcademicYear) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/students/${editingStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: editClassId,
          academicYear: editAcademicYear,
          rollNo: editRollNo || undefined,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        alert(errorBody?.error || "Failed to update student assignment");
        return;
      }

      closeEditModal();

      const refresh = await fetch(`/api/admin/students?academicYear=${academicYear}`);
      if (refresh.ok) {
        const data = await refresh.json();
        const rawStudents = Array.isArray(data?.students) ? data.students : [];
        const mapped = rawStudents.map((student: any) => ({
          id: student._id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          address: student.address,
          photo: student.profilePic || "/avatar.png",
          classRefId: student.currentClass?._id || "",
          classId: student.currentClass?.classId || "",
          className: student.currentClass?.name || "",
          grade: student.currentClass?.grade || "",
          rollNo: student.rollNo || "",
        }));

        const filtered = classIdParam
          ? mapped.filter((student: Student) => student.classId === classIdParam || student.classRefId === classIdParam)
          : mapped;

        setStudents(filtered);
      }
    } catch (error) {
      console.error("Failed to update student assignment", error);
      alert("Failed to update student assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleStageClassChange = (studentId: string, nextClassId: string) => {
    setPendingClassChanges((prev) => ({
      ...prev,
      [studentId]: nextClassId,
    }));
  };

  const handleSaveAllClassChanges = async () => {
    const pendingEntries = Object.entries(pendingClassChanges).filter(([, classId]) => Boolean(classId));
    if (!pendingEntries.length) {
      return;
    }

    try {
      setSavingAllChanges(true);

      for (const [studentId, classId] of pendingEntries) {
        const student = students.find((row) => row.id === studentId);
        const response = await fetch(`/api/admin/students/${studentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId,
            academicYear,
            rollNo: student?.rollNo || undefined,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody?.error || "Failed to save class assignments");
        }
      }

      setStudents((prev) =>
        prev.map((row) => {
          const nextClassId = pendingClassChanges[row.id];
          if (!nextClassId) {
            return row;
          }

          const selectedClass = classes.find((cls) => cls._id === nextClassId);
          return {
            ...row,
            classRefId: nextClassId,
            className: selectedClass?.name || row.className,
            classId: selectedClass?.classId || row.classId,
            grade: selectedClass?.grade || row.grade,
          };
        })
      );

      setPendingClassChanges({});
    } catch (error: any) {
      alert(error?.message || "Failed to save class assignments");
    } finally {
      setSavingAllChanges(false);
    }
  };

  const renderRow = (item: Student) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={item.photo}
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-gray-500">{item.className || item.classId || "-"}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.id}</td>
      <td className="hidden md:table-cell">
        {role === "admin" ? (
          <select
            value={pendingClassChanges[item.id] ?? item.classRefId ?? ""}
            onChange={(event) => handleStageClassChange(item.id, event.target.value)}
            className="min-w-[150px] border border-[#c8c39d] bg-[#fefade] rounded px-2 py-1 text-xs text-[#3a3927]"
            disabled={savingAllChanges}
          >
            <option value="">Select class</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
        ) : (
          item.className || "-"
        )}
        {pendingClassChanges[item.id] && (
          <div className="text-[10px] text-orange-600 mt-1">Unsaved change</div>
        )}
      </td>
      <td className="hidden md:table-cell">{item.grade || "-"}</td>
      <td className="hidden md:table-cell">{item.phone}</td>
      <td className="hidden md:table-cell">{item.address}</td>
      <td>
        <div className="flex items-center gap-2">
          <Link href={`/list/students/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-[#e2ebcb]">
              <Image src="/view.png" alt="" width={16} height={16} />
            </button>
          </Link>
          {role === "admin" && (
            <button
              onClick={() => openEditModal(item)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-[#f5efd8]"
              title="Edit class assignment"
            >
              <Image src="/edit.png" alt="" width={16} height={16} />
            </button>
          )}
          {role === "admin" && (
            // <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaPurple">
            //   <Image src="/delete.png" alt="" width={16} height={16} />
            // </button>
            <FormModal table="student" type="delete" id={item.id}/>
          )}
        </div>
      </td>
    </tr>
  );

  const sectionOptions = useMemo(() => {
    const sections = new Set<string>();
    students.forEach((student) => {
      const raw = student.classId || student.className || '';
      const match = raw.match(/([A-Z])$/);
      if (match?.[1]) sections.add(match[1]);
    });
    return Array.from(sections).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (selectedClassFilter && selectedClassFilter !== 'all' && student.classRefId !== selectedClassFilter) {
        if (student.classId !== selectedClassFilter) {
          return false;
        }
      }

      if (selectedSectionFilter && selectedSectionFilter !== 'all') {
        const raw = student.classId || student.className || '';
        const section = raw.match(/([A-Z])$/)?.[1] || '';
        if (section !== selectedSectionFilter) {
          return false;
        }
      }

      return true;
    });
  }, [students, selectedClassFilter, selectedSectionFilter]);

  return (
    <div className="bg-[#fffdf6] border border-[#d6d2b5]/70 p-4 md:p-5 rounded-2xl flex-1 m-4 mt-0 shadow-sm">
      {/* TOP */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-[#6d7750]">Admin Panel</p>
          <h1 className="hidden md:block text-2xl font-black text-[#3a3927]">All Students</h1>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="academicYear" className="text-[#5a6142] font-medium">Academic Year</label>
            <select
              id="academicYear"
              value={academicYear}
              onChange={(event) => setAcademicYear(event.target.value)}
              className="border border-[#c8c39d] bg-[#fefade] rounded px-2 py-1 text-[#3a3927]"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="classFilter" className="text-[#5a6142] font-medium">Class</label>
            <select
              id="classFilter"
              value={selectedClassFilter || 'all'}
              onChange={(event) => setSelectedClassFilter(event.target.value)}
              className="border border-[#c8c39d] bg-[#fefade] rounded px-2 py-1 text-[#3a3927]"
            >
              <option value="all">All</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="sectionFilter" className="text-[#5a6142] font-medium">Section</label>
            <select
              id="sectionFilter"
              value={selectedSectionFilter}
              onChange={(event) => setSelectedSectionFilter(event.target.value)}
              className="border border-[#c8c39d] bg-[#fefade] rounded px-2 py-1 text-[#3a3927]"
            >
              <option value="all">All</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>
          {role === "admin" && (
            <button
              onClick={handleSaveAllClassChanges}
              disabled={savingAllChanges || Object.keys(pendingClassChanges).length === 0}
              className="px-3 py-1.5 rounded text-sm bg-[#5f6843] text-white disabled:opacity-50"
            >
              {savingAllChanges
                ? "Saving..."
                : `Save All Changes (${Object.keys(pendingClassChanges).length})`}
            </button>
          )}
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5efd8]">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5efd8]">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && (
              // <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              //   <Image src="/plus.png" alt="" width={14} height={14} />
              // </button>
              <FormModal table="student" type="create"/>
            )}
          </div>
        </div>
      </div>
      {loadError && (
        <div className="mt-4 rounded-lg border border-[#a14a2f]/30 bg-[#f5e7e2] text-[#8b3c25] text-sm px-3 py-2">
          {loadError}
        </div>
      )}
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={filteredStudents} />
      {/* PAGINATION */}
      <Pagination />

      {editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-[#fffdf6] border border-[#d6d2b5] rounded-xl w-[95%] max-w-md p-5">
            <h2 className="text-lg font-bold mb-4">Assign Class & Academic Year</h2>
            <p className="text-sm text-[#5b6146] mb-4">Student: {editingStudent.name}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-[#5b6146] mb-1">Academic Year</label>
                <select
                  value={editAcademicYear}
                  onChange={(event) => setEditAcademicYear(event.target.value)}
                  className="w-full border border-[#c8c39d] bg-[#fefade] rounded px-3 py-2 text-[#3a3927]"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#5b6146] mb-1">Class</label>
                <select
                  value={editClassId}
                  onChange={(event) => setEditClassId(event.target.value)}
                  className="w-full border border-[#c8c39d] bg-[#fefade] rounded px-3 py-2 text-[#3a3927]"
                >
                  <option value="">Select class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name} {cls.classId ? `(${cls.classId})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#5b6146] mb-1">Roll No (optional)</label>
                <input
                  value={editRollNo}
                  onChange={(event) => setEditRollNo(event.target.value)}
                  className="w-full border border-[#c8c39d] bg-[#fefade] rounded px-3 py-2 text-[#3a3927]"
                  placeholder="e.g. 15"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 border border-[#c8c39d] rounded hover:bg-[#f8f3e1]"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignment}
                disabled={saving || !editClassId || !editAcademicYear}
                className="px-4 py-2 bg-[#5f6843] text-white rounded disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentListPage;