"use client";

import ParentTopBar from "@/app/components/ParentTopBar";
import ParentAttendanceCard from "@/app/components/ParentAttendanceCard";

export default function ParentAttendancePage() {
  return (
    <>
      <ParentTopBar />
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="p-6 lg:p-10">
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Parent Portal</p>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900">Attendance Overview</h1>
            <p className="text-slate-600 text-base font-medium mt-2">
              View monthly attendance records for your child.
            </p>
          </div>

          <ParentAttendanceCard />
        </div>
      </main>
    </>
  );
}
