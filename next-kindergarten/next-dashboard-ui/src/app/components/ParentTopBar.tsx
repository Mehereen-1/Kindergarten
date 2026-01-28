"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  Bell,
  MessageCircle,
  User,
  LogOut,
  Settings,
  Home,
} from "lucide-react";

const ParentTopBar = () => {
  const [profileMenu, setProfileMenu] = useState(false);
  const [selectedChild, setSelectedChild] = useState("Arjun Singh");

  const children = ["Arjun Singh", "Aisha Singh"];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">
            👨‍👩‍👧
          </div>
          <h2 className="text-xl font-black text-slate-900 hidden sm:block">KinderVision</h2>
        </div>

        {/* Child Selector */}
        <div className="flex-1 max-w-xs">
          <div className="relative">
            <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all shadow-sm border border-slate-300">
              <span className="text-sm">{selectedChild}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all hover:scale-110 shadow-sm">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-md"></span>
          </button>

          {/* Messages */}
          <button className="relative p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all hover:scale-110 shadow-sm">
            <MessageCircle className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-300 rounded-full animate-pulse shadow-lg"></span>
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileMenu(!profileMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/20 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-300 to-peach-300 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform">
                👤
              </div>
            </button>
            {profileMenu && (
              <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-peach-50">
                  <p className="text-sm font-bold text-slate-900">Parent Name</p>
                  <p className="text-xs text-slate-500 mt-0.5">parent@kindergarten.edu</p>
                </div>
                <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-3 border-b border-slate-100 transition-colors">
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-3 border-b border-slate-100 transition-colors">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ParentTopBar;
