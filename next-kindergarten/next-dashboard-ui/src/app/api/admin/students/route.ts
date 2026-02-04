import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import User from '@/lib/models/User';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Check if user is admin
    const userCookie = request.cookies.get('user')?.value;
    
    if (!userCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    try {
      const user = JSON.parse(decodeURIComponent(userCookie));
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Permission denied - admin only' },
          { status: 403 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid user cookie' },
        { status: 401 }
      );
    }

    const students = await Student.find()
      .populate('parentId', 'name email phone')
      .populate('teacherId', 'name email')
      .lean();
    
    return NextResponse.json({ students: students || [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
