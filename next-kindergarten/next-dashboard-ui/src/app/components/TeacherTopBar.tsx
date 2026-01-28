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
  LogOut,
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
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Search students, classes, assignments..."
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all hover:border-slate-400"
            />
          </div>
        </div>

        {/* Class Switcher */}
        <div className="relative">
          <button
            onClick={() => setClassDropdown(!classDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md transition-all"
          >
            <span className="text-sm">{selectedClass}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {classDropdown && (
            <div className="absolute top-full mt-2 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {classes.map((cls) => (
                <button
                  key={cls}
                  onClick={() => {
                    setSelectedClass(cls);
                    setClassDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-600 transition-all ${
                    selectedClass === cls
                      ? "bg-indigo-600 text-white font-medium"
                      : "text-slate-200"
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Today Button */}
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-400 hover:to-orange-400 shadow-lg hover:shadow-amber-500/50 hover:scale-105 transition-all">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Today</span>
        </button>

        {/* Quick Action */}
        <div className="relative">
          <button
            onClick={() => setQuickActionMenu(!quickActionMenu)}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg hover:shadow-purple-500/50 hover:scale-110 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
          {quickActionMenu && (
            <div className="absolute top-full mt-2 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
              <button className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-indigo-600 hover:text-white flex items-center gap-3 border-b border-slate-700 transition-all">
                <ClipboardList className="w-4 h-4" />
                Mark Attendance
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-green-600 hover:text-white flex items-center gap-3 border-b border-slate-700 transition-all">
                <BarChart3 className="w-4 h-4" />
                Add Result
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-blue-600 hover:text-white flex items-center gap-3 border-b border-slate-700 transition-all">
                <BookOpen className="w-4 h-4" />
                Create Assignment
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-amber-600 hover:text-white flex items-center gap-3 border-b border-slate-700 transition-all">
                <FileText className="w-4 h-4" />
                Send Notice
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-purple-600 hover:text-white flex items-center gap-3 transition-all">
                <MessageSquare className="w-4 h-4" />
                Message Parents
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="relative p-2.5 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-red-600 hover:text-white transition-all group hover:scale-110 shadow-md">
          <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-pulse shadow-lg shadow-red-500/50"></span>
        </button>

        {/* Messages Shortcut */}
        <button className="relative p-2.5 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-blue-600 hover:text-white transition-all group hover:scale-110 shadow-md">
          <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></span>
        </button>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileMenu(!profileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-700 transition-all group"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:shadow-purple-500/50 group-hover:scale-110 transition-all animate-pulse">
              T
            </div>
          </button>
          {profileMenu && (
            <div className="absolute top-full mt-2 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-slate-700 bg-gradient-to-r from-indigo-600 to-purple-600">
                <p className="text-sm font-semibold text-white">Teacher Name</p>
                <p className="text-xs text-indigo-100 mt-0.5">teacher@kindergarten.edu</p>
              </div>
              <button className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-indigo-600 hover:text-white flex items-center gap-3 border-b border-slate-700 transition-all">
                <User className="w-4 h-4" />
                My Profile
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-blue-600 hover:text-white flex items-center gap-3 border-b border-slate-700 transition-all">
                <BookOpen className="w-4 h-4" />
                My Subjects
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-purple-600 hover:text-white flex items-center gap-3 border-b border-slate-700 transition-all">
                <Clock className="w-4 h-4" />
                My Schedule
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 hover:text-white flex items-center gap-3 transition-all">
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// Quick action icons
const ClipboardList = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M9 3H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m0-14V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m0 0v14a2 2 0 0 1-2 2H9" />
  </svg>
);

const BarChart3 = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M3 3v18h18M7 16.5V8m5 8.5V4m5 12.5V11" strokeLinecap="round" />
  </svg>
);

const FileText = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
    <line x1="9" y1="15" x2="15" y2="15" />
    <line x1="9" y1="11" x2="15" y2="11" />
  </svg>
);

const MessageSquare = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default TeacherTopBar;
