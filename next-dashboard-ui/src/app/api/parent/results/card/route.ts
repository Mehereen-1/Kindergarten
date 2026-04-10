import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import { extractSessionUser } from '@/lib/auth';
import { buildResultCardPayload } from '@/lib/result-card';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    if (!sessionUser?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = request.nextUrl.searchParams.get('studentId');
    const examCycleId = request.nextUrl.searchParams.get('examCycleId');

    if (!studentId || !examCycleId) {
      return NextResponse.json(
        { success: false, error: 'studentId and examCycleId are required' },
        { status: 400 }
      );
    }

    const student = await Student.findById(studentId).select('parentId').lean();
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    if (String(student.parentId) !== sessionUser.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const payload = await buildResultCardPayload(studentId, examCycleId);
    return NextResponse.json({ success: true, data: payload });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
