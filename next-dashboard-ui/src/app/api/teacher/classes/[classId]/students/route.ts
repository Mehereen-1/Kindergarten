import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Class from '@/lib/models/Class';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import TeacherClassAssignment from '@/lib/models/TeacherClassAssignment';
import ClassSubjectAssignment from '@/lib/models/ClassSubjectAssignment';
import '@/lib/models/Student';

const toId = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    await connectDB();

    const teacherId = request.nextUrl.searchParams.get('teacherId');
    const academicYear = request.nextUrl.searchParams.get('academicYear') || String(new Date().getFullYear());

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId is required' }, { status: 400 });
    }

    const classDoc = await Class.findById(params.classId).lean();
    if (!classDoc) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
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

    const histories = await StudentClassHistory.find({
      classId: classDoc._id,
      academicYear,
      status: 'active',
    })
      .populate('studentId', 'name email phone address bloodGroup birthday sex profilePic')
      .sort({ rollNo: 1, createdAt: 1 })
      .lean();

    const students = histories
      .map((history) => {
        const student: any = history.studentId;
        if (!student?._id) return null;

        return {
          id: String(student._id),
          name: student.name,
          email: student.email || '',
          phone: student.phone || '',
          address: student.address || '',
          bloodGroup: student.bloodGroup || '',
          birthday: student.birthday || null,
          sex: student.sex || '',
          profilePic: student.profilePic || '',
          rollNo: history.rollNo || '',
          academicYear: history.academicYear,
          className: classDoc.name,
          classId: classDoc.classId,
          grade: classDoc.grade,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      class: {
        _id: String(classDoc._id),
        name: classDoc.name,
        classId: classDoc.classId,
        grade: classDoc.grade,
        academicYear,
      },
      students,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
