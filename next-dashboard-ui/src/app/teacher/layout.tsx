"use client";

import TeacherSidebar from "@/app/components/TeacherSidebar";
import MobileTeacherSidebar from "@/app/components/MobileTeacherSidebar";
import NotificationStatusIndicator from "@/app/components/NotificationStatusIndicator";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-80 shrink-0">
        <TeacherSidebar />
      </div>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <MobileTeacherSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* <NotificationStatusIndicator /> */}
        {children}
      </div>
    </div>
  );
}
