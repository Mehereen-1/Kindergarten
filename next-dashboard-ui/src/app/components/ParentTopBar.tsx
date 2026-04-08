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
    <header className="bg-[#fefcf5]/90 backdrop-blur-md border-b border-[#e3dfc0] sticky top-0 z-40 shadow-[0_4px_20px_rgba(58,57,39,0.04)]">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#d9a777]/30 flex items-center justify-center text-xl">
            👨‍👩‍👧
          </div>
          <h2 className="text-xl font-black text-[#3a3927] hidden sm:block">KinderVision</h2>
        </div>

        {/* Child Selector */}
        <div className="flex-1 max-w-xs">
          <div className="relative">
            
            <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-full bg-[#fefade] text-[#3a3927] font-semibold hover:bg-[#ede9c8] transition-all shadow-sm border border-[#d6d2b5]">
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
              className="relative p-2.5 rounded-lg bg-[#fefade] hover:bg-[#ede9c8] text-[#676551] transition-all hover:scale-110 shadow-sm"
            >
              <Bell className="w-5 h-5" />
              {unreadNoticeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] leading-[18px] rounded-full text-center font-bold shadow-md">
                  {unreadNoticeCount > 99 ? "99+" : unreadNoticeCount}
                </span>
              )}
            </button>

            {notificationMenu && (
              <div className="absolute top-full mt-2 right-0 bg-[#fefade] rounded-xl shadow-2xl border border-[#d6d2b5] z-50 w-[360px] max-w-[90vw] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#e3dfc0] bg-[#f8f5df]">
                  <p className="text-sm font-bold text-[#3a3927]">Notifications</p>
                  <p className="text-xs text-[#676551] mt-0.5">Latest announcements and reminders</p>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-[#ece7ca]">
                  {notices.length === 0 && (
                    <div className="p-4 text-sm text-[#676551]">No notifications yet.</div>
                  )}

                  {notices.slice(0, 8).map((notice) => (
                    <div key={notice._id} className="p-4 hover:bg-[#f4efd5] transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-[#3a3927] leading-5">{notice.title}</p>
                        <span className="text-[11px] text-[#9b977f] whitespace-nowrap">
                          {getRelativeTime(notice.createdAt || notice.date)}
                        </span>
                      </div>
                      <p className="text-xs text-[#676551] mt-1 line-clamp-2">{notice.description}</p>
                      <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-[#ede9c8] text-[#705900] font-semibold uppercase tracking-wide">
                        {notice.type === "event-reminder" ? "Event Reminder" : "Announcement"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 border-t border-[#ece7ca]">
                  <Link
                    href="/parent/events"
                    onClick={() => setNotificationMenu(false)}
                    className="text-sm font-semibold text-[#845c32] hover:text-[#6b4a28]"
                  >
                    View all event notices
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <button className="relative p-2.5 rounded-lg bg-[#fefade] hover:bg-[#ede9c8] text-[#676551] transition-all hover:scale-110 shadow-sm">
            <MessageCircle className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#5f6843] rounded-full animate-pulse shadow-lg"></span>
          </button>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileMenu(!profileMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#ede9c8]/70 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-[#d9a777] flex items-center justify-center text-[#271300] font-bold shadow-md group-hover:scale-110 transition-transform">
                👤
              </div>
            </button>
            {profileMenu && (
              <div className="absolute top-full mt-2 right-0 bg-[#fefade] rounded-xl shadow-2xl border border-[#d6d2b5] py-2 z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-[#e3dfc0] bg-[#d9a777]/20">
                  <p className="text-sm font-bold text-[#3a3927]">{user?.name || 'Parent Name'}</p>
                  <p className="text-xs text-[#676551] mt-0.5">{user?.email || 'parent@kindergarten.edu'}</p>
                </div>
                <Link
                  href="/parent/profile"
                  className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#ede9c8] flex items-center gap-3 border-b border-[#e3dfc0] transition-colors"
                  onClick={() => setProfileMenu(false)}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>
                <Link
                  href="/parent/child-profile"
                  className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#ede9c8] flex items-center gap-3 border-b border-[#e3dfc0] transition-colors"
                  onClick={() => setProfileMenu(false)}
                >
                  <User className="w-4 h-4" />
                  Child's Profile
                </Link>
                <Link
                  href="/parent/settings"
                  className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#ede9c8] flex items-center gap-3 border-b border-[#e3dfc0] transition-colors"
                  onClick={() => setProfileMenu(false)}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={signOut}
                  className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#be2d06] hover:text-white flex items-center gap-3 transition-colors"
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
