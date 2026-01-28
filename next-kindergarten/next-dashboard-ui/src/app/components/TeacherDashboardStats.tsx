import { Users, BarChart3, BookOpen, Clock, TrendingUp, ArrowUpRight } from "lucide-react";

const TeacherDashboardStats = () => {
  const stats = [
    {
      title: "My Classes",
      value: "4",
      subtitle: "Active Classes",
      icon: Users,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      iconColor: "bg-blue-600",
      textColor: "text-blue-600",
    },
    {
      title: "Attendance Rate",
      value: "94%",
      subtitle: "This Month",
      icon: BarChart3,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      iconColor: "bg-green-600",
      textColor: "text-green-600",
    },
    {
      title: "Assignments",
      value: "12",
      subtitle: "Pending Review",
      icon: BookOpen,
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      iconColor: "bg-amber-600",
      textColor: "text-amber-600",
    },
    {
      title: "Today's Classes",
      value: "3",
      subtitle: "Next: 10:30 AM",
      icon: Clock,
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      iconColor: "bg-purple-600",
      textColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`group relative overflow-hidden rounded-2xl bg-white p-6 ${stat.borderColor} border transition-all duration-500 hover:shadow-lg hover:-translate-y-1 animate-in fade-in zoom-in duration-700`}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            {/* Subtle background on hover */}
            <div className={`absolute inset-0 ${stat.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`}></div>

            {/* Top accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${stat.iconColor} shadow-md`}></div>

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    {stat.title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-5xl font-bold ${stat.textColor} group-hover:scale-110 transition-transform duration-300 inline-block`}>
                      {stat.value}
                    </span>
                  </div>
                </div>
                <div className={`p-4 rounded-2xl ${stat.bgColor} shadow-md group-hover:scale-110 transition-all duration-500`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} strokeWidth={2.5} />
                </div>
              </div>

              {/* Footer with trend */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 group-hover:border-slate-200 transition-colors duration-300">
                <p className="text-sm text-slate-600 font-semibold">
                  {stat.subtitle}
                </p>
                <div className={`p-2 rounded-full ${stat.iconColor} text-white opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:animate-bounce`}>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TeacherDashboardStats;
