'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import ResultCardView from '@/app/components/results/ResultCardView';

export default function ParentReportCardPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId') || '';
  const examCycleId = searchParams.get('examCycleId') || '';

  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCard = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(
          `/api/parent/results/card?studentId=${studentId}&examCycleId=${examCycleId}`
        );
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
  }, [studentId, examCycleId]);

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
