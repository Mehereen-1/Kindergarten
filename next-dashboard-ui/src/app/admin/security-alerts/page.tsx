import SecurityAlertsWorkspace from '@/app/components/SecurityAlertsWorkspace';

export default function AdminSecurityAlertsPage() {
  return (
    <main className="flex-1 overflow-y-auto bg-white">
      <SecurityAlertsWorkspace role="admin" />
    </main>
  );
}
