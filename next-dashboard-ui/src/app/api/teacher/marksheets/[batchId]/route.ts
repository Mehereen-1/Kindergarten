import { NextRequest, NextResponse } from 'next/server';
import MarksheetBatch from '@/lib/models/MarksheetBatch';
import MarkEntry from '@/lib/models/MarkEntry';
import Class from '@/lib/models/Class';
import '@/lib/models/MarksheetBatch';
import '@/lib/models/MarkEntry';
import '@/lib/models/Class';
import '@/lib/models/Student';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/teacher/marksheets/[batchId]/entries
 * Get all entries for a marksheet batch
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    await connectDB();

    const batch = await MarksheetBatch.findById(params.batchId)
      .populate('classId', 'name')
      .populate('subjectId', 'name');

    if (!batch) {
      return NextResponse.json(
        { success: false, error: 'Marksheet batch not found' },
        { status: 404 }
      );
    }

    // Check teacher owns this batch
    const teacherId = req.cookies.get('user')?.value;
    if (batch.teacherId.toString() !== teacherId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get all entries with student details
    const entries = await MarkEntry.find({ batchId: params.batchId })
      .populate('studentId', 'name email rollNumber')
      .sort({ 'studentId.rollNumber': 1 });

    // If no entries yet, load students from the class
    if (entries.length === 0) {
      const classDoc = await Class.findById(batch.classId)
        .populate('studentIds', 'name email rollNumber');

      if (classDoc && classDoc.studentIds) {
        const studentEntries = classDoc.studentIds.map((student: any) => ({
          _id: null,
          batchId: params.batchId,
          studentId: student,
          examCycleId: batch.examCycleId,
          subjectId: batch.subjectId,
          totalMarks: null,
          fullMarks: batch.examCycleId?.fullMarks || 100,
          percentage: null,
          grade: null,
          isAbsent: false,
          status: 'active',
          theoryMarks: null,
          mcqMarks: null,
          practicalMarks: null,
          vivaMarks: null,
          classTestMarks: null,
          attendanceMarks: null,
          teacherRemark: null,
          academicRemark: null,
        }));
        batch.totalStudents = studentEntries.length;
        return NextResponse.json({
          success: true,
          data: {
            batch,
            entries: studentEntries,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        batch,
        entries,
      },
    });
  } catch (error: any) {
    console.error('GET batch entries error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
