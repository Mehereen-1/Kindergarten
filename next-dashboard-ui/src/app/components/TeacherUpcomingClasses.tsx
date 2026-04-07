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
      bgColor: "bg-[#f2f2e8]",
      lightBg: "bg-[#705900]/10",
      textColor: "text-[#352f00]",
      buttonColor: "bg-[#705900] hover:bg-[#5a4a00]",
      dotColor: "bg-[#705900]",
      accentColor: "#705900",
      iconElement: "school",
    },
    {
      id: 2,
      class: "KG-B",
      subject: "Mathematics",
      time: "11:30 AM - 12:15 PM",
      room: "Room 102",
      students: 26,
      bgColor: "bg-[#f4f7f2]",
      lightBg: "bg-[#466337]/10",
      textColor: "text-[#352f00]",
      buttonColor: "bg-[#466337] hover:bg-[#3a552b]",
      dotColor: "bg-[#466337]",
      accentColor: "#466337",
      iconElement: "calculate",
    },
    {
      id: 3,
      class: "Nursery",
      subject: "Science",
      time: "1:00 PM - 1:45 PM",
      room: "Lab",
      students: 24,
      bgColor: "bg-[#fff9f4]",
      lightBg: "bg-[#904800]/10",
      textColor: "text-[#352f00]",
      buttonColor: "bg-[#904800] hover:bg-[#7a3d00]",
      dotColor: "bg-[#904800]",
      accentColor: "#904800",
      iconElement: "science",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-2xl font-black text-[#352f00] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#705900]">schedule</span>
          Today's Schedule
        </h3>
        <button className="text-[#904800] font-bold hover:underline flex items-center gap-1">
          View Calendar <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </div>

      <div className="space-y-4">
        {upcomingClasses.map((cls, idx) => (
          <div
            key={cls.id}
            className="flex gap-5 group animate-in fade-in slide-in-from-right-5 duration-700"
            style={{ animationDelay: `${idx * 100 + 200}ms` }}
          >
            {/* Time column with vertical line */}
            <div className="flex flex-col items-center pt-2">
              <span className="text-xs font-black text-[#705900]">
                {cls.time.split(" - ")[0]}
              </span>
              <div className="w-0.5 h-full bg-[#705900]/20 mt-2 group-last:hidden"></div>
            </div>

            {/* Class card with organic shape */}
            <div className={`flex-1 ${cls.bgColor} p-5 rounded-[32px_12px_24px_40px] hover:bg-opacity-80 transition-colors relative`}
              style={{
                border: "2px solid #5a4a3a",
                borderRadius: "32px 12px 24px 40px",
              }}
            >
              {/* Decorative icon in corner */}
              <div className="absolute -right-2 top-4 w-7 h-7 text-[#705900] opacity-20">
                <span className="material-symbols-outlined text-2xl">{cls.iconElement}</span>
              </div>

              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h4 className="text-lg font-bold text-[#352f00]">{cls.class}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${cls.lightBg} ${cls.textColor} border border-current/20`}>
                      {cls.subject}
                    </span>
                  </div>
                  
                  {/* Details */}
                  <div className="flex flex-wrap gap-4 text-sm mt-3">
                    <div className="flex items-center gap-2 text-[#352f00]/60">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{cls.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#352f00]/60">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">{cls.room}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#352f00]/60">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">{cls.students} students</span>
                    </div>
                  </div>
                </div>

                {/* Status and button */}
                <div className="flex flex-col items-end gap-3">
                  {idx === 0 && (
                    <span className="px-3 py-1 bg-[#705900]/10 text-[#705900] rounded-full text-xs font-bold uppercase tracking-widest">
                      Active Now
                    </span>
                  )}
                  {idx === 1 && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#904800] rounded-full"></span>
                      <span className="text-xs font-bold text-[#904800]">Upcoming</span>
                    </div>
                  )}
                  
                  <button
                    className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 transition-all text-white shadow-md hover:shadow-lg hover:scale-105 group-hover:gap-3 ${cls.buttonColor}`}
                  >
                    <Play className="w-4 h-4" />
                    Start Class
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherUpcomingClasses;