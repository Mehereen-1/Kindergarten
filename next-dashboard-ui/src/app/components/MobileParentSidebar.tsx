"use client";

import Link from "next/link";
import Image from "next/image";
import { X, Home, Users, Calendar, BarChart3, Bell, Brain, MessageSquare, ClipboardList, Settings } from "lucide-react";

const MobileParentSidebar = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/parent" },
    { icon: Users, label: "My Child", href: "/parent/child" },
    { icon: Calendar, label: "Attendance", href: "/parent/attendance" },
    { icon: BarChart3, label: "Results", href: "/parent/results" },
    { icon: Bell, label: "Events", href: "/parent/events" },
    { icon: Brain, label: "Class Content", href: "/parent/ask-ai" },
    { icon: MessageSquare, label: "Messages", href: "/parent/chat" },
    { icon: Settings, label: "Settings", href: "/parent/settings" },
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 lg:hidden z-40" onClick={onClose}></div>
      )}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-[var(--color-surface-low)] transform transition-transform duration-300 lg:hidden z-50 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_25%,transparent)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-[0.09em]">Parent Panel</p>
            <button onClick={onClose} className="text-[var(--color-on-surface)]">
              <X className="w-6 h-6" />
            </button>
          </div>
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

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary-dim)] transition"
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default MobileParentSidebar;
