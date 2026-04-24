import AnomalyModelTester from '@/app/components/AnomalyModelTester';
import TeacherTopBar from '@/app/components/TeacherTopBar';

export default function TeacherAnomalyModelTesterPage() {
  return (
    <>
      <TeacherTopBar />
      <main className="flex-1 overflow-y-auto bg-slate-100">
        <AnomalyModelTester />
      </main>
    </>
  );
}
