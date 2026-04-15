import EventSection from "@/app/components/EventSection";
import TeacherTopBar from '@/app/components/TeacherTopBar';

export default function TeacherEventsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherTopBar />
      <EventSection role="teacher" canManage={true} title="Teacher Events" />
    </div>
  );
}
