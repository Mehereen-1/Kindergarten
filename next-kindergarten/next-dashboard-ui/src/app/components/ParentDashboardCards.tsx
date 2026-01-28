"use client";

const ParentDashboardCards = () => {
  const cards = [
    {
      title: "Attendance This Month",
      value: "94%",
      subtitle: "22 days present",
      icon: "📅",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      iconColor: "bg-blue-600",
      color: "text-blue-600",
    },
    {
      title: "Latest Score",
      value: "A+",
      subtitle: "Mathematics",
      icon: "📊",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      iconColor: "bg-green-600",
      color: "text-green-600",
    },
    {
      title: "Next PTM",
      value: "5 Feb",
      subtitle: "Schedule confirmed",
      icon: "👨‍👩‍👧",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      iconColor: "bg-orange-600",
      color: "text-orange-600",
    },
    {
      title: "Unread Messages",
      value: "3",
      subtitle: "From teacher",
      icon: "💬",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      iconColor: "bg-purple-600",
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`group relative overflow-hidden rounded-2xl bg-white p-6 ${card.borderColor} border transition-all duration-500 hover:shadow-lg hover:-translate-y-1 animate-in fade-in zoom-in duration-700`}
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          {/* Subtle background on hover */}
          <div className={`absolute inset-0 ${card.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`}></div>

          {/* Top accent bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 ${card.iconColor} shadow-md`}></div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  {card.title}
                </p>
                <span className={`text-4xl font-black ${card.color} group-hover:scale-105 transition-transform duration-300 inline-block`}>
                  {card.value}
                </span>
              </div>
              <div className={`text-3xl p-3 rounded-2xl ${card.bgColor} shadow-md group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                {card.icon}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 group-hover:border-slate-200 transition-colors duration-300">
              <p className="text-sm text-slate-600 font-semibold">
                {card.subtitle}
              </p>
              <div className={`p-2 rounded-full ${card.iconColor} text-white opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:animate-bounce`}>
                <span className="text-sm font-bold">→</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ParentDashboardCards;
