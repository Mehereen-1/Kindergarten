'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ResultCardAssessmentEditor from '@/app/components/results/ResultCardAssessmentEditor';

function TeacherResultAssessmentsPageContent() {
  const searchParams = useSearchParams();
  const examCycleId = searchParams.get('examCycleId') || '';
  const classId = searchParams.get('classId') || '';
  const className = searchParams.get('className') || 'Class';
  const examName = searchParams.get('examName') || 'Exam';

  if (!examCycleId || !classId) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Exam cycle and class are required to open the report-card assessment editor.
        </div>
        <Link href="/teacher/results" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
          Back to Results
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <Link href="/teacher/results" className="text-sm font-medium text-blue-600 hover:underline">
          Back to Results
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-bold text-slate-900">Teacher Report Card Assessments</h1>
        <p className="mt-1 text-sm text-slate-500">
          {examName} | {className}. This section is for class-teacher values that appear on the final result card.
        </p>
      </div>

      <ResultCardAssessmentEditor
        examCycleId={examCycleId}
        classOptions={[{ _id: classId, name: className }]}
        initialClassId={classId}
        apiPath="/api/teacher/result-card-assessments"
        title="Teacher Co-Scholastic and Discipline Entry"
        description="The class teacher can fill the final report-card assessment values from here."
      />
    </div>
  );
}

export default function TeacherResultAssessmentsPage() {
  return (
    <Suspense fallback={<div className="p-6 max-w-6xl mx-auto text-slate-500">Loading assessment editor...</div>}>
      <TeacherResultAssessmentsPageContent />
    </Suspense>
  );
}
