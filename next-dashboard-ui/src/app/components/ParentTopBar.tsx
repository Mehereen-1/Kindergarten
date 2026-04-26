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
import Image from "next/image";

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
    <header className="bg-[color:color-mix(in_srgb,var(--color-surface)_90%,transparent)] backdrop-blur-md border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] sticky top-0 z-40 shadow-[0_4px_20px_rgba(58,57,39,0.04)]">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-low)] border border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] flex items-center justify-center overflow-hidden p-1.5">
            <Image
              src="/logo_system.png"
              alt="School logo"
              width={56}
              height={56}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <h2 className="text-xl font-black text-[var(--color-on-surface)] leading-tight">KinderVision</h2>
            <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--color-on-surface-variant)]">Parent Portal</p>
          </div>
        </div>

        {/* Child Selector */}
        <div className="flex-1 max-w-xs">
          <div className="relative">
            
            <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-full bg-[var(--color-surface-low)] text-[var(--color-on-surface)] font-semibold hover:bg-[var(--color-surface-container)] transition-all shadow-sm border border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)]">
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
              className="relative p-2.5 rounded-lg bg-[var(--color-surface-low)] hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] transition-all hover:scale-110 shadow-sm"
            >
              <Bell className="w-5 h-5" />
              {unreadNoticeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] leading-[18px] rounded-full text-center font-bold shadow-md">
                  {unreadNoticeCount > 99 ? "99+" : unreadNoticeCount}
                </span>
              )}
            </button>

            {notificationMenu && (
              <div className="absolute top-full mt-2 right-0 bg-[var(--color-surface-low)] rounded-xl shadow-2xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] z-50 w-[360px] max-w-[90vw] overflow-hidden">
                <div className="px-4 py-3 border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] bg-[var(--color-surface-container)]">
                  <p className="text-sm font-bold text-[var(--color-on-surface)]">Notifications</p>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">Latest announcements and reminders</p>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-[color:color-mix(in_srgb,var(--color-outline-variant)_20%,transparent)]">
                  {notices.length === 0 && (
                    <div className="p-4 text-sm text-[var(--color-on-surface-variant)]">No notifications yet.</div>
                  )}

                  {notices.slice(0, 8).map((notice) => (
                    <div key={notice._id} className="p-4 hover:bg-[var(--color-surface-container)] transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--color-on-surface)] leading-5">{notice.title}</p>
                        <span className="text-[11px] text-[var(--color-on-surface-variant)] whitespace-nowrap">
                          {getRelativeTime(notice.createdAt || notice.date)}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-on-surface-variant)] mt-1 line-clamp-2">{notice.description}</p>
                      <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface-container)] text-[var(--color-primary-dim)] font-semibold uppercase tracking-wide">
                        {notice.type === "event-reminder" ? "Event Reminder" : "Announcement"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 border-t border-[color:color-mix(in_srgb,var(--color-outline-variant)_20%,transparent)]">
                  <Link
                    href="/parent/events"
                    onClick={() => setNotificationMenu(false)}
                    className="text-sm font-semibold text-[var(--color-primary-dim)] hover:opacity-85"
                  >
                    View all event notices
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <button className="relative p-2.5 rounded-lg bg-[var(--color-surface-low)] hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] transition-all hover:scale-110 shadow-sm">
            <MessageCircle className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[var(--color-primary)] rounded-full animate-pulse shadow-lg"></span>
          </button>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileMenu(!profileMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--color-surface-container)] transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center text-[var(--color-on-surface)] font-bold shadow-md group-hover:scale-110 transition-transform">
                👤
              </div>
            </button>
            {profileMenu && (
              <div className="absolute top-full mt-2 right-0 bg-[var(--color-surface-low)] rounded-xl shadow-2xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] py-2 z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary-container)_60%,transparent)]">
                  <p className="text-sm font-bold text-[var(--color-on-surface)]">{user?.name || 'Parent Name'}</p>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{user?.email || 'parent@kindergarten.edu'}</p>
                </div>
                <Link
                  href="/parent/profile"
                  className="w-full text-left px-4 py-3 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] flex items-center gap-3 border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] transition-colors"
                  onClick={() => setProfileMenu(false)}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>
                <Link
                  href="/parent/child-profile"
                  className="w-full text-left px-4 py-3 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] flex items-center gap-3 border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] transition-colors"
                  onClick={() => setProfileMenu(false)}
                >
                  <User className="w-4 h-4" />
                  Child&apos;s Profile
                </Link>
                <Link
                  href="/parent/settings"
                  className="w-full text-left px-4 py-3 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] flex items-center gap-3 border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] transition-colors"
                  onClick={() => setProfileMenu(false)}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={signOut}
                  className="w-full text-left px-4 py-3 text-sm text-[var(--color-on-surface)] hover:bg-[#be2d06] hover:text-white flex items-center gap-3 transition-colors"
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
