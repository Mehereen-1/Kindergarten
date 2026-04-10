import { connectDB } from '@/lib/mongodb';
import ExamSubjectSetup from '@/lib/models/ExamSubjectSetup';
import MarksheetBatch from '@/lib/models/MarksheetBatch';
import MarkEntry from '@/lib/models/MarkEntry';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import '@/lib/models/Student';
import '@/lib/models/ExamCycle';
import '@/lib/models/Class';
import '@/lib/models/Subject';
import AuditLog from '@/lib/models/AuditLog';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { getCandidateAcademicYears, resolveTeacherIdForSetup } from '@/lib/subjectAssignment';
import { extractSessionUser } from '@/lib/auth';
import {
  buildMarkEntrySnapshot,
  createResultAuditLog,
  diffMarkEntrySnapshots,
} from '@/lib/result-audit';
import { getMarksEntryWindowState } from '@/lib/examCycleWindow';

const COMPONENT_FIELD_MAP = [
  { field: 'theoryMarks', configKey: 'theory' },
  { field: 'mcqMarks', configKey: 'mcq' },
  { field: 'practicalMarks', configKey: 'practical' },
  { field: 'vivaMarks', configKey: 'viva' },
  { field: 'classTestMarks', configKey: 'classTest' },
  { field: 'attendanceMarks', configKey: 'attendance' },
] as const;

function computeGrade(pct: number, passMarks: number, fullMarks: number): string {
  const passPct = (passMarks / fullMarks) * 100;
  if (pct < passPct) return 'F';
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'D';
}

function computeRemark(pct: number, passPct: number): string {
  if (pct >= 90) return 'Outstanding';
  if (pct >= 80) return 'Excellent';
  if (pct >= 70) return 'Very Good';
  if (pct >= 60) return 'Good';
  if (pct >= 50) return 'Average';
  if (pct >= passPct) return 'Satisfactory';
  return 'Needs Improvement';
}

async function fetchBatchAuditLogs(batchId: string | mongoose.Types.ObjectId) {
  const logs = await AuditLog.find({ 'context.batchId': new mongoose.Types.ObjectId(String(batchId)) })
    .populate('changedBy', 'name role')
    .populate('context.studentId', 'name rollNumber')
    .sort({ createdAt: -1 })
    .limit(60)
    .lean();

  return logs.map((log: any) => ({
    _id: String(log._id),
    entityType: log.entityType,
    action: log.action,
    reason: log.reason || '',
    changedFields: Array.isArray(log.changedFields) ? log.changedFields : [],
    oldValue: log.oldValue || null,
    newValue: log.newValue || null,
    createdAt: log.createdAt,
    changedBy: log.changedBy
      ? {
          _id: String(log.changedBy._id || log.changedBy),
          name: log.changedBy.name || 'Unknown user',
          role: log.changedBy.role || log.changedByRole || '',
        }
      : null,
    student: log.context?.studentId
      ? {
          _id: String(log.context.studentId._id || log.context.studentId),
          name: log.context.studentId.name || 'Unknown student',
          rollNumber: log.context.studentId.rollNumber || '',
        }
      : null,
  }));
}

// GET /api/teacher/marks-entry/[setupId]
// Returns setup details + students + existing mark entries for this setup
export async function GET(
  request: NextRequest,
  { params }: { params: { setupId: string } }
) {
  try {
    await connectDB();

    const teacherId = extractSessionUser(request.cookies.get('user')?.value)?.id;
    if (!teacherId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const setup = await ExamSubjectSetup.findById(params.setupId)
      .populate('examCycleId', 'examName academicYear termName examType status marksEntryStartDate marksEntryEndDate')
      .populate('classId', 'name grade')
      .populate('subjectId', 'name')
      .lean();

    if (!setup) {
      return NextResponse.json({ success: false, error: 'Setup not found' }, { status: 404 });
    }

    const resolvedTeacherId = await resolveTeacherIdForSetup({
      explicitTeacherId: setup.teacherId,
      classId: setup.classId,
      subjectId: setup.subjectId,
      academicYear: (setup.examCycleId as any)?.academicYear,
    });

    if (resolvedTeacherId !== teacherId) {
      return NextResponse.json({ success: false, error: 'Not assigned to you' }, { status: 403 });
    }

    const examCycle = setup.examCycleId as any;
    const classDoc = setup.classId as any;
    const classIdForQuery = classDoc._id || classDoc;

    // Try each candidate year until we find enrolled students
    const candidateYears = getCandidateAcademicYears(examCycle?.academicYear || '');
    let histories: any[] = [];
    let resolvedYear = candidateYears[0];
    for (const year of candidateYears) {
      histories = await StudentClassHistory.find({
        classId: classIdForQuery,
        academicYear: year,
        status: 'active',
      })
        .populate('studentId', 'name rollNumber email')
        .lean();
      if (histories.length > 0) {
        resolvedYear = year;
        break;
      }
    }

    const students = histories
      .map((h: any) => ({
        studentId: h.studentId?._id || h.studentId,
        name: h.studentId?.name || 'Unknown',
        rollNumber: h.studentId?.rollNumber || h.rollNo || '',
        rollNo: h.rollNo || '',
      }))
      .sort((a: any, b: any) => (a.rollNo || '').localeCompare(b.rollNo || ''));

    const studentIds = students.map((s: any) => s.studentId);

    // Get or create a MarksheetBatch for this teacher+setup
    let batch = await MarksheetBatch.findOne({
      examCycleId: examCycle._id || setup.examCycleId,
      classId: classDoc._id || setup.classId,
      subjectId: (setup.subjectId as any)._id || setup.subjectId,
      teacherId,
    }).lean();

    if (!batch) {
      const created = await MarksheetBatch.create({
        examCycleId: examCycle._id || setup.examCycleId,
        classId: classDoc._id || setup.classId,
        subjectId: (setup.subjectId as any)._id || setup.subjectId,
        teacherId,
        totalStudents: students.length,
        entriesCompleted: 0,
        status: 'draft',
      });
      batch = created.toObject();
    }

    // Get existing mark entries for this batch
    const existingEntries = await MarkEntry.find({ batchId: batch._id }).lean();
    const entryByStudentId = new Map<string, any>();
    for (const e of existingEntries) {
      entryByStudentId.set(e.studentId.toString(), e);
    }

    // Merge students with their entries
    const rows = students.map((s: any) => {
      const sid = s.studentId.toString();
      const entry = entryByStudentId.get(sid);
      return {
        studentId: sid,
        name: s.name,
        rollNo: s.rollNo,
        entryId: entry?._id?.toString() || null,
        isAbsent: entry?.isAbsent || false,
        theoryMarks: entry?.theoryMarks ?? null,
        mcqMarks: entry?.mcqMarks ?? null,
        practicalMarks: entry?.practicalMarks ?? null,
        vivaMarks: entry?.vivaMarks ?? null,
        classTestMarks: entry?.classTestMarks ?? null,
        attendanceMarks: entry?.attendanceMarks ?? null,
        totalMarks: entry?.totalMarks ?? null,
        fullMarks: entry?.fullMarks ?? setup.fullMarks,
        percentage: entry?.percentage ?? null,
        grade: entry?.grade ?? null,
        teacherRemark: entry?.teacherRemark ?? '',
        isSaved: !!entry,
      };
    });

    const entryWindowState = getMarksEntryWindowState(setup.examCycleId as any);

    return NextResponse.json({
      success: true,
      data: {
        setup,
        resolvedAcademicYear: resolvedYear,
        batchId: batch._id.toString(),
        batchStatus: batch.status,
        entryWindowOpen: entryWindowState.isOpen,
        entryWindowMessage: entryWindowState.message,
        rows,
        auditLogs: await fetchBatchAuditLogs(batch._id),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/teacher/marks-entry/[setupId]
// Upserts mark entries for all students
export async function POST(
  request: NextRequest,
  { params }: { params: { setupId: string } }
) {
  try {
    await connectDB();

    const teacherId = extractSessionUser(request.cookies.get('user')?.value)?.id;
    if (!teacherId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const setup = await ExamSubjectSetup.findById(params.setupId)
      .populate('examCycleId', 'examName academicYear status marksEntryStartDate marksEntryEndDate')
      .lean();

    if (!setup) {
      return NextResponse.json({ success: false, error: 'Setup not found' }, { status: 404 });
    }

    const resolvedTeacherId = await resolveTeacherIdForSetup({
      explicitTeacherId: setup.teacherId,
      classId: setup.classId,
      subjectId: setup.subjectId,
      academicYear: (setup.examCycleId as any)?.academicYear,
    });

    if (resolvedTeacherId !== teacherId) {
      return NextResponse.json({ success: false, error: 'Not assigned to you' }, { status: 403 });
    }

    const body = await request.json();
    const { batchId, entries } = body as {
      batchId: string;
      entries: Array<{
        studentId: string;
        isAbsent: boolean;
        theoryMarks?: number | null;
        mcqMarks?: number | null;
        practicalMarks?: number | null;
        vivaMarks?: number | null;
        classTestMarks?: number | null;
        attendanceMarks?: number | null;
        teacherRemark?: string;
        editReason?: string;
      }>;
    };

    if (!batchId || !Array.isArray(entries)) {
      return NextResponse.json({ success: false, error: 'batchId and entries required' }, { status: 400 });
    }

    const fullMarks = setup.fullMarks;
    const passMarks = setup.passMarks;
    const passPct = (passMarks / fullMarks) * 100;
    const examCycleId = (setup.examCycleId as any)._id || setup.examCycleId;
    const subjectId = setup.subjectId;
    const setupExamCycle = setup.examCycleId as any;

    const batch = await MarksheetBatch.findOne({
      _id: batchId,
      examCycleId,
      classId: setup.classId,
      subjectId,
      teacherId,
    }).lean();

    if (!batch) {
      return NextResponse.json({ success: false, error: 'Batch not found for this setup' }, { status: 404 });
    }

    if (!['draft', 'reopened'].includes(batch.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot edit batch in ${batch.status} status` },
        { status: 400 }
      );
    }

    const entryWindowState = getMarksEntryWindowState(setupExamCycle);
    if (!entryWindowState.isOpen) {
      return NextResponse.json(
        { success: false, error: entryWindowState.message || 'Marks entry window is closed' },
        { status: 400 }
      );
    }

    const activeComponents = COMPONENT_FIELD_MAP.filter(
      ({ configKey }) => Number((setup.components as any)?.[configKey] || 0) > 0
    );
    const batchObjectId = new mongoose.Types.ObjectId(batchId);
    const existingEntries = await MarkEntry.find({ batchId: batchObjectId }).lean();
    const existingEntryByStudentId = new Map(
      existingEntries.map((existingEntry: any) => [String(existingEntry.studentId), existingEntry])
    );

    const isEntryComplete = (entry: any) => {
      if (entry.isAbsent) return true;
      return activeComponents.every(({ field }) => entry[field] !== undefined && entry[field] !== null);
    };

    let savedCount = 0;
    let removedCount = 0;
    for (const entry of entries) {
      const editReason = typeof entry.editReason === 'string' ? entry.editReason.trim() : '';
      const existingEntry = existingEntryByStudentId.get(String(entry.studentId));
      const normalizedComponentValues: Record<string, number | null> = {};

      for (const { field, configKey } of COMPONENT_FIELD_MAP) {
        const rawValue = (entry as any)[field];
        const normalizedValue =
          rawValue === '' || rawValue === undefined || rawValue === null || Number.isNaN(Number(rawValue))
            ? null
            : Number(rawValue);

        if (normalizedValue !== null) {
          if (normalizedValue < 0) {
            return NextResponse.json(
              { success: false, error: `${field} cannot be negative for student ${entry.studentId}` },
              { status: 400 }
            );
          }

          const maxAllowed = Number((setup.components as any)?.[configKey] || 0);
          if (normalizedValue > maxAllowed) {
            return NextResponse.json(
              {
                success: false,
                error: `${field} cannot exceed ${maxAllowed} for student ${entry.studentId}`,
              },
              { status: 400 }
            );
          }
        }

        normalizedComponentValues[field] = normalizedValue;
      }

      const hasAnyMarks = activeComponents.some(
        ({ field }) => normalizedComponentValues[field] !== null && normalizedComponentValues[field] !== undefined
      );

      if (!entry.isAbsent && !hasAnyMarks) {
        if (existingEntry) {
          if (!editReason) {
            return NextResponse.json(
              {
                success: false,
                error: `Edit reason is required before clearing saved marks for student ${entry.studentId}`,
              },
              { status: 400 }
            );
          }

          const previousState = buildMarkEntrySnapshot(existingEntry);
          await MarkEntry.deleteOne({
            batchId: batchObjectId,
            studentId: new mongoose.Types.ObjectId(entry.studentId),
          });
          existingEntryByStudentId.delete(String(entry.studentId));
          removedCount++;

          await createResultAuditLog({
            entityType: 'MarkEntry',
            entityId: existingEntry._id,
            action: 'delete',
            changedBy: teacherId,
            changedByRole: 'teacher',
            reason: editReason,
            changedFields: diffMarkEntrySnapshots(previousState, null),
            oldValue: previousState,
            context: {
              batchId,
              studentId: entry.studentId,
              examCycleId,
              subjectId,
              classId: setup.classId as any,
            },
          });
        }
        continue;
      }

      const componentSum = Object.values(normalizedComponentValues)
        .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))
        .reduce((sum, value) => sum + value, 0);

      const totalMarks = entry.isAbsent ? 0 : componentSum;
      const percentage = entry.isAbsent ? 0 : parseFloat(((totalMarks / fullMarks) * 100).toFixed(2));
      const entryShape = {
        ...normalizedComponentValues,
        isAbsent: entry.isAbsent,
      };
      const complete = isEntryComplete(entryShape);
      const grade = entry.isAbsent
        ? 'AB'
        : complete
          ? computeGrade(percentage, passMarks, fullMarks)
          : undefined;
      const academicRemark = entry.isAbsent
        ? 'Absent'
        : complete
          ? computeRemark(percentage, passPct)
          : 'In progress';
      const nextState = buildMarkEntrySnapshot({
        ...normalizedComponentValues,
        isAbsent: entry.isAbsent,
        totalMarks,
        fullMarks,
        percentage,
        grade,
        status: entry.isAbsent ? 'absent' : 'active',
        teacherRemark: entry.teacherRemark || '',
        academicRemark,
      });
      const previousState = existingEntry ? buildMarkEntrySnapshot(existingEntry) : null;
      const changedFields = diffMarkEntrySnapshots(previousState, nextState);

      if (existingEntry && changedFields.length === 0) {
        continue;
      }

      if (existingEntry && changedFields.length > 0 && !editReason) {
        return NextResponse.json(
          {
            success: false,
            error: `Edit reason is required before updating saved marks for student ${entry.studentId}`,
          },
          { status: 400 }
        );
      }

      const savedEntry = await MarkEntry.findOneAndUpdate(
        { batchId: batchObjectId, studentId: new mongoose.Types.ObjectId(entry.studentId) },
        {
          $set: {
            examCycleId,
            subjectId,
            isAbsent: entry.isAbsent,
            theoryMarks: entry.isAbsent ? undefined : normalizedComponentValues.theoryMarks,
            mcqMarks: entry.isAbsent ? undefined : normalizedComponentValues.mcqMarks,
            practicalMarks: entry.isAbsent ? undefined : normalizedComponentValues.practicalMarks,
            vivaMarks: entry.isAbsent ? undefined : normalizedComponentValues.vivaMarks,
            classTestMarks: entry.isAbsent ? undefined : normalizedComponentValues.classTestMarks,
            attendanceMarks: entry.isAbsent ? undefined : normalizedComponentValues.attendanceMarks,
            totalMarks,
            fullMarks,
            percentage,
            grade,
            status: entry.isAbsent ? 'absent' : 'active',
            teacherRemark: entry.teacherRemark || '',
            academicRemark,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      existingEntryByStudentId.set(String(entry.studentId), savedEntry.toObject());

      await createResultAuditLog({
        entityType: 'MarkEntry',
        entityId: savedEntry._id,
        action: existingEntry ? 'update' : 'create',
        changedBy: teacherId,
        changedByRole: 'teacher',
        reason: existingEntry ? editReason : editReason || 'Initial marks entry',
        changedFields,
        oldValue: previousState || undefined,
        newValue: nextState,
        context: {
          batchId,
          studentId: entry.studentId,
          examCycleId,
          subjectId,
          classId: setup.classId as any,
        },
      });
      savedCount++;
    }

    // Update batch progress
    const batchEntries = await MarkEntry.find({ batchId: batchObjectId }).lean();
    const completedCount = batchEntries.filter((existingEntry: any) => isEntryComplete(existingEntry)).length;
    await MarksheetBatch.findByIdAndUpdate(batchId, {
      entriesCompleted: completedCount,
      status: batch.status === 'reopened' ? 'reopened' : 'draft',
    });

    return NextResponse.json({
      success: true,
      saved: savedCount,
      removed: removedCount,
      entriesCompleted: completedCount,
      batchStatus: batch.status === 'reopened' ? 'reopened' : 'draft',
      auditLogs: await fetchBatchAuditLogs(batchId),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
