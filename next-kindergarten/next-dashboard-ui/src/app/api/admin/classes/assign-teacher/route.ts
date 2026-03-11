import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Class from '@/lib/models/Class';
import User from '@/lib/models/User';
import TeacherClassAssignment from '@/lib/models/TeacherClassAssignment';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    if (!data.classId || !data.teacherId || !data.academicYear) {
      return NextResponse.json(
        { error: 'classId, teacherId, and academicYear are required' },
        { status: 400 }
      );
    }

    const classDoc = await Class.findById(data.classId).lean();
    if (!classDoc) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const teacher = await User.findById(data.teacherId).lean();
    if (!teacher || teacher.role !== 'teacher') {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    await TeacherClassAssignment.findOneAndUpdate(
      {
        teacherId: data.teacherId,
        classId: data.classId,
        academicYear: String(data.academicYear),
      },
      {
        teacherId: data.teacherId,
        classId: data.classId,
        academicYear: String(data.academicYear),
        role: data.role || 'class_teacher',
        status: 'active',
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      classId: data.classId,
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
      },
      academicYear: String(data.academicYear),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
