import { Search, Bell } from "lucide-react";

export default function Topbar() {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="text-slate-800 font-extrabold">Admin Dashboard</div>

        <div className="hidden md:flex items-center bg-slate-100 rounded-xl px-3 py-2 w-80">
          <Search size={16} className="text-slate-500" />
          <input
            className="bg-transparent outline-none text-sm ml-2 w-full"
            placeholder="Search students, teachers, classes..."
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-xl hover:bg-slate-100">
          <Bell size={18} className="text-slate-600" />
        </button>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-slate-800">Admin</div>
            <div className="text-xs text-slate-500">Online</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-violet-200" />
        </div>
      </div>
    </header>
  );
}
