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
          <Link href={`/list/teachers/${item._id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
              <Image src="/view.png" alt="" width={16} height={16} />
            </button>
          </Link>
          {role === "admin" && (
            // <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaPurple">
            //   <Image src="/delete.png" alt="" width={16} height={16} />
            // </button>
            <FormModal table="teacher" type="delete" id={item._id} />
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
    </div>
  );
};

export default TeacherListPage;