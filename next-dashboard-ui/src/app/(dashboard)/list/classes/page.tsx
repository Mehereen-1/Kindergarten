"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/app/components/FormModal";
import Pagination from "@/app/components/Pagination";
import Table from "@/app/components/Table";
import TableSearch from "@/app/components/TableSearch";
import { role } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";
import { useAdvancedSearch } from "@/hooks/useAdvancedSearch";

type Class = {
  _id: string;
  classId?: string;
  name: string;
  capacity: number;
  grade: string;
  teacher?: { name?: string } | null;
};

type TeacherOption = {
  _id: string;
  name?: string;
  email?: string;
};

const columns = [
  {
    header: "Class Name",
    accessor: "name",
  },
  {
    header: "Class ID",
    accessor: "classId",
    className: "hidden md:table-cell",
  },
  {
    header: "Capacity",
    accessor: "capacity",
    className: "hidden md:table-cell",
  },
  {
    header: "Grade",
    accessor: "grade",
    className: "hidden md:table-cell",
  },
  {
    header: "Teacher (Year)",
    accessor: "supervisor",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

const ClassListPage = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<Record<string, string>>({});
  const [isAssigning, setIsAssigning] = useState<Record<string, boolean>>({});
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));
  const [loadError, setLoadError] = useState("");

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    filteredItems: filteredClasses,
    suggestions: searchSuggestions,
  } = useAdvancedSearch({
    items: classes,
    fields: ["name", "classId", "capacity", "grade", "teacher.name"],
    suggestionField: "name",
  });

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1].map((year) => String(year));
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadClasses = async () => {
      try {
        setLoadError("");
        const response = await fetch(`/api/admin/classes?academicYear=${academicYear}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          setLoadError(errorBody?.error || "Failed to load classes");
          setClasses([]);
          return;
        }

        const data = await response.json();
        const classData = Array.isArray(data) ? data : [];
        setClasses(classData);
        setSelectedTeachers((prev) => {
          const next = { ...prev };
          classData.forEach((classDoc: Class & { teacher?: { _id?: string } | null }) => {
            const teacherId = classDoc.teacher?._id || "";
            if (!next[classDoc._id]) {
              next[classDoc._id] = teacherId;
            }
          });
          return next;
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load classes", error);
          setLoadError("Failed to load classes");
        }
      }
    };

    loadClasses();

    return () => controller.abort();
  }, [academicYear]);

  useEffect(() => {
    const controller = new AbortController();

    const loadTeachers = async () => {
      try {
        const response = await fetch("/api/admin/teachers", {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.teachers) ? data.teachers : [];
        setTeachers(list);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load teachers", error);
        }
      }
    };

    loadTeachers();

    return () => controller.abort();
  }, []);

  const assignTeacher = async (classId: string) => {
    const teacherId = selectedTeachers[classId];
    if (!teacherId) {
      return;
    }

    setIsAssigning((prev) => ({ ...prev, [classId]: true }));

    try {
      const response = await fetch("/api/admin/classes/assign-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          teacherId,
          academicYear,
          role: "class_teacher",
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setClasses((prev) =>
          prev.map((item) => (item._id === classId ? { ...item, teacher: updated.teacher } : item))
        );
      }
    } catch (error) {
      console.error("Failed to assign teacher", error);
    } finally {
      setIsAssigning((prev) => ({ ...prev, [classId]: false }));
    }
  };

  const renderRow = (item: Class) => (
    <tr
      key={item._id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.name}</td>
      <td className="hidden md:table-cell">
        {item.classId ? (
          <Link
            href={`/list/students?classId=${encodeURIComponent(item.classId)}&academicYear=${academicYear}`}
            className="text-lamaSky underline"
          >
            {item.classId}
          </Link>
        ) : (
          "-"
        )}
      </td>
      <td className="hidden md:table-cell">{item.capacity}</td>
      <td className="hidden md:table-cell">{item.grade}</td>
      <td className="hidden md:table-cell">{item.teacher?.name || "Unassigned"}</td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <select
                className="hidden md:block border border-gray-300 rounded px-2 py-1 text-xs"
                value={selectedTeachers[item._id] || ""}
                onChange={(event) =>
                  setSelectedTeachers((prev) => ({
                    ...prev,
                    [item._id]: event.target.value,
                  }))
                }
              >
                <option value="">Assign teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name || teacher.email || teacher._id}
                  </option>
                ))}
              </select>
              <button
                className="hidden md:inline-flex items-center px-2 py-1 text-xs rounded bg-lamaSky text-white disabled:opacity-60"
                disabled={!selectedTeachers[item._id] || isAssigning[item._id]}
                onClick={() => assignTeacher(item._id)}
              >
                {isAssigning[item._id] ? "Saving..." : "Assign"}
              </button>
              <FormModal table="class" type="update" data={item} />
              <FormModal table="class" type="delete" id={item._id} />
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
          <h1 className="hidden md:block text-2xl font-black text-[#3a3927]">All Classes</h1>
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
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            suggestions={searchSuggestions}
            onSuggestionSelect={setSearchQuery}
            placeholder="Search class, grade, teacher..."
          />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5efd8]">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5efd8]">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && <FormModal table="class" type="create" />}
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
          {filteredClasses.length} result{filteredClasses.length === 1 ? "" : "s"} found
        </div>
      )}
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={filteredClasses} />
      {/* PAGINATION */}
      <Pagination />
    </div>
  );
};

export default ClassListPage;