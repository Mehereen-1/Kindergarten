"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/app/components/FormModal";
import Pagination from "@/app/components/Pagination";
import Table from "@/app/components/Table";
import TableSearch from "@/app/components/TableSearch";
import { role } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";

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

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1].map((year) => String(year));
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadClasses = async () => {
      try {
        const response = await fetch(`/api/admin/classes?academicYear=${academicYear}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
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
        setTeachers(Array.isArray(data) ? data : []);
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
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Classes</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="academicYear" className="text-gray-600">Academic Year</label>
            <select
              id="academicYear"
              value={academicYear}
              onChange={(event) => setAcademicYear(event.target.value)}
              className="border border-gray-300 rounded px-2 py-1"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && <FormModal table="class" type="create" />}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={classes} />
      {/* PAGINATION */}
      <Pagination />
    </div>
  );
};

export default ClassListPage;