'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface Batch {
  _id: string;
  examCycleId: { _id: string; examName: string; academicYear: string; termName: string; examType: string };
  classId: { _id?: string; name: string; classId?: string; grade?: string };
  subjectId: { name: string };
  teacherId?: { name?: string; email?: string };
  status: string;
  totalStudents: number;
  entriesCompleted: number;
  updatedAt: string;
}

interface MarkEntry {
  _id: string;
  studentId: { _id: string; name: string; rollNumber: string };
  totalMarks: number;
  fullMarks: number;
  percentage: number;
  grade?: string;
  isAbsent: boolean;
  theoryMarks?: number;
  mcqMarks?: number;
  practicalMarks?: number;
  vivaMarks?: number;
  classTestMarks?: number;
  attendanceMarks?: number;
}

interface BatchDetail {
  batch: Batch;
  entries: MarkEntry[];
}

interface GroupedResult {
  groupKey: string;
  examCycleId: { _id: string; examName: string; academicYear: string; termName: string; examType: string };
  classId: { _id?: string; name: string; classId?: string; grade?: string };
  batches: Batch[];
  status: string;
  subjectCount: number;
  studentCount: number;
  updatedAt: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'published': return 'bg-green-100 text-green-800';
    case 'locked': return 'bg-slate-200 text-slate-700';
    case 'approved': return 'bg-purple-100 text-purple-800';
    case 'submitted': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getGradeColor(grade?: string) {
  switch (grade) {
    case 'A+': return 'bg-green-100 text-green-800';
    case 'A': return 'bg-green-100 text-green-700';
    case 'B': return 'bg-blue-100 text-blue-800';
    case 'C': return 'bg-yellow-100 text-yellow-800';
    case 'D': return 'bg-orange-100 text-orange-800';
    case 'F': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function pickPrimaryStatus(statuses: string[]) {
  if (statuses.includes('locked')) return 'locked';
  if (statuses.includes('published')) return 'published';
  if (statuses.includes('approved')) return 'approved';
  return 'submitted';
}

export default function AdminResultsPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<GroupedResult | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'approved' | 'submitted' | 'locked'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await axios.get('/api/admin/results');
        if (res.data.success) {
          setBatches(Array.isArray(res.data.data) ? res.data.data : []);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load admin results');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const groupedResults = useMemo<GroupedResult[]>(() => {
    const groups = new Map<string, { batches: Batch[]; studentIds: Set<string> }>();

    for (const batch of batches) {
      const groupKey = `${batch.examCycleId._id}:${batch.classId._id || batch.classId.name}`;
      const group = groups.get(groupKey) || { batches: [], studentIds: new Set<string>() };
      group.batches.push(batch);
      groups.set(groupKey, group);
    }

    return Array.from(groups.entries()).map(([groupKey, group]) => {
      const firstBatch = group.batches[0];
      const statuses = group.batches.map((batch) => batch.status);
      const primaryStatus = pickPrimaryStatus(statuses);

      return {
        groupKey,
        examCycleId: firstBatch.examCycleId,
        classId: firstBatch.classId,
        batches: group.batches.sort((left, right) => left.subjectId.name.localeCompare(right.subjectId.name)),
        status: primaryStatus,
        subjectCount: group.batches.length,
        studentCount: firstBatch.totalStudents,
        updatedAt: group.batches.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0].updatedAt,
      };
    }).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [batches]);

  const filtered = filterStatus === 'all'
    ? groupedResults
    : groupedResults.filter((group) => group.status === filterStatus);

  const loadBatchDetail = async (batch: Batch, group: GroupedResult) => {
    setDetailLoading(true);
    setSelectedGroup(group);
    setSelectedBatch(null);

    try {
      const res = await axios.get(`/api/admin/results?batchId=${batch._id}`);
      if (res.data.success) {
        setSelectedBatch(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to load batch details');
    } finally {
      setDetailLoading(false);
    }
  };

  const openReportCard = (studentId: string) => {
    if (!selectedBatch?.batch?.examCycleId?._id) return;

    const query = new URLSearchParams({
      studentId,
      examCycleId: selectedBatch.batch.examCycleId._id,
      batchId: selectedBatch.batch._id,
    });

    window.open(`/admin/results/report-card?${query.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const passCount = selectedBatch
    ? selectedBatch.entries.filter((entry) => !entry.isAbsent && entry.percentage >= 40).length
    : 0;
  const avgPct = selectedBatch && selectedBatch.entries.length > 0
    ? (selectedBatch.entries.filter((entry) => !entry.isAbsent).reduce((sum, entry) => sum + entry.percentage, 0) /
       selectedBatch.entries.filter((entry) => !entry.isAbsent).length).toFixed(1)
    : 'N/A';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Published Result Cards</h1>
            <p className="text-sm text-gray-500 mt-1">Review published or locked results and open each student report card.</p>
        </div>
        <button
          onClick={() => router.push('/admin/exam-config')}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
        >
          Back to Exam Config
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200">{error}</div>
      )}

      <div className="mb-6 flex gap-2 flex-wrap">
        {(['all', 'published', 'approved', 'submitted', 'locked'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'all'
              ? `All (${batches.length})`
              : `${status.charAt(0).toUpperCase() + status.slice(1)} (${batches.filter((batch) => batch.status === status).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading results...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📋</div>
          <div className="text-lg font-medium">No results found</div>
          <p className="text-sm mt-1">Results will appear here once marksheets are submitted and approved.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((group) => (
            <div
              key={group.groupKey}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => loadBatchDetail(group.batches[0], group)}
            >
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 text-lg">
                      {group.examCycleId?.academicYear} | {group.examCycleId?.examName}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(group.status)}`}>
                      {group.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {group.examCycleId?.termName} &bull; Class: {group.classId?.name}{group.classId?.classId || group.classId?.grade ? ` (${group.classId.classId || group.classId.grade})` : ''}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    Result Group ID: <span className="font-medium text-gray-700">{group.groupKey}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    Subjects: <span className="font-medium text-gray-700">{group.subjectCount}</span>
                    {' · '}Students: <span className="font-medium text-gray-700">{group.studentCount}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">{group.subjectCount} subject batch(es)</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Updated {new Date(group.updatedAt).toLocaleDateString()}
                  </div>
                  <button className="mt-2 text-xs text-blue-600 hover:underline">View Details →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(selectedGroup || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mt-10 mb-10">
            <div className="flex justify-between items-center p-5 border-b">
              <div>
                {selectedGroup && (
                  <>
                    <h2 className="text-xl font-bold text-gray-800">
                      {selectedGroup.examCycleId?.academicYear} | {selectedGroup.examCycleId?.examName}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {selectedGroup.examCycleId?.termName} &bull; Class: {selectedGroup.classId?.name}{selectedGroup.classId?.classId || selectedGroup.classId?.grade ? ` (${selectedGroup.classId.classId || selectedGroup.classId.grade})` : ''}
                    </p>
                  </>
                )}
                {detailLoading && <p className="text-gray-500">Loading...</p>}
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {detailLoading ? (
              <div className="p-10 text-center text-gray-400">Loading student results...</div>
            ) : selectedGroup && (
              <div className="p-5">
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedGroup.batches.map((batch) => (
                    <button
                      key={batch._id}
                      type="button"
                      onClick={() => loadBatchDetail(batch, selectedGroup)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        selectedBatch?.batch?._id === batch._id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {batch.subjectId?.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700">{selectedBatch?.entries.length || 0}</div>
                    <div className="text-xs text-blue-500 mt-1">Total Students</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">{passCount}</div>
                    <div className="text-xs text-green-500 mt-1">Passed</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-700">
                      {selectedBatch?.entries.filter((entry) => entry.isAbsent).length || 0}
                    </div>
                    <div className="text-xs text-red-500 mt-1">Absent</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-700">{avgPct}%</div>
                    <div className="text-xs text-purple-500 mt-1">Avg Score</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-left">
                        <th className="px-3 py-2 font-medium">Roll No.</th>
                        <th className="px-3 py-2 font-medium">Student</th>
                        <th className="px-3 py-2 font-medium text-center">Theory</th>
                        <th className="px-3 py-2 font-medium text-center">MCQ</th>
                        <th className="px-3 py-2 font-medium text-center">Practical</th>
                        <th className="px-3 py-2 font-medium text-center">Total</th>
                        <th className="px-3 py-2 font-medium text-center">%</th>
                        <th className="px-3 py-2 font-medium text-center">Grade</th>
                        <th className="px-3 py-2 font-medium text-center">Status</th>
                        <th className="px-3 py-2 font-medium text-center">Report Card</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBatch?.entries.map((entry, index) => (
                        <tr key={entry._id || index} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500">{entry.studentId?.rollNumber || '-'}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{entry.studentId?.name || 'Unknown'}</td>
                          <td className="px-3 py-2 text-center">{entry.theoryMarks ?? '-'}</td>
                          <td className="px-3 py-2 text-center">{entry.mcqMarks ?? '-'}</td>
                          <td className="px-3 py-2 text-center">{entry.practicalMarks ?? '-'}</td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {entry.isAbsent ? 'AB' : `${entry.totalMarks ?? '-'} / ${entry.fullMarks}`}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {entry.isAbsent ? '-' : `${entry.percentage?.toFixed(1) ?? '-'}%`}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {entry.grade ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getGradeColor(entry.grade)}`}>
                                {entry.grade}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {entry.isAbsent ? (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Absent</span>
                            ) : entry.percentage >= 40 ? (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Pass</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Fail</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => openReportCard(entry.studentId?._id)}
                              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {selectedBatch && selectedBatch.entries.length === 0 && (
                    <div className="text-center py-8 text-gray-400">No student entries found for this batch.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}