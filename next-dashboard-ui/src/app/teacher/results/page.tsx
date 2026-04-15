'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TeacherTopBar from '@/app/components/TeacherTopBar';

interface AssignedSetup {
  _id: string;
  examCycleId: { examName: string; academicYear: string; termName: string; examType: string; status: string };
  classId: { name: string; grade: string };
  subjectId: { name: string };
  fullMarks: number;
  passMarks: number;
  components: {
    theory?: number; mcq?: number; practical?: number;
    viva?: number; classTest?: number; attendance?: number;
  };
}

// ---- Keep old types below for the published-results modal ----
interface Batch {
  _id: string;
  examCycleId: { _id: string; examName: string; academicYear: string; termName: string; examType: string };
  classId: { name: string };
  subjectId: { name: string };
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
  teacherRemark?: string;
}

interface BatchDetail {
  batch: Batch;
  entries: MarkEntry[];
}

function getGradeColor(grade?: string) {
  switch (grade) {
    case 'A+': return 'bg-green-100 text-green-800';
    case 'A':  return 'bg-green-100 text-green-700';
    case 'B':  return 'bg-blue-100 text-blue-800';
    case 'C':  return 'bg-yellow-100 text-yellow-800';
    case 'D':  return 'bg-orange-100 text-orange-800';
    case 'F':  return 'bg-red-100 text-red-800';
    default:   return 'bg-gray-100 text-gray-600';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'published': return 'bg-green-100 text-green-800';
    case 'approved':  return 'bg-purple-100 text-purple-800';
    case 'submitted': return 'bg-blue-100 text-blue-800';
    default:          return 'bg-gray-100 text-gray-600';
  }
}

export default function TeacherResultsPage() {
  const router = useRouter();

  // --- Assigned setups (marks entry) ---
  const [setups, setSetups] = useState<AssignedSetup[]>([]);
  const [setupsLoading, setSetupsLoading] = useState(true);

  // --- Published results (view only) ---
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'approved' | 'submitted'>('all');

  useEffect(() => {
    // Load admin-assigned subject setups for marks entry
    axios.get('/api/teacher/marks-entry').then(res => {
      if (res.data.success) setSetups(res.data.data);
    }).catch(() => {}).finally(() => setSetupsLoading(false));

    // Load published/approved results for viewing
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await axios.get('/api/teacher/results');
        if (res.data.success) {
          setBatches(res.data.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openBatchDetail = async (batchId: string) => {
    setDetailLoading(true);
    setSelectedBatch(null);
    try {
      const res = await axios.get(`/api/teacher/results?batchId=${batchId}`);
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

    window.open(`/teacher/results/report-card?${query.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const filtered = filterStatus === 'all'
    ? batches
    : batches.filter(b => b.status === filterStatus);

  const passCount = selectedBatch
    ? selectedBatch.entries.filter(e => !e.isAbsent && e.percentage >= 40).length
    : 0;
  const avgPct = selectedBatch && selectedBatch.entries.length > 0
    ? (selectedBatch.entries.filter(e => !e.isAbsent).reduce((s, e) => s + e.percentage, 0) /
       selectedBatch.entries.filter(e => !e.isAbsent).length).toFixed(1)
    : 'N/A';

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherTopBar />

      <div className="p-6 max-w-6xl mx-auto">

      {/* ====== SECTION 1: Marks Entry (Admin-Assigned) ====== */}
      <div className="mb-10">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Marks Entry</h1>
          <p className="text-gray-500 text-sm mt-1">
            Subjects assigned by the admin for the current open exam cycle. Click a card to enter student marks.
          </p>
        </div>

        {setupsLoading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Loading assigned subjects...</div>
        ) : setups.length === 0 ? (
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 py-10 text-center text-gray-400">
            <div className="text-3xl mb-2">📝</div>
            <div className="font-medium">No subjects assigned yet</div>
            <p className="text-xs mt-1">Admin must assign you as a teacher in Exam Config for an open exam cycle.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {setups.map(setup => {
              const comps = Object.entries(setup.components)
                .filter(([, v]) => v && (v as number) > 0)
                .map(([k, v]) => {
                  const labels: Record<string, string> = {
                    theory: 'Theory', mcq: 'MCQ', practical: 'Practical',
                    viva: 'Viva', classTest: 'Class Test', attendance: 'Attendance',
                  };
                  return `${labels[k] || k} (${v})`;
                });
              return (
                <div
                  key={setup._id}
                  onClick={() => router.push(`/teacher/results/${setup._id}`)}
                  className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                        {setup.subjectId?.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Class: <span className="font-medium text-gray-700">{setup.classId?.name}</span>
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 capitalize">
                      {setup.examCycleId?.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    <span className="font-medium text-gray-700">{setup.examCycleId?.examName}</span>
                    {' · '}{setup.examCycleId?.academicYear}{' · '}{setup.examCycleId?.termName}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {comps.map(c => (
                      <span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{c}</span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      Full: <strong className="text-gray-600">{setup.fullMarks}</strong>
                      {' | '}Pass: <strong className="text-gray-600">{setup.passMarks}</strong>
                    </span>
                    <span className="text-xs text-blue-600 font-medium group-hover:underline">Open Sheet →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 mb-8" />

      {/* ====== SECTION 2: Published Results (View Only) ====== */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-800">Published Results</h2>
          <p className="text-gray-500 text-sm mt-1">View submitted and approved marksheets.</p>
        </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(['all', 'published', 'approved', 'submitted'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filterStatus === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? `All (${batches.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${batches.filter(b => b.status === s).length})`}
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
          {filtered.map(batch => (
            <div
              key={batch._id}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openBatchDetail(batch._id)}
            >
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 text-lg">
                      {batch.subjectId?.name || 'Subject'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(batch.status)}`}>
                      {batch.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {batch.examCycleId?.examName} &bull; {batch.examCycleId?.academicYear} &bull; {batch.examCycleId?.termName}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    Class: <span className="font-medium text-gray-700">{batch.classId?.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {batch.entriesCompleted} / {batch.totalStudents} entries
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Updated {new Date(batch.updatedAt).toLocaleDateString()}
                  </div>
                  <button className="mt-2 text-xs text-blue-600 hover:underline">
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>

      {/* Batch Detail Modal */}
      {(selectedBatch || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mt-10 mb-10">
            <div className="flex justify-between items-center p-5 border-b">
              <div>
                {selectedBatch && (
                  <>
                    <h2 className="text-xl font-bold text-gray-800">
                      {selectedBatch.batch.subjectId?.name} — {selectedBatch.batch.classId?.name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {selectedBatch.batch.examCycleId?.examName} &bull; {selectedBatch.batch.examCycleId?.academicYear}
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
            ) : selectedBatch && (
              <div className="p-5">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700">{selectedBatch.entries.length}</div>
                    <div className="text-xs text-blue-500 mt-1">Total Students</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">{passCount}</div>
                    <div className="text-xs text-green-500 mt-1">Passed</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-700">
                      {selectedBatch.entries.filter(e => e.isAbsent).length}
                    </div>
                    <div className="text-xs text-red-500 mt-1">Absent</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-700">{avgPct}%</div>
                    <div className="text-xs text-purple-500 mt-1">Avg Score</div>
                  </div>
                </div>

                {/* Student Results Table */}
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
                      {selectedBatch.entries.map((entry, i) => (
                        <tr key={entry._id || i} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500">
                            {entry.studentId?.rollNumber || '-'}
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-800">
                            {entry.studentId?.name || 'Unknown'}
                          </td>
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

                  {selectedBatch.entries.length === 0 && (
                    <div className="text-center py-8 text-gray-400">No student entries found for this batch.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>{/* end section 2 */}
    </div>
  );
}
