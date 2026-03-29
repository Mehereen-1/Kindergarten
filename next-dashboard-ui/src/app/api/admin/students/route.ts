import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import User from '@/lib/models/User';
import Class from '@/lib/models/Class';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const userCookie = request.cookies.get('user')?.value;

    if (!userCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let user;
    try {
      user = JSON.parse(decodeURIComponent(userCookie));
    } catch {
      return NextResponse.json(
        { error: 'Invalid user cookie' },
        { status: 401 }
      );
    }

    // FIXED LOGIC HERE
    if (user.role !== 'admin' && user.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const students = await Student.find().lean();

    return NextResponse.json({ students: students || [] });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
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
