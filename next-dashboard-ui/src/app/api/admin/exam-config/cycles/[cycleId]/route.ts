import { NextRequest, NextResponse } from 'next/server';
import ExamCycle from '@/lib/models/ExamCycle';
import { connectDB } from '@/lib/mongodb';
import { normalizeExamCycleDate } from '@/lib/examCycleWindow';

/**
 * GET /api/admin/exam-config/cycles/[cycleId]
 * Get a specific exam cycle
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { cycleId: string } }
) {
  try {
    await connectDB();

    const cycle = await ExamCycle.findById(params.cycleId)
      .populate('classIds', 'name')
      .populate('createdBy', 'name email');

    if (!cycle) {
      return NextResponse.json(
        { success: false, error: 'Exam cycle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: cycle });
  } catch (error: any) {
    console.error('GET exam cycle error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/exam-config/cycles/[cycleId]
 * Update an exam cycle
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { cycleId: string } }
) {
  try {
    await connectDB();

    const cycle = await ExamCycle.findById(params.cycleId);
    if (!cycle) {
      return NextResponse.json(
        { success: false, error: 'Exam cycle not found' },
        { status: 404 }
      );
    }

    // Cannot edit if already published
    if (cycle.status === 'published') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit published exam cycle' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { examName, classIds, subjectIds, marksEntryStartDate, marksEntryEndDate, publishDate, status, notes } = body;

    const nextStartDate = marksEntryStartDate
      ? normalizeExamCycleDate(marksEntryStartDate, 'start')
      : cycle.marksEntryStartDate;
    const nextEndDate = marksEntryEndDate
      ? normalizeExamCycleDate(marksEntryEndDate, 'end')
      : cycle.marksEntryEndDate;
    const nextPublishDate = publishDate
      ? normalizeExamCycleDate(publishDate, 'end')
      : cycle.publishDate;

    if (!nextStartDate || !nextEndDate || !nextPublishDate) {
      return NextResponse.json(
        { success: false, error: 'Please provide valid entry and publish dates' },
        { status: 400 }
      );
    }

    if (nextStartDate >= nextEndDate) {
      return NextResponse.json(
        { success: false, error: 'Entry start date must be before end date' },
        { status: 400 }
      );
    }

    if (nextEndDate > nextPublishDate) {
      return NextResponse.json(
        { success: false, error: 'Entry end date must be before or equal to publish date' },
        { status: 400 }
      );
    }

    // Update allowed fields
    if (examName) cycle.examName = examName;
    if (classIds) cycle.classIds = classIds;
    if (subjectIds) cycle.subjectIds = subjectIds;
    cycle.marksEntryStartDate = nextStartDate;
    cycle.marksEntryEndDate = nextEndDate;
    cycle.publishDate = nextPublishDate;
    if (status && ['draft', 'open', 'closed'].includes(status)) cycle.status = status;
    if (notes !== undefined) cycle.notes = notes;

    await cycle.save();

    return NextResponse.json({ success: true, data: cycle });
  } catch (error: any) {
    console.error('PATCH exam cycle error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/exam-config/cycles/[cycleId]
 * Delete an exam cycle (only draft cycles)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { cycleId: string } }
) {
  try {
    await connectDB();

    const cycle = await ExamCycle.findById(params.cycleId);
    if (!cycle) {
      return NextResponse.json(
        { success: false, error: 'Exam cycle not found' },
        { status: 404 }
      );
    }

    // Can only delete draft cycles
    if (cycle.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Can only delete draft exam cycles' },
        { status: 400 }
      );
    }

    await ExamCycle.deleteOne({ _id: params.cycleId });

    return NextResponse.json({
      success: true,
      message: 'Exam cycle deleted',
    });
  } catch (error: any) {
    console.error('DELETE exam cycle error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
