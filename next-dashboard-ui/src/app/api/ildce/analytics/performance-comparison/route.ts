import { NextRequest, NextResponse } from 'next/server';
import Topic from '@/lib/models/Topic';
import TopicMetrics from '@/lib/models/TopicMetrics';
import StudentMetrics from '@/lib/models/StudentMetrics';
import StudentQuizAttempt from '@/lib/models/StudentQuizAttempt';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/ildce/analytics/performance-comparison
 * Compare student performance and rank topics
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');
    const compareBy = searchParams.get('compareBy'); // 'students' or 'topics'

    if (!classId) {
      return NextResponse.json(
        { error: 'Missing classId' },
        { status: 400 }
      );
    }

    if (compareBy === 'topics') {
      // Compare topics by performance
      const topics = await Topic.find({ classId });
      const topicComparison = await Promise.all(
        topics.map(async (topic) => {
          const metrics = await TopicMetrics.findOne({
            topicId: topic._id,
            classId,
          });

          const attempts = await StudentQuizAttempt.countDocuments({
            topicId: topic._id,
            classId,
          });

          return {
            topicId: topic._id,
            topicName: topic.topic_name,
            avgMastery: metrics?.class_avg_mastery || 0,
            difficulty: metrics?.dynamic_difficulty || 0,
            attempts,
            entropy: metrics?.entropy || 0,
            avgEngagement: metrics?.avg_engagement || 0,
            rank: 0, // Will be calculated after sort
          };
        })
      );

      // Sort by mastery and rank
      topicComparison.sort((a, b) => b.avgMastery - a.avgMastery);
      topicComparison.forEach((t, idx) => {
        t.rank = idx + 1;
      });

      return NextResponse.json(
        {
          comparison: topicComparison,
          topRanked: topicComparison[0],
          strugglingTopic: topicComparison[topicComparison.length - 1],
          averageMastery: (topicComparison.reduce((sum, t) => sum + t.avgMastery, 0) / topicComparison.length).toFixed(2),
        },
        { status: 200 }
      );
    } else {
      // Compare students by performance (default)
      const studentMetrics = await StudentMetrics.find({
        classId,
      }).populate('studentId', 'name email');

      const studentComparison = studentMetrics.map((m) => ({
        studentId: m.studentId._id,
        studentName: (m.studentId as any).name,
        avgMastery: m.mastery_score,
        engagementLevel: m.engagement_index,
        learningVelocity: m.learning_velocity,
        topicsMastered: m.mastery_score > 0.7 ? 1 : 0,
        topicsAtRisk: m.mastery_score < 0.5 ? 1 : 0,
        performanceStatus:
          m.mastery_score > 0.7
            ? '⭐ Excellent'
            : m.mastery_score > 0.5
            ? '✅ Good'
            : m.mastery_score > 0.3
            ? '⚠️ Needs Work'
            : '❌ Critical',
      }));

      studentComparison.sort((a, b) => b.avgMastery - a.avgMastery);

      return NextResponse.json(
        {
          comparison: studentComparison,
          topPerformer: studentComparison[0],
          needsSupport: studentComparison[studentComparison.length - 1],
          classAvgMastery: (studentMetrics.reduce((sum, m) => sum + m.mastery_score, 0) / studentMetrics.length).toFixed(2),
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching performance comparison:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching comparison data' },
      { status: 500 }
    );
  }
}
