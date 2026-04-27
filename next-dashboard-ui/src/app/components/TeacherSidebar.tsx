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
    <aside className="sticky top-0 hidden h-screen w-80 rounded-r-[2.25rem] bg-[var(--color-surface-low)] shadow-[14px_0_30px_-16px_rgba(54,57,43,0.18)] lg:flex lg:flex-col">
      {/* Logo Section */}
      <div className="w-full px-4 pt-4 pb-4 relative overflow-hidden group">
        <div className="absolute inset-0 bg-[var(--color-surface-container)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

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
              <h3 className="text-[10px] font-black uppercase tracking-[0.09em] text-[var(--color-on-surface-variant)]">
                {group.title}
              </h3>
            </div>

            {/* Menu Items */}
            <ul className="space-y-1.5">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const colors = [
                  "text-[var(--color-on-surface)] bg-[var(--color-surface-container)]",
                  "text-[var(--color-on-surface)] bg-[var(--color-surface-highest)]",
                  "text-[var(--color-on-surface)] bg-[var(--color-surface-low)]",
                  "text-[var(--color-on-surface)] bg-[var(--color-surface-container)]",
                  "text-[var(--color-on-surface)] bg-[var(--color-surface-highest)]",
                ];
                const colorClass = colors[itemIdx % colors.length];

                return (
                  <li key={itemIdx}>
                    <Link
                      href={item.href}
                      className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-2.5 text-[var(--color-on-surface-variant)] transition-all duration-300 hover:${colorClass}`}
                    >
                      {/* Subtle background on hover */}
                      <div className="absolute inset-0 -z-10 rounded-xl bg-[var(--color-surface-container)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

                      {/* Icon */}
                      <Icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />

                      {/* Label */}
                      <span className="text-sm font-medium group-hover:font-semibold transition-all duration-300">
                        {item.label}
                      </span>

                      {/* Right accent line on hover */}
                      <div className="absolute right-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[var(--color-primary)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
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
        <div className="group flex cursor-pointer items-center gap-3 rounded-xl bg-[var(--color-surface-container)] p-3 shadow-[0_8px_20px_rgba(54,57,43,0.06)] transition-all duration-300 hover:bg-[var(--color-surface-highest)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-container)] font-bold text-[var(--color-on-surface)] shadow-sm transition-transform group-hover:scale-110">
            T
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--color-on-surface)]">Teacher</p>
            <p className="text-xs text-[var(--color-on-surface-variant)]">Profile</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default TeacherSidebar;
