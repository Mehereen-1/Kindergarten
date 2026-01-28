import { connectDB } from '@/lib/mongodb';
import Result from '@/lib/models/Result';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  try {
    await connectDB();
    
    let query: any = {};
    if (studentId) query.studentId = studentId;

    const results = await Result.find(query)
      .populate('studentId', 'name rollNumber');
    
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    if (!data.studentId || !data.subject || !data.marks || !data.examName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await Result.create(data);
    const populatedResult = await result.populate('studentId', 'name rollNumber');
    
    return NextResponse.json(populatedResult, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
