"use client";

const ParentAttendanceCard = () => {
  const days = [
    { date: "1", status: "present", day: "Mon" },
    { date: "2", status: "present", day: "Tue" },
    { date: "3", status: "present", day: "Wed" },
    { date: "4", status: "absent", day: "Thu" },
    { date: "5", status: "present", day: "Fri" },
    { date: "6", status: "present", day: "Sat" },
    { date: "7", status: "present", day: "Sun" },
    { date: "8", status: "present", day: "Mon" },
    { date: "9", status: "present", day: "Tue" },
    { date: "10", status: "absent", day: "Wed" },
    { date: "11", status: "present", day: "Thu" },
    { date: "12", status: "present", day: "Fri" },
    { date: "13", status: "present", day: "Sat" },
    { date: "14", status: "present", day: "Sun" },
  ];

  const presentCount = days.filter(d => d.status === "present").length;
  const absentCount = days.filter(d => d.status === "absent").length;

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 group animate-in fade-in slide-in-from-left-5 duration-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-8 py-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>

        <div className="relative z-10">
          <h2 className="text-3xl font-black text-white drop-shadow-lg flex items-center gap-3">
            <span className="text-4xl">📅</span>
            This Month&apos;s Attendance
          </h2>
          <p className="text-blue-100 text-sm mt-2 font-bold">Keep track of attendance</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 px-8 py-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-100">
        <div className="text-center p-3 rounded-lg bg-white/50 border border-blue-100 hover:border-green-300 transition-all">
          <p className="text-3xl font-black text-green-600 drop-shadow-sm">{presentCount}</p>
          <p className="text-xs font-bold text-slate-600 mt-1 uppercase">Present</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/50 border border-blue-100 hover:border-red-300 transition-all">
          <p className="text-3xl font-black text-red-600 drop-shadow-sm">{absentCount}</p>
          <p className="text-xs font-bold text-slate-600 mt-1 uppercase">Absent</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/50 border border-blue-100 hover:border-blue-300 transition-all">
          <p className="text-3xl font-black text-blue-600 drop-shadow-sm">{Math.round((presentCount / days.length) * 100)}%</p>
          <p className="text-xs font-bold text-slate-600 mt-1 uppercase">Rate</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="p-8">
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => (
            <div key={idx} className="text-center animate-in fade-in zoom-in duration-500" style={{ animationDelay: `${idx * 30}ms` }}>
              <p className="text-xs font-bold text-slate-500 mb-2">{day.day}</p>
              <button
                className={`w-full aspect-square rounded-lg font-bold text-sm transition-all duration-300 shadow-md hover:scale-110 ${
                  day.status === "present"
                    ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-400/50"
                    : "bg-gradient-to-br from-red-400 to-rose-500 text-white hover:shadow-lg hover:shadow-red-400/50"
                }`}
              >
                {day.date}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParentAttendanceCard;
