"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const TeacherMiniCalendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    Promise.all([
      fetch(`/api/teacher/events`).then(r => r.ok ? r.json() : []),
      fetch(`/api/teacher/timetable?teacherId=${user.id}`).then(r => r.ok ? r.json() : { entries: [] })
    ]).then(([eventsData, timetableData]) => {
      const realEvents = (Array.isArray(eventsData) ? eventsData : []).filter((ev: any) => {
        const evDate = new Date(ev.startDate);
        return evDate >= monthStart && evDate <= monthEnd;
      });
      setEvents(realEvents);
      setTimetable(Array.isArray(timetableData.entries) ? timetableData.entries : []);
    });
  }, [user?.id, currentDate]);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days: Array<number | null> = [];
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < adjustedFirstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const isToday = (day: number | null) => {
    if (day === null) return false;
    const today = new Date();
    return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };
  const isWeekend = (index: number) => (index + 1) % 7 === 0 || (index + 1) % 7 === 6;
  // Mark days with events (from both events and timetable)
  const eventDays = new Set([
    ...events.map(ev => new Date(ev.startDate).getDate()),
    ...timetable
      .filter((entry: any) => {
        // entry.dayOfWeek matches this month
        const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const entryDay = days.indexOf(entry.dayOfWeek);
        // Find all dates in this month that match entryDay
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
          if (date.getDay() === entryDay) return true;
        }
        return false;
      })
      .flatMap((entry: any) => {
        const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const entryDay = days.indexOf(entry.dayOfWeek);
        const result: number[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
          if (date.getDay() === entryDay) result.push(d);
        }
        return result;
      })
  ]);

  return (
    <div className="bg-[#f8e999] rounded-[24px_48px_16px_40px] shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-right-5 duration-700"
      style={{
        border: "2px solid #5a4a3a",
        borderRadius: "24px 48px 16px 40px",
      }}
    >
      {/* Decorative botanical elements */}
      <div className="absolute -top-4 -right-4 w-24 h-24 text-[#705900] opacity-20 pointer-events-none">
        <span className="material-symbols-outlined text-8xl">eco</span>
      </div>

      {/* Header */}
      <div className="px-5 pt-5 pb-3 relative">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#352f00] drop-shadow-sm">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={previousMonth}
              className="w-7 h-7 rounded-full bg-[#fff7d6] hover:bg-[#edde84] text-[#352f00] transition-all hover:scale-110 flex items-center justify-center shadow-sm"
              style={{ border: "1px solid #5a4a3a/20" }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={nextMonth}
              className="w-7 h-7 rounded-full bg-[#fff7d6] hover:bg-[#edde84] text-[#352f00] transition-all hover:scale-110 flex items-center justify-center shadow-sm"
              style={{ border: "1px solid #5a4a3a/20" }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="px-5 pb-1">
        {/* Day headers - Monday to Sunday */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
            <div key={idx} className="text-center text-xs font-bold text-[#352f00]/50 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <button
              key={index}
              className={`
                relative aspect-square flex items-center justify-center rounded-lg text-xs font-semibold
                transition-all duration-300 group
                ${day === null ? "cursor-default" : "cursor-pointer"}
                ${isToday(day)
                  ? "bg-[#705900] text-white shadow-md rotate-3 scale-105 hover:scale-110"
                  : isWeekend(index) && day
                    ? "text-[#904800] hover:bg-[#fff7d6] font-bold"
                    : day
                      ? "text-[#352f00] hover:bg-[#fff7d6]"
                      : ""
                }
              `}
            >
              {day && (
                <span className="relative z-10 text-xs">{day}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Event indicators - Teacher's Note style */}
      <div className="p-5 mt-1">
        <div className="bg-[#fffcc2] p-5 rounded-lg shadow-sm relative"
          style={{
            border: "2px solid #5a4a3a",
            borderRadius: "16px 32px 12px 28px",
          }}
        >
          {/* Pin Decoration */}
          <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 w-8 h-8 bg-[#b02500] rounded-full shadow-md z-20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white/50 rounded-full mb-1 ml-1"></div>
          </div>

          <h4 className="font-accent text-xl text-[#352f00] mb-3 border-b border-[#352f00]/10 pb-2 text-center">
            Upcoming Events
          </h4>
          <div className="space-y-2">
            {[
              ...events.map((event: any) => ({
                title: event.title,
                time: `${new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                icon: "event",
              })),
              ...timetable
                .filter((entry: any) => {
                  // Only show upcoming for this month
                  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
                  const entryDay = days.indexOf(entry.dayOfWeek);
                  const today = new Date();
                  const thisMonth = currentDate.getMonth();
                  const thisYear = currentDate.getFullYear();
                  // Find next date in this month for this entry
                  for (let d = today.getDate(); d <= daysInMonth; d++) {
                    const date = new Date(thisYear, thisMonth, d);
                    if (date.getDay() === entryDay && date >= today) return true;
                  }
                  return false;
                })
                .map((entry: any) => {
                  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
                  const entryDay = days.indexOf(entry.dayOfWeek);
                  const thisMonth = currentDate.getMonth();
                  const thisYear = currentDate.getFullYear();
                  // Find next date in this month for this entry
                  let foundDate: Date | null = null;
                  for (let d = 1; d <= daysInMonth; d++) {
                    const date = new Date(thisYear, thisMonth, d);
                    if (date.getDay() === entryDay && date >= new Date()) {
                      foundDate = date;
                      break;
                    }
                  }
                  return {
                    title: entry.subjectId?.name || "Class",
                    time: foundDate ? `${foundDate.toLocaleDateString()} ${entry.startTime} - ${entry.endTime}` : `${entry.startTime} - ${entry.endTime}`,
                    icon: "school",
                  };
                })
            ].slice(0, 5).map((event, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#fff7d6]/50 transition-all group cursor-pointer animate-in fade-in slide-in-from-left-5 duration-500"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="w-7 h-7 bg-white blob-container flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className="material-symbols-outlined text-[#705900] text-base">{event.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#352f00] group-hover:text-[#904800] transition-colors">
                    {event.title}
                  </p>
                  <p className="text-xs text-[#352f00]/50 mt-0.5">{event.time}</p>
                </div>
                <span className="material-symbols-outlined text-[#352f00]/30 text-sm opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                  arrow_forward
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherMiniCalendar;