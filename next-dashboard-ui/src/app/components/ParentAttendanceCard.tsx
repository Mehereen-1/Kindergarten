"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type ChildRecord = {
  _id: string;
  name: string;
};

type AttendanceRow = {
  _id: string;
  date: string;
  status: "present" | "absent" | "late";
};

const ParentAttendanceCard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);

  useEffect(() => {
    let mounted = true;
    const parentId = user?.id;

    if (!parentId) {
      setChildren([]);
      setSelectedChildId("");
      setLoadingChildren(false);
      return () => {
        mounted = false;
      };
    }

    const loadChildren = async () => {
      try {
        setLoadingChildren(true);
        const year = String(new Date().getFullYear());
        const response = await fetch(
          `/api/parent/children?parentId=${encodeURIComponent(parentId)}&academicYear=${year}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("Failed to load children");
        }

        const data = await response.json();
        const rows = Array.isArray(data?.children) ? data.children : [];

        if (!mounted) return;
        setChildren(rows);
        if (rows.length > 0) {
          setSelectedChildId(rows[0]._id);
        }
      } catch {
        if (mounted) {
          setChildren([]);
          setSelectedChildId("");
        }
      } finally {
        if (mounted) {
          setLoadingChildren(false);
        }
      }
    };

    loadChildren();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;

    if (!selectedChildId) {
      setAttendance([]);
      return;
    }

    const loadAttendance = async () => {
      try {
        setLoadingAttendance(true);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const response = await fetch(
          `/api/parent/attendance?studentId=${encodeURIComponent(selectedChildId)}&from=${encodeURIComponent(startOfMonth.toISOString())}&to=${encodeURIComponent(startOfNextMonth.toISOString())}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("Failed to load attendance");
        }

        const data = await response.json();
        const rows = Array.isArray(data?.data) ? data.data : [];

        if (mounted) {
          setAttendance(rows);
        }
      } catch {
        if (mounted) {
          setAttendance([]);
        }
      } finally {
        if (mounted) {
          setLoadingAttendance(false);
        }
      }
    };

    loadAttendance();

    return () => {
      mounted = false;
    };
  }, [selectedChildId]);

  const days = useMemo(() => {
    const byDay = new Map<number, "present" | "absent" | "late">();

    attendance.forEach((row) => {
      const d = new Date(row.date);
      if (Number.isNaN(d.getTime())) return;
      byDay.set(d.getDate(), row.status);
    });

    const now = new Date();
    const today = now.getDate();
    const year = now.getFullYear();
    const month = now.getMonth();

    return Array.from({ length: today }, (_, idx) => {
      const dayNumber = idx + 1;
      const date = new Date(year, month, dayNumber);
      const status = byDay.get(dayNumber);

      return {
        date: String(dayNumber),
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        status,
      };
    });
  }, [attendance]);

  const presentCount = attendance.filter((d) => d.status === "present" || d.status === "late").length;
  const absentCount = attendance.filter((d) => d.status === "absent").length;
  const totalMarked = attendance.length;
  const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 group animate-in fade-in slide-in-from-left-5 duration-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-8 py-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>

        <div className="relative z-10">
          <h2 className="text-3xl font-black text-white drop-shadow-lg flex items-center gap-3">
            <span className="text-4xl">📅</span>
            This Month&apos;s Attendance
          </h2>
          <p className="text-blue-100 text-sm mt-2 font-bold">Keep track of attendance</p>
          <div className="mt-3 max-w-xs">
            <select
              value={selectedChildId}
              onChange={(event) => setSelectedChildId(event.target.value)}
              disabled={loadingChildren || children.length === 0}
              className="w-full rounded-lg border border-blue-200 bg-white/95 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              {children.length === 0 ? (
                <option value="">No child found</option>
              ) : (
                children.map((child) => (
                  <option key={child._id} value={child._id}>
                    {child.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 px-8 py-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-100">
        <div className="text-center p-3 rounded-lg bg-white/50 border border-blue-100 hover:border-green-300 transition-all">
          <p className="text-3xl font-black text-green-600 drop-shadow-sm">{presentCount}</p>
          <p className="text-xs font-bold text-slate-600 mt-1 uppercase">Present</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/50 border border-blue-100 hover:border-red-300 transition-all">
          <p className="text-3xl font-black text-red-600 drop-shadow-sm">{absentCount}</p>
          <p className="text-xs font-bold text-slate-600 mt-1 uppercase">Absent</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/50 border border-blue-100 hover:border-blue-300 transition-all">
          <p className="text-3xl font-black text-blue-600 drop-shadow-sm">{attendanceRate}%</p>
          <p className="text-xs font-bold text-slate-600 mt-1 uppercase">Rate</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="p-8">
        {loadingChildren || loadingAttendance ? (
          <p className="text-sm text-slate-500 font-semibold">Loading attendance...</p>
        ) : !selectedChildId ? (
          <p className="text-sm text-slate-500 font-semibold">No child selected.</p>
        ) : days.length === 0 ? (
          <p className="text-sm text-slate-500 font-semibold">No attendance data for this month yet.</p>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              const statusClass =
                day.status === "present" || day.status === "late"
                  ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-400/50"
                  : day.status === "absent"
                  ? "bg-gradient-to-br from-red-400 to-rose-500 text-white hover:shadow-lg hover:shadow-red-400/50"
                  : "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600";

              return (
                <div key={idx} className="text-center animate-in fade-in zoom-in duration-500" style={{ animationDelay: `${idx * 30}ms` }}>
                  <p className="text-xs font-bold text-slate-500 mb-2">{day.day}</p>
                  <button
                    className={`w-full aspect-square rounded-lg font-bold text-sm transition-all duration-300 shadow-md hover:scale-110 ${statusClass}`}
                    title={day.status ? day.status.toUpperCase() : "No record"}
                  >
                    {day.date}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentAttendanceCard;
