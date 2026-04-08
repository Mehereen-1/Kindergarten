"use client";

import AttendanceReportsPanel from "@/app/components/AttendanceReportsPanel";

export default function AdminAttendanceReportsPage() {
  return (
    <AttendanceReportsPanel
      title="Admin Attendance Excel Reports"
      subtitle="Generate and download attendance sheets across classes."
    />
  );
}
