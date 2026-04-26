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
    <nav className="bg-[color:color-mix(in_srgb,var(--color-surface)_88%,transparent)] backdrop-blur-md border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] sticky top-0 z-40 shadow-[0_6px_24px_rgba(0,0,0,0.24)]">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] transition-colors" />
            <input
              type="text"
              placeholder="Search users, classes, students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--color-surface-low)] border border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-primary)_48%,transparent)] focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setNotificationMenu(!notificationMenu)}
              className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary)] hover:text-white transition-all hover:scale-105 shadow-sm"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-[#ae4025] text-white rounded-full text-xs font-bold shadow-sm">
                3
              </span>
            </button>

            {notificationMenu && (
              <div className="absolute top-full mt-2 right-0 bg-[color:color-mix(in_srgb,var(--color-surface-low)_95%,transparent)] backdrop-blur-md border border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] rounded-xl shadow-[0_14px_34px_rgba(0,0,0,0.24)] overflow-hidden z-50 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] bg-[var(--color-surface-container)]">
                  <h3 className="font-semibold text-[var(--color-on-surface)]">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <button className="w-full text-left px-4 py-3 hover:bg-[var(--color-surface-container)] border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] transition-all">
                    <p className="text-sm font-medium text-[var(--color-on-surface)]">New Teacher Application</p>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">5 minutes ago</p>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-[var(--color-surface-container)] border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] transition-all">
                    <p className="text-sm font-medium text-[var(--color-on-surface)]">Bulk Import Completed</p>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">2 hours ago</p>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-[var(--color-surface-container)] transition-all">
                    <p className="text-sm font-medium text-[var(--color-on-surface)]">System Update Available</p>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">1 day ago</p>
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/admin/students"
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--color-surface-container)] border border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-surface)] shadow-sm hover:shadow-md transition-all text-sm font-semibold"
            title="Students"
          >
            <Users className="w-4 h-4" />
            <span className="hidden md:inline">Students</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setProfileMenu(!profileMenu)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--color-surface-container)] transition-all group"
            >
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-[var(--color-on-surface)]">{adminDisplayName}</span>
                <span className="text-xs text-[var(--color-on-surface-variant)]">Administrator</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center text-[var(--color-on-surface)] font-bold shadow-md group-hover:shadow-lg transition-all">
                {adminInitial}
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-on-surface)] transition-all" />
            </button>

            {profileMenu && (
              <div className="absolute top-full mt-2 right-0 bg-[color:color-mix(in_srgb,var(--color-surface-low)_95%,transparent)] backdrop-blur-md border border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] rounded-xl shadow-[0_14px_34px_rgba(0,0,0,0.24)] overflow-hidden z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] bg-[var(--color-surface-container)]">
                  <p className="text-sm font-semibold text-[var(--color-on-surface)]">{adminDisplayName}</p>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">{admin?.email || 'Loading admin profile...'}</p>
                </div>
                <Link
                  href="/admin/settings"
                  className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--color-on-surface)] hover:bg-[#ae4025] hover:text-white transition-all"
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
