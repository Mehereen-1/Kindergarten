import { NextRequest, NextResponse } from 'next/server';
import '@/lib/models/MarksheetBatch';
import '@/lib/models/MarkEntry';
import '@/lib/models/ExamCycle';
import '@/lib/models/Class';
import '@/lib/models/Student';
import MarksheetBatch from '@/lib/models/MarksheetBatch';
import MarkEntry from '@/lib/models/MarkEntry';
import ExamCycle from '@/lib/models/ExamCycle';
import Class from '@/lib/models/Class';
import { connectDB } from '@/lib/mongodb';
import { calculateTotalMarks, calculatePercentage, getGrade, generateAcademicRemark } from '@/lib/marks-utils';

/**
 * GET /api/teacher/marksheets
 * Get marksheets assigned to a teacher (that they can edit)
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // draft, submitted, etc.
    const examCycleId = searchParams.get('examCycleId');

    const teacherId = req.cookies.get('user')?.value;
    if (!teacherId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const filter: any = { teacherId };
    if (status) filter.status = status;
    if (examCycleId) filter.examCycleId = examCycleId;

    const batches = await MarksheetBatch.find(filter)
      .populate('examCycleId', 'examName academicYear termName')
      .populate('classId', 'name')
      .populate('subjectId', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: batches });
  } catch (error: any) {
    console.error('GET marksheets error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teacher/marksheets/[batchId]/entries
 * Save/update a mark entry for a student
 * 
 * Body: {
 *   studentId: ObjectId,
 *   theoryMarks?: number,
 *   mcqMarks?: number,
 *   practicalMarks?: number,
 *   vivaMarks?: number,
 *   classTestMarks?: number,
 *   attendanceMarks?: number,
 *   isAbsent?: boolean,
 *   teacherRemark?: string
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    await connectDB();

    const batch = await MarksheetBatch.findById(params.batchId).populate('examCycleId');
    if (!batch) {
      return NextResponse.json(
        { success: false, error: 'Marksheet batch not found' },
        { status: 404 }
      );
    }

    // Verify teacher owns this batch
    const teacherId = req.cookies.get('user')?.value;
    if (batch.teacherId.toString() !== teacherId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verify batch is in editable state
    if (!['draft', 'reopened'].includes(batch.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot edit batch in ${batch.status} status` },
        { status: 400 }
      );
    }

    // Verify marks entry is within window (unless admin override)
    const now = new Date();
    const examCycle = batch.examCycleId;
    if (!(now >= examCycle.marksEntryStartDate && now <= examCycle.marksEntryEndDate)) {
      return NextResponse.json(
        { success: false, error: 'Marks entry window is closed' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      studentId,
      theoryMarks,
      mcqMarks,
      practicalMarks,
      vivaMarks,
      classTestMarks,
      attendanceMarks,
      isAbsent,
      teacherRemark,
    } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Calculate total marks
    const components = {
      theory: theoryMarks,
      mcq: mcqMarks,
      practical: practicalMarks,
      viva: vivaMarks,
      classTest: classTestMarks,
      attendance: attendanceMarks,
    };

    const totalMarks = isAbsent ? 0 : calculateTotalMarks(components);
    const percentage = calculatePercentage(totalMarks, batch.examCycleId.fullMarks || 100);
    const grade = isAbsent ? 'ABS' : getGrade(percentage);
    const academicRemark = isAbsent ? 'Absent' : generateAcademicRemark(percentage);

    // Find or create mark entry
    let entry = await MarkEntry.findOne({
      batchId: params.batchId,
      studentId,
    });

    if (!entry) {
      entry = new MarkEntry({
        batchId: params.batchId,
        studentId,
        examCycleId: batch.examCycleId._id,
        subjectId: batch.subjectId,
        fullMarks: batch.examCycleId.fullMarks || 100,
      });
    }

    // Update entry
    entry.theoryMarks = theoryMarks;
    entry.mcqMarks = mcqMarks;
    entry.practicalMarks = practicalMarks;
    entry.vivaMarks = vivaMarks;
    entry.classTestMarks = classTestMarks;
    entry.attendanceMarks = attendanceMarks;
    entry.totalMarks = totalMarks;
    entry.percentage = percentage;
    entry.grade = grade;
    entry.isAbsent = isAbsent || false;
    entry.status = isAbsent ? 'absent' : 'active';
    entry.teacherRemark = teacherRemark;
    entry.academicRemark = academicRemark;

    await entry.save();

    // Update batch completion tracking
    const completedCount = await MarkEntry.countDocuments({ batchId: params.batchId });
    batch.entriesCompleted = completedCount;
    await batch.save();

    return NextResponse.json(
      { success: true, data: entry },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST mark entry error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
