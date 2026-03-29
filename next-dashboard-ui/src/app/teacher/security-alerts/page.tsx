import SecurityAlertsWorkspace from '@/app/components/SecurityAlertsWorkspace';
import TeacherTopBar from '@/app/components/TeacherTopBar';

export default function TeacherSecurityAlertsPage() {
  return (
    <>
      <TeacherTopBar />
      <main className="flex-1 overflow-y-auto bg-white">
        <SecurityAlertsWorkspace role="teacher" />
      </main>
    </>
  );
}