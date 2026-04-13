"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TeacherClassOption {
  _id: string;
  classId?: string;
  name: string;
}

const TeacherTopBar = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [classDropdown, setClassDropdown] = useState(false);
  const [quickActionMenu, setQuickActionMenu] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassOption[]>([]);

  const currentYear = String(new Date().getFullYear());

  useEffect(() => {
    const loadClasses = async () => {
      if (!user?.id) return;
      try {
        const response = await fetch(
          `/api/teacher/classes?teacherId=${encodeURIComponent(user.id)}&academicYear=${encodeURIComponent(currentYear)}`,
          { cache: "no-store" }
        );
        if (!response.ok) return;
        const data = await response.json();
        const normalized = Array.isArray(data) ? data : [];
        setTeacherClasses(normalized);
      } catch {
        setTeacherClasses([]);
      }
    };

    loadClasses();
  }, [user?.id, currentYear]);

  const [selectedClass, setSelectedClass] = useState<TeacherClassOption | null>(null);

  useEffect(() => {
    if (!teacherClasses.length) {
      setSelectedClass(null);
      return;
    }

    setSelectedClass((prev) => {
      if (prev && teacherClasses.some((cls) => cls._id === prev._id)) {
        return prev;
      }
      return teacherClasses[0];
    });
  }, [teacherClasses]);

  const searchableItems = useMemo(() => {
    const baseItems = [
      { label: "Dashboard", href: "/teacher" },
      { label: "My Classes", href: "/teacher/classes" },
      { label: "Attendance", href: "/teacher/attendance" },
      { label: "Results", href: "/teacher/results" },
      { label: "Activities", href: "/teacher/activities" },
      { label: "Class Content", href: "/teacher/ildce" },
      { label: "Events", href: "/teacher/events" },
      { label: "Timetable", href: "/teacher/timetable" },
      { label: "Parent Messages", href: "/teacher/chat" },
      { label: "Security Alerts", href: "/teacher/security-alerts" },
      { label: "My Profile", href: "/teacher/profile" },
      { label: "Settings", href: "/teacher/settings" },
    ];

    const classItems = teacherClasses.map((cls) => ({
      label: cls.name,
      href: `/teacher/attendance?classId=${encodeURIComponent(cls._id)}&academicYear=${encodeURIComponent(currentYear)}`,
    }));

    return [...baseItems, ...classItems];
  }, [teacherClasses, currentYear]);

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];
    return searchableItems
      .filter((item) => item.label.toLowerCase().includes(query))
      .slice(0, 6);
  }, [searchTerm, searchableItems]);

  const handleNavigate = (href: string) => {
    setClassDropdown(false);
    setQuickActionMenu(false);
    setProfileMenu(false);
    router.push(href);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const first = searchResults[0];
    if (first) {
      handleNavigate(first.href);
      setSearchFocused(false);
      return;
    }
    if (searchTerm.trim()) {
      handleNavigate(`/teacher/classes?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchFocused(false);
    }
  };

  return (
    <header className="bg-[#fefdf1]/88 backdrop-blur-md sticky top-0 z-40 shadow-[0_6px_24px_rgba(54,57,43,0.06)]">
      <div className="flex items-center justify-between px-5 lg:px-10 py-3 gap-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <form className="relative group" onSubmit={handleSearchSubmit}>
            <Search className="absolute left-3 top-3 w-4 h-4 text-[#7f8271] group-hover:text-[#5a685a] transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
              placeholder="Search classes, attendance, results, messages..."
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-[#fafaeb] border border-[#b9bba826] text-[#36392b] placeholder:text-[#7f8271] focus:outline-none focus:ring-2 focus:ring-[#5a685a66] focus:bg-[#ffffffcc] transition-all text-sm"
            />

            {searchFocused && searchTerm.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#fafaebf2] backdrop-blur-md border border-[#b9bba826] rounded-xl shadow-[0_14px_34px_rgba(54,57,43,0.12)] overflow-hidden z-50">
                {searchResults.length ? (
                  searchResults.map((item) => (
                    <button
                      key={`${item.label}-${item.href}`}
                      type="button"
                      onMouseDown={() => {
                        handleNavigate(item.href);
                        setSearchTerm("");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#36392b] hover:bg-[#eeefdd] transition-all"
                    >
                      {item.label}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2.5 text-sm text-[#636656]">No matching results</div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Class Switcher */}
        <div className="relative">
          <button
            onClick={() => setClassDropdown(!classDropdown)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-br from-[#5a685a] to-[#4e5c4e] text-white font-semibold hover:brightness-95 shadow-[0_8px_24px_rgba(54,57,43,0.16)] transition-all"
          >
            <span className="text-sm">{selectedClass?.name || "No Class"}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {classDropdown && (
            <div className="absolute top-full mt-2 right-0 bg-[#fafaebf2] backdrop-blur-md border border-[#b9bba826] rounded-xl shadow-[0_14px_34px_rgba(54,57,43,0.12)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {teacherClasses.length ? (
                teacherClasses.map((cls) => (
                  <button
                    key={cls._id}
                    onClick={() => {
                      setSelectedClass(cls);
                      setClassDropdown(false);
                      handleNavigate(
                        `/teacher/attendance?classId=${encodeURIComponent(cls._id)}&academicYear=${encodeURIComponent(currentYear)}`
                      );
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-all ${
                      selectedClass?._id === cls._id
                        ? "bg-[#d7e7d5] text-[#354336] font-medium"
                        : "text-[#36392b] hover:bg-[#eeefdd]"
                    }`}
                  >
                    {cls.name}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2.5 text-sm text-[#636656]">No assigned classes</div>
              )}
            </div>
          )}
        </div>

        {/* Today Button */}
        <button
          onClick={() => handleNavigate("/teacher/events")}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#eeefdd] border border-[#b9bba826] text-[#5a685a] font-semibold hover:bg-[#d7e7d5] hover:text-[#354336] shadow-sm hover:shadow-md transition-all"
        >
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Today</span>
        </button>

        {/* Quick Action */}
        <div className="relative">
          <button
            onClick={() => setQuickActionMenu(!quickActionMenu)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-[#5a685a] to-[#4e5c4e] text-white hover:brightness-95 shadow-[0_8px_24px_rgba(54,57,43,0.16)] hover:scale-110 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
          {quickActionMenu && (
            <div className="absolute top-full mt-2 right-0 bg-[#fafaebf2] backdrop-blur-md border border-[#b9bba826] rounded-xl shadow-[0_14px_34px_rgba(54,57,43,0.12)] overflow-hidden z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => handleNavigate(`/teacher/attendance${selectedClass?._id ? `?classId=${encodeURIComponent(selectedClass._id)}&academicYear=${encodeURIComponent(currentYear)}` : ""}`)}
                className="w-full text-left px-4 py-3 text-sm text-[#36392b] hover:bg-[#eeefdd] hover:text-[#5a685a] flex items-center gap-3 transition-all"
              >
                <ClipboardList className="w-4 h-4" />
                Mark Attendance
              </button>
              <button
                onClick={() => handleNavigate("/teacher/results")}
                className="w-full text-left px-4 py-3 text-sm text-[#36392b] hover:bg-[#eeefdd] hover:text-[#5a685a] flex items-center gap-3 transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                Add Result
              </button>
              <button
                onClick={() => handleNavigate("/teacher/ildce")}
                className="w-full text-left px-4 py-3 text-sm text-[#36392b] hover:bg-[#eeefdd] hover:text-[#5a685a] flex items-center gap-3 transition-all"
              >
                <BookOpen className="w-4 h-4" />
                Class Content
              </button>
              <button
                onClick={() => handleNavigate("/teacher/classes")}
                className="w-full text-left px-4 py-3 text-sm text-[#36392b] hover:bg-[#eeefdd] hover:text-[#5a685a] flex items-center gap-3 transition-all"
              >
                <UsersIcon className="w-4 h-4" />
                My Classes
              </button>
              <button
                onClick={() => handleNavigate("/teacher/chat")}
                className="w-full text-left px-4 py-3 text-sm text-[#36392b] hover:bg-[#eeefdd] hover:text-[#5a685a] flex items-center gap-3 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                Message Parents
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-full bg-[#eeefdd] text-[#636656] hover:bg-[#5a685a] hover:text-white transition-all hover:scale-110 shadow-sm">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#ae4025] rounded-full animate-pulse shadow-sm"></span>
        </button>

        {/* Messages Shortcut */}
        <button
          onClick={() => handleNavigate("/teacher/chat")}
          className="relative p-2 rounded-full bg-[#eeefdd] text-[#636656] hover:bg-[#5a685a] hover:text-white transition-all hover:scale-110 shadow-sm"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#5a685a] rounded-full animate-pulse shadow-sm"></span>
        </button>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileMenu(!profileMenu)}
            className="flex items-center gap-2 p-1 rounded-full hover:scale-105 transition-all"
          >
            <div className="w-9 h-9 rounded-full bg-[#d7e7d5] flex items-center justify-center text-[#354336] font-bold text-sm shadow-md">
              {user?.name?.charAt(0) || "T"}
            </div>
          </button>
          {profileMenu && (
            <div className="absolute top-full mt-2 right-0 bg-[#fafaebf2] backdrop-blur-md border border-[#b9bba826] rounded-xl shadow-[0_14px_34px_rgba(54,57,43,0.12)] overflow-hidden z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 bg-[#eeefdd]">
                <p className="text-sm font-semibold text-[#36392b]">{user?.name || 'Teacher'}</p>
                <p className="text-xs text-[#636656] mt-0.5">{user?.email || 'teacher@kindergarten.edu'}</p>
              </div>
              <Link
                href="/teacher/profile"
                className="w-full text-left px-4 py-3 text-sm text-[#36392b] hover:bg-[#eeefdd] hover:text-[#5a685a] flex items-center gap-3 transition-all"
                onClick={() => setProfileMenu(false)}
              >
                <User className="w-4 h-4" />
                My Profile
              </Link>
              <Link
                href="/teacher/ildce"
                className="w-full text-left px-4 py-3 text-sm text-[#36392b] hover:bg-[#eeefdd] hover:text-[#5a685a] flex items-center gap-3 transition-all"
                onClick={() => setProfileMenu(false)}
              >
                <BookOpen className="w-4 h-4" />
                My Subjects
              </Link>
              <Link
                href="/teacher/timetable"
                className="w-full text-left px-4 py-3 text-sm text-[#36392b] hover:bg-[#eeefdd] hover:text-[#5a685a] flex items-center gap-3 transition-all"
                onClick={() => setProfileMenu(false)}
              >
                <Clock className="w-4 h-4" />
                My Schedule
              </Link>
              <Link
                href="/teacher/settings"
                className="w-full text-left px-4 py-3 text-sm text-[#36392b] hover:bg-[#eeefdd] hover:text-[#5a685a] flex items-center gap-3 transition-all"
                onClick={() => setProfileMenu(false)}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <button
                onClick={signOut}
                className="w-full text-left px-4 py-3 text-sm text-[#36392b] hover:bg-[#ae4025] hover:text-white flex items-center gap-3 transition-all"
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

const UsersIcon = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="3" />
    <path d="M20 8v6" />
    <path d="M23 11h-6" />
  </svg>
);

const BarChart3 = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M3 3v18h18M7 16.5V8m5 8.5V4m5 12.5V11" strokeLinecap="round" />
  </svg>
);

const MessageSquare = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default TeacherTopBar;