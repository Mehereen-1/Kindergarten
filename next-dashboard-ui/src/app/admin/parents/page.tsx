"use client";

import { useEffect, useState } from "react";
import FormModal from "@/app/components/FormModal";
import Pagination from "@/app/components/Pagination";
import Table from "@/app/components/Table";
import TableSearch from "@/app/components/TableSearch";
import { role } from "@/lib/data";
import Image from "next/image";
import { useAdvancedSearch } from "@/hooks/useAdvancedSearch";

type Parent = {
  _id: string;
  name: string;
  email?: string;
  students?: string[];
  phone?: string;
  address?: string;
};

const columns = [
  { header: "Info", accessor: "info" },
  { header: "Student Names", accessor: "students", className: "hidden md:table-cell" },
  { header: "Phone", accessor: "phone", className: "hidden lg:table-cell" },
  { header: "Address", accessor: "address", className: "hidden lg:table-cell" },
  { header: "Actions", accessor: "action" },
];

export default function ParentListPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [loadError, setLoadError] = useState("");

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    filteredItems: filteredParents,
    suggestions: searchSuggestions,
  } = useAdvancedSearch({
    items: parents,
    fields: ["name", "email", "students", "phone", "address"],
    suggestionField: "name",
  });

  useEffect(() => {
    const controller = new AbortController();

    const loadParents = async () => {
      try {
        setLoadError("");
        const response = await fetch("/api/admin/parents", { signal: controller.signal });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          setLoadError(errorBody?.error || "Failed to load parents");
          setParents([]);
          return;
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.parents) ? data.parents : [];
        setParents(list);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setLoadError("Failed to load parents");
        }
      }
    };

    loadParents();
    return () => controller.abort();
  }, []);

  const renderRow = (item: Parent) => (
    <tr key={item._id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
      <td className="flex items-center gap-4 p-4">
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-gray-500">{item.email || "-"}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.students?.length ? item.students.join(", ") : "-"}</td>
      <td className="hidden md:table-cell">{item.phone || "-"}</td>
      <td className="hidden md:table-cell">{item.address || "-"}</td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormModal table="parent" type="update" data={item as any} />
              <FormModal table="parent" type="delete" id={item._id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-[#fffdf6] border border-[#d6d2b5]/70 p-4 md:p-5 rounded-2xl flex-1 m-4 mt-0 shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-[#6d7750]">Admin Panel</p>
          <h1 className="hidden md:block text-2xl font-black text-[#3a3927]">All Parents</h1>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            suggestions={searchSuggestions}
            onSuggestionSelect={setSearchQuery}
            placeholder="Search parent, student, phone..."
          />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5efd8]">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5efd8]">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && <FormModal table="parent" type="create" />}
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
          {filteredParents.length} result{filteredParents.length === 1 ? "" : "s"} found
        </div>
      )}

      <Table columns={columns} renderRow={renderRow} data={filteredParents} />
      <Pagination />
    </div>
  );
}
