"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
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

const MobileTeacherSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar when clicking outside
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isOpen]);

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
        { icon: Trophy, label: "Activities", href: "/teacher/activities" },
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
    <>
      {/* Mobile Menu Button - Show on small screens */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-[var(--color-primary)] p-2 text-white transition hover:bg-[var(--color-primary-dim)] lg:hidden"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/45 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar - Slide in from left */}
      <aside
        className={`fixed z-40 h-screen w-64 transform overflow-y-auto bg-[var(--color-surface-low)] shadow-[14px_0_30px_-16px_rgba(54,57,43,0.18)] transition-transform duration-300 lg:relative lg:block lg:transform-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-center">
            <div className="w-full flex items-center justify-center overflow-hidden">
              <Image
                src="/logo_system.png"
                alt="School logo"
                width={420}
                height={130}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
          </div>
        </div>

        <nav className="space-y-6 px-4">
          {menuGroups.map((group, idx) => (
            <div key={idx}>
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--color-on-surface-variant)]">
                {group.title}
              </h3>
              <ul className="space-y-1">
                {group.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  return (
                    <li key={itemIdx}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="group flex items-center gap-3 rounded-lg px-4 py-2.5 text-[var(--color-on-surface-variant)] transition-colors duration-200 hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
                      >
                        <Icon className="h-5 w-5 group-hover:text-[var(--color-primary)]" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default MobileTeacherSidebar;
