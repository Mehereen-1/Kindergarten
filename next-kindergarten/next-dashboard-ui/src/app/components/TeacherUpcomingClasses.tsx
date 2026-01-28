import { Clock, MapPin, Users, Play } from "lucide-react";

const TeacherUpcomingClasses = () => {
  const upcomingClasses = [
    {
      id: 1,
      class: "KG-A",
      subject: "English",
      time: "10:30 AM - 11:15 AM",
      room: "Room 101",
      students: 28,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      lightBg: "bg-blue-100",
      textColor: "text-blue-600",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
      dotColor: "bg-blue-600",
    },
    {
      id: 2,
      class: "KG-B",
      subject: "Mathematics",
      time: "11:30 AM - 12:15 PM",
      room: "Room 102",
      students: 26,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      lightBg: "bg-green-100",
      textColor: "text-green-600",
      buttonColor: "bg-green-600 hover:bg-green-700",
      dotColor: "bg-green-600",
    },
    {
      id: 3,
      class: "Nursery",
      subject: "Science",
      time: "1:00 PM - 1:45 PM",
      room: "Lab",
      students: 24,
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      lightBg: "bg-purple-100",
      textColor: "text-purple-600",
      buttonColor: "bg-purple-600 hover:bg-purple-700",
      dotColor: "bg-purple-600",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md hover:shadow-lg transition-all duration-500 group animate-in fade-in slide-in-from-left-5 duration-700">
      {/* Clean header */}
      <div className="bg-indigo-600 px-8 py-8 relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-4xl">📚</span>
              <span>Today&apos;s Schedule</span>
            </h2>
            <p className="text-indigo-100 text-sm mt-2 font-medium">Manage your classes efficiently</p>
          </div>
          <a
            href="#"
            className="text-white bg-white/20 hover:bg-white/30 text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105"
          >
            View All
          </a>
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        {upcomingClasses.map((cls, idx) => (
          <div
            key={cls.id}
            className="p-6 hover:bg-slate-50 transition-all duration-300 group/item cursor-pointer border-l-4 border-transparent hover:border-l-4 animate-in fade-in slide-in-from-right-5 duration-700"
            style={{ 
              animationDelay: `${idx * 100 + 200}ms`,
              borderLeftColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              const colors: Record<string, string> = {
                'KG-A': '#2563eb',
                'KG-B': '#16a34a', 
                'Nursery': '#9333ea'
              };
              const color = colors[cls.class] || '#2563eb';
              (e.currentTarget as HTMLElement).style.borderLeftColor = color;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent';
            }}
          >
            <div className="flex items-start gap-4">
              {/* Left accent with dot */}
              <div className="flex flex-col items-center gap-3 pt-1">
                <div className={`w-5 h-5 rounded-full ${cls.dotColor} shadow-md group-hover/item:ring-4 group-hover/item:ring-offset-2 group-hover/item:ring-offset-white transition-all group-hover/item:scale-125 group-hover/item:shadow-lg animate-pulse`}></div>
              </div>

              {/* Main content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-lg ${cls.textColor}`}>
                      {cls.class}
                    </h3>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${cls.lightBg} ${cls.textColor} border border-current/20`}>
                      {cls.subject}
                    </span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-600">{cls.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-600">{cls.room}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-600">{cls.students}</span>
                  </div>
                </div>

                {/* Clean button */}
                <button
                  className={`px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all text-white shadow-md hover:shadow-lg hover:scale-105 group-hover/item:gap-3 ${cls.buttonColor}`}
                >
                  <Play className="w-4 h-4" />
                  Start Class
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherUpcomingClasses;
