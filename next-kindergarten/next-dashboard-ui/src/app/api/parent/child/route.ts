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

    // Fetch all children for this parent
    const children = await Student.find({ parentId })
      .select('name email phone grade roll address bloodGroup birthday sex')
      .lean();
    
    if (!children || children.length === 0) {
      return NextResponse.json({ children: [] }, { status: 200 });
    }

    return NextResponse.json({ children });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
