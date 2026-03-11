import { NextRequest, NextResponse } from 'next/server';
import StudentMetrics from '@/lib/models/StudentMetrics';
import TopicMetrics from '@/lib/models/TopicMetrics';
import StudentQuizAttempt from '@/lib/models/StudentQuizAttempt';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/ildce/metrics/student
 * Get metrics for a specific student and topic
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const topicId = searchParams.get('topicId');
    const classId = searchParams.get('classId');

    if (!studentId || !topicId) {
      return NextResponse.json(
        { error: 'Missing studentId or topicId' },
        { status: 400 }
      );
    }

    // Get student metrics
    const metrics = await StudentMetrics.findOne({
      studentId,
      topicId,
    });

    // Get quiz attempts
    const attempts = await StudentQuizAttempt.find({
      studentId,
      topicId,
    }).sort({ timestamp: -1 });

    return NextResponse.json(
      {
        metrics: metrics || null,
        attempts,
        attempt_count: attempts.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching student metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching metrics' },
      { status: 500 }
    );
  }
}
