import ExamCycle from '@/lib/models/ExamCycle';
import ExamSubjectSetup from '@/lib/models/ExamSubjectSetup';
import ResultCardAssessment from '@/lib/models/ResultCardAssessment';
import ResultCardTemplate from '@/lib/models/ResultCardTemplate';
import ResultSummary from '@/lib/models/ResultSummary';
import Student from '@/lib/models/Student';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import User from '@/lib/models/User';
import { getGrade } from '@/lib/marks-utils';
import { getCandidateAcademicYears } from '@/lib/subjectAssignment';
import mongoose from 'mongoose';

export const DEFAULT_RESULT_CARD_COLORS = {
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

const DEFAULT_CO_SCHOLASTIC_ROWS = [
  { key: 'activity', label: 'Activity' },
  { key: 'work-education', label: 'Work Education' },
  { key: 'art-education', label: 'Art Education' },
  { key: 'health-education', label: 'Health Physical Education' },
  { key: 'social-skills', label: 'Social Skills' },
  { key: 'sports', label: 'Sports' },
];

const DEFAULT_DISCIPLINE_ROWS = [
  { key: 'punctuality', label: 'Regularity & Punctuality' },
  { key: 'sincerity', label: 'Sincerity' },
  { key: 'values', label: 'Behaviour & Values' },
  { key: 'respect', label: 'Respect for Rules' },
  { key: 'teachers', label: 'Attitude Towards Teachers' },
  { key: 'society', label: 'Attitude Towards Society' },
];

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

function sanitizeColor(value: unknown, fallback: string): string {
  const candidate = String(value || '').trim();
  return HEX_COLOR_PATTERN.test(candidate) ? candidate : fallback;
}

function normalizeTextRows(
  rows: unknown,
  prefix: string,
  fallbackRows: Array<{ key: string; label: string }>
) {
  if (!Array.isArray(rows)) {
    return fallbackRows;
  }

  const nextRows = rows
    .map((row, index) => {
      if (!row || typeof row !== 'object') return null;

      const label = String((row as Record<string, unknown>).label || '').trim();
      if (!label) return null;

      const keyCandidate = String((row as Record<string, unknown>).key || '').trim();

      return {
        key: keyCandidate || `${prefix}-${index + 1}`,
        label,
      };
    })
    .filter(Boolean) as Array<{ key: string; label: string }>;

  return nextRows.length > 0 ? nextRows : fallbackRows;
}

function normalizeStoredValues(values: unknown) {
  if (values instanceof Map) {
    return Array.from(values.entries()).reduce<Record<string, string>>((accumulator, [key, rawValue]) => {
      const value = String(rawValue || '').trim();
      if (!value) return accumulator;

      accumulator[String(key)] = value;
      return accumulator;
    }, {});
  }

  if (!values || typeof values !== 'object') {
    return {} as Record<string, string>;
  }

  return Object.entries(values as Record<string, unknown>).reduce<Record<string, string>>(
    (accumulator, [key, rawValue]) => {
      const value = String(rawValue || '').trim();
      if (!value) return accumulator;

      accumulator[key] = value;
      return accumulator;
    },
    {}
  );
}

function normalizeSubjectRows(rows: unknown) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row, index) => {
      if (!row || typeof row !== 'object') return null;

      const rawRow = row as Record<string, unknown>;
      const label = String(rawRow.label || '').trim();
      if (!label) return null;

      const keyCandidate = String(rawRow.key || '').trim();
      const subjectIdCandidate = String(rawRow.subjectId || '').trim();

      return {
        key: keyCandidate || `subject-${index + 1}`,
        label,
        subjectId: mongoose.Types.ObjectId.isValid(subjectIdCandidate)
          ? subjectIdCandidate
          : undefined,
      };
    })
    .filter(Boolean) as Array<{ key: string; label: string; subjectId?: string }>;
}

export async function buildDefaultResultCardTemplate(examCycleId: string) {
  const [examCycle, setups] = await Promise.all([
    ExamCycle.findById(examCycleId).lean(),
    ExamSubjectSetup.find({ examCycleId })
      .populate('subjectId', 'name')
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  const seenSubjectIds = new Set<string>();
  const subjectRows = setups
    .map((setup: any, index: number) => {
      const subjectId = setup.subjectId?._id ? String(setup.subjectId._id) : String(setup.subjectId || '');
      const label = String(setup.subjectId?.name || '').trim();

      if (!subjectId || !label || seenSubjectIds.has(subjectId)) {
        return null;
      }

      seenSubjectIds.add(subjectId);

      return {
        key: `subject-${index + 1}`,
        label,
        subjectId,
      };
    })
    .filter(Boolean) as Array<{ key: string; label: string; subjectId: string }>;

  return {
    examCycleId,
    schoolName: 'Your School Name',
    affiliationLine: 'Affiliation and contact details',
    contactLine: '',
    cardTitle: 'Academic Record',
    sessionLabel: String(examCycle?.academicYear || ''),
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
    colors: { ...DEFAULT_RESULT_CARD_COLORS },
    subjectRows,
    coScholasticRows: DEFAULT_CO_SCHOLASTIC_ROWS,
    disciplineRows: DEFAULT_DISCIPLINE_ROWS,
    isDefault: true,
  };
}

export async function getResolvedResultCardTemplate(examCycleId: string) {
  const storedTemplate = await ResultCardTemplate.findOne({ examCycleId }).lean();

  if (!storedTemplate) {
    return buildDefaultResultCardTemplate(examCycleId);
  }

  return {
    ...storedTemplate,
    colors: {
      ...DEFAULT_RESULT_CARD_COLORS,
      ...(storedTemplate.colors || {}),
    },
    coScholasticRows: normalizeTextRows(
      storedTemplate.coScholasticRows,
      'co-scholastic',
      DEFAULT_CO_SCHOLASTIC_ROWS
    ),
    disciplineRows: normalizeTextRows(
      storedTemplate.disciplineRows,
      'discipline',
      DEFAULT_DISCIPLINE_ROWS
    ),
    subjectRows: normalizeSubjectRows(storedTemplate.subjectRows),
    isDefault: false,
  };
}

export function normalizeResultCardTemplateInput(payload: Record<string, unknown>) {
  const studentFieldLabels = payload.studentFieldLabels as Record<string, unknown> | undefined;
  const summaryFieldLabels = payload.summaryFieldLabels as Record<string, unknown> | undefined;
  const colors = payload.colors as Record<string, unknown> | undefined;

  return {
    schoolName: String(payload.schoolName || '').trim() || 'Your School Name',
    affiliationLine: String(payload.affiliationLine || '').trim(),
    contactLine: String(payload.contactLine || '').trim(),
    cardTitle: String(payload.cardTitle || '').trim() || 'Academic Record',
    sessionLabel: String(payload.sessionLabel || '').trim(),
    promotionMessage:
      String(payload.promotionMessage || '').trim() || 'Congratulations! Result published successfully.',
    classTeacherSignatureLabel:
      String(payload.classTeacherSignatureLabel || '').trim() || "Class Teacher's Signature",
    principalSignatureLabel:
      String(payload.principalSignatureLabel || '').trim() || "Principal's Signature",
    studentFieldLabels: {
      name: String(studentFieldLabels?.name || '').trim() || 'Student Name',
      rollNumber: String(studentFieldLabels?.rollNumber || '').trim() || 'Roll No.',
      guardianPrimary:
        String(studentFieldLabels?.guardianPrimary || '').trim() || "Guardian's Name",
      guardianSecondary:
        String(studentFieldLabels?.guardianSecondary || '').trim() || 'Secondary Guardian',
      dateOfBirth: String(studentFieldLabels?.dateOfBirth || '').trim() || 'Date of Birth',
      admissionNo: String(studentFieldLabels?.admissionNo || '').trim() || 'Admission No.',
    },
    summaryFieldLabels: {
      totalMarks: String(summaryFieldLabels?.totalMarks || '').trim() || 'Overall Marks',
      percentage: String(summaryFieldLabels?.percentage || '').trim() || 'Percentage',
      grade: String(summaryFieldLabels?.grade || '').trim() || 'Grade',
      rank: String(summaryFieldLabels?.rank || '').trim() || 'Rank',
    },
    colors: {
      headerStart: sanitizeColor(colors?.headerStart, DEFAULT_RESULT_CARD_COLORS.headerStart),
      headerEnd: sanitizeColor(colors?.headerEnd, DEFAULT_RESULT_CARD_COLORS.headerEnd),
      frame: sanitizeColor(colors?.frame, DEFAULT_RESULT_CARD_COLORS.frame),
      accent: sanitizeColor(colors?.accent, DEFAULT_RESULT_CARD_COLORS.accent),
      tableHeader: sanitizeColor(colors?.tableHeader, DEFAULT_RESULT_CARD_COLORS.tableHeader),
      summaryOne: sanitizeColor(colors?.summaryOne, DEFAULT_RESULT_CARD_COLORS.summaryOne),
      summaryTwo: sanitizeColor(colors?.summaryTwo, DEFAULT_RESULT_CARD_COLORS.summaryTwo),
      summaryThree: sanitizeColor(colors?.summaryThree, DEFAULT_RESULT_CARD_COLORS.summaryThree),
      summaryFour: sanitizeColor(colors?.summaryFour, DEFAULT_RESULT_CARD_COLORS.summaryFour),
      coScholastic: sanitizeColor(colors?.coScholastic, DEFAULT_RESULT_CARD_COLORS.coScholastic),
      discipline: sanitizeColor(colors?.discipline, DEFAULT_RESULT_CARD_COLORS.discipline),
      watermark: sanitizeColor(colors?.watermark, DEFAULT_RESULT_CARD_COLORS.watermark),
    },
    subjectRows: normalizeSubjectRows(payload.subjectRows),
    coScholasticRows: normalizeTextRows(
      payload.coScholasticRows,
      'co-scholastic',
      DEFAULT_CO_SCHOLASTIC_ROWS
    ),
    disciplineRows: normalizeTextRows(
      payload.disciplineRows,
      'discipline',
      DEFAULT_DISCIPLINE_ROWS
    ),
  };
}

export async function buildResultCardPayload(studentId: string, examCycleId: string) {
  const [resultSummary, examCycle, student, template, assessment] = await Promise.all([
    ResultSummary.findOne({ studentId, examCycleId }).lean(),
    ExamCycle.findById(examCycleId).lean(),
    Student.findById(studentId).lean(),
    getResolvedResultCardTemplate(examCycleId),
    ResultCardAssessment.findOne({ examCycleId, studentId }).lean(),
  ]);

  if (!resultSummary) {
    throw new Error('Published result not found for this student and exam');
  }

  if (!examCycle) {
    throw new Error('Exam cycle not found');
  }

  if (!student) {
    throw new Error('Student not found');
  }

  const candidateYears = getCandidateAcademicYears(String(examCycle.academicYear || ''));
  let classHistory: any = null;

  for (const academicYear of candidateYears) {
    classHistory = await StudentClassHistory.findOne({
      studentId,
      academicYear,
    })
      .populate('classId', 'name classId grade')
      .lean();

    if (classHistory) break;
  }

  const parentUser = student.parentId
    ? await User.findById(student.parentId).select('name email phone').lean()
    : null;

  const setupRows = await ExamSubjectSetup.find({ examCycleId })
    .populate('subjectId', 'name')
    .sort({ createdAt: 1 })
    .lean();

  const seenSubjectIds = new Set<string>();
  const cycleSubjectRows = setupRows
    .map((setup: any, index: number) => {
      const subjectId = setup.subjectId?._id ? String(setup.subjectId._id) : String(setup.subjectId || '');
      const label = String(setup.subjectId?.name || '').trim();

      if (!subjectId || !label || seenSubjectIds.has(subjectId)) {
        return null;
      }

      seenSubjectIds.add(subjectId);

      return {
        key: `subject-${index + 1}`,
        label,
        subjectId,
      };
    })
    .filter(Boolean) as Array<{ key: string; label: string; subjectId: string }>;

  const subjectResults = Array.isArray(resultSummary.subjectResults)
    ? resultSummary.subjectResults.map((subject) => ({
        ...subject,
        subjectId: String(subject.subjectId),
      }))
    : [];

  const matchedSubjectIds = new Set<string>();
  const subjectRowDefinitions = cycleSubjectRows.length > 0 ? cycleSubjectRows : template.subjectRows;

  const displayRows =
    subjectRowDefinitions.length > 0
      ? subjectRowDefinitions.map((row: any) => {
          const match = subjectResults.find((subject) => {
            const sameSubjectId = row.subjectId && String(subject.subjectId) === String(row.subjectId);
            const sameLabel =
              subject.subjectName?.trim().toLowerCase() === String(row.label || '').trim().toLowerCase();

            return sameSubjectId || sameLabel;
          });

          if (match) {
            matchedSubjectIds.add(String(match.subjectId));
          }

          return {
            key: row.key,
            label: row.label,
            subjectId: row.subjectId,
            result: match || null,
          };
        })
      : subjectResults.map((subject, index) => ({
          key: `subject-${index + 1}`,
          label: subject.subjectName,
          subjectId: subject.subjectId,
          result: subject,
        }));

  const unmatchedRows = subjectResults
    .filter((subject) => !matchedSubjectIds.has(String(subject.subjectId)))
    .map((subject, index) => ({
      key: `actual-subject-${index + 1}`,
      label: subject.subjectName,
      subjectId: subject.subjectId,
      result: subject,
    }));

  const finalRows = [...displayRows, ...unmatchedRows].map((row) => ({
    key: row.key,
    label: row.label,
    subjectId: row.subjectId,
    hasResult: !!row.result,
    obtained: row.result?.obtained ?? null,
    fullMarks: row.result?.fullMarks ?? null,
    percentage: row.result?.percentage ?? null,
    grade: row.result?.grade ?? null,
    isPassed: row.result?.isPassed ?? null,
  }));

  const overallGrade = resultSummary.overallGrade || getGrade(resultSummary.percentage) || '-';
  const passedAllSubjects =
    subjectResults.length > 0 && subjectResults.every((subject) => subject.isPassed);
  const coScholasticValues = normalizeStoredValues(assessment?.coScholasticValues || {});
  const disciplineValues = normalizeStoredValues(assessment?.disciplineValues || {});

  return {
    template,
    examCycle: {
      _id: String(examCycle._id),
      examName: examCycle.examName,
      academicYear: examCycle.academicYear,
      termName: examCycle.termName,
      examType: examCycle.examType,
      publishDate: examCycle.publishDate,
    },
    student: {
      _id: String(student._id),
      name: student.name,
      rollNo: classHistory?.rollNo || '',
      className: classHistory?.classId?.name || '',
      classCode: classHistory?.classId?.classId || classHistory?.classId?.grade || '',
      dateOfBirth: student.birthday || null,
      guardianPrimaryName: parentUser?.name || '',
      guardianSecondaryName: '',
      admissionNo: String(student._id).slice(-6).toUpperCase(),
      email: student.email || '',
    },
    result: {
      totalObtained: resultSummary.totalObtained,
      totalFullMarks: resultSummary.totalFullMarks,
      percentage: resultSummary.percentage,
      overallGrade,
      classRank: resultSummary.classRank || null,
      classTotal: resultSummary.classTotal || null,
      gpa: resultSummary.gpa || null,
      publishedAt: resultSummary.publishedAt,
      promotionStatus:
        resultSummary.promotionStatus || (passedAllSubjects ? 'promoted' : 'awaiting-review'),
      message:
        resultSummary.promotionStatus === 'failed'
          ? 'Result requires review before promotion.'
          : template.promotionMessage,
    },
    subjectRows: finalRows,
    coScholasticRows: (template.coScholasticRows || []).map((row: any) => ({
      key: row.key,
      label: row.label,
      value: coScholasticValues[row.key] || '',
    })),
    disciplineRows: (template.disciplineRows || []).map((row: any) => ({
      key: row.key,
      label: row.label,
      value: disciplineValues[row.key] || '',
    })),
  };
}
