'use client';

import { useState } from 'react';
import { Search, Bell, Settings, LogOut, BarChart3, Users, ChevronDown } from 'lucide-react';
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
    <nav className="bg-[#fefade] border-b border-[#ddd8b8] sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-[#7d8460] group-hover:text-[#5f6843] transition-colors" />
            <input
              type="text"
              placeholder="Search users, classes, students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#fffdf4] border border-[#d8d3b3] text-[#3a3927] placeholder-[#8b9071] focus:outline-none focus:ring-2 focus:ring-[#5f6843] focus:bg-white focus:border-[#5f6843] transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setNotificationMenu(!notificationMenu)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#eef3de] text-[#5f6843] hover:bg-[#e2ebcb] hover:shadow-sm transition-all relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-[#5f6843] text-white rounded-full text-xs font-bold">
                3
              </span>
            </button>

            {notificationMenu && (
              <div className="absolute top-full mt-2 right-0 bg-[#fffdf6] border border-[#d8d3b3] rounded-xl shadow-xl overflow-hidden z-50 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-[#e2ddbf] bg-[#eef3de]">
                  <h3 className="font-semibold text-[#3a3927]">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <button className="w-full text-left px-4 py-3 hover:bg-[#f4f8e8] border-b border-[#ece7c9] transition-all">
                    <p className="text-sm font-medium text-[#3a3927]">New Teacher Application</p>
                    <p className="text-xs text-[#6f7654] mt-1">5 minutes ago</p>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-[#f4f8e8] border-b border-[#ece7c9] transition-all">
                    <p className="text-sm font-medium text-[#3a3927]">Bulk Import Completed</p>
                    <p className="text-xs text-[#6f7654] mt-1">2 hours ago</p>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-[#f4f8e8] transition-all">
                    <p className="text-sm font-medium text-[#3a3927]">System Update Available</p>
                    <p className="text-xs text-[#6f7654] mt-1">1 day ago</p>
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/dashboard/admin"
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#edf3dd] text-[#4f5838] hover:bg-[#e2ebcb] hover:shadow-sm transition-all text-sm font-semibold"
            title="Dashboard"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>

          <Link
            href="/list/students"
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f5efd8] text-[#6a5b2e] hover:bg-[#eee5c5] hover:shadow-sm transition-all text-sm font-semibold"
            title="Students"
          >
            <Users className="w-4 h-4" />
            <span className="hidden md:inline">Students</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setProfileMenu(!profileMenu)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#ede9c8] transition-all group"
            >
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-[#3a3927]">Admin User</span>
                <span className="text-xs text-[#6f7654]">Administrator</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#d9a777] flex items-center justify-center text-[#2f1a05] font-bold shadow-md group-hover:shadow-lg transition-all">
                A
              </div>
              <ChevronDown className="w-4 h-4 text-[#6f7654] group-hover:text-[#3a3927] transition-all" />
            </button>

            {profileMenu && (
              <div className="absolute top-full mt-2 right-0 bg-[#fffdf6] border border-[#d8d3b3] rounded-xl shadow-xl overflow-hidden z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-[#e2ddbf] bg-[#eef3de]">
                  <p className="text-sm font-semibold text-[#3a3927]">Admin User</p>
                  <p className="text-xs text-[#6f7654]">admin@kindervision.com</p>
                </div>
                <Link
                  href="/admin/settings"
                  className="flex items-center gap-3 px-4 py-3 text-sm text-[#3a3927] hover:bg-[#f4f8e8] border-b border-[#ece7c9] transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#a14a2f] hover:bg-[#f5e7e2] transition-all"
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