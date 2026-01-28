import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parentId');

  try {
    await connectDB();
    
    if (!parentId) {
      return NextResponse.json(
        { error: 'parentId required' },
        { status: 400 }
      );
    }

    const child = await Student.findOne({ parentId })
      .populate('teacherId', 'name email phone');
    
    if (!child) {
      return NextResponse.json(
        { error: 'Child not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(child);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
