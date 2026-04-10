'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import ResultCardView from '@/app/components/results/ResultCardView';

interface SubjectOption {
  _id: string;
  name: string;
  code?: string;
}

interface SubjectSetupItem {
  _id: string;
  subjectId?: { _id?: string; name?: string };
}

interface ResultCardTemplateEditorProps {
  examCycleId: string;
  academicYear?: string;
  subjects: SubjectOption[];
  subjectSetups: SubjectSetupItem[];
}

interface TemplateRow {
  key: string;
  label: string;
  subjectId?: string;
}

interface TemplateFormState {
  schoolName: string;
  affiliationLine: string;
  contactLine: string;
  cardTitle: string;
  sessionLabel: string;
  promotionMessage: string;
  classTeacherSignatureLabel: string;
  principalSignatureLabel: string;
  studentFieldLabels: {
    name: string;
    rollNumber: string;
    guardianPrimary: string;
    guardianSecondary: string;
    dateOfBirth: string;
    admissionNo: string;
  };
  summaryFieldLabels: {
    totalMarks: string;
    percentage: string;
    grade: string;
    rank: string;
  };
  colors: {
    headerStart: string;
    headerEnd: string;
    frame: string;
    accent: string;
    tableHeader: string;
    summaryOne: string;
    summaryTwo: string;
    summaryThree: string;
    summaryFour: string;
    coScholastic: string;
    discipline: string;
    watermark: string;
  };
  subjectRows: TemplateRow[];
  coScholasticRows: TemplateRow[];
  disciplineRows: TemplateRow[];
}

const DEFAULT_COLORS = {
  headerStart: '#8f1d1d',
  headerEnd: '#d64242',
  frame: '#d7c6a1',
  accent: '#7c3aed',
  tableHeader: '#efe2b5',
  summaryOne: '#16a34a',
  summaryTwo: '#ea580c',
  summaryThree: '#2563eb',
  summaryFour: '#db2777',
  coScholastic: '#d18f1f',
  discipline: '#d61f92',
  watermark: '#f6edd7',
};

function createKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRow(prefix: string, label = '', subjectId = '', explicitKey?: string): TemplateRow {
  return {
    key: explicitKey || (subjectId ? `${prefix}-${subjectId}` : createKey(prefix)),
    label,
    subjectId: subjectId || undefined,
  };
}

function buildInitialState(academicYear?: string): TemplateFormState {
  return {
    schoolName: 'Your School Name',
    affiliationLine: 'Affiliation and contact details',
    contactLine: '',
    cardTitle: 'Academic Record',
    sessionLabel: academicYear || '',
    promotionMessage: 'Congratulations! Result published successfully.',
    classTeacherSignatureLabel: "Class Teacher's Signature",
    principalSignatureLabel: "Principal's Signature",
    studentFieldLabels: {
      name: 'Student Name',
      rollNumber: 'Roll No.',
      guardianPrimary: "Guardian's Name",
      guardianSecondary: 'Secondary Guardian',
      dateOfBirth: 'Date of Birth',
      admissionNo: 'Admission No.',
    },
    summaryFieldLabels: {
      totalMarks: 'Overall Marks',
      percentage: 'Percentage',
      grade: 'Grade',
      rank: 'Rank',
    },
    colors: { ...DEFAULT_COLORS },
    subjectRows: [],
    coScholasticRows: [
      createRow('co', 'Activity', '', 'activity'),
      createRow('co', 'Work Education', '', 'work-education'),
      createRow('co', 'Art Education', '', 'art-education'),
      createRow('co', 'Health Physical Education', '', 'health-education'),
      createRow('co', 'Social Skills', '', 'social-skills'),
      createRow('co', 'Sports', '', 'sports'),
    ],
    disciplineRows: [
      createRow('discipline', 'Regularity & Punctuality', '', 'punctuality'),
      createRow('discipline', 'Sincerity', '', 'sincerity'),
      createRow('discipline', 'Behaviour & Values', '', 'values'),
      createRow('discipline', 'Respect for Rules', '', 'respect'),
      createRow('discipline', 'Attitude Towards Teachers', '', 'teachers'),
      createRow('discipline', 'Attitude Towards Society', '', 'society'),
    ],
  };
}

export default function ResultCardTemplateEditor({
  examCycleId,
  academicYear,
  subjects,
  subjectSetups,
}: ResultCardTemplateEditorProps) {
  const [form, setForm] = useState<TemplateFormState>(() => buildInitialState(academicYear));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success');

  const availableSubjectRows = useMemo(() => {
    const seen = new Set<string>();

    return subjectSetups
      .map((setup) => {
        const subjectId = setup.subjectId?._id || '';
        const label = setup.subjectId?.name || '';

        if (!subjectId || !label || seen.has(subjectId)) {
          return null;
        }

        seen.add(subjectId);

        return createRow('subject', label, subjectId);
      })
      .filter(Boolean) as TemplateRow[];
  }, [subjectSetups]);

  const previewData = useMemo(() => {
    const subjectRows = (form.subjectRows.length > 0 ? form.subjectRows : availableSubjectRows).map(
      (row, index) => ({
        key: row.key,
        label: row.label || `Subject ${index + 1}`,
        hasResult: true,
        obtained: 70 + (index % 4) * 6,
        fullMarks: 100,
        percentage: 70 + (index % 4) * 6,
        grade:
          index % 4 === 0 ? 'A+' : index % 4 === 1 ? 'A' : index % 4 === 2 ? 'B' : 'C',
        isPassed: true,
      })
    );

    return {
      template: {
        ...form,
      },
      examCycle: {
        examName: 'Preview Exam',
        academicYear: form.sessionLabel || academicYear || '-',
        termName: 'Preview Term',
        examType: 'term',
      },
      student: {
        name: 'Preview Student',
        rollNo: '12',
        className: 'Preview Class',
        classCode: 'A',
        dateOfBirth: '2016-01-12',
        guardianPrimaryName: 'Preview Guardian',
        admissionNo: 'ADM1234',
      },
      result: {
        totalObtained: subjectRows.reduce((sum, row) => sum + row.obtained, 0),
        totalFullMarks: subjectRows.length * 100,
        percentage:
          subjectRows.length > 0
            ? subjectRows.reduce((sum, row) => sum + row.percentage, 0) / subjectRows.length
            : 0,
        overallGrade: 'A',
        classRank: 3,
        classTotal: 42,
        gpa: 4.67,
        publishedAt: new Date().toISOString(),
        promotionStatus: 'promoted',
        message: form.promotionMessage,
      },
      subjectRows,
      coScholasticRows: form.coScholasticRows.map((row, index) => ({
        key: row.key,
        label: row.label,
        value: index % 2 === 0 ? 'A' : 'Excellent',
      })),
      disciplineRows: form.disciplineRows.map((row, index) => ({
        key: row.key,
        label: row.label,
        value: index % 2 === 0 ? 'A' : 'Good',
      })),
    };
  }, [academicYear, availableSubjectRows, form]);

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);
        setStatusMessage('');
        const response = await axios.get(
          `/api/admin/result-card-template?examCycleId=${examCycleId}`
        );

        if (response.data?.success) {
          const data = response.data.data || {};
          setForm({
            ...buildInitialState(academicYear),
            ...data,
            colors: {
              ...DEFAULT_COLORS,
              ...(data.colors || {}),
            },
            subjectRows: Array.isArray(data.subjectRows)
              ? data.subjectRows.map((row: any) =>
                  createRow('subject', row.label || '', row.subjectId || '', row.key || undefined)
                )
              : [],
            coScholasticRows: Array.isArray(data.coScholasticRows)
              ? data.coScholasticRows.map((row: any) =>
                  createRow('co', row.label || '', '', row.key || undefined)
                )
              : buildInitialState(academicYear).coScholasticRows,
            disciplineRows: Array.isArray(data.disciplineRows)
              ? data.disciplineRows.map((row: any) =>
                  createRow('discipline', row.label || '', '', row.key || undefined)
                )
              : buildInitialState(academicYear).disciplineRows,
          });
        }
      } catch (err: any) {
        setStatusTone('error');
        setStatusMessage(err.response?.data?.error || 'Failed to load result card template');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [academicYear, examCycleId]);

  const updateField = <K extends keyof TemplateFormState>(field: K, value: TemplateFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateStudentLabel = (field: keyof TemplateFormState['studentFieldLabels'], value: string) => {
    setForm((prev) => ({
      ...prev,
      studentFieldLabels: {
        ...prev.studentFieldLabels,
        [field]: value,
      },
    }));
  };

  const updateSummaryLabel = (field: keyof TemplateFormState['summaryFieldLabels'], value: string) => {
    setForm((prev) => ({
      ...prev,
      summaryFieldLabels: {
        ...prev.summaryFieldLabels,
        [field]: value,
      },
    }));
  };

  const updateColor = (field: keyof TemplateFormState['colors'], value: string) => {
    setForm((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [field]: value,
      },
    }));
  };

  const updateRow = (
    collection: 'subjectRows' | 'coScholasticRows' | 'disciplineRows',
    index: number,
    field: 'label' | 'subjectId',
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [collection]: prev[collection].map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value || undefined,
              ...(field === 'label' ? {} : {}),
            }
          : row
      ),
    }));
  };

  const addRow = (collection: 'subjectRows' | 'coScholasticRows' | 'disciplineRows') => {
    const nextRow =
      collection === 'subjectRows'
        ? createRow('subject')
        : collection === 'coScholasticRows'
          ? createRow('co')
          : createRow('discipline');

    setForm((prev) => ({
      ...prev,
      [collection]: [...prev[collection], nextRow],
    }));
  };

  const removeRow = (
    collection: 'subjectRows' | 'coScholasticRows' | 'disciplineRows',
    index: number
  ) => {
    setForm((prev) => ({
      ...prev,
      [collection]: prev[collection].filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const useSavedSubjects = () => {
    setForm((prev) => ({
      ...prev,
      subjectRows:
        availableSubjectRows.length > 0 ? availableSubjectRows : [createRow('subject', 'Subject')],
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatusMessage('');

      const payload = {
        examCycleId,
        ...form,
        subjectRows: form.subjectRows.filter((row) => row.label.trim()),
        coScholasticRows: form.coScholasticRows.filter((row) => row.label.trim()),
        disciplineRows: form.disciplineRows.filter((row) => row.label.trim()),
      };

      await axios.put('/api/admin/result-card-template', payload);

      setStatusTone('success');
      setStatusMessage('Result card template saved');
    } catch (err: any) {
      setStatusTone('error');
      setStatusMessage(err.response?.data?.error || 'Failed to save result card template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">Loading result card template...</div>;
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Result Card Template</h3>
          <p className="text-sm text-slate-500">
            Admin can customize the final published report card design, colors, and manual subject rows here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={useSavedSubjects}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            Use Saved Subjects
          </button>
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            {showPreview ? 'Hide Preview' : 'Preview Template'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Template'}
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

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            School Name
          </label>
          <input
            value={form.schoolName}
            onChange={(event) => updateField('schoolName', event.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Card Title
          </label>
          <input
            value={form.cardTitle}
            onChange={(event) => updateField('cardTitle', event.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Affiliation Line
          </label>
          <input
            value={form.affiliationLine}
            onChange={(event) => updateField('affiliationLine', event.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Contact Line
          </label>
          <input
            value={form.contactLine}
            onChange={(event) => updateField('contactLine', event.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Session Label
          </label>
          <input
            value={form.sessionLabel}
            onChange={(event) => updateField('sessionLabel', event.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Promotion Message
          </label>
          <input
            value={form.promotionMessage}
            onChange={(event) => updateField('promotionMessage', event.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h4 className="mb-3 text-sm font-bold text-slate-900">Student Field Labels</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(form.studentFieldLabels).map(([key, value]) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {key}
                </label>
                <input
                  value={value}
                  onChange={(event) =>
                    updateStudentLabel(
                      key as keyof TemplateFormState['studentFieldLabels'],
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h4 className="mb-3 text-sm font-bold text-slate-900">Summary Labels</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(form.summaryFieldLabels).map(([key, value]) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {key}
                </label>
                <input
                  value={value}
                  onChange={(event) =>
                    updateSummaryLabel(
                      key as keyof TemplateFormState['summaryFieldLabels'],
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border bg-white p-4">
        <h4 className="mb-3 text-sm font-bold text-slate-900">Color Palette</h4>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Object.entries(form.colors).map(([key, value]) => (
            <label key={key} className="rounded-lg border px-3 py-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {key}
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={value}
                  onChange={(event) =>
                    updateColor(key as keyof TemplateFormState['colors'], event.target.value)
                  }
                  className="h-10 w-14 rounded border"
                />
                <input
                  value={value}
                  onChange={(event) =>
                    updateColor(key as keyof TemplateFormState['colors'], event.target.value)
                  }
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">Subject Rows</h4>
          <button
            type="button"
            onClick={() => addRow('subjectRows')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            Add Subject Row
          </button>
        </div>

        <div className="space-y-3">
          {form.subjectRows.length === 0 ? (
            <p className="text-sm text-slate-500">
              No subject rows yet. Add them manually or use the saved subject setups.
            </p>
          ) : (
            form.subjectRows.map((row, index) => (
              <div key={row.key} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.2fr_1fr_auto]">
                <input
                  value={row.label}
                  onChange={(event) => updateRow('subjectRows', index, 'label', event.target.value)}
                  placeholder="Subject label"
                  className="rounded-lg border px-3 py-2"
                />
                <select
                  value={row.subjectId || ''}
                  onChange={(event) => {
                    const nextSubjectId = event.target.value;
                    const selectedSubject = subjects.find((item) => item._id === nextSubjectId);

                    setForm((prev) => ({
                      ...prev,
                      subjectRows: prev.subjectRows.map((currentRow, currentIndex) =>
                        currentIndex === index
                          ? {
                              ...currentRow,
                              subjectId: nextSubjectId || undefined,
                              label: currentRow.label.trim()
                                ? currentRow.label
                                : selectedSubject?.name || currentRow.label,
                            }
                          : currentRow
                      ),
                    }));
                  }}
                  className="rounded-lg border px-3 py-2"
                >
                  <option value="">Custom / manual row</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name}
                      {subject.code ? ` (${subject.code})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeRow('subjectRows', index)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">Co-Scholastic Rows</h4>
            <button
              type="button"
              onClick={() => addRow('coScholasticRows')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              Add Row
            </button>
          </div>
          <div className="space-y-3">
            {form.coScholasticRows.map((row, index) => (
              <div key={row.key} className="flex gap-2">
                <input
                  value={row.label}
                  onChange={(event) =>
                    updateRow('coScholasticRows', index, 'label', event.target.value)
                  }
                  className="flex-1 rounded-lg border px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => removeRow('coScholasticRows', index)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">Discipline Rows</h4>
            <button
              type="button"
              onClick={() => addRow('disciplineRows')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              Add Row
            </button>
          </div>
          <div className="space-y-3">
            {form.disciplineRows.map((row, index) => (
              <div key={row.key} className="flex gap-2">
                <input
                  value={row.label}
                  onChange={(event) =>
                    updateRow('disciplineRows', index, 'label', event.target.value)
                  }
                  className="flex-1 rounded-lg border px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => removeRow('disciplineRows', index)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3">
            <h4 className="text-sm font-bold text-slate-900">Template Preview</h4>
            <p className="text-sm text-slate-500">
              This is a live preview of the current form values before saving.
            </p>
          </div>
          <ResultCardView data={previewData} showActions={false} />
        </div>
      )}
    </div>
  );
}
