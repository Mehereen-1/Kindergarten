import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BarChart3,
  BookOpen,
  Calendar,
  MessageSquare,
  FileText,
  Clock,
  Settings,
} from "lucide-react";

const TeacherSidebar = () => {
  const menuGroups = [
    {
      title: "Teaching",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/teacher" },
        { icon: Users, label: "My Classes", href: "/teacher/classes" },
        { icon: ClipboardList, label: "Attendance", href: "/teacher/attendance" },
        { icon: BarChart3, label: "Results", href: "/teacher/results" },
        { icon: BookOpen, label: "Assignments", href: "/teacher/assignments" },
      ],
    },
    {
      title: "Communication",
      items: [
        { icon: MessageSquare, label: "Messages", href: "/teacher/messages" },
        { icon: FileText, label: "Notices", href: "/teacher/notices" },
      ],
    },
    {
      title: "Schedule",
      items: [
        { icon: Calendar, label: "Events", href: "/teacher/events" },
        { icon: Clock, label: "Timetable", href: "/teacher/timetable" },
      ],
    },
    {
      title: "Settings",
      items: [{ icon: Settings, label: "Settings", href: "/teacher/settings" }],
    },
  ];

  return (
    <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 overflow-y-auto sticky top-0 h-screen shadow-sm">
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-200 relative overflow-hidden group">
        <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-2xl shadow-md">
              📚
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Kindergarten</h2>
              <p className="text-xs text-slate-600 font-semibold">Teacher Panel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-8 px-4 py-8">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="animate-in fade-in slide-in-from-left-5 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
            {/* Group Title */}
            <div className="mb-4 pb-3 border-b border-slate-200">
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">
                {group.title}
              </h3>
              <div className="h-1 w-8 bg-indigo-600 rounded-full mt-2"></div>
            </div>

            {/* Menu Items */}
            <ul className="space-y-2">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const colors = [
                  "text-blue-600 bg-blue-50",
                  "text-indigo-600 bg-indigo-50",
                  "text-purple-600 bg-purple-50",
                  "text-green-600 bg-green-50",
                  "text-amber-600 bg-amber-50",
                ];
                const colorClass = colors[itemIdx % colors.length];

                return (
                  <li key={itemIdx}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:${colorClass} transition-all duration-300 group relative overflow-hidden`}
                    >
                      {/* Subtle background on hover */}
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`}></div>

                      {/* Icon */}
                      <Icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />

                      {/* Label */}
                      <span className="text-sm font-semibold group-hover:font-bold transition-all duration-300">
                        {item.label}
                      </span>

                      {/* Right accent line on hover */}
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Section */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 to-transparent border-t border-slate-200">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all duration-300 cursor-pointer group">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-110 transition-transform">
            T
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Teacher</p>
            <p className="text-xs text-slate-600">Profile</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default TeacherSidebar;
