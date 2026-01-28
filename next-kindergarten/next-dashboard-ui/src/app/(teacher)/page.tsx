"use client";

import TeacherTopBar from "@/app/components/TeacherTopBar";
import TeacherDashboardStats from "@/app/components/TeacherDashboardStats";
import TeacherUpcomingClasses from "@/app/components/TeacherUpcomingClasses";
import TeacherRecentActivity from "@/app/components/TeacherRecentActivity";
import BigCalendar from "@/app/components/BigCalender";

function TeacherPage() {
  return (
    <>
      {/* Top Bar */}
      <TeacherTopBar />

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Welcome Back, Teacher! 👋
            </h1>
            <p className="text-slate-600 mt-2 text-lg">
              Here&apos;s what&apos;s happening in your classes today
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mb-8">
            <TeacherDashboardStats />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Calendar & Classes */}
            <div className="lg:col-span-2 space-y-8">
              {/* Upcoming Classes */}
              <TeacherUpcomingClasses />

              {/* Calendar */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  📅 Schedule
                </h2>
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-4">
                  <BigCalendar />
                </div>
              </div>
            </div>

            {/* Right Column - Activity */}
            <div className="lg:col-span-1">
              <TeacherRecentActivity />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default TeacherPage;
