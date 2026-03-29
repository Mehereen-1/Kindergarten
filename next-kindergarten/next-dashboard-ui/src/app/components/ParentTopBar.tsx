"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Bell,
  MessageCircle,
  User,
  LogOut,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

type NoticeItem = {
  _id: string;
  title: string;
  description: string;
  createdAt?: string;
  date?: string;
  type?: "notice" | "event-reminder";
};

function getRelativeTime(iso?: string): string {
  if (!iso) return "Recently";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Recently";

  const diffMs = Date.now() - t;
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ParentTopBar = () => {
  const { user, signOut } = useAuth();
  const [profileMenu, setProfileMenu] = useState(false);
  const [notificationMenu, setNotificationMenu] = useState(false);
  const [selectedChild, setSelectedChild] = useState("Alu");
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const children = ["Alu", "Vorta"];

  useEffect(() => {
    const lastOpenedKey = "parent-notice-last-opened-at";
    const getLastOpened = (): number => {
      try {
        const raw = localStorage.getItem(lastOpenedKey);
        return raw ? Number(raw) : 0;
      } catch {
        return 0;
      }
    };

    const fetchNotices = async () => {
      try {
        const res = await fetch("/api/notices?role=parent&limit=50", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) return;

        const list: NoticeItem[] = Array.isArray(data.notices) ? data.notices : [];
        setNotices(list);

        const lastOpened = getLastOpened();
        const unread = list.filter((n) => {
          const ts = new Date(n.createdAt || n.date || 0).getTime();
          return ts > lastOpened;
        }).length;

        setUnreadNoticeCount(unread);
      } catch {
        setUnreadNoticeCount(0);
      }
    };

    fetchNotices();
    const timer = setInterval(fetchNotices, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationMenu(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const openNotifications = () => {
    const next = !notificationMenu;
    setNotificationMenu(next);
    if (next) {
      localStorage.setItem("parent-notice-last-opened-at", String(Date.now()));
      setUnreadNoticeCount(0);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">
            👨‍👩‍👧
          </div>
          <h2 className="text-xl font-black text-slate-900 hidden sm:block">KinderVision</h2>
        </div>

        {/* Child Selector */}
        <div className="flex-1 max-w-xs">
          <div className="relative">
            <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all shadow-sm border border-slate-300">
              <span className="text-sm">{selectedChild}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={openNotifications}
              className="relative p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all hover:scale-110 shadow-sm"
            >
              <Bell className="w-5 h-5" />
              {unreadNoticeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] leading-[18px] rounded-full text-center font-bold shadow-md">
                  {unreadNoticeCount > 99 ? "99+" : unreadNoticeCount}
                </span>
              )}
            </button>

            {notificationMenu && (
              <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 w-[360px] max-w-[90vw] overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <p className="text-sm font-bold text-slate-900">Notifications</p>
                  <p className="text-xs text-slate-500 mt-0.5">Latest announcements and reminders</p>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notices.length === 0 && (
                    <div className="p-4 text-sm text-slate-500">No notifications yet.</div>
                  )}

                  {notices.slice(0, 8).map((notice) => (
                    <div key={notice._id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900 leading-5">{notice.title}</p>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {getRelativeTime(notice.createdAt || notice.date)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{notice.description}</p>
                      <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold uppercase tracking-wide">
                        {notice.type === "event-reminder" ? "Event Reminder" : "Announcement"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 border-t border-slate-100">
                  <Link
                    href="/parent/events"
                    onClick={() => setNotificationMenu(false)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-500"
                  >
                    View all event notices
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <button className="relative p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all hover:scale-110 shadow-sm">
            <MessageCircle className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-300 rounded-full animate-pulse shadow-lg"></span>
          </button>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileMenu(!profileMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/20 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-300 to-peach-300 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform">
                👤
              </div>
            </button>
            {profileMenu && (
              <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-peach-50">
                  <p className="text-sm font-bold text-slate-900">{user?.name || 'Parent Name'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'parent@kindergarten.edu'}</p>
                </div>
                <Link
                  href="/parent/profile"
                  className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-3 border-b border-slate-100 transition-colors"
                  onClick={() => setProfileMenu(false)}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>
                <Link
                  href="/parent/child-profile"
                  className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-3 border-b border-slate-100 transition-colors"
                  onClick={() => setProfileMenu(false)}
                >
                  <User className="w-4 h-4" />
                  Child's Profile
                </Link>
                <Link
                  href="/parent/settings"
                  className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-3 border-b border-slate-100 transition-colors"
                  onClick={() => setProfileMenu(false)}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={signOut}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ParentTopBar;
