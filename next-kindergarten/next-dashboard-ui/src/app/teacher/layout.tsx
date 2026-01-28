"use client";

import TeacherSidebar from "@/app/components/TeacherSidebar";
import MobileTeacherSidebar from "@/app/components/MobileTeacherSidebar";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block md:w-64 lg:w-72 bg-white border-r border-slate-200">
        <TeacherSidebar />
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <MobileTeacherSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
