import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import StudentClassHistory from '@/lib/models/StudentClassHistory';

/**
 * GET /api/parent/children?parentId={id}
 * Get all children for a parent
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const parentId = request.nextUrl.searchParams.get('parentId');
    const academicYear = request.nextUrl.searchParams.get('academicYear') || String(new Date().getFullYear());

    if (!parentId) {
      return NextResponse.json(
        { error: 'parentId is required' },
        { status: 400 }
      );
    }

    const children = await Student.find({ parentId }).select(
      'name email phone address bloodGroup birthday sex profilePic'
    );

    const histories = await StudentClassHistory.find({
      studentId: { $in: children.map((child) => child._id) },
      academicYear,
    })
      .populate('classId', 'name classId grade')
      .lean();

    const historyByStudent = new Map(
      histories.map((history) => [history.studentId.toString(), history])
    );

    const response = children.map((child) => {
      const history = historyByStudent.get(child._id.toString());
      return {
        ...child.toObject(),
        currentClass: history?.classId || null,
        academicYear: history?.academicYear || academicYear,
        rollNo: history?.rollNo || null,
      };
    });

    return NextResponse.json({
      children: response || []
    });
  } catch (error: any) {
    console.error('Error fetching children:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
