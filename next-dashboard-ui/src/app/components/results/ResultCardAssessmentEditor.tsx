'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

interface SubjectSetupItem {
  _id: string;
  classId?: { _id?: string; name?: string };
}

interface ResultCardAssessmentEditorProps {
  examCycleId: string;
  subjectSetups?: SubjectSetupItem[];
  classOptions?: Array<{ _id: string; name: string }>;
  apiPath?: string;
  title?: string;
  description?: string;
  initialClassId?: string;
}

interface TemplateRow {
  key: string;
  label: string;
}

interface StudentAssessmentRow {
  studentId: string;
  name: string;
  rollNo: string;
  coScholasticValues: Record<string, string>;
  disciplineValues: Record<string, string>;
}

const ASSESSMENT_VALUE_OPTIONS = [
  'A+',
  'A',
  'B+',
  'B',
  'C',
  'D',
  'Excellent',
  'Very Good',
  'Good',
  'Satisfactory',
  'Needs Improvement',
];

export default function ResultCardAssessmentEditor({
  examCycleId,
  subjectSetups = [],
  classOptions,
  apiPath = '/api/admin/result-card-assessments',
  title = 'Co-Scholastic and Discipline Entry',
  description = 'Admin can now save the non-academic values that appear on the final result card.',
  initialClassId = '',
}: ResultCardAssessmentEditorProps) {
  const availableClassOptions = useMemo(() => {
    if (Array.isArray(classOptions) && classOptions.length > 0) {
      return classOptions;
    }

    const seen = new Set<string>();

    return subjectSetups
      .map((setup) => {
        const classId = setup.classId?._id || '';
        const name = setup.classId?.name || '';

        if (!classId || !name || seen.has(classId)) {
          return null;
        }

        seen.add(classId);
        return { _id: classId, name };
      })
      .filter(Boolean) as Array<{ _id: string; name: string }>;
  }, [classOptions, subjectSetups]);

  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [coScholasticRows, setCoScholasticRows] = useState<TemplateRow[]>([]);
  const [disciplineRows, setDisciplineRows] = useState<TemplateRow[]>([]);
  const [students, setStudents] = useState<StudentAssessmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (!selectedClassId && availableClassOptions.length > 0) {
      setSelectedClassId(initialClassId || availableClassOptions[0]._id);
    }
  }, [availableClassOptions, initialClassId, selectedClassId]);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedClassId) return;

      try {
        setLoading(true);
        setStatusMessage('');
        const response = await axios.get(
          `${apiPath}?examCycleId=${examCycleId}&classId=${selectedClassId}`,
          { timeout: 15000 }
        );

        if (response.data?.success) {
          setCoScholasticRows(response.data.data?.template?.coScholasticRows || []);
          setDisciplineRows(response.data.data?.template?.disciplineRows || []);
          setStudents(Array.isArray(response.data.data?.students) ? response.data.data.students : []);
        }
      } catch (err: any) {
        setStatusTone('error');
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          setStatusMessage('Session/role mismatch. Sign in again with the correct account and retry.');
        } else if (err?.code === 'ECONNABORTED') {
          setStatusMessage('Request timed out while loading assessments. Please refresh and try again.');
        } else {
          setStatusMessage(err.response?.data?.error || 'Failed to load student report-card assessments');
        }
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [apiPath, examCycleId, selectedClassId]);

  const updateStudentValue = (
    studentId: string,
    collection: 'coScholasticValues' | 'disciplineValues',
    key: string,
    value: string
  ) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.studentId === studentId
          ? {
              ...student,
              [collection]: {
                ...student[collection],
                [key]: value,
              },
            }
          : student
      )
    );
  };

  const buildOptions = (value?: string) => {
    const normalized = (value || '').trim();
    if (normalized && !ASSESSMENT_VALUE_OPTIONS.includes(normalized)) {
      return [normalized, ...ASSESSMENT_VALUE_OPTIONS];
    }
    return ASSESSMENT_VALUE_OPTIONS;
  };

  const handleSave = async () => {
    if (!selectedClassId) return;

    try {
      setSaving(true);
      setStatusMessage('');
      const response = await axios.put(apiPath, {
        examCycleId,
        classId: selectedClassId,
        assessments: students.map((student) => ({
          studentId: student.studentId,
          coScholasticValues: student.coScholasticValues,
          disciplineValues: student.disciplineValues,
        })),
      }, { timeout: 15000 });

      setStudents(Array.isArray(response.data?.data) ? response.data.data : students);
      setStatusTone('success');
      setStatusMessage('Report-card assessment values saved');
    } catch (err: any) {
      setStatusTone('error');
      setStatusMessage(err.response?.data?.error || 'Failed to save report-card assessment values');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            {availableClassOptions.length === 0 ? (
              <option value="">No class available</option>
            ) : (
              availableClassOptions.map((option) => (
                <option key={option._id} value={option._id}>
                  {option.name}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selectedClassId || students.length === 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Values'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            statusTone === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {statusMessage}
        </div>
      )}

      {availableClassOptions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
          Create subject setups for this exam cycle first so classes and students can be selected.
        </div>
      ) : loading ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
          Loading class assessments...
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
          No active students found for this class in the selected exam cycle.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Use the dropdown values for consistent report-card formatting.
          </div>

          {students.map((student) => (
            <div key={student.studentId} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-slate-900">{student.name}</h4>
                  <p className="text-xs text-slate-500">Roll: {student.rollNo || '-'}</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <h5 className="mb-3 text-sm font-semibold text-slate-800">Co-Scholastic</h5>
                  <div className="space-y-3">
                    {coScholasticRows.map((row) => (
                      <label key={row.key} className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {row.label}
                        </span>
                        <select
                          value={student.coScholasticValues?.[row.key] || ''}
                          onChange={(event) =>
                            updateStudentValue(
                              student.studentId,
                              'coScholasticValues',
                              row.key,
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Select value</option>
                          {buildOptions(student.coScholasticValues?.[row.key]).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <h5 className="mb-3 text-sm font-semibold text-slate-800">Discipline</h5>
                  <div className="space-y-3">
                    {disciplineRows.map((row) => (
                      <label key={row.key} className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {row.label}
                        </span>
                        <select
                          value={student.disciplineValues?.[row.key] || ''}
                          onChange={(event) =>
                            updateStudentValue(
                              student.studentId,
                              'disciplineValues',
                              row.key,
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Select value</option>
                          {buildOptions(student.disciplineValues?.[row.key]).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
