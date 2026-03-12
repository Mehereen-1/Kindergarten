"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ActivityForm from "@/app/components/activities/ActivityForm";
import { role } from "@/lib/data";
import { Plus, RefreshCw, Trash2 } from "lucide-react";

type Activity = {
  _id: string;
  title: string;
  description: string;
  subject: string;
  date: string;
  classId?: { _id: string; name?: string; grade?: string } | string;
  createdBy?: { _id: string; name?: string } | string;
};

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function getClassName(classId: Activity["classId"]) {
  if (!classId) return "—";
  if (typeof classId === "string") return classId;
  return classId.name ? `${classId.name} (Grade ${classId.grade})` : classId._id;
}

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [adminId, setAdminId] = useState<string>("000000000000000000000000");

  // Get admin id from cookie
  useEffect(() => {
    const userCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user="));
    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.split("=")[1]));
        setAdminId(user.id);
      } catch {}
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/activities", { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch activities");
      }
      const data = await response.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this activity?")) return;
    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete");
      }
      setActivities((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const sorted = useMemo(
    () =>
      [...activities].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [activities]
  );

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">All Activities</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchActivities}
            className="flex items-center gap-1 px-3 py-2 rounded-md border text-sm text-gray-700 hover:bg-gray-100"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          {role === "admin" && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1 px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              <Plus size={16} />
              {showForm ? "Hide Form" : "Create Activity"}
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 max-w-3xl">
          <ActivityForm
            createdBy={adminId}
            onCreated={() => {
              setShowForm(false);
              fetchActivities();
            }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          <p>{error}</p>
          <button
            onClick={fetchActivities}
            className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="text-gray-500 py-6">Loading activities...</div>
      )}

      {/* Table */}
      {!isLoading && !error && sorted.length === 0 && (
        <div className="text-gray-500 py-6">
          No activities found. Click &ldquo;Create Activity&rdquo; to add one.
        </div>
      )}

      {!isLoading && sorted.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">
                  Class
                </th>
                <th className="px-4 py-3 font-semibold">Date</th>
                {role === "admin" && (
                  <th className="px-4 py-3 font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((activity) => (
                <tr key={activity._id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="line-clamp-1 text-xs text-gray-500">
                      {activity.description}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {activity.subject}
                  </td>
                  <td className="px-4 py-3 text-gray-700 hidden md:table-cell">
                    {getClassName(activity.classId)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(activity.date)}
                  </td>
                  {role === "admin" && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(activity._id)}
                        className="rounded-md bg-red-50 p-2 text-red-600 hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
