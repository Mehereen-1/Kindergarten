import mongoose from 'mongoose';
import AuditLog from '@/lib/models/AuditLog';

export type MarkEntrySnapshot = {
  isAbsent: boolean;
  theoryMarks: number | null;
  mcqMarks: number | null;
  practicalMarks: number | null;
  vivaMarks: number | null;
  classTestMarks: number | null;
  attendanceMarks: number | null;
  totalMarks: number;
  fullMarks: number;
  percentage: number;
  grade: string | null;
  status: 'active' | 'absent';
  teacherRemark: string;
  academicRemark: string;
};

type AuditContextInput = {
  batchId?: string | mongoose.Types.ObjectId | null;
  studentId?: string | mongoose.Types.ObjectId | null;
  examCycleId?: string | mongoose.Types.ObjectId | null;
  subjectId?: string | mongoose.Types.ObjectId | null;
  classId?: string | mongoose.Types.ObjectId | null;
};

type ResultAuditInput = {
  entityType: 'ExamCycle' | 'MarksheetBatch' | 'MarkEntry' | 'ResultSummary';
  entityId: string | mongoose.Types.ObjectId;
  action: 'create' | 'update' | 'delete' | 'submit' | 'approve' | 'publish' | 'lock' | 'reopen';
  changedBy: string | mongoose.Types.ObjectId;
  changedByRole: string;
  reason?: string;
  changedFields?: string[];
  oldValue?: unknown;
  newValue?: unknown;
  context?: AuditContextInput;
};

const SNAPSHOT_FIELDS: Array<keyof MarkEntrySnapshot> = [
  'isAbsent',
  'theoryMarks',
  'mcqMarks',
  'practicalMarks',
  'vivaMarks',
  'classTestMarks',
  'attendanceMarks',
  'totalMarks',
  'fullMarks',
  'percentage',
  'grade',
  'status',
  'teacherRemark',
  'academicRemark',
];

function toObjectId(value?: string | mongoose.Types.ObjectId | null) {
  if (!value) return undefined;
  const normalized = String(value);
  return mongoose.Types.ObjectId.isValid(normalized)
    ? new mongoose.Types.ObjectId(normalized)
    : undefined;
}

function normalizeNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export function buildMarkEntrySnapshot(source: any): MarkEntrySnapshot {
  return {
    isAbsent: Boolean(source?.isAbsent),
    theoryMarks: normalizeNumber(source?.theoryMarks),
    mcqMarks: normalizeNumber(source?.mcqMarks),
    practicalMarks: normalizeNumber(source?.practicalMarks),
    vivaMarks: normalizeNumber(source?.vivaMarks),
    classTestMarks: normalizeNumber(source?.classTestMarks),
    attendanceMarks: normalizeNumber(source?.attendanceMarks),
    totalMarks: Number(source?.totalMarks || 0),
    fullMarks: Number(source?.fullMarks || 0),
    percentage: Number(source?.percentage || 0),
    grade: source?.grade ? String(source.grade) : null,
    status: source?.status === 'absent' ? 'absent' : 'active',
    teacherRemark: normalizeString(source?.teacherRemark),
    academicRemark: normalizeString(source?.academicRemark),
  };
}

export function diffMarkEntrySnapshots(
  before: Partial<MarkEntrySnapshot> | null | undefined,
  after: Partial<MarkEntrySnapshot> | null | undefined
) {
  const safeBefore = before || {};
  const safeAfter = after || {};

  return SNAPSHOT_FIELDS.filter((field) => {
    const left = safeBefore[field] ?? null;
    const right = safeAfter[field] ?? null;
    return JSON.stringify(left) !== JSON.stringify(right);
  });
}

export async function createResultAuditLog({
  entityType,
  entityId,
  action,
  changedBy,
  changedByRole,
  reason,
  changedFields,
  oldValue,
  newValue,
  context,
}: ResultAuditInput) {
  const resolvedEntityId = toObjectId(entityId);
  const resolvedChangedBy = toObjectId(changedBy);

  if (!resolvedEntityId || !resolvedChangedBy) {
    return null;
  }

  return AuditLog.create({
    entityType,
    entityId: resolvedEntityId,
    action,
    changedBy: resolvedChangedBy,
    changedByRole,
    reason: reason?.trim() || undefined,
    changedFields: changedFields?.length ? changedFields : undefined,
    oldValue,
    newValue,
    context: context
      ? {
          batchId: toObjectId(context.batchId),
          studentId: toObjectId(context.studentId),
          examCycleId: toObjectId(context.examCycleId),
          subjectId: toObjectId(context.subjectId),
          classId: toObjectId(context.classId),
        }
      : undefined,
  });
}
