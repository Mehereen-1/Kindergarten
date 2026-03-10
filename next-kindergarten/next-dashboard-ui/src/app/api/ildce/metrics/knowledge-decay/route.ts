import { NextRequest, NextResponse } from 'next/server';
import StudentMetrics from '@/lib/models/StudentMetrics';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/ildce/metrics/knowledge-decay
 * Get knowledge decay predictions for students
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const topicId = searchParams.get('topicId');
    const classId = searchParams.get('classId');

    if (!topicId || !classId) {
      return NextResponse.json(
        { error: 'Missing topicId or classId' },
        { status: 400 }
      );
    }

    // Get all student metrics for topic
    const metrics = await StudentMetrics.find({
      topicId,
      classId,
    }).populate('studentId', 'name email');

    // Sort by predicted drop date
    const studentDecayData = metrics
      .map((m) => ({
        student: m.studentId,
        mastery_score: m.mastery_score,
        predicted_decay: m.predicted_decay,
        predicted_drop_date: m.next_predicted_review_date,
        recommendation:
          m.predicted_decay < 0.6
            ? '⚠️ Schedule immediate revision'
            : 'Monitor progress',
        needs_revision: m.predicted_decay < 0.6,
      }))
      .sort((a, b) => {
        // Urgent (predicted_decay < 0.6) first
        if (a.needs_revision !== b.needs_revision) {
          return a.needs_revision ? -1 : 1;
        }
        // Then by predicted drop date
        if (a.predicted_drop_date && b.predicted_drop_date) {
          return (
            new Date(a.predicted_drop_date).getTime() -
            new Date(b.predicted_drop_date).getTime()
          );
        }
        return 0;
      });

    const urgentCount = studentDecayData.filter((s) => s.needs_revision).length;

    return NextResponse.json(
      {
        students: studentDecayData,
        urgent_revisions_needed: urgentCount,
        total_students: studentDecayData.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching knowledge decay data:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching decay data' },
      { status: 500 }
    );
  }
}
