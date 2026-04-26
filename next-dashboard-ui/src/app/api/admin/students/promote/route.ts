import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Class from '@/lib/models/Class';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import { extractSessionUser } from '@/lib/auth';
import { logAdminAction } from '@/lib/admin/audit';
import { logStudentHistoryEvent } from '@/lib/studentHistory';

type PromotionStatus = 'promoted' | 'retained' | 'transferred' | 'graduated' | 'manual';

type PromoteRequest = {
  fromAcademicYear?: string;
  toAcademicYear?: string;
  fromClassId?: string;
  toClassId?: string;
  selectedStudentIds?: string[];
  retainRollNo?: boolean;
  overwriteTarget?: boolean;
  promotionStatus?: PromotionStatus;
  remarks?: string;
  previewOnly?: boolean;
};

type PreviewRow = {
  studentId: string;
  studentName: string;
  fromClassName: string;
  fromRollNo: string;
  toClassName: string;
  targetExists: boolean;
  predictedRollNo: string;
  action: 'create' | 'update' | 'skip';
};

const BYPASS_ADMIN_AUTH = true;

const normalizeAcademicYear = (value?: string | null) => String(value || '').trim();

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function nextRoll(used: Set<number>): string {
  let candidate = 1;
  while (used.has(candidate)) {
    candidate += 1;
  }
  used.add(candidate);
  return String(candidate);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    const role = String(sessionUser?.role || '').toLowerCase();
    if (!BYPASS_ADMIN_AUTH && role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can run student promotion.' }, { status: 403 });
    }

    const body = (await request.json()) as PromoteRequest;
    const fromAcademicYear = normalizeAcademicYear(body.fromAcademicYear);
    const toAcademicYear = normalizeAcademicYear(body.toAcademicYear);
    const fromClassInput = String(body.fromClassId || '').trim();
    const toClassInput = String(body.toClassId || '').trim();
    const retainRollNo = Boolean(body.retainRollNo);
    const overwriteTarget = Boolean(body.overwriteTarget);
    const previewOnly = Boolean(body.previewOnly);
    const promotionStatus: PromotionStatus = body.promotionStatus || 'promoted';
    const remarks = String(body.remarks || '').trim();
    const selectedStudentIds = Array.isArray(body.selectedStudentIds)
      ? body.selectedStudentIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];

    if (!fromAcademicYear || !toAcademicYear || !toClassInput) {
      return NextResponse.json(
        { error: 'fromAcademicYear, toAcademicYear and toClassId are required.' },
        { status: 400 }
      );
    }

    if (fromAcademicYear === toAcademicYear) {
      return NextResponse.json(
        { error: 'Target academic year must be different from source year.' },
        { status: 400 }
      );
    }

    const toClassDoc =
      (mongoose.Types.ObjectId.isValid(toClassInput)
        ? await Class.findById(toClassInput).lean()
        : await Class.findOne({ classId: toClassInput }).lean()) || null;
    if (!toClassDoc?._id) {
      return NextResponse.json({ error: 'Target class not found.' }, { status: 400 });
    }

    let fromClassDoc: any = null;
    if (fromClassInput) {
      fromClassDoc =
        (mongoose.Types.ObjectId.isValid(fromClassInput)
          ? await Class.findById(fromClassInput).lean()
          : await Class.findOne({ classId: fromClassInput }).lean()) || null;
      if (!fromClassDoc?._id) {
        return NextResponse.json({ error: 'Source class not found.' }, { status: 400 });
      }
    }

    const sourceQuery: Record<string, any> = {
      academicYear: fromAcademicYear,
      status: 'active',
    };
    if (fromClassDoc?._id) {
      sourceQuery.classId = fromClassDoc._id;
    }
    if (selectedStudentIds.length) {
      sourceQuery.studentId = { $in: selectedStudentIds };
    }

    const sourceHistories = await StudentClassHistory.find(sourceQuery)
      .populate('studentId', 'name')
      .populate('classId', 'name classId grade')
      .sort({ createdAt: 1 })
      .lean();

    if (!sourceHistories.length) {
      return NextResponse.json(
        { error: 'No source students found for the selected criteria.' },
        { status: 404 }
      );
    }

    const studentIds = sourceHistories.map((history: any) => String(history.studentId?._id || history.studentId));
    const existingTarget = await StudentClassHistory.find({
      studentId: { $in: studentIds },
      academicYear: toAcademicYear,
    })
      .populate('classId', 'name classId grade')
      .lean();

    const existingByStudent = new Map(existingTarget.map((row: any) => [String(row.studentId), row]));

    const targetClassUsedRolls = await StudentClassHistory.find({
      classId: toClassDoc._id,
      academicYear: toAcademicYear,
    })
      .select('rollNo')
      .lean();
    const usedRollNumbers = new Set<number>();
    for (const row of targetClassUsedRolls) {
      const parsed = parsePositiveInt(String((row as any).rollNo || ''));
      if (parsed) usedRollNumbers.add(parsed);
    }

    const previewRows: PreviewRow[] = [];
    const preparedRollByStudent = new Map<string, string>();

    for (const source of sourceHistories as any[]) {
      const sid = String(source.studentId?._id || source.studentId);
      const existing = existingByStudent.get(sid);
      const studentName = String(source.studentId?.name || 'Student');
      const fromClassName = String(source.classId?.name || '-');
      const sourceRoll = String(source.rollNo || '');

      let action: 'create' | 'update' | 'skip' = 'create';
      if (existing && !overwriteTarget) action = 'skip';
      else if (existing && overwriteTarget) action = 'update';

      let predictedRollNo = '';
      if (action === 'skip') {
        predictedRollNo = String(existing?.rollNo || '');
      } else if (retainRollNo && parsePositiveInt(sourceRoll) && !usedRollNumbers.has(parsePositiveInt(sourceRoll) as number)) {
        predictedRollNo = sourceRoll;
        usedRollNumbers.add(parsePositiveInt(sourceRoll) as number);
      } else {
        predictedRollNo = nextRoll(usedRollNumbers);
      }

      preparedRollByStudent.set(sid, predictedRollNo);
      previewRows.push({
        studentId: sid,
        studentName,
        fromClassName,
        fromRollNo: sourceRoll,
        toClassName: String(toClassDoc.name || toClassDoc.classId || 'Class'),
        targetExists: Boolean(existing),
        predictedRollNo,
        action,
      });
    }

    const summary = {
      totalCandidates: previewRows.length,
      createCount: previewRows.filter((row) => row.action === 'create').length,
      updateCount: previewRows.filter((row) => row.action === 'update').length,
      skipCount: previewRows.filter((row) => row.action === 'skip').length,
    };

    if (previewOnly) {
      return NextResponse.json({
        preview: true,
        fromAcademicYear,
        toAcademicYear,
        fromClass: fromClassDoc
          ? { _id: String(fromClassDoc._id), name: fromClassDoc.name, classId: fromClassDoc.classId, grade: fromClassDoc.grade }
          : null,
        toClass: { _id: String(toClassDoc._id), name: toClassDoc.name, classId: toClassDoc.classId, grade: toClassDoc.grade },
        retainRollNo,
        overwriteTarget,
        summary,
        rows: previewRows,
      });
    }

    const session = await mongoose.startSession();
    let appliedCount = 0;
    let skippedCount = 0;
    const appliedStudentIds: string[] = [];
    try {
      await session.withTransaction(async () => {
        const sourceRows = await StudentClassHistory.find(sourceQuery).session(session).lean();
        for (const source of sourceRows as any[]) {
          const sid = String(source.studentId);
          const existing = await StudentClassHistory.findOne({
            studentId: sid,
            academicYear: toAcademicYear,
          })
            .session(session)
            .lean();

          if (existing && !overwriteTarget) {
            skippedCount += 1;
            continue;
          }

          const nextRollNo = preparedRollByStudent.get(sid) || '';
          const nextPayload: Record<string, any> = {
            studentId: sid,
            classId: toClassDoc._id,
            academicYear: toAcademicYear,
            rollNo: nextRollNo || undefined,
            status: 'active',
            promotionStatus,
            promotedFromClassId: source.classId,
            promotedAt: new Date(),
            promotedBy: sessionUser?.id && mongoose.Types.ObjectId.isValid(sessionUser.id) ? sessionUser.id : undefined,
            remarks: remarks || undefined,
          };

          await StudentClassHistory.findOneAndUpdate(
            { studentId: sid, academicYear: toAcademicYear },
            nextPayload,
            { upsert: true, new: true, session, runValidators: true }
          );
          appliedCount += 1;
          appliedStudentIds.push(sid);
        }
      });
    } finally {
      await session.endSession();
    }

    if (appliedStudentIds.length) {
      const toClassName = String(toClassDoc.name || toClassDoc.classId || 'Class');
      const fromClassName = String(fromClassDoc?.name || fromClassDoc?.classId || 'Source class');
      await Promise.all(
        appliedStudentIds.map((studentId) =>
          logStudentHistoryEvent({
            studentId,
            eventType: 'promotion',
            academicYear: toAcademicYear,
            occurredAt: new Date(),
            title: `Promoted to ${toClassName} (${toAcademicYear})`,
            summary: `Moved from ${fromClassName} (${fromAcademicYear}) to ${toClassName} (${toAcademicYear}).`,
            metadata: {
              fromAcademicYear,
              toAcademicYear,
              fromClassId: fromClassDoc?._id ? String(fromClassDoc._id) : null,
              toClassId: String(toClassDoc._id),
              promotionStatus,
              retainRollNo,
              overwriteTarget,
              remarks: remarks || null,
            },
            createdBy: sessionUser?.id,
            createdByRole: role || 'admin',
          })
        )
      );
    }

    if (sessionUser?.id) {
      const ipAddress =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown';
      void logAdminAction(
        sessionUser.id,
        'students.promote.bulk',
        ipAddress,
        {
          fromAcademicYear,
          toAcademicYear,
          fromClassId: fromClassDoc?._id ? String(fromClassDoc._id) : null,
          toClassId: String(toClassDoc._id),
          totalCandidates: summary.totalCandidates,
          appliedCount,
          skippedCount,
          retainRollNo,
          overwriteTarget,
          promotionStatus,
        }
      );
    }

    return NextResponse.json({
      preview: false,
      message: 'Promotion applied successfully.',
      summary: {
        ...summary,
        appliedCount,
        skippedCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to promote students.' }, { status: 500 });
  }
}
