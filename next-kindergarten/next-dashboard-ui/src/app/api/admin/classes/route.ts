import { connectDB } from '@/lib/mongodb';
import Class from '@/lib/models/Class';
import Student from '@/lib/models/Student';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const classes = await Class.find()
      .populate('teacherId', 'name email')
      .populate('studentIds', 'name rollNumber');
    
    return NextResponse.json(classes);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    // Validate required fields
    if (!data.className || !data.section || !data.teacherId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const classData = await Class.create({
      className: data.className,
      section: data.section,
      teacherId: data.teacherId,
      studentIds: data.studentIds || []
    });

    const populatedClass = await classData.populate([
      { path: 'teacherId', select: 'name email' },
      { path: 'studentIds', select: 'name rollNumber' }
    ]);

    return NextResponse.json(populatedClass, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
