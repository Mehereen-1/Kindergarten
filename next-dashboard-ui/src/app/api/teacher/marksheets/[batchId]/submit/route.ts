import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import MarksheetBatch from '@/lib/models/MarksheetBatch';
import { extractSessionUser } from '@/lib/auth';
import { createResultAuditLog } from '@/lib/result-audit';

export async function POST(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(req.cookies.get('user')?.value);
    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const batch = await MarksheetBatch.findById(params.batchId);
    if (!batch) {
      return NextResponse.json(
        { success: false, error: 'Marksheet batch not found' },
        { status: 404 }
      );
    }

    if (String(batch.teacherId) !== sessionUser.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (!['draft', 'reopened'].includes(batch.status)) {
      return NextResponse.json(
        { success: false, error: `Batch must be draft or reopened to submit (currently ${batch.status})` },
        { status: 400 }
      );
    }

    if (batch.entriesCompleted < batch.totalStudents) {
      return NextResponse.json(
        {
          success: false,
          error: `${batch.totalStudents - batch.entriesCompleted} students still have incomplete marks`,
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';
    const previousStatus = batch.status;
    const previousNotes = batch.notes;

    batch.status = 'submitted';
    batch.submittedAt = new Date();
    batch.submittedBy = batch.teacherId;
    if (notes) {
      batch.notes = notes;
    }

    await batch.save();

    await createResultAuditLog({
      entityType: 'MarksheetBatch',
      entityId: batch._id,
      action: 'submit',
      changedBy: sessionUser.id,
      changedByRole: sessionUser.role || 'teacher',
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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
