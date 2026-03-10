import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import User from '@/lib/models/User';
import Class from '@/lib/models/Class';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Authorization temporarily disabled.

    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear());

    const students = await Student.find()
      .populate('parentId', 'name email phone')
      .lean();

    const histories = await StudentClassHistory.find({ academicYear })
      .populate('classId', 'name classId grade')
      .lean();

    const historyByStudent = new Map(
      histories.map((history) => [history.studentId.toString(), history])
    );

    const response = (students || []).map((student) => {
      const history = historyByStudent.get(student._id.toString());
      return {
        ...student,
        currentClass: history?.classId || null,
        academicYear: history?.academicYear || academicYear,
        rollNo: history?.rollNo || null,
      };
    });

    return NextResponse.json({ students: response });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.parentId || !data.classId || !data.academicYear) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const classDoc = await Class.findById(data.classId).lean() ||
      await Class.findOne({ classId: data.classId }).lean();

    if (!classDoc) {
      return NextResponse.json(
        { error: 'Class not found for classId' },
        { status: 400 }
      );
    }

    const student = await Student.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      parentId: data.parentId,
      address: data.address,
      bloodGroup: data.bloodGroup,
      birthday: data.birthday ? new Date(data.birthday) : undefined,
      sex: data.sex,
      profilePic: data.profilePic,
    });

    await StudentClassHistory.findOneAndUpdate(
      { studentId: student._id, academicYear: String(data.academicYear) },
      {
        studentId: student._id,
        classId: classDoc._id,
        academicYear: String(data.academicYear),
        rollNo: data.rollNo ? String(data.rollNo) : undefined,
        status: 'active'
      },
      { upsert: true, new: true }
    );

    const populatedStudent = await student.populate([
      { path: 'parentId', select: 'name email phone' }
    ]);

    return NextResponse.json(populatedStudent, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
