import { connectDB } from '@/lib/mongodb';
import MarksheetBatch from '@/lib/models/MarksheetBatch';
import MarkEntry from '@/lib/models/MarkEntry';
import '@/lib/models/ExamCycle';
import '@/lib/models/Class';
import '@/lib/models/Subject';
import '@/lib/models/Student';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionUser } from '@/lib/auth';

// GET /api/teacher/results
// Returns published/approved marksheet batches for the logged-in teacher
// Optional ?batchId=... to get full student entries for a specific batch
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const teacherId = extractSessionUser(request.cookies.get('user')?.value)?.id;
    if (!teacherId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    // Return entries for a specific batch
    if (batchId) {
      const batch = await MarksheetBatch.findById(batchId)
        .populate('examCycleId', 'examName academicYear termName examType')
        .populate('classId', 'name')
        .populate('subjectId', 'name');

      if (!batch) {
        return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
      }

      if (String(batch.teacherId) !== teacherId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }

      const entries = await MarkEntry.find({ batchId })
        .populate('studentId', 'name rollNumber')
        .sort({ 'studentId.rollNumber': 1 });

      return NextResponse.json({ success: true, data: { batch, entries } });
    }

    // Return all published/approved batches for this teacher
    const batches = await MarksheetBatch.find({
      teacherId,
      status: { $in: ['published', 'approved', 'submitted'] },
    })
      .populate('examCycleId', 'examName academicYear termName examType')
      .populate('classId', 'name')
      .populate('subjectId', 'name')
      .sort({ updatedAt: -1 });

    return NextResponse.json({ success: true, data: batches });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
