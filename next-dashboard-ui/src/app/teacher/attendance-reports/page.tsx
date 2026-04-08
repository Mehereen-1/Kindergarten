"use client";

import TeacherTopBar from "@/app/components/TeacherTopBar";
import AttendanceReportsPanel from "@/app/components/AttendanceReportsPanel";

export default function TeacherAttendanceReportsPage() {
  return (
    <>
      <TeacherTopBar />
      <AttendanceReportsPanel
        title="Attendance Excel Reports"
        subtitle="Generate and download daily/monthly attendance sheets for your classes."
      />
    </>
  );
}
