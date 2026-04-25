
import { useEffect, useState } from "react";
import { MessageSquare, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const iconMap = {
  message: MessageSquare,
  assignment: FileText,
  attendance: CheckCircle,
  alert: AlertCircle,
};

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 60000); // minutes
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff} min${diff > 1 ? "s" : ""} ago`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

const TeacherRecentActivity = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/teacher/messages?to=${user.id}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/teacher/attendance?classIds=&from=&to=`).then(r => r.ok ? r.json() : []),
      fetch(`/api/teacher/events`).then(r => r.ok ? r.json() : []),
    ]).then(([messages, attendance, events]) => {
      const msgActs = (Array.isArray(messages) ? messages : []).slice(0, 3).map((msg: any) => ({
        id: msg._id,
        type: "message",
        title: msg.subject || "New Message",
        description: msg.body || "Message received",
        time: formatTimeAgo(msg.createdAt),
        icon: iconMap.message,
        bgColor: "bg-[#f2f2e8]",
        iconBgColor: "bg-white",
        accentColor: "#705900",
        iconElement: "chat",
      }));
      const attActs = (Array.isArray(attendance) ? attendance : []).slice(0, 2).map((att: any) => ({
        id: att._id,
        type: "attendance",
        title: "Attendance Marked",
        description: `${att.classId?.name || "Class"}: Attendance marked for ${att.date?.slice(0,10)}`,
        time: formatTimeAgo(att.createdAt),
        icon: iconMap.attendance,
        bgColor: "bg-[#fff9f4]",
        iconBgColor: "bg-white",
        accentColor: "#904800",
        iconElement: "check_circle",
      }));
      const eventActs = (Array.isArray(events) ? events : []).slice(0, 2).map((ev: any) => ({
        id: ev._id,
        type: "alert",
        title: ev.title || "Event",
        description: ev.description || "Scheduled event",
        time: formatTimeAgo(ev.startDate),
        icon: iconMap.alert,
        bgColor: "bg-[#fef8e8]",
        iconBgColor: "bg-white",
        accentColor: "#b87c00",
        iconElement: "notification_important",
      }));
      setActivities([...msgActs, ...attActs, ...eventActs].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5));
      setLoading(false);
    });
  }, [user?.id]);

  return (
    <div className="bg-[#fff7d6] rounded-[24px_48px_16px_40px] shadow-sm relative overflow-hidden h-full flex flex-col animate-in fade-in slide-in-from-right-5 duration-700"
      style={{
        border: "2px solid #5a4a3a",
        borderRadius: "24px 48px 16px 40px",
      }}
    >
      {/* Teacher's Note style header */}
      <div className="bg-[#fffcc2] p-5 relative border-b-2 border-[#5a4a3a]/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white blob-container flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[#705900]">notifications_active</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-[#352f00]">Recent Activity</h2>
            <p className="text-xs text-[#352f00]/50 font-medium">Stay updated with latest activities</p>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 divide-y divide-[#5a4a3a]/10">
        {loading ? (
          <div className="p-6 text-center text-[#352f00]/60">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="p-6 text-center text-[#352f00]/60">No recent activity.</div>
        ) : activities.map((activity, idx) => (
          <div
            key={activity.id}
            className={`p-4 ${activity.bgColor} hover:bg-opacity-50 transition-all duration-300 group/activity cursor-pointer animate-in fade-in slide-in-from-right-5 duration-700`}
            style={{ animationDelay: `${idx * 100 + 300}ms` }}
          >
            <div className="flex gap-3">
              {/* Icon with blob container */}
              <div className="flex-shrink-0 mt-1">
                <div className={`w-10 h-10 ${activity.iconBgColor} blob-container flex items-center justify-center shadow-sm group-hover/activity:scale-110 transition-all duration-300`}
                  style={{
                    borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%",
                    border: "1px solid #5a4a3a/20",
                  }}
                >
                  <span className="material-symbols-outlined text-[#352f00] text-xl">
                    {activity.iconElement}
                  </span>
                </div>
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[#352f00] text-sm group-hover/activity:text-[#904800] transition-colors">
                  {activity.title}
                </h3>
                <p className="text-[#352f00]/60 text-sm mt-1 line-clamp-2">
                  {activity.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-1.5 h-1.5 rounded-full bg-[${activity.accentColor}]`}></div>
                  <p className="text-xs font-medium text-[#352f00]/40">
                    {activity.time}
                  </p>
                </div>
              </div>
              {/* Decorative arrow */}
              <div className="flex-shrink-0 pt-1 opacity-0 group-hover/activity:opacity-100 transition-all duration-300 group-hover/activity:translate-x-1">
                <span className="material-symbols-outlined text-[#904800] text-xl">arrow_forward</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Button with sketched style */}
      <div className="p-3 border-t-2 border-[#5a4a3a]/10 bg-[#fff7d6]">
        <button className="w-full py-2.5 px-4 bg-[#f8e999] text-[#352f00] rounded-full font-bold text-sm hover:bg-[#edde84] transition-all shadow-md hover:shadow-lg hover:scale-[1.02] duration-300 flex items-center justify-center gap-2"
          style={{
            border: "1px solid #5a4a3a/30",
            borderRadius: "9999px",
          }}
        >
          <span>View All Activities</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default TeacherRecentActivity;