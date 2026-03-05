import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import User from '@/lib/models/User';
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
    if (!data.name || !data.class || !data.section || !data.parentId || !data.teacherId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const student = await Student.create(data);
    const populatedStudent = await student.populate([
      { path: 'parentId', select: 'name email phone' },
      { path: 'teacherId', select: 'name email' }
    ]);

    return NextResponse.json(populatedStudent, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
