"use client";

import Link from "next/link";
import {
  Home,
  Users,
  Calendar,
  BarChart3,
  Bell,
  MessageSquare,
  ClipboardList,
  Settings,
} from "lucide-react";

const ParentSidebar = () => {
  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/parent", colorBg: "bg-blue-50", colorText: "text-blue-600" },
    { icon: Users, label: "My Child", href: "/parent/child", colorBg: "bg-pink-50", colorText: "text-pink-600" },
    { icon: Calendar, label: "Attendance", href: "/parent/attendance", colorBg: "bg-green-50", colorText: "text-green-600" },
    { icon: BarChart3, label: "Results", href: "/parent/results", colorBg: "bg-amber-50", colorText: "text-amber-600" },
    { icon: Bell, label: "Events", href: "/parent/events", colorBg: "bg-purple-50", colorText: "text-purple-600" },
    { icon: MessageSquare, label: "Messages", href: "/parent/messages", colorBg: "bg-indigo-50", colorText: "text-indigo-600" },
    { icon: ClipboardList, label: "Notices", href: "/parent/notices", colorBg: "bg-cyan-50", colorText: "text-cyan-600" },
    { icon: Settings, label: "Settings", href: "/parent/settings", colorBg: "bg-slate-100", colorText: "text-slate-600" },
  ];

  return (
    <aside className="hidden lg:block w-72 bg-white border-r border-slate-200 overflow-y-auto sticky top-0 h-screen shadow-sm">
      {/* Logo Section */}
      <div className="p-8 border-b border-slate-200 relative overflow-hidden group">
        <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-4xl shadow-sm">
              👨‍👩‍👧
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">KinderVision</h2>
              <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">Parent Portal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-2 px-4 py-8">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              href={item.href}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl text-slate-700 hover:${item.colorText} transition-all duration-300 group relative overflow-hidden`}
            >
              {/* Subtle background on hover */}
              <div className={`absolute inset-0 ${item.colorBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 rounded-xl`}></div>

              {/* Icon with background */}
              <div className={`p-3 rounded-lg ${item.colorBg} group-hover:${item.colorText} transition-all duration-300 shadow-sm`}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Label */}
              <span className="text-base font-bold group-hover:font-black transition-all duration-300">
                {item.label}
              </span>

              {/* Right accent line on hover */}
              <div className={`absolute right-0 top-1/4 bottom-1/4 w-1 ${item.colorText.replace('text-', 'bg-')} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full`}></div>
            </Link>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 to-transparent border-t border-slate-200">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all duration-300 cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center text-lg font-bold shadow-md group-hover:scale-110 transition-transform">
            👨
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Parent</p>
            <p className="text-xs text-slate-600">View Profile</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ParentSidebar;
