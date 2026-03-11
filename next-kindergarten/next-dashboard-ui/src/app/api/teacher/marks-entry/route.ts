import { connectDB } from '@/lib/mongodb';
import ExamSubjectSetup from '@/lib/models/ExamSubjectSetup';
import ExamCycle from '@/lib/models/ExamCycle';
import '@/lib/models/Class';
import '@/lib/models/Subject';
import { NextRequest, NextResponse } from 'next/server';

function extractUserIdFromCookie(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue));
    return parsed.id || null;
  } catch {
    return cookieValue || null;
  }
}

// GET /api/teacher/marks-entry
// Returns ExamSubjectSetups assigned to the current teacher in open exam cycles
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const teacherId = extractUserIdFromCookie(request.cookies.get('user')?.value);
    if (!teacherId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get all open exam cycles first
    const openCycles = await ExamCycle.find({ status: 'open' }).select('_id examName academicYear termName examType').lean();
    const openCycleIds = openCycles.map((c: any) => c._id.toString());

    // Find setups assigned to this teacher in open cycles
    const setups = await ExamSubjectSetup.find({
      teacherId,
      examCycleId: { $in: openCycleIds },
    })
      .populate('examCycleId', 'examName academicYear termName examType status marksEntryStartDate marksEntryEndDate')
      .populate('classId', 'name grade')
      .populate('subjectId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: setups });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
