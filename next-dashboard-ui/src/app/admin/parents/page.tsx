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
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [savingParent, setSavingParent] = useState(false);
  const [deletingParentId, setDeletingParentId] = useState<string | null>(null);
  const [parentForm, setParentForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

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

  const openEditParent = (parent: Parent) => {
    setEditingParent(parent);
    setParentForm({
      name: parent.name || "",
      email: parent.email || "",
      phone: parent.phone || "",
      address: parent.address || "",
    });
  };

  const closeEditParent = () => {
    setEditingParent(null);
    setParentForm({ name: "", email: "", phone: "", address: "" });
  };

  const handleSaveParent = async () => {
    if (!editingParent) return;

    try {
      setSavingParent(true);
      const response = await fetch(`/api/admin/parents/${encodeURIComponent(editingParent._id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parentForm),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update parent");
      }

      setParents((prev) =>
        prev.map((parent) =>
          parent._id === editingParent._id
            ? {
                ...parent,
                name: parentForm.name,
                email: parentForm.email,
                phone: parentForm.phone,
                address: parentForm.address,
              }
            : parent
        )
      );
      closeEditParent();
    } catch (error: any) {
      alert(error?.message || "Failed to update parent");
    } finally {
      setSavingParent(false);
    }
  };

  const handleDeleteParent = async (parent: Parent) => {
    const confirmed = window.confirm(`Delete ${parent.name || "this parent"}?`);
    if (!confirmed) return;

    try {
      setDeletingParentId(parent._id);
      const response = await fetch(`/api/admin/parents/${encodeURIComponent(parent._id)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete parent");
      }

      setParents((prev) => prev.filter((row) => row._id !== parent._id));
    } catch (error: any) {
      alert(error?.message || "Failed to delete parent");
    } finally {
      setDeletingParentId(null);
    }
  };

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
              <button
                type="button"
                onClick={() => openEditParent(item)}
                className="h-8 px-2 flex items-center gap-1 justify-center rounded-md bg-[#f5efd8] text-[#4f4727] border border-[#d8d3b3]"
                title="Edit parent"
                aria-label="Edit parent"
              >
                <Image src="/edit.png" alt="Edit" width={16} height={16} />
                <span className="text-xs font-semibold">Edit</span>
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteParent(item)}
                disabled={deletingParentId === item._id}
                className="h-8 px-2 flex items-center gap-1 justify-center rounded-md bg-[#fdf0eb] text-[#8b3c25] border border-[#b64f2f]/40 disabled:opacity-50"
                title="Delete parent"
                aria-label="Delete parent"
              >
                <Image src="/delete.png" alt="Delete" width={16} height={16} />
                <span className="text-xs font-semibold">
                  {deletingParentId === item._id ? "Deleting..." : "Delete"}
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

      {editingParent && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center px-4">
          <div className="bg-[#fffdf6] border border-[#d6d2b5] rounded-xl w-full max-w-lg p-5 shadow-xl">
            <h2 className="text-lg font-bold text-[#3a3927] mb-4">Edit Parent</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <EditInput label="Name" value={parentForm.name} onChange={(value) => setParentForm((prev) => ({ ...prev, name: value }))} />
              <EditInput label="Email" value={parentForm.email} onChange={(value) => setParentForm((prev) => ({ ...prev, email: value }))} />
              <EditInput label="Phone" value={parentForm.phone} onChange={(value) => setParentForm((prev) => ({ ...prev, phone: value }))} />
              <EditInput label="Address" value={parentForm.address} onChange={(value) => setParentForm((prev) => ({ ...prev, address: value }))} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditParent}
                disabled={savingParent}
                className="px-4 py-2 rounded-lg border border-[#c8c39d] text-[#4f4727] hover:bg-[#f8f3e1]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveParent()}
                disabled={savingParent}
                className="px-4 py-2 rounded-lg bg-[#5f6843] text-white font-semibold disabled:opacity-50"
              >
                {savingParent ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
