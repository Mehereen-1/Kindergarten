'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';

interface ChildRecord {
  _id: string;
  name: string;
  rollNo?: string | null;
  currentClass?: {
    _id?: string;
    name?: string;
    classId?: string;
    grade?: string;
  } | null;
}

interface ResultSummary {
  _id: string;
  examCycleId: {
    _id: string;
    examName: string;
    academicYear: string;
    termName: string;
    publishDate: string;
  };
  totalObtained: number;
  totalFullMarks: number;
  percentage: number;
  gpa?: number;
  overallGrade?: string;
  classRank?: number;
  classTotal?: number;
  publishedAt: string;
}

export default function ParentResultsPage() {
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadChildren = async () => {
      if (!user?.id) {
        setLoadingChildren(false);
        return;
      }

      try {
        setLoadingChildren(true);
        setError('');
        const response = await axios.get(`/api/parent/children?parentId=${user.id}`);
        const nextChildren = Array.isArray(response.data?.children) ? response.data.children : [];
        setChildren(nextChildren);

        if (nextChildren.length > 0) {
          setSelectedStudentId((current) =>
            current && nextChildren.some((child: ChildRecord) => child._id === current)
              ? current
              : nextChildren[0]._id
          );
        } else {
          setSelectedStudentId('');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load children');
      } finally {
        setLoadingChildren(false);
      }
    };

    loadChildren();
  }, [user?.id]);

  useEffect(() => {
    const loadResults = async () => {
      if (!selectedStudentId) {
        setResults([]);
        return;
      }

      try {
        setLoadingResults(true);
        setError('');
        const response = await axios.get(`/api/parent/results?studentId=${selectedStudentId}`);
        if (response.data.success) {
          setResults(Array.isArray(response.data.data) ? response.data.data : []);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load published results');
      } finally {
        setLoadingResults(false);
      }
    };

    loadResults();
  }, [selectedStudentId]);

  const selectedChild =
    children.find((child) => child._id === selectedStudentId) || children[0] || null;

  if (authLoading || loadingChildren) {
    return <div className="p-8 text-center text-slate-500">Loading results...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8f1dc] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[28px] border border-[#ead8b5] bg-white/90 p-6 shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8f1d1d]">
                Parent Portal
              </p>
              <h1 className="mt-2 font-serif text-3xl font-bold text-slate-900">
                Published Result Cards
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                View your child&apos;s official published report cards and open each one in a print-ready format.
              </p>
            </div>

            <div className="w-full max-w-sm">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Select Child
              </label>
              <select
                value={selectedChild?._id || ''}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                className="w-full rounded-2xl border border-[#e5d2aa] bg-[#fffaf0] px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#8f1d1d]"
                disabled={children.length === 0}
              >
                {children.length === 0 ? (
                  <option value="">No child found</option>
                ) : (
                  children.map((child) => (
                    <option key={child._id} value={child._id}>
                      {child.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {selectedChild && (
            <div className="mt-6 grid gap-4 rounded-[24px] border border-[#ecdcb8] bg-[#fffaf2] p-5 md:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{selectedChild.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Roll No.</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{selectedChild.rollNo || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Class</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {selectedChild.currentClass?.name || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {selectedChild.currentClass?.classId || selectedChild.currentClass?.grade || '-'}
                </p>
              </div>
            </div>
          )}

          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Available Results</h2>
              {loadingResults ? (
                <span className="text-sm text-slate-500">Refreshing...</span>
              ) : (
                <span className="text-sm text-slate-500">{results.length} published result(s)</span>
              )}
            </div>

            {loadingResults ? (
              <div className="rounded-[24px] border border-dashed border-[#e4d5b3] px-6 py-12 text-center text-slate-500">
                Loading published results...
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#e4d5b3] px-6 py-12 text-center text-slate-500">
                {selectedStudentId
                  ? 'No published result cards are available for this child yet.'
                  : 'Select a child to view published results.'}
              </div>
            ) : (
              <div className="grid gap-4">
                {results.map((result) => (
                  <div
                    key={result._id}
                    className="rounded-[24px] border border-[#ead8b5] bg-[#fffaf3] p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-serif text-2xl font-semibold text-slate-900">
                          {result.examCycleId.examName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {result.examCycleId.academicYear} | {result.examCycleId.termName}
                        </p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#8f1d1d]">
                          Published {new Date(result.publishedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:min-w-[360px]">
                        <div className="rounded-2xl bg-[#e8f7ea] px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-green-700">Percentage</p>
                          <p className="mt-1 text-xl font-bold text-green-800">
                            {result.percentage.toFixed(2)}%
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[#eef4ff] px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-blue-700">Overall Grade</p>
                          <p className="mt-1 text-xl font-bold text-blue-800">
                            {result.overallGrade || '-'}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[#fff1df] px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-orange-700">Marks</p>
                          <p className="mt-1 text-xl font-bold text-orange-800">
                            {result.totalObtained} / {result.totalFullMarks}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[#f9e9ff] px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-fuchsia-700">Rank</p>
                          <p className="mt-1 text-xl font-bold text-fuchsia-800">
                            {result.classRank && result.classTotal
                              ? `${result.classRank} / ${result.classTotal}`
                              : 'Not Ranked'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap justify-end gap-3">
                      <Link
                        href={`/parent/results/report-card?studentId=${selectedStudentId}&examCycleId=${result.examCycleId._id}`}
                        className="rounded-full bg-[#8f1d1d] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#731717]"
                      >
                        Open Result Card
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
