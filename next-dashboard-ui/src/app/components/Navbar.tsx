'use client';

import { useMemo, useState } from 'react';
import { Search, Bell, Settings, LogOut, BarChart3, Users, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const Navbar = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [notificationMenu, setNotificationMenu] = useState(false);

  const searchableItems = useMemo(
    () => [
      { label: 'Dashboard', href: '/admin' },
      { label: 'Students', href: '/list/students' },
      { label: 'Teachers', href: '/list/teachers' },
      { label: 'Parents', href: '/list/parents' },
      { label: 'Classes', href: '/list/classes' },
      { label: 'Subjects', href: '/list/subjects' },
      { label: 'Lessons', href: '/list/lessons' },
      { label: 'Exams', href: '/list/exams' },
      { label: 'Results', href: '/list/results' },
      { label: 'Assignments', href: '/list/assignments' },
      { label: 'Announcements', href: '/list/announcements' },
      { label: 'Attendance', href: '/admin/attendance' },
      { label: 'Attendance Audit', href: '/admin/attendance-audit' },
      { label: 'Import Teachers', href: '/admin/import-teachers' },
      { label: 'Import Parents', href: '/admin/import-parents' },
      { label: 'Import Students', href: '/admin/import-students' },
      { label: 'Admin Settings', href: '/admin/settings' },
    ],
    []
  );

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return searchableItems
      .map((item) => {
        const label = item.label.toLowerCase();
        let score = 0;
        if (label === query) score = 100;
        else if (label.startsWith(query)) score = 80;
        else if (label.includes(query)) score = 60;
        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [searchQuery, searchableItems]);

  const navigateTo = (href: string) => {
    router.push(href);
    setSearchFocused(false);
    setSearchQuery('');
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const first = searchResults[0];
    if (first) {
      navigateTo(first.href);
      return;
    }

    if (searchQuery.trim()) {
      // Fallback route keeps behavior predictable when there is no direct match.
      router.push(`/list/students?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchFocused(false);
    }
  };

  const handleLogout = () => {
    document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    router.push('/sign-in');
  };

  return (
    <nav className="bg-[#fefdf1]/88 backdrop-blur-md border-b border-[#b9bba826] sticky top-0 z-40 shadow-[0_6px_24px_rgba(54,57,43,0.06)]">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        <div className="flex-1 max-w-md">
          <form className="relative group" onSubmit={handleSearchSubmit}>
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-[#7f8271] group-hover:text-[#5a685a] transition-colors" />
            <input
              type="text"
              placeholder="Search users, classes, students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#fafaeb] border border-[#b9bba826] text-[#36392b] placeholder-[#7f8271] focus:outline-none focus:ring-2 focus:ring-[#5a685a66] focus:bg-[#ffffffcc] focus:border-[#5a685a] transition-all"
            />

            {searchFocused && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#fafaebf2] backdrop-blur-md border border-[#b9bba826] rounded-xl shadow-[0_14px_34px_rgba(54,57,43,0.12)] overflow-hidden z-50">
                {searchResults.length ? (
                  searchResults.map((item) => (
                    <button
                      key={`${item.label}-${item.href}`}
                      type="button"
                      onMouseDown={() => navigateTo(item.href)}
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

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setNotificationMenu(!notificationMenu)}
              className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#eeefdd] text-[#636656] hover:bg-[#5a685a] hover:text-white transition-all hover:scale-105 shadow-sm"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-[#ae4025] text-white rounded-full text-xs font-bold shadow-sm">
                3
              </span>
            </button>

            {notificationMenu && (
              <div className="absolute top-full mt-2 right-0 bg-[#fafaebf2] backdrop-blur-md border border-[#b9bba826] rounded-xl shadow-[0_14px_34px_rgba(54,57,43,0.12)] overflow-hidden z-50 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-[#b9bba826] bg-[#eeefdd]">
                  <h3 className="font-semibold text-[#36392b]">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <button className="w-full text-left px-4 py-3 hover:bg-[#eeefdd] border-b border-[#b9bba826] transition-all">
                    <p className="text-sm font-medium text-[#36392b]">New Teacher Application</p>
                    <p className="text-xs text-[#636656] mt-1">5 minutes ago</p>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-[#eeefdd] border-b border-[#b9bba826] transition-all">
                    <p className="text-sm font-medium text-[#36392b]">Bulk Import Completed</p>
                    <p className="text-xs text-[#636656] mt-1">2 hours ago</p>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-[#eeefdd] transition-all">
                    <p className="text-sm font-medium text-[#36392b]">System Update Available</p>
                    <p className="text-xs text-[#636656] mt-1">1 day ago</p>
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/dashboard/admin"
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-br from-[#5a685a] to-[#4e5c4e] text-white hover:brightness-95 shadow-[0_8px_24px_rgba(54,57,43,0.16)] transition-all text-sm font-semibold"
            title="Dashboard"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>

          <Link
            href="/list/students"
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-[#eeefdd] border border-[#b9bba826] text-[#5a685a] hover:bg-[#d7e7d5] hover:text-[#354336] shadow-sm hover:shadow-md transition-all text-sm font-semibold"
            title="Students"
          >
            <Users className="w-4 h-4" />
            <span className="hidden md:inline">Students</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setProfileMenu(!profileMenu)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#eeefdd] transition-all group"
            >
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-[#36392b]">Admin User</span>
                <span className="text-xs text-[#636656]">Administrator</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#d7e7d5] flex items-center justify-center text-[#354336] font-bold shadow-md group-hover:shadow-lg transition-all">
                A
              </div>
              <ChevronDown className="w-4 h-4 text-[#636656] group-hover:text-[#36392b] transition-all" />
            </button>

            {profileMenu && (
              <div className="absolute top-full mt-2 right-0 bg-[#fafaebf2] backdrop-blur-md border border-[#b9bba826] rounded-xl shadow-[0_14px_34px_rgba(54,57,43,0.12)] overflow-hidden z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-[#b9bba826] bg-[#eeefdd]">
                  <p className="text-sm font-semibold text-[#36392b]">Admin User</p>
                  <p className="text-xs text-[#636656]">admin@kindervision.com</p>
                </div>
                <Link
                  href="/admin/settings"
                  className="flex items-center gap-3 px-4 py-3 text-sm text-[#36392b] hover:bg-[#eeefdd] border-b border-[#b9bba826] transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#36392b] hover:bg-[#ae4025] hover:text-white transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;