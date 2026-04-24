import { NextRequest, NextResponse } from 'next/server';
import MarksheetBatch from '@/lib/models/MarksheetBatch';
import MarkEntry from '@/lib/models/MarkEntry';
import ResultSummary from '@/lib/models/ResultSummary';
import ExamCycle from '@/lib/models/ExamCycle';
import ExamSubjectSetup from '@/lib/models/ExamSubjectSetup';
import '@/lib/models/MarksheetBatch';
import '@/lib/models/MarkEntry';
import '@/lib/models/ResultSummary';
import '@/lib/models/ExamCycle';
import { connectDB } from '@/lib/mongodb';
import { calculateGPA, getGrade, rankStudents } from '@/lib/marks-utils';
import { extractSessionUser } from '@/lib/auth';
import { createResultAuditLog } from '@/lib/result-audit';

const BYPASS_ADMIN_AUTH = true;

/**
 * POST /api/teacher/marksheets/[batchId]/submit
 * Teacher submits a completed batch for approval
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    await connectDB();

    const batch = await MarksheetBatch.findById(params.batchId);
    if (!batch) {
      return NextResponse.json(
        { success: false, error: 'Marksheet batch not found' },
        { status: 404 }
      );
    }

    const teacherId = extractSessionUser(req.cookies.get('user')?.value)?.id;
    if (batch.teacherId.toString() !== teacherId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (batch.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: `Batch must be in draft status to submit (currently ${batch.status})` },
        { status: 400 }
      );
    }

    // Check all entries are complete
    const totalMarks = Math.max(batch.totalStudents, batch.entriesCompleted);
    if (batch.entriesCompleted < totalMarks) {
      return NextResponse.json(
        { success: false, error: `${totalMarks - batch.entriesCompleted} students still pending` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { notes } = body;
    const previousStatus = batch.status;
    const previousNotes = batch.notes;

    batch.status = 'submitted';
    batch.submittedAt = new Date();
    batch.submittedBy = teacherId;
    if (notes) batch.notes = notes;

    await batch.save();
    await createResultAuditLog({
      entityType: 'MarksheetBatch',
      entityId: batch._id,
      action: 'submit',
      changedBy: teacherId!,
      changedByRole: 'teacher',
      reason: notes || 'Submitted for approval',
      changedFields: ['status', ...(notes !== (previousNotes || '') ? ['notes'] : [])],
      oldValue: {
        status: previousStatus,
        notes: previousNotes || '',
      },
      newValue: {
        status: batch.status,
        notes: batch.notes || '',
        submittedAt: batch.submittedAt,
      },
      context: {
        batchId: batch._id,
        examCycleId: batch.examCycleId,
        subjectId: batch.subjectId,
        classId: batch.classId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Batch submitted for approval',
      data: batch,
    });
  } catch (error: any) {
    console.error('POST batch submit error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/marksheets/[batchId]/approve
 * Admin approves a submitted batch
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  let action = '';
  try {
    await connectDB();

    const batch = await MarksheetBatch.findById(params.batchId);
    if (!batch) {
      return NextResponse.json(
        { success: false, error: 'Marksheet batch not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    action = body.action || '';
    const { notes } = body; // action: 'approve', 'reject', 'publish', 'lock'
    const previousStatus = batch.status;
    const previousNotes = batch.notes;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    const actionLabelMap: Record<string, string> = {
      approve: 'approved',
      publish: 'published',
      lock: 'locked',
    };

    const sessionUser = extractSessionUser(req.cookies.get('user')?.value);
    const adminId = sessionUser?.id || 'system';
    const userRole = sessionUser?.role || req.cookies.get('userRole')?.value;

    // Only admin can approve/publish
    if (!BYPASS_ADMIN_AUTH && (!adminId || userRole !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Only admins can approve/publish batches' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'approve':
        if (batch.status !== 'submitted') {
          return NextResponse.json(
            { success: false, error: 'Batch must be submitted to approve' },
            { status: 400 }
          );
        }
        batch.status = 'approved';
        batch.approvedAt = new Date();
        batch.approvedBy = adminId;
        break;

      case 'publish':
        if (!['approved', 'reopened'].includes(batch.status)) {
          return NextResponse.json(
            { success: false, error: 'Batch must be approved before publishing' },
            { status: 400 }
          );
        }

        const examCycle = await ExamCycle.findById(batch.examCycleId);
        if (!examCycle) {
          return NextResponse.json(
            { success: false, error: 'Exam cycle not found' },
            { status: 404 }
          );
        }

        const expectedSetups = await ExamSubjectSetup.find({
          examCycleId: batch.examCycleId,
          classId: batch.classId,
        })
          .populate('subjectId', 'name')
          .lean();

        const publishableBatches = await MarksheetBatch.find({
          examCycleId: batch.examCycleId,
          classId: batch.classId,
          status: { $in: ['approved', 'published', 'locked'] },
        })
          .populate('subjectId', 'name')
          .lean();

        const publishableSubjectIds = new Set(
          publishableBatches.map((item: any) => String(item.subjectId?._id || item.subjectId))
        );

        const missingSubjects = expectedSetups
          .filter((setup: any) => !publishableSubjectIds.has(String(setup.subjectId?._id || setup.subjectId)))
          .map((setup: any) => setup.subjectId?.name || 'Unknown subject');

        if (missingSubjects.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Publish all approved subject batches first: ${missingSubjects.join(', ')}`,
            },
            { status: 400 }
          );
        }

        const allEntries = await MarkEntry.find({
          batchId: { $in: publishableBatches.map((item) => item._id) },
        })
          .populate('subjectId', 'name')
          .lean();

        // Group entries by student to calculate totals
        const studentResults = new Map<string, any>();
        allEntries.forEach((entry: any) => {
          const sid = String(entry.studentId);
          if (!studentResults.has(sid)) {
            studentResults.set(sid, {
              studentId: entry.studentId,
              totalObtained: 0,
              totalFullMarks: 0,
              subjectResults: [],
              gradePoints: [],
            });
          }
          const result = studentResults.get(sid);
          result.totalObtained += entry.totalMarks;
          result.totalFullMarks += entry.fullMarks;
          result.subjectResults.push({
            subjectId: entry.subjectId,
            subjectName: entry.subjectId?.name || 'Subject',
            obtained: entry.totalMarks,
            fullMarks: entry.fullMarks,
            percentage: entry.percentage,
            grade: entry.grade,
            isPassed: entry.status === 'absent' ? false : entry.grade !== 'F',
          });
          if (typeof entry.gradePoint === 'number') result.gradePoints.push(entry.gradePoint);
        });

        // Calculate percentages and GPA
        const summaries = [] as any[];
        studentResults.forEach((result, studentId) => {
          const percentage = result.totalFullMarks
            ? (result.totalObtained / result.totalFullMarks) * 100
            : 0;
          const gpa = calculateGPA(result.gradePoints);
          const overallGrade = getGrade(percentage) || undefined;
          const passedAllSubjects =
            result.subjectResults.length > 0 &&
            result.subjectResults.every((subject: any) => subject.isPassed);

          summaries.push({
            studentId: result.studentId,
            examCycleId: batch.examCycleId,
            totalObtained: result.totalObtained,
            totalFullMarks: result.totalFullMarks,
            percentage: Math.round(percentage * 100) / 100,
            gpa: gpa || undefined,
            overallGrade,
            subjectResults: result.subjectResults,
            rankEnabled: true,
            promotionStatus: passedAllSubjects ? 'promoted' : 'awaiting-review',
            publishedAt: new Date(),
            publishedBy: adminId,
          });
        });

        // Add rankings if enabled
        const ranked = rankStudents(
          summaries.map(s => ({ studentId: s.studentId.toString(), percentage: s.percentage }))
        );

        // Save summaries with rankings
        for (const summary of summaries) {
          const rank = ranked.find(r => r.studentId === summary.studentId.toString());
          if (rank) summary.classRank = rank.rank;
          summary.classTotal = summaries.length;

          await ResultSummary.updateOne(
            { studentId: summary.studentId, examCycleId: summary.examCycleId },
            { $set: summary },
            { upsert: true }
          );
        }

        batch.status = 'published';
        batch.publishedAt = new Date();
        batch.publishedBy = adminId;

        const totalSetupsForCycle = await ExamSubjectSetup.countDocuments({
          examCycleId: batch.examCycleId,
        });
        const alreadyPublishedBatchesForCycle = await MarksheetBatch.countDocuments({
          examCycleId: batch.examCycleId,
          status: { $in: ['published', 'locked'] },
        });
        const publishedBatchesForCycle =
          alreadyPublishedBatchesForCycle + (batch.status === 'published' ? 1 : 0);

        if (totalSetupsForCycle > 0 && publishedBatchesForCycle >= totalSetupsForCycle) {
          examCycle.status = 'published';
          await examCycle.save();
        }
        break;

      case 'lock':
        if (batch.status !== 'published') {
          return NextResponse.json(
            { success: false, error: 'Batch must be published to lock' },
            { status: 400 }
          );
        }
        batch.status = 'locked';
        batch.lockedAt = new Date();
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (notes) batch.notes = notes;
    await batch.save();
    await createResultAuditLog({
      entityType: 'MarksheetBatch',
      entityId: batch._id,
      action: action as 'approve' | 'publish' | 'lock',
      changedBy: adminId,
      changedByRole: userRole || 'admin',
      reason: notes || `Batch ${actionLabelMap[action] || action}`,
      changedFields: ['status', ...(notes !== (previousNotes || '') ? ['notes'] : [])],
      oldValue: {
        status: previousStatus,
        notes: previousNotes || '',
      },
      newValue: {
        status: batch.status,
        notes: batch.notes || '',
        approvedAt: batch.approvedAt,
        publishedAt: batch.publishedAt,
        lockedAt: batch.lockedAt,
      },
      context: {
        batchId: batch._id,
        examCycleId: batch.examCycleId,
        subjectId: batch.subjectId,
        classId: batch.classId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Batch ${actionLabelMap[action] || action} successfully`,
      data: batch,
    });
  } catch (error: any) {
    console.error(`Batch ${action} error:`, error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
