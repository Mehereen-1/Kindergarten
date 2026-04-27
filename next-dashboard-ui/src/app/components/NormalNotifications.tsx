"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

type NotificationRole = "admin" | "teacher" | "parent";

type NoticeItem = {
  _id: string;
  title?: string;
  description?: string;
  createdAt?: string;
  date?: string;
  type?: "notice" | "event-reminder" | "anomaly-alert";
};

const roleLinkMap: Record<NotificationRole, Record<string, string>> = {
  admin: {
    notice: "/admin/announcements",
    "event-reminder": "/admin/events",
    "anomaly-alert": "/admin/security-alerts",
  },
  teacher: {
    notice: "/teacher/notices",
    "event-reminder": "/teacher/events",
    "anomaly-alert": "/teacher/security-alerts",
  },
  parent: {
    notice: "/parent/events",
    "event-reminder": "/parent/events",
    "anomaly-alert": "/parent/events",
  },
};

function relativeTime(value?: string) {
  if (!value) return "Recently";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Recently";

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function noticeLabel(type?: string) {
  if (type === "event-reminder") return "Event Reminder";
  if (type === "anomaly-alert") return "Sound Alert";
  return "Announcement";
}

function getNoticeTime(notice: NoticeItem) {
  return notice.createdAt || notice.date || "";
}

type NormalNotificationsProps = {
  role: NotificationRole;
  className?: string;
  dropdownClassName?: string;
  buttonClassName?: string;
  headerClassName?: string;
};

export default function NormalNotifications({
  role,
  className = "",
  dropdownClassName = "bg-[#fafaebf2] border-[#b9bba826]",
  buttonClassName = "bg-[#eeefdd] text-[#636656] hover:bg-[#5a685a] hover:text-white",
  headerClassName = "bg-[#eeefdd] border-[#b9bba826] text-[#36392b]",
}: NormalNotificationsProps) {
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const openedKey = `normal-notifications-last-opened-${role}`;

  useEffect(() => {
    const getLastOpened = () => {
      try {
        return Number(localStorage.getItem(openedKey) || 0);
      } catch {
        return 0;
      }
    };

    const loadNotices = async () => {
      try {
        const response = await fetch(`/api/notices?role=${role}&limit=50`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return;

        const list: NoticeItem[] = Array.isArray(data?.notices) ? data.notices : [];
        setNotices(list);

        const lastOpened = getLastOpened();
        const unread = list.filter((notice) => {
          const ts = new Date(getNoticeTime(notice) || 0).getTime();
          return Number.isFinite(ts) && ts > lastOpened;
        }).length;
        setUnreadCount(unread);
      } catch {
        setNotices([]);
        setUnreadCount(0);
      }
    };

    void loadNotices();
    const timer = window.setInterval(loadNotices, 15000);
    return () => window.clearInterval(timer);
  }, [openedKey, role]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        localStorage.setItem(openedKey, String(Date.now()));
      } catch {
        /* ignore storage errors */
      }
      setUnreadCount(0);
    }
  };

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-all hover:scale-105 ${buttonClassName}`}
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ae4025] px-1 text-[10px] font-bold leading-5 text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[90vw] overflow-hidden rounded-xl border shadow-[0_14px_34px_rgba(54,57,43,0.12)] backdrop-blur-md ${dropdownClassName}`}
        >
          <div className={`border-b px-4 py-3 ${headerClassName}`}>
            <p className="text-sm font-bold">Notifications</p>
            <p className="mt-0.5 text-xs opacity-75">Latest notices, reminders, and alerts</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notices.length === 0 ? (
              <div className="px-4 py-4 text-sm opacity-75">No notifications yet.</div>
            ) : (
              notices.slice(0, 8).map((notice, index) => {
                const type = notice.type || "notice";
                const href = roleLinkMap[role][type] || roleLinkMap[role].notice;
                return (
                  <Link
                    key={notice._id}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 transition-colors hover:bg-black/5 ${
                      index !== Math.min(notices.length, 8) - 1 ? "border-b border-black/10" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold leading-5">{notice.title || "Notification"}</p>
                      <span className="shrink-0 text-[11px] opacity-65">{relativeTime(getNoticeTime(notice))}</span>
                    </div>
                    {notice.description && (
                      <p className="mt-1 line-clamp-2 text-xs opacity-75">{notice.description}</p>
                    )}
                    <span className="mt-2 inline-block rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                      {noticeLabel(type)}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
