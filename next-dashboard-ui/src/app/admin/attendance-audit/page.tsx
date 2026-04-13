"use client";

import { useEffect, useMemo, useState } from "react";

type SourceFilter = "all" | "manual" | "cctv";

interface AuditRow {
  _id: string;
  when: string;
  date: string;
  source: "manual" | "cctv";
  action: "create" | "update";
  previousStatus: "present" | "absent" | "late" | null;
  newStatus: "present" | "absent" | "late";
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  class: {
    id: string;
    name: string;
    classId: string;
    grade: string;
  };
  student: {
    id: string;
    name: string;
  };
}

export default function AttendanceAuditPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [date, setDate] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "100");
    if (source !== "all") params.set("source", source);
    if (date) params.set("date", date);
    return params.toString();
  }, [source, date]);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/admin/attendance-audit?${queryString}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Failed to load attendance audit logs");
        }
        setLogs(Array.isArray(data?.logs) ? data.logs : []);
      } catch (err: any) {
        setLogs([]);
        setError(err?.message || "Failed to load attendance audit logs");
      } finally {
        setLoading(false);
      }
    };

    void loadLogs();
  }, [queryString]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Attendance Audit Trail</h1>
        <p className="text-sm text-slate-600 mt-1">
          Monitor which teacher saved attendance, how it was saved (manual or CCTV), and when.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as SourceFilter)}
            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
          >
            <option value="all">All</option>
            <option value="manual">Manual</option>
            <option value="cctv">CCTV</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
          />
        </div>

        <button
          onClick={() => {
            setSource("all");
            setDate("");
          }}
          className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-semibold"
        >
          Reset Filters
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-slate-600">When</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600">Teacher</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600">Class</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600">Student</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600">Source</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600">Change</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600">Attendance Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    No attendance audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row._id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {new Date(row.when).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="font-semibold">{row.teacher.name}</div>
                      {row.teacher.email && <div className="text-xs text-slate-500">{row.teacher.email}</div>}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="font-semibold">{row.class.name}</div>
                      <div className="text-xs text-slate-500">{row.class.classId} • Grade {row.class.grade}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.student.name}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                          row.source === "cctv" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {row.source.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.previousStatus ? `${row.previousStatus} → ${row.newStatus}` : `set ${row.newStatus}`}
                    </td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {new Date(row.date).toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
