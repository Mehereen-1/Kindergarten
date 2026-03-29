import { NextRequest, NextResponse } from 'next/server';
import MarksheetBatch from '@/lib/models/MarksheetBatch';
import ExamCycle from '@/lib/models/ExamCycle';
import Class from '@/lib/models/Class';
import '@/lib/models/MarksheetBatch';
import '@/lib/models/ExamCycle';
import '@/lib/models/Class';
import '@/lib/models/Student';
import { connectDB } from '@/lib/mongodb';

/**
 * POST /api/teacher/marksheets/create
 * Create a new marksheet batch for marks entry
 * 
 * Body: {
 *   examCycleId: ObjectId,
 *   classId: ObjectId,
 *   subjectId: ObjectId,
 *   sectionId?: string (optional)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { examCycleId, classId, subjectId, sectionId } = body;

    if (!examCycleId || !classId || !subjectId) {
      return NextResponse.json(
        { success: false, error: 'examCycleId, classId, and subjectId are required' },
        { status: 400 }
      );
    }

    const teacherId = req.cookies.get('user')?.value;
    if (!teacherId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify exam cycle exists and is open
    const examCycle = await ExamCycle.findById(examCycleId);
    if (!examCycle) {
      return NextResponse.json(
        { success: false, error: 'Exam cycle not found' },
        { status: 404 }
      );
    }

    if (examCycle.status !== 'open') {
      return NextResponse.json(
        { success: false, error: `Exam cycle is ${examCycle.status}, marks entry must be open` },
        { status: 400 }
      );
    }

    const now = new Date();
    if (!(now >= examCycle.marksEntryStartDate && now <= examCycle.marksEntryEndDate)) {
      return NextResponse.json(
        { success: false, error: 'Marks entry window is closed' },
        { status: 400 }
      );
    }

    // Check if batch already exists
    const existingBatch = await MarksheetBatch.findOne({
      examCycleId,
      classId,
      subjectId,
      teacherId,
      status: { $ne: 'archived' },
    });

    if (existingBatch) {
      return NextResponse.json(
        { success: true, message: 'Batch already exists', data: existingBatch },
        { status: 200 }
      );
    }

    // Get class and count students
    const classDoc = await Class.findById(classId).populate('studentIds');
    const totalStudents = classDoc?.studentIds?.length || 0;

    // Create new batch
    const batch = new MarksheetBatch({
      examCycleId,
      classId,
      subjectId,
      teacherId,
      sectionId: sectionId || undefined,
      status: 'draft',
      totalStudents,
      entriesCompleted: 0,
    });

    await batch.save();

    // Populate for response
    await batch.populate('examCycleId', 'examName academicYear termName');
    await batch.populate('classId', 'name');
    await batch.populate('subjectId', 'name');

    return NextResponse.json(
      {
        success: true,
        message: 'Marksheet batch created',
        data: batch,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST create batch error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
