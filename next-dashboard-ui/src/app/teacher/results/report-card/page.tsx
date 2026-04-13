'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import ResultCardView from '@/app/components/results/ResultCardView';

function TeacherReportCardPageContent() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId') || '';
  const examCycleId = searchParams.get('examCycleId') || '';
  const batchId = searchParams.get('batchId') || '';

  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCard = async () => {
      try {
        setLoading(true);
        setError('');
        const url = new URL('/api/teacher/results/card', window.location.origin);
        url.searchParams.set('studentId', studentId);
        url.searchParams.set('examCycleId', examCycleId);
        if (batchId) {
          url.searchParams.set('batchId', batchId);
        }

        const response = await axios.get(url.pathname + url.search);
        if (response.data.success) {
          setCardData(response.data.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load report card');
      } finally {
        setLoading(false);
      }
    };

    if (!studentId || !examCycleId) {
      setError('Missing student or exam information');
      setLoading(false);
      return;
    }

    loadCard();
  }, [studentId, examCycleId, batchId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading report card...</div>;
  }

  if (error || !cardData) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error || 'Report card not found'}
        </div>
      </div>
    );
  }

  return <ResultCardView data={cardData} onPrint={() => window.print()} />;
}

export default function TeacherReportCardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading report card...</div>}>
      <TeacherReportCardPageContent />
    </Suspense>
  );
}
