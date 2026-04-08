import { Users, BarChart3, BookOpen, Clock, TrendingUp, ArrowUpRight } from "lucide-react";

interface TeacherDashboardStatsProps {
  totalClasses: number;
  attendanceRate: number;
  todayClasses: number;
  attendanceSubtitle?: string;
  nextClassSubtitle?: string;
}

const TeacherDashboardStats = ({
  totalClasses,
  attendanceRate,
  todayClasses,
  attendanceSubtitle,
  nextClassSubtitle,
}: TeacherDashboardStatsProps) => {
  const stats = [
    {
      title: "My Classes",
      value: String(totalClasses),
      subtitle: "Active Classes",
      icon: Users,
      bgColor: "bg-[#f2f2e8]",
      iconBgColor: "bg-white",
      textColor: "text-[#352f00]",
      accentColor: "#705900",
      iconElement: "school",
    },
    {
      title: "Attendance Rate",
      value: `${attendanceRate}%`,
      subtitle: attendanceSubtitle || "This Month",
      icon: BarChart3,
      bgColor: "bg-[#f4f7f2]",
      iconBgColor: "bg-white",
      textColor: "text-[#352f00]",
      accentColor: "#466337",
      iconElement: "monitoring",
    },
    {
      title: "Today's Classes",
      value: String(todayClasses),
      subtitle: nextClassSubtitle || "No class scheduled",
      icon: Clock,
      bgColor: "bg-[#fff9f4]",
      iconBgColor: "bg-white",
      textColor: "text-[#352f00]",
      accentColor: "#904800",
      iconElement: "schedule",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`${stat.bgColor} p-8 sketched-border flex flex-col items-center text-center transition-transform duration-500 hover:-translate-y-2 group`}
            style={{
              border: "2px solid #5a4a3a",
              borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px",
            }}
          >
            {/* Icon with blob container */}
            <div className={`w-16 h-16 ${stat.iconBgColor} blob-container flex items-center justify-center mb-4 shadow-sm`}
              style={{
                borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%",
              }}
            >
              <span className="material-symbols-outlined text-on-surface-variant text-3xl" style={{ fontVariationSettings: "'wght' 300" }}>
                {stat.iconElement}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-accent font-bold text-on-surface mb-1">
              {stat.title}
            </h3>

            {/* Value */}
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-on-surface tracking-tight">
                {stat.value}
              </span>
            </div>

            {/* Subtitle */}
            <p className="text-on-surface-variant text-sm font-medium leading-relaxed mt-2">
              {stat.subtitle}
            </p>

            {/* Decorative line at bottom */}
            <div className="mt-6 flex items-center gap-2">
              <div className="h-0.5 w-6 bg-on-surface/20"></div>
              <span className="material-symbols-outlined text-xs text-on-surface/30">circle</span>
              <div className="h-0.5 w-6 bg-on-surface/20"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TeacherDashboardStats;