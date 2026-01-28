import { connectDB } from '@/lib/mongodb';
import Result from '@/lib/models/Result';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  try {
    await connectDB();
    
    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId required' },
        { status: 400 }
      );
    }

    const results = await Result.find({ studentId })
      .sort({ createdAt: -1 });
    
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
