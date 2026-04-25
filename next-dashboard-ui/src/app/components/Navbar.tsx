'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Bell, Settings, LogOut, Users, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type AdminProfile = {
  id: string;
  email: string;
};

const Navbar = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenu, setProfileMenu] = useState(false);
  const [notificationMenu, setNotificationMenu] = useState(false);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

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

  const adminDisplayName = useMemo(() => {
    if (!admin?.email) return 'Admin';
    return admin.email.split('@')[0] || 'Admin';
  }, [admin]);

  const adminInitial = useMemo(() => {
    const source = adminDisplayName.trim();
    return source ? source[0]?.toUpperCase() : 'A';
  }, [adminDisplayName]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin-login');
  };

  return (
    <nav className="bg-[#fefdf1]/88 backdrop-blur-md border-b border-[#b9bba826] sticky top-0 z-40 shadow-[0_6px_24px_rgba(54,57,43,0.06)]">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-[#7f8271] group-hover:text-[#5a685a] transition-colors" />
            <input
              type="text"
              placeholder="Search users, classes, students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#fafaeb] border border-[#b9bba826] text-[#36392b] placeholder-[#7f8271] focus:outline-none focus:ring-2 focus:ring-[#5a685a66] focus:bg-[#ffffffcc] focus:border-[#5a685a] transition-all"
            />
          </div>
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
