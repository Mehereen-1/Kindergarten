"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  Calendar,
  Plus,
  Bell,
  MessageCircle,
  User,
  Settings,
  BookOpen,
  Clock,
} from "lucide-react";

const TeacherTopBar = () => {
  const [classDropdown, setClassDropdown] = useState(false);
  const [quickActionMenu, setQuickActionMenu] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);

  const classes = ["KG-A", "KG-B", "Nursery", "Play Group"];
  const [selectedClass, setSelectedClass] = useState("KG-A");

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            <input
              type="text"
              placeholder="Search student, class, assignment…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-300 transition-all duration-200"
            />
          </div>
        </div>

        {/* Class Switcher */}
        <div className="relative">
          <button
            onClick={() => setClassDropdown(!classDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-600 font-medium hover:from-indigo-100 hover:to-blue-100 border border-indigo-200 transition-all duration-200"
          >
            <span className="text-sm">{selectedClass}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                classDropdown ? "rotate-180" : ""
              }`}
            />
          </button>
          {classDropdown && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
              {classes.map((cls) => (
                <button
                  key={cls}
                  onClick={() => {
                    setSelectedClass(cls);
                    setClassDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-200 ${
                    selectedClass === cls
                      ? "bg-indigo-600 text-white font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Today Button */}
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-600 font-medium hover:from-amber-100 hover:to-yellow-100 border border-amber-200 transition-all duration-200 group">
          <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-sm">Today</span>
        </button>

        {/* Quick Action */}
        <div className="relative">
          <button
            onClick={() => setQuickActionMenu(!quickActionMenu)}
            className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white hover:shadow-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 group"
          >
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
          {quickActionMenu && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 w-56">
              {[
                { icon: "📋", label: "Mark Attendance", color: "text-blue-600" },
                { icon: "📊", label: "Add Result", color: "text-green-600" },
                { icon: "📝", label: "Create Assignment", color: "text-purple-600" },
                { icon: "📢", label: "Send Notice", color: "text-orange-600" },
                { icon: "💬", label: "Message Parents", color: "text-pink-600" },
              ].map((action, idx) => (
                <button
                  key={idx}
                  className="w-full text-left px-4 py-3.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-b-0 transition-colors duration-200"
                >
                  <span className="text-lg">{action.icon}</span>
                  <span className="font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 group">
          <Bell className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
        </button>

        {/* Messages Shortcut */}
        <button className="relative p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group">
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
        </button>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileMenu(!profileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors duration-200"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm hover:shadow-lg transition-shadow">
              T
            </div>
          </button>
          {profileMenu && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 w-56">
              <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100">
                <p className="text-sm font-semibold text-slate-900">Teacher Name</p>
                <p className="text-xs text-slate-500 mt-0.5">teacher@kindergarten.edu</p>
              </div>
              {[
                { icon: User, label: "My Profile" },
                { icon: BookOpen, label: "My Subjects" },
                { icon: Clock, label: "My Schedule" },
                { icon: Settings, label: "Settings" },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 border-b border-slate-100 last:border-b-0 transition-colors duration-200"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TeacherTopBar;
