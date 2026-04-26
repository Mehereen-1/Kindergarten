"use client";

import { useEffect, useMemo, useState } from "react";
import ParentTopBar from "@/app/components/ParentTopBar";
import ProfileView from "@/app/components/ProfileView";
import { GraduationCap, UserRound } from "lucide-react";

interface Child {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  bloodGroup?: string;
  birthday?: string;
  sex?: string;
  currentClass?: {
    name?: string;
    classId?: string;
    grade?: string;
  } | null;
  rollNo?: string | null;
}

export default function ParentChildPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentId, setParentId] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  useEffect(() => {
    const userCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user="));

    if (!userCookie) {
      setLoading(false);
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userCookie.split("=")[1]));
      setParentId(user.id);
      void fetchChildren(user.id);
    } catch {
      setLoading(false);
    }
  }, []);

  const fetchChildren = async (id: string) => {
    try {
      const response = await fetch(`/api/parent/child?parentId=${encodeURIComponent(id)}`);
      const data = await response.json();

      if (!response.ok) {
        setChildren([]);
        return;
      }

      const list = Array.isArray(data.children) ? data.children : [];
      setChildren(list);
      if (list.length > 0) {
        setSelectedChildId(list[0]._id);
      }
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedChild = useMemo(
    () => children.find((child) => child._id === selectedChildId) || null,
    [children, selectedChildId]
  );

  return (
    <div className="min-h-screen bg-[var(--parent-main-bg)] overflow-y-auto">
      <ParentTopBar />

      <main className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
        <section className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] bg-[var(--color-surface-low)] p-6 shadow-[0_12px_34px_rgba(0,0,0,0.14)]">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">
            Parent Panel
          </p>
          <h1 className="text-3xl font-black text-[var(--color-on-surface)] mt-1">My Child</h1>
          <p className="text-[var(--color-on-surface-variant)] mt-2">
            You can edit basic child profile details here. Academic information is visible but managed by school administration.
          </p>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] bg-[var(--color-surface-low)] p-10 text-center text-[var(--color-on-surface-variant)]">
            Loading child profile...
          </section>
        ) : children.length === 0 ? (
          <section className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] bg-[var(--color-surface-low)] p-10 text-center">
            <UserRound className="mx-auto h-12 w-12 text-[var(--color-on-surface-variant)]" />
            <p className="mt-3 text-lg font-semibold text-[var(--color-on-surface)]">No child profile found.</p>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Please contact administration if this looks incorrect.</p>
          </section>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6 items-start">
            <aside className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] bg-[var(--color-surface-low)] p-4 shadow-[0_10px_26px_rgba(0,0,0,0.12)]">
              <p className="px-2 pb-3 text-xs font-black uppercase tracking-[0.11em] text-[var(--color-on-surface-variant)]">
                Children
              </p>
              <div className="space-y-2">
                {children.map((child) => {
                  const active = selectedChildId === child._id;
                  return (
                    <button
                      key={child._id}
                      onClick={() => setSelectedChildId(child._id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-container)]"
                          : "border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-container)]"
                      }`}
                    >
                      <p className="font-semibold text-[var(--color-on-surface)]">{child.name}</p>
                      <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5">
                        {child.currentClass?.grade || "No grade assigned"}
                        {child.rollNo ? ` • Roll ${child.rollNo}` : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="space-y-5">
              {selectedChild && (
                <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] bg-[var(--color-surface-low)] p-5 shadow-[0_10px_26px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-[var(--color-primary-container)] text-[var(--color-on-surface)] flex items-center justify-center font-black">
                      {selectedChild.name?.trim()?.charAt(0)?.toUpperCase() || "C"}
                    </div>
                    <div>
                      <p className="text-lg font-black text-[var(--color-on-surface)]">{selectedChild.name}</p>
                      <p className="text-sm text-[var(--color-on-surface-variant)]">Selected child profile</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_22%,transparent)] bg-[var(--color-surface)] p-3">
                      <p className="text-xs uppercase tracking-[0.08em] font-bold text-[var(--color-on-surface-variant)]">Grade</p>
                      <p className="text-lg font-black text-[var(--color-on-surface)] mt-1">{selectedChild.currentClass?.grade || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_22%,transparent)] bg-[var(--color-surface)] p-3">
                      <p className="text-xs uppercase tracking-[0.08em] font-bold text-[var(--color-on-surface-variant)]">Roll Number</p>
                      <p className="text-lg font-black text-[var(--color-on-surface)] mt-1">{selectedChild.rollNo || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_22%,transparent)] bg-[var(--color-surface)] p-3">
                      <p className="text-xs uppercase tracking-[0.08em] font-bold text-[var(--color-on-surface-variant)]">Class</p>
                      <p className="text-lg font-black text-[var(--color-on-surface)] mt-1 flex items-center gap-1">
                        <GraduationCap className="w-4 h-4 text-[var(--color-primary)]" />
                        {selectedChild.currentClass?.name || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {parentId && selectedChildId && (
                <ProfileView
                  userId={parentId}
                  childId={selectedChildId}
                  profileType="student"
                  theme="parent"
                />
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
