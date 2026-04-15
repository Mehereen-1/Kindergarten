import { connectDB } from '@/lib/mongodb';
import ResultSummary from '@/lib/models/ResultSummary';
import Student from '@/lib/models/Student';
import '@/lib/models/ResultSummary';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionUser } from '@/lib/auth';

/**
 * GET /api/parent/results
 * Get all published results for a student (parent view)
 * Only shows published results with exam details and subject breakdown
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const examCycleId = searchParams.get('examCycleId');
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;

  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required' },
        { status: 400 }
      );
    }

    const student = await Student.findById(studentId).select('parentId').lean();
    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    if (String(student.parentId) !== sessionUser.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const filter: any = { studentId };
    if (examCycleId) filter.examCycleId = examCycleId;

    const results = await ResultSummary.find(filter)
      .populate('examCycleId', 'examName academicYear termName publishDate')
      .sort({ publishedAt: -1 })
      .limit(limit);
    
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('GET parent results error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
