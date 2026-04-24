"use client";

import Link from "next/link";
import { X, Home, Users, Calendar, BarChart3, Bell, Brain, MessageSquare, ClipboardList, Settings, ShieldCheck } from "lucide-react";

const MobileParentSidebar = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/parent" },
    { icon: Users, label: "My Child", href: "/parent/child" },
    { icon: ShieldCheck, label: "Verification", href: "/parent/verification" },
    { icon: Calendar, label: "Attendance", href: "/parent/attendance" },
    { icon: BarChart3, label: "Results", href: "/parent/results" },
    { icon: Bell, label: "Events", href: "/parent/events" },
    { icon: Brain, label: "Class Content", href: "/parent/ask-ai" },
    { icon: MessageSquare, label: "Messages", href: "/parent/chat" },
    { icon: ClipboardList, label: "Notices", href: "/parent/notices" },
    { icon: Settings, label: "Settings", href: "/parent/settings" },
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 lg:hidden z-40" onClick={onClose}></div>
      )}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-blue-600 to-peach-500 transform transition-transform duration-300 lg:hidden z-50 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-white/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-white" />
            <h2 className="text-xl font-black text-white">KinderVision</h2>
          </div>
          <button onClick={onClose} className="text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white hover:bg-white/15 transition"
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
