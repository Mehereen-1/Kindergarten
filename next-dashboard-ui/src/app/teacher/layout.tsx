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
    <div className="teacher-theme flex h-screen bg-[#f8f5ee]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-80 shrink-0">
        <TeacherSidebar />
      </div>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <MobileTeacherSidebar />
      </div>

      {/* Main Content */}
      <div className="teacher-main-surface flex-1 min-w-0 flex flex-col overflow-y-auto bg-[#f8f5ee]">
        {/* <NotificationStatusIndicator /> */}
        {children}
      </div>
    </div>
  );
}
