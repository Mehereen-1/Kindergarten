import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import MarksheetBatch from '@/lib/models/MarksheetBatch';
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
    const batchId = request.nextUrl.searchParams.get('batchId');

    if (!studentId || !examCycleId) {
      return NextResponse.json(
        { success: false, error: 'studentId and examCycleId are required' },
        { status: 400 }
      );
    }

    if (batchId) {
      const batch = await MarksheetBatch.findById(batchId).lean();

      if (!batch) {
        return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
      }

      if (String(batch.teacherId) !== sessionUser.id) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }

      if (String(batch.examCycleId) !== examCycleId) {
        return NextResponse.json(
          { success: false, error: 'Batch does not match the requested exam cycle' },
          { status: 400 }
        );
      }
    } else {
      const teacherBatch = await MarksheetBatch.findOne({
        teacherId: sessionUser.id,
        examCycleId,
      }).select('_id').lean();

      if (!teacherBatch) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
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
