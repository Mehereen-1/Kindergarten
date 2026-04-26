import Link from "next/link";
import Image from "next/image";
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
        { icon: FileText, label: "Assignments", href: "/teacher/assignments" },
        { icon: ClipboardList, label: "Attendance", href: "/teacher/attendance" },
        { icon: BarChart3, label: "Results", href: "/teacher/results" },
        // { icon: Trophy, label: "Activities", href: "/teacher/activities" },
      ],
    },
    {
      title: "Communication",
      items: [
        { icon: MessageSquare, label: "Messages", href: "/teacher/chat" },
        { icon: FileText, label: "Notices", href: "/teacher/notices" },
        { icon: ShieldAlert, label: "Sound Alerts", href: "/teacher/security-alerts" },
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
    <aside className="hidden lg:flex lg:flex-col w-80 bg-[#fafaeb] rounded-r-[2.25rem] sticky top-0 h-screen shadow-[14px_0_30px_-16px_rgba(54,57,43,0.18)]">
      {/* Logo Section */}
      <div className="w-full px-4 pt-4 pb-4 relative overflow-hidden group">
        <div className="absolute inset-0 bg-[#f4f5e4] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-center">
            <div className="w-full flex items-center justify-center overflow-hidden">
              <Image
                src="/logo_system.png"
                alt="School logo"
                width={560}
                height={180}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-8 px-5 py-7 overflow-y-auto">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="animate-in fade-in slide-in-from-left-5 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
            {/* Group Title */}
            <div className="mb-4">
              <h3 className="text-[10px] font-black text-[#636656] uppercase tracking-[0.09em]">
                {group.title}
              </h3>
            </div>

            {/* Menu Items */}
            <ul className="space-y-1.5">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const colors = [
                  "text-[#36392b] bg-[#eeefdd]",
                  "text-[#36392b] bg-[#e8ead5]",
                  "text-[#36392b] bg-[#f4f5e4]",
                  "text-[#36392b] bg-[#eeefdd]",
                  "text-[#36392b] bg-[#e8ead5]",
                ];
                const colorClass = colors[itemIdx % colors.length];

                return (
                  <li key={itemIdx}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#636656] hover:${colorClass} transition-all duration-300 group relative overflow-hidden`}
                    >
                      {/* Subtle background on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 bg-[#eeefdd] rounded-xl"></div>

                      {/* Icon */}
                      <Icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />

                      {/* Label */}
                      <span className="text-sm font-medium group-hover:font-semibold transition-all duration-300">
                        {item.label}
                      </span>

                      {/* Right accent line on hover */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#726246] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Section */}
      <div className="p-6">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#eeefdd] hover:bg-[#e8ead5] transition-all duration-300 cursor-pointer group shadow-[0_8px_20px_rgba(54,57,43,0.06)]">
          <div className="w-10 h-10 rounded-full bg-[#d7e7d5] flex items-center justify-center text-[#354336] font-bold shadow-sm group-hover:scale-110 transition-transform">
            T
          </div>
          <div>
            <p className="text-sm font-bold text-[#36392b]">Teacher</p>
            <p className="text-xs text-[#636656]">Profile</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default TeacherSidebar;
