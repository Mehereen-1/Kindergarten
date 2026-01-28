"use client";

const ParentNoticesCard = () => {
  const notices = [
    {
      title: "School Holiday",
      description: "School will be closed on Feb 26 for Foundation Day",
      date: "2 days ago",
      type: "holiday",
      icon: "🏫",
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Annual Sports Day",
      description: "Mark your calendars! Sports day is scheduled for March 15",
      date: "1 week ago",
      type: "event",
      icon: "🏅",
      color: "from-yellow-500 to-orange-500",
    },
    {
      title: "PTM Schedule",
      description: "Parent-Teacher meeting scheduled for February 5-7",
      date: "2 weeks ago",
      type: "important",
      icon: "👨‍👩‍👧",
      color: "from-pink-500 to-rose-500",
    },
  ];

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
        {notices.map((notice, idx) => (
          <div
            key={idx}
            className="p-6 hover:bg-gradient-to-r hover:from-orange-50 hover:to-peach-50 transition-all duration-300 group/notice cursor-pointer border-l-4 border-transparent animate-in fade-in slide-in-from-right-5 duration-700"
            style={{ animationDelay: `${idx * 100}ms` }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderLeftColor = notice.color.split(' ')[1] === 'to-cyan-500' ? '#06B6D4' : notice.color.split(' ')[1] === 'to-orange-500' ? '#F97316' : '#EC4899';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent';
            }}
          >
            <div className="flex gap-4">
              {/* Icon */}
              <div className={`text-4xl p-3 rounded-2xl bg-gradient-to-br ${notice.color} shadow-lg group-hover/notice:scale-125 group-hover/notice:rotate-12 transition-all duration-300 flex-shrink-0`}>
                {notice.icon}
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
                  {notice.date}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex items-center pt-2">
                <div className={`p-2.5 rounded-full bg-gradient-to-r ${notice.color} opacity-0 group-hover/notice:opacity-100 transition-all duration-300 shadow-lg`}>
                  <span className="text-white font-bold">→</span>
                </div>
              </div>
            </div>
          </div>
        ))}
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
