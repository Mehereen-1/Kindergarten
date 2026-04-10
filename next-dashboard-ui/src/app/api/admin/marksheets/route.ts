import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import MarksheetBatch from '@/lib/models/MarksheetBatch';
import '@/lib/models/ExamCycle';
import '@/lib/models/Class';
import '@/lib/models/Subject';
import '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const examCycleId = request.nextUrl.searchParams.get('examCycleId');
    const status = request.nextUrl.searchParams.get('status');
    const classId = request.nextUrl.searchParams.get('classId');

    const filter: Record<string, unknown> = {};
    if (examCycleId) filter.examCycleId = examCycleId;
    if (status) filter.status = status;
    if (classId) filter.classId = classId;

    const batches = await MarksheetBatch.find(filter)
      .populate('examCycleId', 'examName academicYear termName')
      .populate('classId', 'name classId grade')
      .populate('subjectId', 'name')
      .populate('teacherId', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: batches });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
