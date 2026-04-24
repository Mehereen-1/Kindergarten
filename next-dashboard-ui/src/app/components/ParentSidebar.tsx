"use client";

import Link from "next/link";
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
  ShieldCheck,
} from "lucide-react";

const ParentSidebar = () => {
  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/parent", colorBg: "bg-[#ede9c8]", colorText: "text-[#845c32]" },
    { icon: Users, label: "My Child", href: "/parent/child", colorBg: "bg-[#f3ead2]", colorText: "text-[#5f6843]" },
    { icon: ShieldCheck, label: "Verification", href: "/parent/verification", colorBg: "bg-[#e2efe2]", colorText: "text-[#4f6b4a]" },
    { icon: Calendar, label: "Attendance", href: "/parent/attendance", colorBg: "bg-[#dde7b9]", colorText: "text-[#5f6843]" },
    { icon: BarChart3, label: "Results", href: "/parent/results", colorBg: "bg-[#f8e999]", colorText: "text-[#705900]" },
    { icon: Bell, label: "Events", href: "/parent/events", colorBg: "bg-[#f7dfb6]", colorText: "text-[#904800]" },
    { icon: Brain, label: "Class Content", href: "/parent/ask-ai", colorBg: "bg-[#efeccf]", colorText: "text-[#62674a]" },
    { icon: MessageSquare, label: "Messages", href: "/parent/chat", colorBg: "bg-[#edf4d9]", colorText: "text-[#466337]" },
    { icon: ClipboardList, label: "Notices", href: "/parent/notices", colorBg: "bg-[#f4ecd3]", colorText: "text-[#845c32]" },
    { icon: Settings, label: "Settings", href: "/parent/settings", colorBg: "bg-[#f2eedc]", colorText: "text-[#676551]" },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col w-80 bg-[#fefade] rounded-r-[3rem] sticky top-0 h-screen shadow-[12px_0_28px_-12px_rgba(58,57,39,0.08)]">
      <div className="px-8 pt-10 pb-6 border-b border-[#d6d2b5]/40 relative overflow-hidden group text-center">
        <div className="absolute inset-0 bg-[#f8f5df] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="relative z-10">
          <div className="flex flex-col items-center gap-3 mb-3">
            <div className="w-20 h-20 rounded-2xl bg-[#d9a777] flex items-center justify-center shadow-md">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#845c32]">KinderVision</h2>
              <p className="text-[#676551] text-xs font-semibold uppercase tracking-wider mt-0.5">Parent Panel</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-5 py-8 overflow-y-auto">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl text-[#3a3927] hover:${item.colorText} transition-all duration-300 group relative overflow-hidden`}
            >
              <div className={`absolute inset-0 ${item.colorBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 rounded-xl`}></div>
              <div className={`p-2.5 rounded-lg ${item.colorBg} group-hover:${item.colorText} transition-all duration-300 shadow-sm`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold group-hover:font-bold transition-all duration-300">
                {item.label}
              </span>
              <div className={`absolute right-0 top-1/4 bottom-1/4 w-1 ${item.colorText.replace('text-', 'bg-')} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full`}></div>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-[#d6d2b5]/30">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#fefcf5] hover:bg-[#ede9c8] transition-all duration-300 cursor-pointer group shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#d9a777] flex items-center justify-center text-[#271300] font-bold shadow-md group-hover:scale-110 transition-transform">
            P
          </div>
          <div>
            <p className="text-sm font-bold text-[#3a3927]">Parent</p>
            <p className="text-xs text-[#676551]">Profile</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ParentSidebar;
