'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Bell, Settings, LogOut, Users, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type AdminProfile = {
  id: string;
  email: string;
};

type NotificationItem = {
  id: string;
  title: string;
  timestamp: string;
};

const Navbar = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [notificationMenu, setNotificationMenu] = useState(false);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let isActive = true;

    const loadAdmin = async () => {
      try {
        const response = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (isActive) {
          setAdmin(data?.admin || null);
        }
      } catch {
        if (isActive) {
          setAdmin(null);
        }
      }
    };

    void loadAdmin();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadNotifications = async () => {
      try {
        const response = await fetch('/api/admin/events?role=all', { cache: 'no-store' });
        if (!response.ok) return;

        const events = await response.json();
        if (!Array.isArray(events)) return;

        const mapped: NotificationItem[] = events
          .map((event: any, index: number) => ({
            id: String(event?._id || event?.id || `${event?.title || 'event'}-${index}`),
            title: String(event?.title || 'Event update'),
            timestamp: String(event?.startDate || event?.createdAt || new Date().toISOString()),
          }))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 8);

        if (isActive) {
          setNotifications(mapped);
        }
      } catch {
        if (isActive) {
          setNotifications([]);
        }
      }
    };

    void loadNotifications();
    return () => {
      isActive = false;
    };
  }, []);

  const formatRelativeTime = (value: string) => {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return '';

    const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const adminDisplayName = useMemo(() => {
    if (!admin?.email) return 'Admin';
    return admin.email.split('@')[0] || 'Admin';
  }, [admin]);

  const adminInitial = useMemo(() => {
    const source = adminDisplayName.trim();
    return source ? source[0]?.toUpperCase() : 'A';
  }, [adminDisplayName]);

  const searchableItems = useMemo(
    () => [
      { label: 'Dashboard', href: '/admin/dashboard' },
      { label: 'Students', href: '/admin/students' },
      { label: 'Teachers', href: '/admin/teachers' },
      { label: 'Parents', href: '/admin/parents' },
      { label: 'Classes', href: '/admin/classes' },
      { label: 'Subjects', href: '/admin/subjects' },
      { label: 'Lessons', href: '/admin/lessons' },
      { label: 'Exams', href: '/admin/exam-config' },
      { label: 'Results', href: '/admin/results' },
      { label: 'Announcements', href: '/admin/announcements' },
      { label: 'Attendance Reports', href: '/admin/attendance-reports' },
      { label: 'Attendance Audit', href: '/admin/attendance-audit' },
      { label: 'Sound Alerts', href: '/admin/security-alerts' },
      { label: 'Timetable', href: '/admin/timetable' },
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
      router.push(`/admin/students?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchFocused(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin-login');
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
                {notifications.length}
              </span>
            </button>

            {notificationMenu && (
              <div className="absolute top-full mt-2 right-0 bg-[#fafaebf2] backdrop-blur-md border border-[#b9bba826] rounded-xl shadow-[0_14px_34px_rgba(54,57,43,0.12)] overflow-hidden z-50 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-[#b9bba826] bg-[#eeefdd]">
                  <h3 className="font-semibold text-[#36392b]">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-[#636656]">No notifications yet</div>
                  ) : (
                    notifications.map((item, index) => (
                      <button
                        key={item.id}
                        className={`w-full text-left px-4 py-3 hover:bg-[#eeefdd] transition-all ${
                          index !== notifications.length - 1 ? 'border-b border-[#b9bba826]' : ''
                        }`}
                      >
                        <p className="text-sm font-medium text-[#36392b]">{item.title}</p>
                        <p className="text-xs text-[#636656] mt-1">{formatRelativeTime(item.timestamp)}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/admin/students"
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
                <span className="text-sm font-semibold text-[#36392b]">{adminDisplayName}</span>
                <span className="text-xs text-[#636656]">Administrator</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#d7e7d5] flex items-center justify-center text-[#354336] font-bold shadow-md group-hover:shadow-lg transition-all">
                {adminInitial}
              </div>
              <ChevronDown className="w-4 h-4 text-[#636656] group-hover:text-[#36392b] transition-all" />
            </button>

            {profileMenu && (
              <div className="absolute top-full mt-2 right-0 bg-[#fafaebf2] backdrop-blur-md border border-[#b9bba826] rounded-xl shadow-[0_14px_34px_rgba(54,57,43,0.12)] overflow-hidden z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-[#b9bba826] bg-[#eeefdd]">
                  <p className="text-sm font-semibold text-[#36392b]">{adminDisplayName}</p>
                  <p className="text-xs text-[#636656]">{admin?.email || 'Loading admin profile...'}</p>
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
