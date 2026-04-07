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
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

const TeacherTopBar = () => {
  const { user, signOut } = useAuth();
  const [classDropdown, setClassDropdown] = useState(false);
  const [quickActionMenu, setQuickActionMenu] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);

  const classes = ["KG-A", "KG-B", "Nursery", "Play Group"];
  const [selectedClass, setSelectedClass] = useState("KG-A");

  return (
    <header className="bg-[#fefcf5]/90 backdrop-blur-md border-b border-[#e3dfc0] sticky top-0 z-40 shadow-[0_4px_20px_rgba(58,57,39,0.04)]">
      <div className="flex items-center justify-between px-5 lg:px-10 py-3 gap-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <Search className="absolute left-3 top-3 w-4 h-4 text-[#83816c] group-hover:text-[#845c32] transition-colors" />
            <input
              type="text"
              placeholder="Search students, classes, assignments..."
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-[#fefade] border border-[#d6d2b5] text-[#3a3927] placeholder:text-[#a6a48b] focus:outline-none focus:ring-2 focus:ring-[#d9a777] focus:bg-white transition-all text-sm"
            />
          </div>
        </div>

        {/* Class Switcher */}
        <div className="relative">
          <button
            onClick={() => setClassDropdown(!classDropdown)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#845c32] text-white font-semibold hover:bg-[#6b4a28] shadow-md transition-all"
          >
            <span className="text-sm">{selectedClass}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {classDropdown && (
            <div className="absolute top-full mt-2 right-0 bg-[#fefade] border border-[#d6d2b5] rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {classes.map((cls) => (
                <button
                  key={cls}
                  onClick={() => {
                    setSelectedClass(cls);
                    setClassDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-all ${
                    selectedClass === cls
                      ? "bg-[#d9a777] text-[#271300] font-medium"
                      : "text-[#3a3927] hover:bg-[#ede9c8]"
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Today Button */}
        <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#fefade] border border-[#d9a777] text-[#845c32] font-semibold hover:bg-[#d9a777] hover:text-white shadow-md hover:shadow-lg transition-all">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Today</span>
        </button>

        {/* Quick Action */}
        <div className="relative">
          <button
            onClick={() => setQuickActionMenu(!quickActionMenu)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[#845c32] text-white hover:bg-[#6b4a28] shadow-md hover:scale-110 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
          {quickActionMenu && (
            <div className="absolute top-full mt-2 right-0 bg-[#fefade] border border-[#d6d2b5] rounded-xl shadow-xl overflow-hidden z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
              <button className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#ede9c8] hover:text-[#845c32] flex items-center gap-3 border-b border-[#e3dfc0] transition-all">
                <ClipboardList className="w-4 h-4" />
                Mark Attendance
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#ede9c8] hover:text-[#845c32] flex items-center gap-3 border-b border-[#e3dfc0] transition-all">
                <BarChart3 className="w-4 h-4" />
                Add Result
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#ede9c8] hover:text-[#845c32] flex items-center gap-3 border-b border-[#e3dfc0] transition-all">
                <BookOpen className="w-4 h-4" />
                Create Assignment
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#ede9c8] hover:text-[#845c32] flex items-center gap-3 border-b border-[#e3dfc0] transition-all">
                <FileText className="w-4 h-4" />
                Send Notice
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#ede9c8] hover:text-[#845c32] flex items-center gap-3 transition-all">
                <MessageSquare className="w-4 h-4" />
                Message Parents
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-full bg-[#fefade] text-[#676551] hover:bg-[#845c32] hover:text-white transition-all hover:scale-110 shadow-sm">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#be2d06] rounded-full animate-pulse shadow-sm"></span>
        </button>

        {/* Messages Shortcut */}
        <button className="relative p-2 rounded-full bg-[#fefade] text-[#676551] hover:bg-[#5f6843] hover:text-white transition-all hover:scale-110 shadow-sm">
          <MessageCircle className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#5f6843] rounded-full animate-pulse shadow-sm"></span>
        </button>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileMenu(!profileMenu)}
            className="flex items-center gap-2 p-1 rounded-full hover:scale-105 transition-all"
          >
            <div className="w-9 h-9 rounded-full bg-[#d9a777] flex items-center justify-center text-[#271300] font-bold text-sm shadow-md">
              {user?.name?.charAt(0) || "T"}
            </div>
          </button>
          {profileMenu && (
            <div className="absolute top-full mt-2 right-0 bg-[#fefade] border border-[#d6d2b5] rounded-xl shadow-xl overflow-hidden z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-[#e3dfc0] bg-[#d9a777]/20">
                <p className="text-sm font-semibold text-[#3a3927]">{user?.name || 'Teacher'}</p>
                <p className="text-xs text-[#676551] mt-0.5">{user?.email || 'teacher@kindergarten.edu'}</p>
              </div>
              <Link
                href="/teacher/profile"
                className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#ede9c8] hover:text-[#845c32] flex items-center gap-3 border-b border-[#e3dfc0] transition-all"
                onClick={() => setProfileMenu(false)}
              >
                <User className="w-4 h-4" />
                My Profile
              </Link>
              <button className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#ede9c8] hover:text-[#845c32] flex items-center gap-3 border-b border-[#e3dfc0] transition-all">
                <BookOpen className="w-4 h-4" />
                My Subjects
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#ede9c8] hover:text-[#845c32] flex items-center gap-3 border-b border-[#e3dfc0] transition-all">
                <Clock className="w-4 h-4" />
                My Schedule
              </button>
              <Link
                href="/teacher/settings"
                className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#ede9c8] hover:text-[#845c32] flex items-center gap-3 border-b border-[#e3dfc0] transition-all"
                onClick={() => setProfileMenu(false)}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <button
                onClick={signOut}
                className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#be2d06] hover:text-white flex items-center gap-3 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// Quick action icons (unchanged)
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