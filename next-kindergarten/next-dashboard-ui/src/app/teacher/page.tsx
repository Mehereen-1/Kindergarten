"use client";

import TeacherTopBar from "@/app/components/TeacherTopBar";
import TeacherDashboardStats from "@/app/components/TeacherDashboardStats";
import TeacherUpcomingClasses from "@/app/components/TeacherUpcomingClasses";
import TeacherRecentActivity from "@/app/components/TeacherRecentActivity";
import TeacherMiniCalendar from "@/app/components/TeacherMiniCalendar";
import BigCalendar from "@/app/components/BigCalender";

export default function TeacherPage() {
  return (
    <>
      {/* Top Bar */}
      <TeacherTopBar />

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="p-6 lg:p-10">
          {/* Premium header with split styling */}
          <div className="mb-12 animate-in fade-in slide-in-from-top-5 duration-700">
            <div className="space-y-3 mb-8">
              <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider">Welcome Back,</p>
              <h1 className="text-6xl lg:text-7xl font-black text-slate-900 leading-tight">
                Teacher! 👋
              </h1>
            </div>
            <p className="text-slate-600 text-lg font-medium max-w-2xl">
              Here&apos;s a complete overview of what&apos;s happening in your classes today
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mb-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <TeacherDashboardStats />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Column - Classes */}
            <div className="lg:col-span-2 space-y-8">
              {/* Upcoming Classes */}
              <TeacherUpcomingClasses />

              {/* Calendar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg hover:shadow-2xl transition-all duration-300 group animate-in fade-in slide-in-from-bottom-5 duration-700">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl bg-gradient-to-br from-blue-100 to-indigo-100 p-3 rounded-xl group-hover:scale-110 transition-transform">📅</div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Full Schedule
                    </h2>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200/50 shadow-inner">
                  <BigCalendar />
                </div>
              </div>
            </div>

            {/* Right Column - Mini Calendar & Activity */}
            <div className="lg:col-span-2 space-y-8">
              {/* Mini Calendar */}
              <TeacherMiniCalendar />

              {/* Activity */}
              <TeacherRecentActivity />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
