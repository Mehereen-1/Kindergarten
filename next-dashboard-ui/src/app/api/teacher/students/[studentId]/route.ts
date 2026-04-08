import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Class from '@/lib/models/Class';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import TeacherClassAssignment from '@/lib/models/TeacherClassAssignment';
import ClassSubjectAssignment from '@/lib/models/ClassSubjectAssignment';

const toId = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    await connectDB();

    const teacherId = request.nextUrl.searchParams.get('teacherId');
    const academicYear = request.nextUrl.searchParams.get('academicYear') || String(new Date().getFullYear());

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId is required' }, { status: 400 });
    }

    const student = await Student.findById(params.studentId).lean();
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const history = await StudentClassHistory.findOne({
      studentId: student._id,
      academicYear,
      status: 'active',
    })
      .populate('classId', 'name classId grade teacherId')
      .lean();

    const classDoc: any = history?.classId || null;

    if (!classDoc?._id) {
      return NextResponse.json({ error: 'Student is not assigned to a class for this academic year' }, { status: 404 });
    }

    const teacherMatch = mongoose.Types.ObjectId.isValid(teacherId)
      ? [{ teacherId }, { teacherId: new mongoose.Types.ObjectId(teacherId) }]
      : [{ teacherId }];

    const isAssignedBySubject = await ClassSubjectAssignment.exists({
      classId: classDoc._id,
      academicYear,
      status: 'active',
      $or: teacherMatch,
    });

    const isAssignedLegacy = await TeacherClassAssignment.exists({
      classId: classDoc._id,
      academicYear,
      status: 'active',
      $or: teacherMatch,
    });

    const isAssignedDirect = toId(classDoc.teacherId) === teacherId;

    if (!isAssignedBySubject && !isAssignedLegacy && !isAssignedDirect) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    return NextResponse.json({
      student: {
        _id: String(student._id),
        name: student.name,
        email: student.email || '',
        phone: student.phone || '',
        address: student.address || '',
        bloodGroup: student.bloodGroup || '',
        birthday: student.birthday || null,
        sex: student.sex || '',
        profilePic: student.profilePic || '',
        rollNo: history?.rollNo || '',
        academicYear,
        className: classDoc.name || '',
        classId: classDoc.classId || '',
        grade: classDoc.grade || '',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
