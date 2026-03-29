import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parentId');
  const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear());

  try {
    await connectDB();
    
    if (!parentId) {
      return NextResponse.json(
        { error: 'parentId required' },
        { status: 400 }
      );
    }

    // Fetch all children for this parent
    const children = await Student.find({ parentId })
      .select('name email phone address bloodGroup birthday sex')
      .lean();
    
    if (!children || children.length === 0) {
      return NextResponse.json({ children: [] }, { status: 200 });
    }

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
        ...child,
        currentClass: history?.classId || null,
        academicYear: history?.academicYear || academicYear,
        rollNo: history?.rollNo || null,
      };
    });

    return NextResponse.json({ children: response });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
