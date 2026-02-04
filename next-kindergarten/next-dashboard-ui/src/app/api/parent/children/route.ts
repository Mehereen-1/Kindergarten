import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';

/**
 * GET /api/parent/children?parentId={id}
 * Get all children for a parent
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const parentId = request.nextUrl.searchParams.get('parentId');

    if (!parentId) {
      return NextResponse.json(
        { error: 'parentId is required' },
        { status: 400 }
      );
    }

    const children = await Student.find({ parentId }).select(
      'name email phone grade roll address bloodGroup birthday sex profilePic'
    );

    return NextResponse.json({
      children: children || []
    });
  } catch (error: any) {
    console.error('Error fetching children:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
