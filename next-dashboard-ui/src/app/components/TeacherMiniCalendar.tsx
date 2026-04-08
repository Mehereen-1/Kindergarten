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
  const days: Array<number | null> = [];

  // Add empty cells for days before month starts (adjust for Monday start)
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < adjustedFirstDay; i++) {
    days.push(null);
  }

  // Add days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const isToday = (day: number | null) => {
    if (day === null) return false;
    const today = new Date();
    return day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
  };

  const isWeekend = (index: number) => {
    return (index + 1) % 7 === 0 || (index + 1) % 7 === 6;
  };

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
              { title: "Class Meeting", time: "10:00 AM - 11:00 AM", icon: "groups" },
              { title: "Parent Conference", time: "2:00 PM - 3:00 PM", icon: "forum" },
              { title: "Exam Preparation", time: "3:30 PM - 4:30 PM", icon: "school" },
            ].map((event, idx) => (
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