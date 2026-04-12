import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BarChart3,
  Trophy,
  BookOpen,
  Calendar,
  MessageSquare,
  FileText,
  Clock,
  ShieldAlert,
  Settings,
} from "lucide-react";

const TeacherSidebar = () => {
  const menuGroups = [
    {
      title: "Teaching",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/teacher" },
        { icon: Users, label: "My Classes", href: "/teacher/classes" },
        { icon: BookOpen, label: "Class Content", href: "/teacher/ildce" },
        { icon: FileText, label: "Assignments", href: "/list/assignments" },
        { icon: ClipboardList, label: "Attendance", href: "/teacher/attendance" },
        { icon: BarChart3, label: "Results", href: "/teacher/results" },
        { icon: Trophy, label: "Activities", href: "/teacher/activities" },
      ],
    },
    {
      title: "Communication",
      items: [
        { icon: MessageSquare, label: "Messages", href: "/teacher/chat" },
        { icon: FileText, label: "Notices", href: "/teacher/notices" },
        { icon: ShieldAlert, label: "Security Alerts", href: "/teacher/security-alerts" },
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
    <aside className="hidden lg:flex lg:flex-col w-80 bg-[#fefade] rounded-r-[3rem] sticky top-0 h-screen shadow-[12px_0_28px_-12px_rgba(58,57,39,0.08)]">
      {/* Logo Section */}
      <div className="px-8 pt-10 pb-6 text-center border-b border-[#d6d2b5]/40 relative overflow-hidden group">
        <div className="absolute inset-0 bg-[#f8f5df] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col items-center gap-3 mb-3">
            <div className="w-20 h-20 rounded-2xl bg-[#d9a777] flex items-center justify-center text-4xl shadow-md">
              📚
            </div>
            <div>
              <h2 className="text-2xl font-black font-headline text-[#845c32]">Kindergarten</h2>
              <p className="text-xs text-[#676551] font-semibold mt-0.5">Teacher Panel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-8 px-5 py-8 overflow-y-auto">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="animate-in fade-in slide-in-from-left-5 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
            {/* Group Title */}
            <div className="mb-4 pb-3 border-b border-[#d6d2b5]/40">
              <h3 className="text-xs font-black text-[#676551] uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="h-0.5 w-10 bg-[#d9a777] rounded-full mt-2"></div>
            </div>

            {/* Menu Items */}
            <ul className="space-y-1.5">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const colors = [
                  "text-[#845c32] bg-[#ede9c8]",
                  "text-[#5f6843] bg-[#dde7b9]",
                  "text-[#62674a] bg-[#f6fad5]",
                  "text-[#845c32] bg-[#fefade]",
                  "text-[#5f6843] bg-[#ede9c8]",
                ];
                const colorClass = colors[itemIdx % colors.length];

                return (
                  <li key={itemIdx}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#3a3927] hover:${colorClass} transition-all duration-300 group relative overflow-hidden`}
                    >
                      {/* Subtle background on hover */}
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 bg-[#ede9c8]/50 rounded-xl`}></div>

                      {/* Icon */}
                      <Icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />

                      {/* Label */}
                      <span className="text-sm font-medium group-hover:font-semibold transition-all duration-300">
                        {item.label}
                      </span>

                      {/* Right accent line on hover */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#d9a777] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Section */}
      <div className="p-6 border-t border-[#d6d2b5]/30">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#fefcf5] hover:bg-[#ede9c8] transition-all duration-300 cursor-pointer group shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#d9a777] flex items-center justify-center text-[#271300] font-bold shadow-md group-hover:scale-110 transition-transform">
            T
          </div>
          <div>
            <p className="text-sm font-bold text-[#3a3927]">Teacher</p>
            <p className="text-xs text-[#676551]">Profile</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default TeacherSidebar;