import { NextRequest, NextResponse } from 'next/server';
import MarksheetBatch from '@/lib/models/MarksheetBatch';
import MarkEntry from '@/lib/models/MarkEntry';
import ResultSummary from '@/lib/models/ResultSummary';
import ExamCycle from '@/lib/models/ExamCycle';
import '@/lib/models/MarksheetBatch';
import '@/lib/models/MarkEntry';
import '@/lib/models/ResultSummary';
import '@/lib/models/ExamCycle';
import { connectDB } from '@/lib/mongodb';
import { calculateGPA, getGradePoint, rankStudents } from '@/lib/marks-utils';

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

    const teacherId = req.cookies.get('user')?.value;
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

    batch.status = 'submitted';
    batch.submittedAt = new Date();
    batch.submittedBy = teacherId;
    if (notes) batch.notes = notes;

    await batch.save();

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
    const { action, notes } = body; // action: 'approve', 'reject', 'publish', 'lock'

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    const adminId = req.cookies.get('user')?.value;
    const userRole = req.cookies.get('userRole')?.value;

    // Only admin can approve/publish
    if (userRole !== 'admin') {
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

        // Get all mark entries for this batch
        const entries = await MarkEntry.find({ batchId: params.batchId }).allowDiskUse(true);

        // Create ResultSummary for this batch's exam
        const examCycle = await ExamCycle.findById(batch.examCycleId);
        if (!examCycle) {
          return NextResponse.json(
            { success: false, error: 'Exam cycle not found' },
            { status: 404 }
          );
        }

        // Get all batches for this exam to calculate rankings
        const allBatches = await MarksheetBatch.find({
          examCycleId: batch.examCycleId,
          status: { $in: ['approved', 'published', 'locked'] },
        });

        const allEntries = await MarkEntry.find({
          batchId: { $in: allBatches.map(b => b._id) },
        }).allowDiskUse(true);

        // Group entries by student to calculate totals
        const studentResults = new Map();
        entries.forEach((entry) => {
          const sid = entry.studentId.toString();
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
            subjectName: 'Subject', // You'll need to populate this
            obtained: entry.totalMarks,
            fullMarks: entry.fullMarks,
            percentage: entry.percentage,
            grade: entry.grade,
            isPassed: entry.percentage >= 35, // Default pass mark
          });
          if (entry.gradePoint) result.gradePoints.push(entry.gradePoint);
        });

        // Calculate percentages and GPA
        const summaries = [] as any[];
        studentResults.forEach((result, studentId) => {
          const percentage = (result.totalObtained / result.totalFullMarks) * 100;
          const gpa = calculateGPA(result.gradePoints);
          summaries.push({
            studentId: result.studentId,
            examCycleId: batch.examCycleId,
            totalObtained: result.totalObtained,
            totalFullMarks: result.totalFullMarks,
            percentage: Math.round(percentage * 100) / 100,
            gpa: gpa || undefined,
            subjectResults: result.subjectResults,
            rankEnabled: true,
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
            summary,
            { upsert: true }
          );
        }

        batch.status = 'published';
        batch.publishedAt = new Date();
        batch.publishedBy = adminId;
        examCycle.status = 'published';
        await examCycle.save();
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

    return NextResponse.json({
      success: true,
      message: `Batch ${action}ed successfully`,
      data: batch,
    });
  } catch (error: any) {
    console.error(`Batch ${body?.action} error:`, error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
