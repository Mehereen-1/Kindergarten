import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import User from '@/lib/models/User';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const students = await Student.find()
      .populate('parentId', 'name email phone')
      .populate('teacherId', 'name email');
    
    return NextResponse.json(students);
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
