import { NextRequest, NextResponse } from 'next/server';
import StudentMetrics from '@/lib/models/StudentMetrics';
import StudentQuizAttempt from '@/lib/models/StudentQuizAttempt';
import TopicMetrics from '@/lib/models/TopicMetrics';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/ildce/analytics/learning-velocity
 * Get learning velocity trends over time for visualization
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

    // Get all attempts for this topic, sorted by date
    const attempts = await StudentQuizAttempt.find({
      topicId,
      classId,
    })
      .sort({ timestamp: 1 })
      .populate('studentId', 'name');

    // Calculate velocity trends per student
    const velocityData: any = {};

    attempts.forEach((attempt: any) => {
      const studentId = attempt.studentId._id.toString();
      
      if (!velocityData[studentId]) {
        velocityData[studentId] = {
          studentName: attempt.studentId.name,
          attempts: [],
        };
      }

      velocityData[studentId].attempts.push({
        attemptNumber: attempt.attempt_number,
        score: attempt.percentage,
        timestamp: attempt.timestamp,
        timeSpent: attempt.time_spent,
      });
    });

    // Calculate velocities
    const velocityTrends = Object.entries(velocityData).map(([studentId, data]: any) => {
      const velocities: any[] = [];
      
      for (let i = 1; i < data.attempts.length; i++) {
        const current = data.attempts[i];
        const previous = data.attempts[i - 1];
        
        const scoreDiff = (current.score - previous.score) / 100;
        const timeDiff = (current.timestamp - previous.timestamp) / (1000 * 60 * 60); // hours
        
        velocities.push({
          attemptNumber: current.attemptNumber,
          velocity: timeDiff > 0 ? scoreDiff / timeDiff : 0,
          score: current.score,
          timestamp: current.timestamp,
        });
      }

      const avgVelocity = velocities.length > 0
        ? velocities.reduce((sum, v) => sum + v.velocity, 0) / velocities.length
        : 0;

      const trend = avgVelocity > 0 ? 'improving' : avgVelocity < 0 ? 'declining' : 'stable';

      return {
        studentId,
        studentName: data.studentName,
        avgVelocity,
        trend,
        velocities,
        lastScore: data.attempts[data.attempts.length - 1].score,
        firstScore: data.attempts[0].score,
        totalAttempts: data.attempts.length,
      };
    });

    return NextResponse.json(
      {
        velocityTrends: velocityTrends.sort((a, b) => b.avgVelocity - a.avgVelocity),
        improvingCount: velocityTrends.filter((t) => t.trend === 'improving').length,
        decliningCount: velocityTrends.filter((t) => t.trend === 'declining').length,
        stableCount: velocityTrends.filter((t) => t.trend === 'stable').length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching learning velocity:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching velocity data' },
      { status: 500 }
    );
  }
}
