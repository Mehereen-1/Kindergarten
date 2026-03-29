'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  examCycleId: { examName: string; academicYear: string; termName: string; examType: string; status: string };
  classId: { name: string; grade: string };
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
}

type ComponentKey = 'theoryMarks' | 'mcqMarks' | 'practicalMarks' | 'vivaMarks' | 'classTestMarks' | 'attendanceMarks';

const COMPONENT_MAP: { key: ComponentKey; label: string; setupKey: keyof ComponentConfig }[] = [
  { key: 'theoryMarks', label: 'Theory', setupKey: 'theory' },
  { key: 'mcqMarks', label: 'MCQ', setupKey: 'mcq' },
  { key: 'practicalMarks', label: 'Practical', setupKey: 'practical' },
  { key: 'vivaMarks', label: 'Viva', setupKey: 'viva' },
  { key: 'classTestMarks', label: 'Class Test', setupKey: 'classTest' },
  { key: 'attendanceMarks', label: 'Attendance', setupKey: 'attendance' },
];

function computeTotal(row: MarkRow, activeComponents: ComponentKey[]): number {
  return activeComponents.reduce((sum, key) => {
    const v = row[key];
    return sum + (typeof v === 'number' && !isNaN(v) ? v : 0);
  }, 0);
}

function computePct(total: number, fullMarks: number): number {
  if (!fullMarks) return 0;
  return parseFloat(((total / fullMarks) * 100).toFixed(1));
}

function gradeColor(grade: string | null): string {
  switch (grade) {
    case 'A+': return 'text-green-700 font-bold';
    case 'A': return 'text-green-600 font-bold';
    case 'B': return 'text-blue-600 font-bold';
    case 'C': return 'text-yellow-600 font-bold';
    case 'D': return 'text-orange-600 font-bold';
    case 'F': return 'text-red-600 font-bold';
    case 'AB': return 'text-gray-400';
    default: return 'text-gray-400';
  }
}

export default function MarksEntryPage() {
  const params = useParams();
  const router = useRouter();
  const setupId = params.setupId as string;

  const [setup, setSetup] = useState<Setup | null>(null);
  const [batchId, setBatchId] = useState('');
  const [batchStatus, setBatchStatus] = useState('');
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<MarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/teacher/marks-entry/${setupId}`);
        if (res.data.success) {
          setSetup(res.data.data.setup);
          setBatchId(res.data.data.batchId);
          setBatchStatus(res.data.data.batchStatus);
          setRows(res.data.data.rows);
          setSavedSnapshot(JSON.parse(JSON.stringify(res.data.data.rows)));
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load marks');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setupId]);

  const activeComponents = useMemo(
    () => setup ? COMPONENT_MAP.filter(c => (setup.components[c.setupKey] ?? 0) > 0) : [],
    [setup]
  );

  const isRowDirty = (row: MarkRow, idx: number): boolean => {
    const snap = savedSnapshot[idx];
    if (!snap) return true;
    if (row.isAbsent !== snap.isAbsent) return true;
    for (const c of activeComponents) {
      if (row[c.key] !== snap[c.key]) return true;
    }
    if (row.teacherRemark !== snap.teacherRemark) return true;
    return false;
  };

  const updateCell = useCallback((rowIdx: number, field: ComponentKey | 'isAbsent' | 'teacherRemark', value: any) => {
    setRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIdx] };

      if (field === 'isAbsent') {
        row.isAbsent = value as boolean;
      } else if (field === 'teacherRemark') {
        row.teacherRemark = value as string;
      } else {
        const numVal = value === '' || value === null ? null : parseFloat(value);
        (row as any)[field] = isNaN(numVal as number) ? null : numVal;
      }

      // Auto-compute total + %
      if (!row.isAbsent) {
        const comps = activeComponents;
        const total = comps.reduce((sum, c) => {
          const v = row[c.key];
          return sum + (typeof v === 'number' ? v : 0);
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
  }, [activeComponents]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    const colCount = activeComponents.length + 1; // +1 for remark
    let nextRow = rowIdx;
    let nextCol = colIdx;

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        nextCol = colIdx - 1;
        if (nextCol < 0) { nextCol = colCount - 1; nextRow = rowIdx - 1; }
      } else {
        nextCol = colIdx + 1;
        if (nextCol >= colCount) { nextCol = 0; nextRow = rowIdx + 1; }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      nextRow = rowIdx + 1;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = rowIdx + 1;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = rowIdx - 1;
    } else {
      return;
    }

    nextRow = Math.max(0, Math.min(nextRow, rows.length - 1));
    nextCol = Math.max(0, Math.min(nextCol, colCount - 1));
    const refKey = `${nextRow}-${nextCol}`;
    inputRefs.current.get(refKey)?.focus();
  };

  const handleSave = async () => {
    if (!batchId) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const entries = rows.map(row => ({
        studentId: row.studentId,
        isAbsent: row.isAbsent,
        theoryMarks: row.theoryMarks,
        mcqMarks: row.mcqMarks,
        practicalMarks: row.practicalMarks,
        vivaMarks: row.vivaMarks,
        classTestMarks: row.classTestMarks,
        attendanceMarks: row.attendanceMarks,
        teacherRemark: row.teacherRemark,
      }));
      await axios.post(`/api/teacher/marks-entry/${setupId}`, { batchId, entries });
      setSavedSnapshot(JSON.parse(JSON.stringify(rows)));
      setSaveMsg(`Saved ${rows.length} students successfully!`);
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (err: any) {
      setSaveMsg('Error: ' + (err.response?.data?.error || 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const dirtyCount = rows.filter((r, i) => isRowDirty(r, i)).length;
  const filledCount = rows.filter(r => r.isAbsent || activeComponents.some(c => r[c.key] !== null)).length;

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
        <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">← Back</button>
      </div>
    );
  }

  if (!setup) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-800 text-sm flex items-center gap-1"
          >
            ← Back
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div>
            <span className="font-semibold text-gray-800">{setup.subjectId?.name}</span>
            <span className="text-gray-400 mx-2">|</span>
            <span className="text-gray-600 text-sm">{setup.classId?.name}</span>
            <span className="text-gray-400 mx-2">|</span>
            <span className="text-gray-500 text-sm">{setup.examCycleId?.examName} {setup.examCycleId?.academicYear}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">{filledCount}</span>/{rows.length} filled
            {dirtyCount > 0 && (
              <span className="ml-2 text-orange-500 font-medium">• {dirtyCount} unsaved</span>
            )}
          </div>
          {saveMsg && (
            <span className={`text-sm font-medium ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || dirtyCount === 0}
            className={`px-5 py-2 rounded text-sm font-semibold transition-colors ${
              dirtyCount > 0 && !saving
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : dirtyCount > 0 ? `Save (${dirtyCount} changed)` : 'Saved ✓'}
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-blue-50 border-b border-blue-100 px-6 py-2 flex flex-wrap gap-6 text-xs text-blue-700">
        <span>Full Marks: <strong>{setup.fullMarks}</strong></span>
        <span>Pass Marks: <strong>{setup.passMarks}</strong></span>
        {activeComponents.map(c => (
          <span key={c.key}>{c.label}: <strong>{setup.components[c.setupKey]}</strong></span>
        ))}
        <span className="ml-auto text-blue-400">Use Tab/Enter/Arrow keys to navigate cells</span>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
          <table className="w-full border-collapse text-sm" style={{ minWidth: '700px' }}>
            <thead>
              <tr className="bg-gray-700 text-white text-xs uppercase tracking-wide">
                <th className="border border-gray-600 px-3 py-2 text-left w-10 sticky left-0 bg-gray-700 z-10">#</th>
                <th className="border border-gray-600 px-3 py-2 text-left w-12 sticky left-10 bg-gray-700 z-10">Roll</th>
                <th className="border border-gray-600 px-3 py-2 text-left min-w-[160px] sticky left-24 bg-gray-700 z-10">Student Name</th>
                <th className="border border-gray-600 px-3 py-2 text-center w-16">Absent</th>
                {activeComponents.map(c => (
                  <th key={c.key} className="border border-gray-600 px-2 py-1 text-center min-w-[80px]">
                    <div>{c.label}</div>
                    <div className="font-normal text-gray-300 text-xs normal-case">/{setup.components[c.setupKey]}</div>
                  </th>
                ))}
                <th className="border border-gray-600 px-2 py-1 text-center min-w-[80px]">
                  <div>Total</div>
                  <div className="font-normal text-gray-300 text-xs normal-case">/{setup.fullMarks}</div>
                </th>
                <th className="border border-gray-600 px-2 py-1 text-center min-w-[60px]">%</th>
                <th className="border border-gray-600 px-2 py-1 text-center w-12">Grade</th>
                <th className="border border-gray-600 px-3 py-2 text-left min-w-[140px]">Remark</th>
                <th className="border border-gray-600 px-2 py-1 text-center w-16">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={activeComponents.length + 8} className="text-center py-12 text-gray-400">
                    No students found for class <strong>{setup.classId?.name}</strong>.
                    <br />
                    <span className="text-xs mt-1 block">Make sure students are enrolled in this class via Student Management (Admin).</span>
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIdx) => {
                  const dirty = isRowDirty(row, rowIdx);
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
                    ? row.percentage >= 90 ? 'A+' : row.percentage >= 80 ? 'A' : row.percentage >= 70 ? 'B' : row.percentage >= 60 ? 'C' : row.percentage >= 50 ? 'D' : 'F'
                    : null;

                  return (
                    <tr key={row.studentId} className={`${rowBg} hover:brightness-95 transition-colors border-b border-gray-200`}>
                      {/* Row number */}
                      <td className="border-r border-gray-200 px-3 py-0 text-center text-gray-400 sticky left-0 bg-inherit z-10 text-xs">
                        {rowIdx + 1}
                      </td>
                      {/* Roll No */}
                      <td className="border-r border-gray-200 px-3 py-0 text-center text-gray-500 sticky left-10 bg-inherit z-10 text-xs font-mono">
                        {row.rollNo || '-'}
                      </td>
                      {/* Name */}
                      <td className="border-r border-gray-200 px-3 py-1.5 font-medium text-gray-800 sticky left-24 bg-inherit z-10">
                        {row.name}
                        {dirty && !row.isAbsent && (
                          <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-orange-400 align-middle" title="Unsaved changes" />
                        )}
                      </td>
                      {/* Absent checkbox */}
                      <td className="border-r border-gray-200 px-3 py-0 text-center">
                        <input
                          type="checkbox"
                          checked={row.isAbsent}
                          onChange={e => updateCell(rowIdx, 'isAbsent', e.target.checked)}
                          className="w-4 h-4 cursor-pointer accent-red-500"
                        />
                      </td>
                      {/* Component mark cells */}
                      {activeComponents.map((comp, colIdx) => {
                        const maxVal = setup.components[comp.setupKey] ?? 0;
                        const val = row[comp.key];
                        const isOver = typeof val === 'number' && val > maxVal;
                        return (
                          <td key={comp.key} className="border-r border-gray-200 p-0">
                            <input
                              ref={el => {
                                const k = `${rowIdx}-${colIdx}`;
                                if (el) inputRefs.current.set(k, el);
                                else inputRefs.current.delete(k);
                              }}
                              type="number"
                              min={0}
                              max={maxVal}
                              step="0.5"
                              disabled={row.isAbsent}
                              value={val === null || val === undefined ? '' : String(val)}
                              onChange={e => updateCell(rowIdx, comp.key, e.target.value)}
                              onKeyDown={e => handleKeyDown(e, rowIdx, colIdx)}
                              className={`w-full h-9 px-2 text-center text-sm outline-none border-0 bg-transparent focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-400 disabled:opacity-40 disabled:cursor-not-allowed
                                ${isOver ? 'text-red-600 font-bold' : 'text-gray-800'}
                                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                              placeholder="-"
                            />
                          </td>
                        );
                      })}
                      {/* Total */}
                      <td className="border-r border-gray-200 px-3 py-1.5 text-center font-semibold text-gray-700 bg-gray-50">
                        {displayTotal}
                      </td>
                      {/* % */}
                      <td className="border-r border-gray-200 px-3 py-1.5 text-center text-gray-600 bg-gray-50">
                        {displayPct}
                      </td>
                      {/* Grade */}
                      <td className="border-r border-gray-200 px-3 py-1.5 text-center bg-gray-50">
                        <span className={grade ? gradeColor(grade) : 'text-gray-300'}>
                          {grade || '-'}
                        </span>
                      </td>
                      {/* Remark input */}
                      <td className="border-r border-gray-200 p-0">
                        <input
                          ref={el => {
                            const k = `${rowIdx}-${activeComponents.length}`;
                            if (el) inputRefs.current.set(k, el);
                            else inputRefs.current.delete(k);
                          }}
                          type="text"
                          value={row.teacherRemark}
                          onChange={e => updateCell(rowIdx, 'teacherRemark', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, rowIdx, activeComponents.length)}
                          placeholder="Optional remark..."
                          className="w-full h-9 px-2 text-xs outline-none border-0 bg-transparent focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-400 text-gray-600"
                        />
                      </td>
                      {/* Save status */}
                      <td className="px-2 py-1.5 text-center">
                        {dirty ? (
                          <span className="text-xs text-orange-500 font-medium">●</span>
                        ) : row.isSaved || !dirty ? (
                          <span className="text-xs text-green-500">✓</span>
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
                  {activeComponents.map(c => {
                    const vals = rows.filter(r => !r.isAbsent && r[c.key] !== null).map(r => r[c.key] as number);
                    const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-';
                    return (
                      <td key={c.key} className="px-2 py-2 text-center text-xs text-gray-500">
                        avg: {avg}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    {(() => {
                      const vals = rows.filter(r => !r.isAbsent && r.totalMarks !== null).map(r => r.totalMarks as number);
                      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-';
                    })()}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {(() => {
                      const vals = rows.filter(r => !r.isAbsent && r.percentage !== null).map(r => r.percentage as number);
                      return vals.length ? `${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)}%` : '-';
                    })()}
                  </td>
                  <td colSpan={3} className="px-3 py-2 text-center text-xs text-gray-500">
                    Pass: {rows.filter(r => !r.isAbsent && r.percentage !== null && r.percentage >= (setup.passMarks / setup.fullMarks) * 100).length} |
                    Fail: {rows.filter(r => !r.isAbsent && r.percentage !== null && r.percentage < (setup.passMarks / setup.fullMarks) * 100).length} |
                    Absent: {rows.filter(r => r.isAbsent).length}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Bottom save bar */}
        {rows.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <p className="text-xs text-gray-400">
              Orange dot (●) = unsaved changes &nbsp;|&nbsp; Green tick (✓) = saved &nbsp;|&nbsp; Cells turn blue when focused
            </p>
            <button
              onClick={handleSave}
              disabled={saving || dirtyCount === 0}
              className={`px-8 py-2.5 rounded font-semibold text-sm shadow transition-colors ${
                dirtyCount > 0 && !saving
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : dirtyCount > 0 ? `Save All Changes (${dirtyCount} rows)` : 'All Saved ✓'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
