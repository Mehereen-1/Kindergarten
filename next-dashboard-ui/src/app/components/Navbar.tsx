'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Search, MessageCircle, Bell, Settings, LogOut, Users, BarChart3, Plus, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const Navbar = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenu, setProfileMenu] = useState(false);
  const [notificationMenu, setNotificationMenu] = useState(false);

  const handleLogout = () => {
    document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    router.push('/sign-in');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
            <input
              type="text"
              placeholder="Search users, classes, students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white focus:border-amber-500 transition-all hover:border-slate-400"
            />
          </div>
        </div>

        {/* Action Items */}
        <div className="flex items-center gap-4">
          {/* Messages */}
          <Link
            href="/admin/messages"
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 hover:from-blue-200 hover:to-blue-100 hover:shadow-md transition-all"
            title="Messages"
          >
            <MessageCircle className="w-5 h-5" />
          </Link>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotificationMenu(!notificationMenu)}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-orange-50 text-amber-600 hover:from-amber-200 hover:to-orange-100 hover:shadow-md transition-all relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs font-bold">
                3
              </span>
            </button>

            {notificationMenu && (
              <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <button className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-100 transition-all">
                    <p className="text-sm font-medium text-slate-900">New Teacher Application</p>
                    <p className="text-xs text-slate-500 mt-1">5 minutes ago</p>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-100 transition-all">
                    <p className="text-sm font-medium text-slate-900">Bulk Import Completed</p>
                    <p className="text-xs text-slate-500 mt-1">2 hours ago</p>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-amber-50 transition-all">
                    <p className="text-sm font-medium text-slate-900">System Update Available</p>
                    <p className="text-xs text-slate-500 mt-1">1 day ago</p>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Admin Stats Quick Link */}
          <Link
            href="/admin"
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-100 to-teal-50 text-emerald-700 hover:from-emerald-200 hover:to-teal-100 hover:shadow-md transition-all text-sm font-medium"
            title="Dashboard"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setProfileMenu(!profileMenu)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-all group"
            >
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-900">Admin User</span>
                <span className="text-xs text-slate-500">Administrator</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-md group-hover:shadow-lg transition-all">
                A
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-all" />
            </button>

            {profileMenu && (
              <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
                  <p className="text-sm font-semibold text-slate-900">Admin User</p>
                  <p className="text-xs text-slate-500">admin@kindervision.com</p>
                </div>
                <Link
                  href="/admin/settings"
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-amber-50 border-b border-slate-100 transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <Link
                  href="/admin/manage-users"
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-amber-50 border-b border-slate-100 transition-all"
                >
                  <Users className="w-4 h-4" />
                  Manage Users
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all"
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