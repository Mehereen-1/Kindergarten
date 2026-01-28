import { MessageSquare, FileText, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

const TeacherRecentActivity = () => {
  const activities = [
    {
      id: 1,
      type: "message",
      title: "New Parent Message",
      description: "Mrs. Sharma asked about homework",
      time: "10 mins ago",
      icon: MessageSquare,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50",
      lightBg: "bg-blue-500/10",
      textColor: "text-blue-700",
      dotColor: "bg-blue-500",
      borderColor: "border-blue-300",
    },
    {
      id: 2,
      type: "submission",
      title: "Assignment Submitted",
      description: "KG-A: Drawing Assignment - 24 submissions",
      time: "1 hour ago",
      icon: FileText,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      lightBg: "bg-green-500/10",
      textColor: "text-green-700",
      dotColor: "bg-green-500",
      borderColor: "border-green-300",
    },
    {
      id: 3,
      type: "success",
      title: "Attendance Marked",
      description: "KG-B: Attendance marked for today",
      time: "2 hours ago",
      icon: CheckCircle,
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-50",
      lightBg: "bg-emerald-500/10",
      textColor: "text-emerald-700",
      dotColor: "bg-emerald-500",
      borderColor: "border-emerald-300",
    },
    {
      id: 4,
      type: "alert",
      title: "Pending Confirmations",
      description: "Field Trip - 5 pending confirmations",
      time: "3 hours ago",
      icon: AlertCircle,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-50",
      lightBg: "bg-amber-500/10",
      textColor: "text-amber-700",
      dotColor: "bg-amber-500",
      borderColor: "border-amber-300",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 h-full flex flex-col animate-in fade-in slide-in-from-right-5 duration-700">
      {/* Vibrant gradient header with animation */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 px-8 py-8 relative overflow-hidden">
        {/* Decorative animated circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
        
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3 drop-shadow-lg">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <TrendingUp className="w-7 h-7" />
            </div>
            <span>Activity Feed</span>
          </h2>
          <p className="text-pink-100 text-sm mt-2 font-medium">Stay updated with latest activities</p>
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
        {activities.map((activity, idx) => {
          const Icon = activity.icon;
          return (
            <div
              key={activity.id}
              className="p-5 hover:bg-gradient-to-r hover:from-slate-50 hover:to-white transition-all duration-300 group/activity cursor-pointer border-l-4 border-transparent animate-in fade-in slide-in-from-right-5 duration-700"
              style={{ 
                animationDelay: `${idx * 100 + 300}ms`
              }}
              onMouseEnter={(e) => {
                const colors: Record<string, string> = {
                  'from-blue-500': '#3b82f6',
                  'from-green-500': '#22c55e',
                  'from-emerald-500': '#10b981',
                  'from-amber-500': '#f59e0b'
                };
                const color = colors[activity.color.split(' ')[0]] || '#3b82f6';
                (e.currentTarget as HTMLElement).style.borderLeftColor = color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent';
              }}
            >
              <div className="flex gap-4">
                {/* Icon with vibrant gradient background */}
                <div className="flex-shrink-0 mt-1">
                  <div className={`bg-gradient-to-br ${activity.color} p-3.5 rounded-2xl shadow-lg group-hover/activity:scale-125 group-hover/activity:rotate-12 transition-all duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm group-hover/activity:text-indigo-600 transition-colors">
                    {activity.title}
                  </h3>
                  <p className="text-slate-600 text-xs mt-1.5 line-clamp-2">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${activity.color} animate-pulse`}></div>
                    <p className={`text-xs font-bold bg-gradient-to-r ${activity.color} bg-clip-text text-transparent`}>
                      {activity.time}
                    </p>
                  </div>
                </div>

                {/* Animated timeline dot */}
                <div className="flex-shrink-0 pt-1">
                  <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${activity.color} shadow-lg group-hover/activity:scale-150 group-hover/activity:shadow-xl transition-all duration-300 animate-pulse`}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Button with gradient */}
      <div className="p-4 border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <button className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white rounded-xl font-bold hover:from-purple-500 hover:via-pink-500 hover:to-rose-500 transition-all shadow-lg hover:shadow-xl hover:scale-105 duration-300">
          View All Activities
        </button>
      </div>
    </div>
  );
};

export default TeacherRecentActivity;
