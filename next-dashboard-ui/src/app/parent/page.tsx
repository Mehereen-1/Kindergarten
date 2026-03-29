"use client";

import ParentTopBar from "@/app/components/ParentTopBar";
import ParentDashboardCards from "@/app/components/ParentDashboardCards";
import ParentChildCard from "@/app/components/ParentChildCard";
import ParentAttendanceCard from "@/app/components/ParentAttendanceCard";
import ParentNoticesCard from "@/app/components/ParentNoticesCard";
import ParentMessagesCard from "@/app/components/ParentMessagesCard";

export default function ParentDashboard() {
  return (
    <>
      {/* Top Bar */}
      <ParentTopBar />

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="p-6 lg:p-10">
          {/* Premium header */}
          <div className="mb-12 animate-in fade-in slide-in-from-top-5 duration-700">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Welcome Back,</p>
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 leading-tight">
              Parent Portal 💝
            </h1>
            <p className="text-slate-600 text-lg font-medium max-w-2xl mt-3">
              Stay connected with your child&apos;s school journey
            </p>
          </div>

          {/* Child Card */}
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <ParentChildCard />
          </div>

          {/* Key Stats */}
          <div className="mb-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <ParentDashboardCards />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Attendance */}
              <ParentAttendanceCard />

              {/* Notices */}
              <ParentNoticesCard />
            </div>

            {/* Right Column */}
            <div className="lg:col-span-1 space-y-8">
              {/* Messages */}
              <ParentMessagesCard />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
