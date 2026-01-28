"use client";

const ParentMessagesCard = () => {
  const messages = [
    {
      from: "Mrs. Sharma",
      role: "Class Teacher",
      message: "Arjun did great in today's activity! Keep supporting at home.",
      time: "10 mins ago",
      avatar: "👩‍🏫",
      unread: true,
      color: "from-blue-500 to-cyan-500",
    },
    {
      from: "School Admin",
      role: "School",
      message: "Please pay the monthly fees by 28th of this month",
      time: "2 hours ago",
      avatar: "🏫",
      unread: true,
      color: "from-purple-500 to-pink-500",
    },
    {
      from: "Mrs. Sharma",
      role: "Class Teacher",
      message: "Reminder: Please send the project report by Friday",
      time: "1 day ago",
      avatar: "👩‍🏫",
      unread: false,
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 h-full flex flex-col animate-in fade-in slide-in-from-right-5 duration-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse"></div>

        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white drop-shadow-lg flex items-center gap-3">
            <span className="text-3xl">💬</span>
            <span>Messages</span>
          </h2>
          <p className="text-purple-100 text-xs mt-2 font-bold">Latest communication</p>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto divide-y-2 divide-blue-100">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-4 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 group/msg cursor-pointer border-l-4 border-transparent animate-in fade-in slide-in-from-right-5 duration-700 ${
              msg.unread ? "bg-blue-50/50" : ""
            }`}
            style={{ animationDelay: `${idx * 100}ms` }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderLeftColor = "#818CF8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent";
            }}
          >
            <div className="flex gap-3">
              {/* Avatar */}
              <div className={`text-2xl p-2.5 rounded-xl bg-gradient-to-br ${msg.color} shadow-md group-hover/msg:scale-110 transition-transform flex-shrink-0`}>
                {msg.avatar}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{msg.from}</h4>
                    <p className="text-xs text-slate-500">{msg.role}</p>
                  </div>
                  {msg.unread && (
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse shadow-lg"></div>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{msg.message}</p>
                <p className="text-xs text-slate-400 mt-2 font-semibold">{msg.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t-2 border-blue-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <button className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold text-sm hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg hover:shadow-xl hover:scale-105 duration-300">
          View All Messages
        </button>
      </div>
    </div>
  );
};

export default ParentMessagesCard;
