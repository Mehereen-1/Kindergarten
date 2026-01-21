import { NavLink } from "react-router-dom";
import { LayoutDashboard, GraduationCap, Users, CalendarCheck2, Wallet } from "lucide-react";

const navItem =
  "flex items-center gap-3 px-4 py-3 rounded-xl transition font-semibold";

export default function Sidebar() {
  return (
    <aside className="w-72 bg-white border-r min-h-screen p-4">
      <div className="px-3 py-2">
        <div className="text-2xl font-extrabold text-slate-800">Kindergarten</div>
        <div className="text-sm text-slate-500">Admin Panel</div>
      </div>

      <div className="mt-6 space-y-2">
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) =>
            `${navItem} ${
              isActive
                ? "bg-violet-50 text-violet-700 shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            }`
          }
        >
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>

        <NavLink
          to="/admin/students"
          className={({ isActive }) =>
            `${navItem} ${
              isActive
                ? "bg-emerald-50 text-emerald-700 shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            }`
          }
        >
          <GraduationCap size={18} /> Students
        </NavLink>

        <NavLink
          to="/admin/teachers"
          className={({ isActive }) =>
            `${navItem} ${
              isActive
                ? "bg-orange-50 text-orange-700 shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            }`
          }
        >
          <Users size={18} /> Teachers
        </NavLink>

        <NavLink
          to="/admin/attendance"
          className={({ isActive }) =>
            `${navItem} ${
              isActive
                ? "bg-yellow-50 text-yellow-700 shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            }`
          }
        >
          <CalendarCheck2 size={18} /> Attendance
        </NavLink>

        <NavLink
          to="/admin/fees"
          className={({ isActive }) =>
            `${navItem} ${
              isActive
                ? "bg-rose-50 text-rose-700 shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            }`
          }
        >
          <Wallet size={18} /> Fees
        </NavLink>
      </div>

      <div className="mt-10 px-3 text-xs text-slate-400">
        Version 1.0 • UI Build
      </div>
    </aside>
  );
}
