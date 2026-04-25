"use client";

import { useEffect, useMemo, useState } from "react";
import TeacherTopBar from "@/app/components/TeacherTopBar";
import TeacherDashboardStats from "@/app/components/TeacherDashboardStats";
import TeacherUpcomingClasses from "@/app/components/TeacherUpcomingClasses";
import TeacherRecentActivity from "@/app/components/TeacherRecentActivity";
import TeacherMiniCalendar from "@/app/components/TeacherMiniCalendar";
import BigCalendar from "@/app/components/BigCalender";
import { useAuth } from "@/hooks/useAuth";

interface TeacherClassSummary {
  _id: string;
  name: string;
  classId?: string;
  studentCount: number;
}

interface TeacherEvent {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  allDay?: boolean;
}

export default function TeacherPage() {
  const { user, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState<TeacherClassSummary[]>([]);
  const [events, setEvents] = useState<TeacherEvent[]>([]);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [timetable, setTimetable] = useState<any[]>([]);

  const currentYear = String(new Date().getFullYear());

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) return;
      try {
        const [classesResponse, eventsResponse, timetableResponse] = await Promise.all([
          fetch(`/api/teacher/classes?teacherId=${encodeURIComponent(user.id)}&academicYear=${encodeURIComponent(currentYear)}`, { cache: "no-store" }),
          fetch("/api/teacher/events", { cache: "no-store" }),
          fetch(`/api/teacher/timetable?teacherId=${encodeURIComponent(user.id)}&academicYear=${encodeURIComponent(currentYear)}`, { cache: "no-store" })
        ]);
        const classesData = classesResponse.ok ? await classesResponse.json() : [];
        const classList = Array.isArray(classesData) ? classesData : [];
        setClasses(classList);
        const eventsData = eventsResponse.ok ? await eventsResponse.json() : [];
        const teacherEvents = Array.isArray(eventsData) ? eventsData : [];
        setEvents(teacherEvents);
        const timetableData = timetableResponse.ok ? await timetableResponse.json() : { entries: [] };
        setTimetable(Array.isArray(timetableData.entries) ? timetableData.entries : []);

        if (!classList.length) {
          setAttendanceRate(0);
          return;
        }
        const classIds = classList.map((classDoc: TeacherClassSummary) => classDoc._id).filter(Boolean);
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        const attendanceResponse = await fetch(
          `/api/teacher/attendance?classIds=${encodeURIComponent(classIds.join(","))}&from=${encodeURIComponent(monthStart.toISOString())}&to=${encodeURIComponent(monthEnd.toISOString())}`,
          { cache: "no-store" }
        );
        const attendanceData = attendanceResponse.ok ? await attendanceResponse.json() : [];
        const attendanceRecords = Array.isArray(attendanceData) ? attendanceData : [];
        if (!attendanceRecords.length) {
          setAttendanceRate(0);
          return;
        }
        const presentLikeCount = attendanceRecords.filter(
          (record: { status?: string }) => record.status === "present" || record.status === "late"
        ).length;
        setAttendanceRate(Math.round((presentLikeCount / attendanceRecords.length) * 100));
      } catch {
        setClasses([]);
        setEvents([]);
        setAttendanceRate(0);
        setTimetable([]);
      }
    };
    if (!authLoading) {
      loadDashboardData();
    }
  }, [user?.id, authLoading, currentYear]);

  const todayRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }, []);

  // Merge today's timetable and events for a complete schedule
  const todayEvents = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    // Timetable entries for today
    const timetableToday = timetable.filter((entry: any) => {
      // entry.dayOfWeek matches today
      const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      return days[today.getDay()] === entry.dayOfWeek;
    }).map((entry: any) => ({
      _id: entry._id,
      title: entry.subjectId?.name || "Class",
      description: entry.classId?.name ? `Class: ${entry.classId.name}` : "",
      startDate: `${todayStr}T${entry.startTime}`,
      endDate: `${todayStr}T${entry.endTime}`,
      location: entry.room || "Campus",
      allDay: false,
      isTimetable: true,
    }));
    // Events for today
    const eventsToday = events.filter((event) => {
      const start = new Date(event.startDate);
      return start >= todayRange.start && start < todayRange.end;
    });
    // Merge and sort
    return [...timetableToday, ...eventsToday].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [events, timetable, todayRange]);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

  const upcomingSchedule = useMemo(() => {
    const now = new Date();

    return todayEvents.map((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const relatedClass = classes.find((classDoc) => event.title.toLowerCase().includes(classDoc.name.toLowerCase()));

      let status: "active" | "upcoming" | "later" = "later";
      if (start <= now && end >= now) status = "active";
      else if (start > now) status = "upcoming";

      return {
        id: event._id,
        className: relatedClass?.name || event.title,
        subject: relatedClass?.classId || "Event",
        time: `${formatter.format(start)} - ${formatter.format(end)}`,
        room: event.location || "Campus",
        students: relatedClass?.studentCount,
        status,
        attendanceHref: relatedClass
          ? `/teacher/attendance?classId=${encodeURIComponent(relatedClass._id)}&academicYear=${encodeURIComponent(currentYear)}`
          : "/teacher/attendance",
      };
    });
  }, [todayEvents, classes, formatter, currentYear]);

  const nextClassSubtitle = useMemo(() => {
    const now = new Date();
    const nextEvent = todayEvents.find((event) => new Date(event.startDate) > now);
    if (!nextEvent) return "No class scheduled";

    return `Next: ${formatter.format(new Date(nextEvent.startDate))}`;
  }, [todayEvents, formatter]);

  // Combine timetable and events for the calendar
  const calendarEvents = useMemo(() => {
    // Timetable entries for all days in the academic year
    const timetableEvents: any[] = [];
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    // For each timetable entry, create events for each matching day in the current month
    timetable.forEach((entry: any) => {
      const entryDay = days.indexOf(entry.dayOfWeek);
      for (let d = 1; d <= 31; d++) {
        const date = new Date(year, month, d);
        if (date.getMonth() !== month) break;
        if (date.getDay() === entryDay) {
          timetableEvents.push({
            title: entry.subjectId?.name || "Class",
            start: new Date(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}T${entry.startTime}`),
            end: new Date(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}T${entry.endTime}`),
            allDay: false,
          });
        }
      }
    });
    // Add real events
    const realEvents = events
      .filter((event) => event.startDate && event.endDate)
      .map((event) => ({
        title: event.title,
        allDay: Boolean(event.allDay),
        start: new Date(event.startDate),
        end: new Date(event.endDate),
      }));
    return [...timetableEvents, ...realEvents];
  }, [events, timetable]);

  return (
    <>
      {/* Top Bar */}
      <TeacherTopBar />

      {/* Page Content */}
      <main className="flex-1 bg-[#fff7d6]">
        <div className="p-5 lg:p-10 space-y-10">
          {/* Premium header with storybook styling */}
          <section>
            <div className="flex items-end gap-3 mb-1">
              <h2 className="text-4xl lg:text-[2.75rem] font-black text-[#352f00] tracking-tight">Welcome Back, Teacher!</h2>
              <span className="material-symbols-outlined text-[#904800] text-3xl pb-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                celebration
              </span>
            </div>
            <p className="font-accent text-2xl text-[#904800] rotate-[-1deg] inline-block ml-1">
              Today is a beautiful day for learning!
            </p>
          </section>

          {/* Stats Grid */}
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
            <TeacherDashboardStats
              totalClasses={classes.length}
              attendanceRate={attendanceRate}
              todayClasses={todayEvents.length}
              attendanceSubtitle="This Month"
              nextClassSubtitle={nextClassSubtitle}
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* Left Column - Classes & Calendar */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upcoming Classes */}
              <TeacherUpcomingClasses upcomingClasses={upcomingSchedule} />

              {/* Calendar - Storybook style */}
              <div className="bg-[#f8e999] p-6 rounded-[24px_48px_16px_40px] shadow-sm relative overflow-hidden group animate-in fade-in slide-in-from-bottom-5 duration-700">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white blob-container flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[#705900] text-xl">calendar_month</span>
                    </div>
                    <h2 className="text-2xl font-black text-[#352f00]">
                      Full Schedule
                    </h2>
                  </div>
                </div>
                <div className="bg-[#fff7d6] rounded-[32px_12px_24px_40px] p-5 border-2 border-[#705900]/20 shadow-inner">
                  <BigCalendar events={calendarEvents} />
                </div>
              </div>
            </div>

            {/* Right Column - Mini Calendar & Activity */}
            <div className="space-y-6">
              {/* Mini Calendar */}
              <TeacherMiniCalendar />

              {/* Activity */}
              <TeacherRecentActivity />
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&family=Be+Vietnam+Pro:wght@400;500;600&family=Caveat:wght@400;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        
        .font-headline {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        
        .font-accent {
          font-family: 'Caveat', cursive;
        }
        
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          vertical-align: middle;
        }
        
        .sketched-border {
          border: 2px solid #5a4a3a;
          border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
        }
        
        .blob-container {
          border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
        }
        
        .animate-in {
          animation-duration: 0.7s;
          animation-fill-mode: both;
        }
        
        .fade-in {
          animation-name: fadeIn;
        }
        
        .slide-in-from-top-5 {
          animation-name: slideInFromTop;
        }
        
        .slide-in-from-bottom-5 {
          animation-name: slideInFromBottom;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}