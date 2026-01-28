"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
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
    <>
      {/* Mobile Menu Button - Show on small screens */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar - Slide in from left */}
      <aside
        className={`fixed lg:relative lg:block w-64 bg-white border-r border-slate-200 h-screen overflow-y-auto z-40 transition-transform duration-300 transform lg:transform-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-indigo-600">📚 Kindergarten</h2>
          <p className="text-sm text-slate-500 mt-1">Teacher Panel</p>
        </div>

        <nav className="space-y-6 px-4">
          {menuGroups.map((group, idx) => (
            <div key={idx}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
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
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-200 group"
                      >
                        <Icon className="w-5 h-5 group-hover:text-indigo-600" />
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
