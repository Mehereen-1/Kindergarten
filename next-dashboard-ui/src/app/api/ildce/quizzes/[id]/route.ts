import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Quiz from '@/lib/models/Quiz';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const quiz: any = await Quiz.findOne({ _id: params.id, is_published: true }).lean();

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json({ quiz });
  } catch (error: any) {
    console.error('Error fetching quiz by id:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch quiz' },
      { status: 500 }
    );
  }
}
