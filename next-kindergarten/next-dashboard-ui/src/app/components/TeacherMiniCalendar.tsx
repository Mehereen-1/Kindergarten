"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TeacherMiniCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 28)); // January 28, 2026

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
  };

  const isWeekend = (index: number) => {
    return (index + 1) % 7 === 0 || (index + 1) % 7 === 6;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-right-5 duration-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-5 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-8 -mb-8"></div>

        <div className="flex items-center justify-between relative z-10">
          <div>
            <h3 className="text-base font-bold text-white drop-shadow-lg">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
          </div>
          <div className="flex gap-1">
            <button
              onClick={previousMonth}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-110 backdrop-blur-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-110 backdrop-blur-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
            <div key={idx} className="text-center text-xs font-bold text-slate-600 py-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-0.5 mb-4">
          {days.map((day, index) => (
            <button
              key={index}
              className={`
                relative aspect-square flex items-center justify-center rounded text-xs font-semibold
                transition-all duration-300 group overflow-hidden
                ${day === null ? "cursor-default" : "cursor-pointer"}
                ${isToday(day)
                  ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg scale-105 hover:shadow-xl"
                  : isWeekend(index) && day
                    ? "text-red-500 hover:bg-red-50 font-bold"
                    : day
                      ? "text-slate-700 hover:bg-indigo-50"
                      : ""
                }
              `}
            >
              {/* Hover background */}
              <div className={`absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 rounded`}></div>

              {day && (
                <>
                  <span className="relative z-10 text-xs">{day}</span>
                  {/* Glow effect for today */}
                  {isToday(day) && (
                    <div className="absolute inset-0 rounded border border-white/50 animate-pulse"></div>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

        {/* Event indicators */}
        <div className="px-4 pb-4">
          <h4 className="text-sm font-bold text-slate-900 mb-3">Upcoming Events</h4>
          <div className="space-y-3">
            {[
              { title: "Class Meeting", time: "10:00 AM - 11:00 AM", color: "from-blue-500 to-cyan-500" },
              { title: "Parent Conference", time: "2:00 PM - 3:00 PM", color: "from-purple-500 to-pink-500" },
              { title: "Exam Preparation", time: "3:30 PM - 4:30 PM", color: "from-green-500 to-emerald-500" },
            ].map((event, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-gradient-to-r from-slate-50 to-white border-l-4 border-transparent hover:border-indigo-600 hover:bg-indigo-50 transition-all group cursor-pointer animate-in fade-in slide-in-from-left-5 duration-500 shadow-sm hover:shadow-md"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${event.color} float-left mr-2.5 mt-0.5 group-hover:scale-150 transition-transform shadow-md`}></div>
                <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                <p className="text-xs text-slate-500 mt-1.5">{event.time}</p>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
};

export default TeacherMiniCalendar;
