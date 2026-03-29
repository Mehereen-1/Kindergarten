import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ClassSubjectAssignment from '@/lib/models/ClassSubjectAssignment';
import '@/lib/models/ClassSubjectAssignment';
import '@/lib/models/Subject';
import '@/lib/models/User';

/**
 * GET /api/parent/class-subjects?classId=...&academicYear=...
 * Returns active class-subject assignments for a class and year.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear());

    if (!classId) {
      return NextResponse.json(
        { success: false, error: 'classId is required' },
        { status: 400 }
      );
    }

    const assignments = await ClassSubjectAssignment.find({
      classId,
      academicYear,
      status: 'active',
    })
      .populate('subjectId', 'name code')
      .populate('teacherId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const subjects = assignments.map((assignment: any) => ({
      _id: assignment._id?.toString?.() || String(assignment._id),
      subjectId: assignment.subjectId?._id?.toString?.() || String(assignment.subjectId?._id || ''),
      subjectName: assignment.subjectId?.name || 'Subject',
      subjectCode: assignment.subjectId?.code || '',
      teacherName: assignment.teacherId?.name || 'Teacher',
      teacherEmail: assignment.teacherId?.email || '',
      academicYear: assignment.academicYear,
    }));

    return NextResponse.json({ success: true, data: subjects, count: subjects.length });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load class subjects' },
      { status: 500 }
    );
  }
}
