"use client";

import { useEffect, useMemo, useState } from "react";

type NoticeItem = {
  _id: string;
  title: string;
  description: string;
  date?: string;
  createdAt?: string;
  type?: "notice" | "event-reminder";
};

function getRelativeTime(iso?: string): string {
  if (!iso) return "Recently";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Recently";

  const diffMs = Date.now() - t;
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
}

const ParentNoticesCard = () => {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchNotices = async () => {
      try {
        const res = await fetch("/api/notices?role=parent&limit=6", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !mounted) return;
        setNotices(Array.isArray(data.notices) ? data.notices : []);
      } catch {
        if (mounted) setNotices([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchNotices();
    const timer = setInterval(fetchNotices, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const viewItems = useMemo(() => notices.slice(0, 3), [notices]);

  const getVisual = (type?: string) => {
    if (type === "event-reminder") {
      return { icon: "📅", color: "from-yellow-500 to-orange-500" };
    }
    return { icon: "📢", color: "from-blue-500 to-cyan-500" };
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 group animate-in fade-in slide-in-from-left-5 duration-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-400 to-peach-500 px-8 py-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>

        <div className="relative z-10">
          <h2 className="text-3xl font-black text-white drop-shadow-lg flex items-center gap-3">
            <span className="text-4xl">📢</span>
            Latest Notices
          </h2>
          <p className="text-orange-100 text-sm mt-2 font-bold">Important announcements</p>
        </div>
      </div>

      {/* Notices List */}
      <div className="divide-y-2 divide-blue-100">
        {loading && (
          <div className="p-6 text-sm text-slate-500 font-semibold">Loading latest notices...</div>
        )}

        {!loading && viewItems.length === 0 && (
          <div className="p-6 text-sm text-slate-500 font-semibold">No notices yet.</div>
        )}

        {viewItems.map((notice, idx) => {
          const visual = getVisual(notice.type);
          return (
          <div
            key={notice._id || idx}
            className="p-6 hover:bg-gradient-to-r hover:from-orange-50 hover:to-peach-50 transition-all duration-300 group/notice cursor-pointer border-l-4 border-transparent animate-in fade-in slide-in-from-right-5 duration-700"
            style={{ animationDelay: `${idx * 100}ms` }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderLeftColor = visual.color.includes("to-orange-500") ? "#F97316" : "#06B6D4";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent';
            }}
          >
            <div className="flex gap-4">
              {/* Icon */}
              <div className={`text-4xl p-3 rounded-2xl bg-gradient-to-br ${visual.color} shadow-lg group-hover/notice:scale-125 group-hover/notice:rotate-12 transition-all duration-300 flex-shrink-0`}>
                {visual.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-900 group-hover/notice:text-blue-600 transition-colors">
                  {notice.title}
                </h3>
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                  {notice.description}
                </p>
                <p className="text-xs font-bold text-slate-400 mt-3 uppercase tracking-wider">
                  {getRelativeTime(notice.date || notice.createdAt)}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex items-center pt-2">
                <div className={`p-2.5 rounded-full bg-gradient-to-r ${visual.color} opacity-0 group-hover/notice:opacity-100 transition-all duration-300 shadow-lg`}>
                  <span className="text-white font-bold">→</span>
                </div>
              </div>
            </div>
          </div>
        )})}
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-gradient-to-r from-orange-50 to-peach-50 border-t-2 border-blue-100">
        <button className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg hover:shadow-xl hover:scale-105 duration-300">
          View All Notices
        </button>
      </div>
    </div>
  );
};

export default ParentNoticesCard;
