"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Home,
  Users,
  Calendar,
  BarChart3,
  Bell,
  MessageSquare,
  Brain,
  ClipboardList,
  Settings,
} from "lucide-react";

const ParentSidebar = () => {
  const menuGroups = [
    {
      title: "Overview",
      items: [
        { icon: Home, label: "Dashboard", href: "/parent" },
        { icon: Users, label: "My Child", href: "/parent/child" },
        { icon: Calendar, label: "Attendance", href: "/parent/attendance" },
        { icon: BarChart3, label: "Results", href: "/parent/results" },
      ],
    },
    {
      title: "Learning",
      items: [
        { icon: Brain, label: "Class Content", href: "/parent/ask-ai" },
        { icon: Bell, label: "Events", href: "/parent/events" },
      ],
    },
    {
      title: "Communication",
      items: [{ icon: MessageSquare, label: "Messages", href: "/parent/chat" }],
    },
    {
      title: "Settings",
      items: [{ icon: Settings, label: "Settings", href: "/parent/settings" }],
    },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col w-80 bg-[var(--color-surface-low)] rounded-r-[2.25rem] sticky top-0 h-screen shadow-[14px_0_30px_-16px_rgba(54,57,43,0.18)]">
      {/* Logo Section */}
      <div className="w-full px-4 pt-4 pb-4 border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_22%,transparent)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-[var(--color-surface-container)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

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
          <p className="text-center text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-[0.09em] mt-1">
            Parent Panel
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-8 px-5 py-7 overflow-y-auto">
        {menuGroups.map((group, idx) => (
          <div key={group.title} className="animate-in fade-in slide-in-from-left-5 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
            <div className="mb-4">
              <h3 className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-[0.09em]">
                {group.title}
              </h3>
            </div>

            <ul className="space-y-1.5">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <li key={`${group.title}-${item.label}`}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary-dim)] transition-all duration-300 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 bg-[var(--color-surface-container)] rounded-xl"></div>
                      <Icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-sm font-medium group-hover:font-semibold transition-all duration-300">
                        {item.label}
                      </span>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[var(--color-primary)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Section */}
      <div className="p-6 border-t border-[color:color-mix(in_srgb,var(--color-outline-variant)_22%,transparent)]">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-container)] transition-all duration-300 cursor-pointer group shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center text-[var(--color-on-surface)] font-bold shadow-md group-hover:scale-110 transition-transform">
            👨
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--color-on-surface)]">Parent</p>
            <p className="text-xs text-[var(--color-on-surface-variant)]">Profile</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ParentSidebar;
