import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Topic from '@/lib/models/Topic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const topicId = params.id;

    if (!topicId) {
      return NextResponse.json(
        { error: 'Topic ID is required' },
        { status: 400 }
      );
    }

    const topic = await Topic.findById(topicId);

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      topic
    });

  } catch (error: any) {
    console.error('Error fetching topic:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch topic' },
      { status: 500 }
    );
  }
}
