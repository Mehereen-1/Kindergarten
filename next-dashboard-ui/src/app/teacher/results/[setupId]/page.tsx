'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

interface ComponentConfig {
  theory?: number;
  mcq?: number;
  practical?: number;
  viva?: number;
  classTest?: number;
  attendance?: number;
}

interface Setup {
  _id: string;
  examCycleId: {
    _id?: string;
    examName: string;
    academicYear: string;
    termName: string;
    examType: string;
    status: string;
    marksEntryStartDate?: string;
    marksEntryEndDate?: string;
  };
  classId: { _id?: string; name: string; grade: string };
  subjectId: { name: string };
  fullMarks: number;
  passMarks: number;
  components: ComponentConfig;
}

interface MarkRow {
  studentId: string;
  name: string;
  rollNo: string;
  entryId: string | null;
  isAbsent: boolean;
  theoryMarks: number | null;
  mcqMarks: number | null;
  practicalMarks: number | null;
  vivaMarks: number | null;
  classTestMarks: number | null;
  attendanceMarks: number | null;
  totalMarks: number | null;
  fullMarks: number;
  percentage: number | null;
  grade: string | null;
  teacherRemark: string;
  isSaved: boolean;
  editReason: string;
}

interface AuditLogItem {
  _id: string;
  entityType: string;
  action: string;
  reason: string;
  changedFields: string[];
  oldValue?: {
    totalMarks?: number;
    percentage?: number;
    grade?: string | null;
  } | null;
  newValue?: {
    totalMarks?: number;
    percentage?: number;
    grade?: string | null;
  } | null;
  createdAt: string;
  changedBy?: {
    _id: string;
    name: string;
    role?: string;
  } | null;
  student?: {
    _id: string;
    name: string;
    rollNumber?: string;
  } | null;
}

interface ValidationIssue {
  rowIdx: number;
  studentName: string;
  componentLabel: string;
  value: number;
  maxValue: number;
}

type ComponentKey =
  | 'theoryMarks'
  | 'mcqMarks'
  | 'practicalMarks'
  | 'vivaMarks'
  | 'classTestMarks'
  | 'attendanceMarks';

const COMPONENT_MAP: { key: ComponentKey; label: string; setupKey: keyof ComponentConfig }[] = [
  { key: 'theoryMarks', label: 'Theory', setupKey: 'theory' },
  { key: 'mcqMarks', label: 'MCQ', setupKey: 'mcq' },
  { key: 'practicalMarks', label: 'Practical', setupKey: 'practical' },
  { key: 'vivaMarks', label: 'Viva', setupKey: 'viva' },
  { key: 'classTestMarks', label: 'Class Test', setupKey: 'classTest' },
  { key: 'attendanceMarks', label: 'Attendance', setupKey: 'attendance' },
];

function computePct(total: number, fullMarks: number): number {
  if (!fullMarks) return 0;
  return parseFloat(((total / fullMarks) * 100).toFixed(1));
}

function gradeColor(grade: string | null): string {
  switch (grade) {
    case 'A+':
      return 'text-green-700 font-bold';
    case 'A':
      return 'text-green-600 font-bold';
    case 'B':
      return 'text-blue-600 font-bold';
    case 'C':
      return 'text-yellow-600 font-bold';
    case 'D':
      return 'text-orange-600 font-bold';
    case 'F':
      return 'text-red-600 font-bold';
    case 'AB':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

function actionBadge(action: string): string {
  switch (action) {
    case 'create':
      return 'bg-emerald-100 text-emerald-700';
    case 'update':
      return 'bg-amber-100 text-amber-700';
    case 'delete':
      return 'bg-rose-100 text-rose-700';
    case 'submit':
      return 'bg-blue-100 text-blue-700';
    case 'approve':
      return 'bg-violet-100 text-violet-700';
    case 'publish':
      return 'bg-slate-900 text-white';
    case 'lock':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function batchStatusBadge(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-amber-100 text-amber-700';
    case 'submitted':
      return 'bg-blue-100 text-blue-700';
    case 'approved':
      return 'bg-violet-100 text-violet-700';
    case 'published':
      return 'bg-emerald-100 text-emerald-700';
    case 'reopened':
      return 'bg-orange-100 text-orange-700';
    case 'locked':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export default function MarksEntryPage() {
  const params = useParams();
  const router = useRouter();
  const setupId = params.setupId as string;

  const [setup, setSetup] = useState<Setup | null>(null);
  const [batchId, setBatchId] = useState('');
  const [batchStatus, setBatchStatus] = useState('');
  const [entryWindowOpen, setEntryWindowOpen] = useState(true);
  const [entryWindowMessage, setEntryWindowMessage] = useState('');
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<MarkRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');
  const [error, setError] = useState('');
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const activeComponents = useMemo(
    () => (setup ? COMPONENT_MAP.filter((component) => (setup.components[component.setupKey] ?? 0) > 0) : []),
    [setup]
  );
  const isEditable = entryWindowOpen && (batchStatus === 'draft' || batchStatus === 'reopened');
  const editLockMessage = !entryWindowOpen
    ? entryWindowMessage
    : batchStatus !== 'draft' && batchStatus !== 'reopened'
      ? `This sheet is ${batchStatus} and is now read-only.`
      : '';

  const loadSheet = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`/api/teacher/marks-entry/${setupId}`);

      if (res.data.success) {
        const hydratedRows = (res.data.data.rows || []).map((row: Omit<MarkRow, 'editReason'>) => ({
          ...row,
          editReason: '',
        }));

        setSetup(res.data.data.setup);
        setBatchId(res.data.data.batchId);
        setBatchStatus(res.data.data.batchStatus);
        setEntryWindowOpen(res.data.data.entryWindowOpen !== false);
        setEntryWindowMessage(res.data.data.entryWindowMessage || '');
        setRows(hydratedRows);
        setSavedSnapshot(JSON.parse(JSON.stringify(hydratedRows)));
        setAuditLogs(Array.isArray(res.data.data.auditLogs) ? res.data.data.auditLogs : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load marks');
    } finally {
      setLoading(false);
    }
  }, [setupId]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  const isRowDirty = useCallback(
    (row: MarkRow, idx: number): boolean => {
      const snap = savedSnapshot[idx];
      if (!snap) return true;
      if (row.isAbsent !== snap.isAbsent) return true;
      for (const component of activeComponents) {
        if (row[component.key] !== snap[component.key]) return true;
      }
      if (row.teacherRemark !== snap.teacherRemark) return true;
      return false;
    },
    [activeComponents, savedSnapshot]
  );

  const updateCell = useCallback(
    (rowIdx: number, field: ComponentKey | 'isAbsent' | 'teacherRemark' | 'editReason', value: any) => {
      setSaveMsg('');
      setSubmitMsg('');
      setRows((prev) => {
        const updated = [...prev];
        const row = { ...updated[rowIdx] };

        if (field === 'isAbsent') {
          row.isAbsent = value as boolean;
        } else if (field === 'teacherRemark') {
          row.teacherRemark = value as string;
        } else if (field === 'editReason') {
          row.editReason = value as string;
        } else {
          const numVal = value === '' || value === null ? null : parseFloat(value);
          row[field] = Number.isNaN(numVal as number) ? null : numVal;
        }

        if (!row.isAbsent) {
          const total = activeComponents.reduce((sum, component) => {
            const componentValue = row[component.key];
            return sum + (typeof componentValue === 'number' ? componentValue : 0);
          }, 0);
          row.totalMarks = total;
          row.percentage = computePct(total, row.fullMarks);
        } else {
          row.totalMarks = 0;
          row.percentage = 0;
        }

        updated[rowIdx] = row;
        return updated;
      });
    },
    [activeComponents]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    const colCount = activeComponents.length + 2;
    let nextRow = rowIdx;
    let nextCol = colIdx;

    if (event.key === 'Tab') {
      event.preventDefault();
      if (event.shiftKey) {
        nextCol = colIdx - 1;
        if (nextCol < 0) {
          nextCol = colCount - 1;
          nextRow = rowIdx - 1;
        }
      } else {
        nextCol = colIdx + 1;
        if (nextCol >= colCount) {
          nextCol = 0;
          nextRow = rowIdx + 1;
        }
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      nextRow = rowIdx + 1;
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      nextRow = rowIdx + 1;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      nextRow = rowIdx - 1;
    } else {
      return;
    }

    nextRow = Math.max(0, Math.min(nextRow, rows.length - 1));
    nextCol = Math.max(0, Math.min(nextCol, colCount - 1));
    inputRefs.current.get(`${nextRow}-${nextCol}`)?.focus();
  };

  const dirtyCount = rows.filter((row, idx) => isRowDirty(row, idx)).length;
  const filledCount = rows.filter((row) => row.isAbsent || activeComponents.some((component) => row[component.key] !== null)).length;
  const completedCount = rows.filter(
    (row) => row.isAbsent || activeComponents.every((component) => row[component.key] !== null)
  ).length;
  const validationIssues = useMemo<ValidationIssue[]>(
    () =>
      rows.flatMap((row, rowIdx) => {
        if (row.isAbsent || !setup) return [];

        return activeComponents.flatMap((component) => {
          const value = row[component.key];
          const maxValue = setup.components[component.setupKey] ?? 0;

          if (typeof value !== 'number' || Number.isNaN(value)) {
            return [];
          }

          if (value < 0 || value > maxValue) {
            return [
              {
                rowIdx,
                studentName: row.name,
                componentLabel: component.label,
                value,
                maxValue,
              },
            ];
          }

          return [];
        });
      }),
    [activeComponents, rows, setup]
  );
  const invalidMarkCount = validationIssues.length;
  const missingReasonCount = rows.filter((row, idx) => {
    const wasPreviouslySaved = Boolean(savedSnapshot[idx]?.entryId);
    return wasPreviouslySaved && isRowDirty(row, idx) && !row.editReason.trim();
  }).length;

  const handleSave = async () => {
    if (!batchId) return;
    if (!isEditable) {
      setSaveMsg(`Error: ${entryWindowMessage || `Cannot edit batch in ${batchStatus} status`}`);
      return;
    }

    if (invalidMarkCount > 0) {
      setSaveMsg(`Error: fix ${invalidMarkCount} invalid mark(s) before saving`);
      return;
    }

    if (missingReasonCount > 0) {
      setSaveMsg(`Error: add edit reasons for ${missingReasonCount} changed saved row(s) before saving`);
      return;
    }

    setSaving(true);
    setSaveMsg('');

    try {
      const entries = rows.map((row) => ({
        studentId: row.studentId,
        isAbsent: row.isAbsent,
        theoryMarks: row.theoryMarks,
        mcqMarks: row.mcqMarks,
        practicalMarks: row.practicalMarks,
        vivaMarks: row.vivaMarks,
        classTestMarks: row.classTestMarks,
        attendanceMarks: row.attendanceMarks,
        teacherRemark: row.teacherRemark,
        editReason: row.editReason,
      }));

      const response = await axios.post(`/api/teacher/marks-entry/${setupId}`, { batchId, entries });
      await loadSheet();
      setSaveMsg(
        `Saved ${response.data?.saved || 0} change(s)` +
          (response.data?.removed ? ` and removed ${response.data.removed} empty saved row(s)` : '')
      );
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (err: any) {
      setSaveMsg('Error: ' + (err.response?.data?.error || 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!batchId) return;
    if (!isEditable) {
      setSubmitMsg(entryWindowMessage || `Cannot submit batch in ${batchStatus} status`);
      return;
    }

    if (invalidMarkCount > 0) {
      setSubmitMsg(`Fix ${invalidMarkCount} invalid mark(s) before submitting`);
      return;
    }

    if (dirtyCount > 0) {
      setSubmitMsg('Save the sheet before submitting it for approval');
      return;
    }

    if (completedCount < rows.length) {
      setSubmitMsg(`${rows.length - completedCount} student(s) still have incomplete marks`);
      return;
    }

    setSubmitting(true);
    setSubmitMsg('');

    try {
      await axios.post(`/api/teacher/marksheets/${batchId}/submit`, {
        notes: 'Submitted from teacher result sheet',
      });
      await loadSheet();
      setSubmitMsg('Batch submitted for approval');
      setTimeout(() => setSubmitMsg(''), 4000);
    } catch (err: any) {
      setSubmitMsg(err.response?.data?.error || 'Failed to submit for approval');
    } finally {
      setSubmitting(false);
    }
  };

  const openAssessmentEditor = () => {
    if (!setup?.examCycleId?._id || !setup?.classId?._id) return;

    const query = new URLSearchParams({
      examCycleId: setup.examCycleId._id,
      classId: setup.classId._id,
      className: setup.classId.name || 'Class',
      examName: setup.examCycleId.examName || 'Exam',
    });

    router.push(`/teacher/results/assessments?${query.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Loading marks sheet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-700 p-4 rounded">{error}</div>
        <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">
          Back
        </button>
      </div>
    );
  }

  if (!setup) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-800 text-sm flex items-center gap-1"
          >
            Back
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800">{setup.subjectId?.name}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${batchStatusBadge(batchStatus)}`}>
                {batchStatus || 'draft'}
              </span>
            </div>
            <div className="text-gray-500 text-sm mt-1">
              {setup.classId?.name} | {setup.examCycleId?.examName} {setup.examCycleId?.academicYear}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="text-sm text-gray-500 text-right">
            <div>
              <span className="font-medium text-gray-700">{filledCount}</span>/{rows.length} filled
              {dirtyCount > 0 && (
                <span className="ml-2 text-orange-500 font-medium">* {dirtyCount} unsaved</span>
              )}
            </div>
            <div className="text-xs text-gray-400">
              {completedCount}/{rows.length} complete for submission
            </div>
            {invalidMarkCount > 0 && (
              <div className="text-xs font-semibold text-red-600">
                {invalidMarkCount} invalid mark{invalidMarkCount === 1 ? '' : 's'} to fix
              </div>
            )}
          </div>
          {saveMsg && (
            <span className={`text-sm font-medium ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {saveMsg}
            </span>
          )}
          {submitMsg && (
            <span className={`text-sm font-medium ${submitMsg.includes('submitted') ? 'text-green-600' : 'text-red-600'}`}>
              {submitMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || dirtyCount === 0 || !isEditable}
            className={`px-5 py-2 rounded text-sm font-semibold transition-colors ${
              dirtyCount > 0 && !saving && isEditable
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : dirtyCount > 0 ? `Save (${dirtyCount} changed)` : 'Saved'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !isEditable || dirtyCount > 0 || invalidMarkCount > 0 || completedCount < rows.length || rows.length === 0}
            className={`px-5 py-2 rounded text-sm font-semibold transition-colors ${
              !submitting && isEditable && dirtyCount === 0 && invalidMarkCount === 0 && completedCount === rows.length && rows.length > 0
                ? 'bg-slate-900 hover:bg-slate-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit For Approval'}
          </button>
          <button
            onClick={openAssessmentEditor}
            disabled={!setup?.examCycleId?._id || !setup?.classId?._id}
            className="px-5 py-2 rounded text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Report Card Assessments
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border-b border-blue-100 px-6 py-2 flex flex-wrap gap-6 text-xs text-blue-700">
        <span>
          Full Marks: <strong>{setup.fullMarks}</strong>
        </span>
        <span>
          Pass Marks: <strong>{setup.passMarks}</strong>
        </span>
        {activeComponents.map((component) => (
          <span key={component.key}>
            {component.label}: <strong>{setup.components[component.setupKey]}</strong>
          </span>
        ))}
        <span className="ml-auto text-blue-500">
          Keep the spreadsheet flow. Any saved-row edit now needs a reason and is logged automatically.
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {editLockMessage && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="font-semibold">Editing is currently locked</div>
            <div className="mt-1">{editLockMessage}</div>
          </div>
        )}

        {invalidMarkCount > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="font-semibold">Some marks are outside the allowed range.</div>
            <div className="mt-1">
              Each component must stay between <strong>0</strong> and its full marks before you can save or submit.
            </div>
            <div className="mt-2 space-y-1 text-xs sm:text-sm">
              {validationIssues.slice(0, 4).map((issue) => (
                <div key={`${issue.rowIdx}-${issue.componentLabel}`}>
                  <strong>{issue.studentName}</strong>: {issue.componentLabel} is <strong>{issue.value}</strong>, but the maximum is{' '}
                  <strong>{issue.maxValue}</strong>.
                </div>
              ))}
              {invalidMarkCount > 4 && (
                <div className="text-red-600/80">+{invalidMarkCount - 4} more invalid mark(s)</div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-300 rounded shadow-sm overflow-x-auto overflow-y-hidden">
          <table className="w-full min-w-[1400px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-700 text-white text-xs uppercase tracking-wide">
                <th className="border border-gray-600 px-3 py-2 text-left w-10 sticky left-0 bg-gray-700 z-10">#</th>
                <th className="border border-gray-600 px-3 py-2 text-left w-12 sticky left-10 bg-gray-700 z-10">Roll</th>
                <th className="border border-gray-600 px-3 py-2 text-left min-w-[170px] sticky left-24 bg-gray-700 z-10">
                  Student Name
                </th>
                <th className="border border-gray-600 px-3 py-2 text-center w-16">Absent</th>
                {activeComponents.map((component) => (
                  <th key={component.key} className="border border-gray-600 px-2 py-1 text-center min-w-[80px]">
                    <div>{component.label}</div>
                    <div className="font-normal text-gray-300 text-xs normal-case">
                      /{setup.components[component.setupKey]}
                    </div>
                  </th>
                ))}
                <th className="border border-gray-600 px-2 py-1 text-center min-w-[80px]">
                  <div>Total</div>
                  <div className="font-normal text-gray-300 text-xs normal-case">/{setup.fullMarks}</div>
                </th>
                <th className="border border-gray-600 px-2 py-1 text-center min-w-[60px]">%</th>
                <th className="border border-gray-600 px-2 py-1 text-center w-12">Grade</th>
                <th className="border border-gray-600 px-3 py-2 text-left min-w-[150px]">Remark</th>
                <th className="border border-gray-600 px-3 py-2 text-left min-w-[220px]">Edit Reason</th>
                <th className="border border-gray-600 px-2 py-1 text-center w-16">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={activeComponents.length + 11} className="text-center py-12 text-gray-400">
                    No students found for class <strong>{setup.classId?.name}</strong>.
                    <br />
                    <span className="text-xs mt-1 block">
                      Make sure students are enrolled in this class via Student Management (Admin).
                    </span>
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIdx) => {
                  const dirty = isRowDirty(row, rowIdx);
                  const wasPreviouslySaved = Boolean(savedSnapshot[rowIdx]?.entryId);
                  const needsReason = wasPreviouslySaved && dirty;
                  const rowBg = row.isAbsent
                    ? 'bg-gray-50'
                    : dirty
                      ? 'bg-orange-50'
                      : row.isSaved || savedSnapshot[rowIdx]?.isSaved
                        ? 'bg-green-50/40'
                        : 'bg-white';

                  const displayTotal = row.isAbsent ? 'AB' : row.totalMarks !== null ? row.totalMarks : '';
                  const displayPct = row.isAbsent ? '-' : row.percentage !== null ? `${row.percentage}%` : '';
                  const grade = row.isAbsent
                    ? 'AB'
                    : row.percentage !== null
                      ? row.percentage >= 90
                        ? 'A+'
                        : row.percentage >= 80
                          ? 'A'
                          : row.percentage >= 70
                            ? 'B'
                            : row.percentage >= 60
                              ? 'C'
                              : row.percentage >= 50
                                ? 'D'
                                : 'F'
                      : null;

                  return (
                    <tr key={row.studentId} className={`${rowBg} hover:brightness-95 transition-colors border-b border-gray-200`}>
                      <td className="border-r border-gray-200 px-3 py-0 text-center text-gray-400 sticky left-0 bg-inherit z-10 text-xs">
                        {rowIdx + 1}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-0 text-center text-gray-500 sticky left-10 bg-inherit z-10 text-xs font-mono">
                        {row.rollNo || '-'}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-1.5 font-medium text-gray-800 sticky left-24 bg-inherit z-10">
                        {row.name}
                        {dirty && !row.isAbsent && (
                          <span
                            className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-orange-400 align-middle"
                            title="Unsaved changes"
                          />
                        )}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-0 text-center">
                        <input
                          type="checkbox"
                          checked={row.isAbsent}
                          disabled={!isEditable}
                          onChange={(event) => updateCell(rowIdx, 'isAbsent', event.target.checked)}
                          className="w-4 h-4 cursor-pointer accent-red-500 disabled:cursor-not-allowed"
                        />
                      </td>
                      {activeComponents.map((component, colIdx) => {
                        const maxValue = setup.components[component.setupKey] ?? 0;
                        const value = row[component.key];
                        const isInvalid = typeof value === 'number' && (value < 0 || value > maxValue);

                        return (
                          <td key={component.key} className="border-r border-gray-200 p-0">
                            <input
                              ref={(element) => {
                                const refKey = `${rowIdx}-${colIdx}`;
                                if (element) inputRefs.current.set(refKey, element);
                                else inputRefs.current.delete(refKey);
                              }}
                              type="number"
                              min={0}
                              max={maxValue}
                              step="0.5"
                              disabled={!isEditable || row.isAbsent}
                              value={value === null || value === undefined ? '' : String(value)}
                              onChange={(event) => updateCell(rowIdx, component.key, event.target.value)}
                              onKeyDown={(event) => handleKeyDown(event, rowIdx, colIdx)}
                              title={isInvalid ? `${component.label} must be between 0 and ${maxValue}` : undefined}
                              aria-invalid={isInvalid}
                              className={`w-full h-9 px-2 text-center text-sm outline-none border-0 bg-transparent focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-400 disabled:opacity-40 disabled:cursor-not-allowed ${
                                isInvalid ? 'bg-red-50 text-red-700 font-bold focus:bg-red-50 focus:ring-red-400' : 'text-gray-800'
                              } [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                              placeholder="-"
                            />
                          </td>
                        );
                      })}
                      <td className="border-r border-gray-200 px-3 py-1.5 text-center font-semibold text-gray-700 bg-gray-50">
                        {displayTotal}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-1.5 text-center text-gray-600 bg-gray-50">
                        {displayPct}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-1.5 text-center bg-gray-50">
                        <span className={grade ? gradeColor(grade) : 'text-gray-300'}>{grade || '-'}</span>
                      </td>
                      <td className="border-r border-gray-200 p-0">
                        <input
                          ref={(element) => {
                            const refKey = `${rowIdx}-${activeComponents.length}`;
                            if (element) inputRefs.current.set(refKey, element);
                            else inputRefs.current.delete(refKey);
                          }}
                          type="text"
                          value={row.teacherRemark}
                          disabled={!isEditable}
                          onChange={(event) => updateCell(rowIdx, 'teacherRemark', event.target.value)}
                          onKeyDown={(event) => handleKeyDown(event, rowIdx, activeComponents.length)}
                          placeholder="Optional remark..."
                          className="w-full h-9 px-2 text-xs outline-none border-0 bg-transparent focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-400 text-gray-600 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="border-r border-gray-200 p-0">
                        <input
                          ref={(element) => {
                            const refKey = `${rowIdx}-${activeComponents.length + 1}`;
                            if (element) inputRefs.current.set(refKey, element);
                            else inputRefs.current.delete(refKey);
                          }}
                          type="text"
                          value={row.editReason}
                          disabled={!isEditable}
                          onChange={(event) => updateCell(rowIdx, 'editReason', event.target.value)}
                          onKeyDown={(event) => handleKeyDown(event, rowIdx, activeComponents.length + 1)}
                          placeholder={
                            needsReason ? 'Required: explain this saved change' : wasPreviouslySaved ? 'Needed only when editing saved marks' : 'Initial entry'
                          }
                          className={`w-full h-9 px-2 text-xs outline-none border-0 bg-transparent focus:bg-blue-50 focus:ring-2 focus:ring-inset text-gray-600 disabled:cursor-not-allowed ${
                            needsReason && !row.editReason.trim()
                              ? 'bg-red-50 focus:ring-red-400'
                              : 'focus:ring-blue-400'
                          }`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {dirty ? (
                          <span className="text-xs text-orange-500 font-medium">*</span>
                        ) : row.isSaved || !dirty ? (
                          <span className="text-xs text-green-500">OK</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100 font-semibold text-gray-700 text-sm border-t-2 border-gray-300">
                  <td colSpan={4} className="px-3 py-2 sticky left-0 bg-gray-100 z-10">
                    Summary ({rows.length} students)
                  </td>
                  {activeComponents.map((component) => {
                    const values = rows
                      .filter((row) => !row.isAbsent && row[component.key] !== null)
                      .map((row) => row[component.key] as number);
                    const average = values.length
                      ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
                      : '-';

                    return (
                      <td key={component.key} className="px-2 py-2 text-center text-xs text-gray-500">
                        avg: {average}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    {(() => {
                      const values = rows
                        .filter((row) => !row.isAbsent && row.totalMarks !== null)
                        .map((row) => row.totalMarks as number);
                      return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : '-';
                    })()}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {(() => {
                      const values = rows
                        .filter((row) => !row.isAbsent && row.percentage !== null)
                        .map((row) => row.percentage as number);
                      return values.length
                        ? `${(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)}%`
                        : '-';
                    })()}
                  </td>
                  <td colSpan={4} className="px-3 py-2 text-center text-xs text-gray-500">
                    Pass: {rows.filter((row) => !row.isAbsent && row.percentage !== null && row.percentage >= (setup.passMarks / setup.fullMarks) * 100).length} |
                    Fail: {rows.filter((row) => !row.isAbsent && row.percentage !== null && row.percentage < (setup.passMarks / setup.fullMarks) * 100).length} |
                    Absent: {rows.filter((row) => row.isAbsent).length}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {rows.length > 0 && (
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="font-semibold">Edit control</div>
              <div className="mt-1">
                Saved rows can still be corrected, but each edit must include a reason. That reason is kept in the audit log for teachers and admin review.
              </div>
              {invalidMarkCount > 0 && (
                <div className="mt-2 font-medium text-red-700">
                  {invalidMarkCount} mark{invalidMarkCount === 1 ? '' : 's'} are outside the allowed range.
                </div>
              )}
              {missingReasonCount > 0 && (
                <div className="mt-2 font-medium text-red-700">
                  {missingReasonCount} changed saved row(s) still need a reason.
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleSave}
                disabled={saving || dirtyCount === 0 || !isEditable}
                className={`px-8 py-2.5 rounded font-semibold text-sm shadow transition-colors ${
                  dirtyCount > 0 && !saving && isEditable
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? 'Saving...' : dirtyCount > 0 ? `Save All Changes (${dirtyCount} rows)` : 'All Saved'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !isEditable || dirtyCount > 0 || invalidMarkCount > 0 || completedCount < rows.length || rows.length === 0}
                className={`px-8 py-2.5 rounded font-semibold text-sm shadow transition-colors ${
                  !submitting && isEditable && dirtyCount === 0 && invalidMarkCount === 0 && completedCount === rows.length && rows.length > 0
                    ? 'bg-slate-900 hover:bg-slate-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {submitting ? 'Submitting...' : 'Submit Batch'}
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Change Log</h2>
              <p className="text-sm text-slate-500">
                Every mark edit, deletion, submission, approval, publish, or lock action appears here.
              </p>
            </div>
            <button
              type="button"
              onClick={loadSheet}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              Refresh Log
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              No audit history yet for this sheet.
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log._id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${actionBadge(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {log.student ? `${log.student.name}${log.student.rollNumber ? ` (${log.student.rollNumber})` : ''}` : 'Batch event'}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        {log.reason || 'No reason recorded'}
                      </div>
                      {log.changedFields?.length > 0 && (
                        <div className="mt-2 text-xs text-slate-500">
                          Fields: {log.changedFields.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{new Date(log.createdAt).toLocaleString()}</div>
                      <div className="mt-1">
                        {log.changedBy?.name || 'Unknown user'}
                        {log.changedBy?.role ? ` | ${log.changedBy.role}` : ''}
                      </div>
                    </div>
                  </div>
                  {(log.oldValue?.totalMarks !== undefined || log.newValue?.totalMarks !== undefined) && (
                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      Total: {log.oldValue?.totalMarks ?? '-'} to {log.newValue?.totalMarks ?? '-'} | Percentage:{' '}
                      {log.oldValue?.percentage ?? '-'} to {log.newValue?.percentage ?? '-'} | Grade:{' '}
                      {log.oldValue?.grade ?? '-'} to {log.newValue?.grade ?? '-'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
