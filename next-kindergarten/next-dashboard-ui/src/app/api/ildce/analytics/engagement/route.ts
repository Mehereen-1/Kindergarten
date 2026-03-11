import { NextRequest, NextResponse } from 'next/server';
import StudentMetrics from '@/lib/models/StudentMetrics';
import TopicMetrics from '@/lib/models/TopicMetrics';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/ildce/analytics/engagement
 * Get engagement analytics and patterns
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

    // Get all student metrics for this topic
    const metrics = await StudentMetrics.find({
      topicId,
      classId,
    }).populate('studentId', 'name email');

    // Categorize by engagement level
    const engagement = {
      high: metrics.filter((m) => m.engagement_index >= 0.8),
      medium: metrics.filter((m) => m.engagement_index >= 0.5 && m.engagement_index < 0.8),
      low: metrics.filter((m) => m.engagement_index < 0.5),
    };

    // Calculate engagement metrics
    const avgEngagement = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.engagement_index, 0) / metrics.length
      : 0;

    const avgTimeSpent = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.total_time_spent, 0) / metrics.length
      : 0;

    const avgAttempts = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.quiz_attempts, 0) / metrics.length
      : 0;

    const avgViews = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.content_views, 0) / metrics.length
      : 0;

    // Engagement trends
    const engagementTrend = metrics.map((m) => ({
      studentId: m.studentId._id,
      studentName: m.studentId.name,
      engagementIndex: m.engagement_index,
      timeSpent: m.total_time_spent,
      quizAttempts: m.quiz_attempts,
      contentViews: m.content_views,
      status: m.engagement_index >= 0.8 ? '✅ High' : m.engagement_index >= 0.5 ? '⚠️ Medium' : '❌ Low',
    }));

    // Get topic metrics for class averages
    const topicMetrics = await TopicMetrics.findOne({ topicId, classId });

    return NextResponse.json(
      {
        avgEngagement,
        avgTimeSpent,
        avgAttempts,
        avgViews,
        engagement: {
          high: {
            count: engagement.high.length,
            percentage: ((engagement.high.length / metrics.length) * 100).toFixed(1),
            students: engagement.high.map((m) => ({ name: (m.studentId as any).name, index: m.engagement_index })),
          },
          medium: {
            count: engagement.medium.length,
            percentage: ((engagement.medium.length / metrics.length) * 100).toFixed(1),
            students: engagement.medium.map((m) => ({ name: (m.studentId as any).name, index: m.engagement_index })),
          },
          low: {
            count: engagement.low.length,
            percentage: ((engagement.low.length / metrics.length) * 100).toFixed(1),
            students: engagement.low.map((m) => ({ name: (m.studentId as any).name, index: m.engagement_index })),
          },
        },
        engagementTrend: engagementTrend.sort((a, b) => b.engagementIndex - a.engagementIndex),
        classAvgEngagement: topicMetrics?.avg_engagement || avgEngagement,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching engagement analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching engagement data' },
      { status: 500 }
    );
  }
}
