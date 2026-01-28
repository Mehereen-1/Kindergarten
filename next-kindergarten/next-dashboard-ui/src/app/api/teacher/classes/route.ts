import { connectDB } from '@/lib/mongodb';
import Class from '@/lib/models/Class';
import Student from '@/lib/models/Student';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  try {
    await connectDB();
    
    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacherId required' },
        { status: 400 }
      );
    }

    const classes = await Class.find({ teacherId })
      .populate('studentIds', 'name rollNumber class section');
    
    return NextResponse.json(classes);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
