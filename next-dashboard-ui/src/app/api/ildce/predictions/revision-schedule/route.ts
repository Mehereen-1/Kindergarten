import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import StudentMetrics from '@/lib/models/StudentMetrics';
import StudentQuizAttempt from '@/lib/models/StudentQuizAttempt';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');

    if (!classId) {
      return NextResponse.json(
        { error: 'classId is required' },
        { status: 400 }
      );
    }

    // Get student or all students based on filter
    const query: any = { classId };
    if (studentId) query.studentId = studentId;

    const studentMetrics = await StudentMetrics.find(query)
      .populate('studentId', 'name')
      .populate('classId', 'name');

    if (studentMetrics.length === 0) {
      return NextResponse.json({
        success: true,
        revisionSchedule: [],
        message: 'No students found',
      });
    }

    // Calculate revision schedules based on knowledge decay model
    const schedules = studentMetrics.map((metric: any) => {
      const decayRates = metric.knowledgeDecay || {};
      const topics = Object.entries(decayRates).map(([topicId, decayData]: any) => {
        // Predict when mastery will drop below threshold (e.g., 70%)
        const currentMastery = decayData.currentMastery || 0.8;
        const decayConstant = decayData.decayConstant || 0.05; // per day
        const masteryThreshold = 0.7;

        // Calculate days until revision needed
        // M(t) = M0 * e^(-k*t)
        // t = -ln(M_threshold / M0) / k
        let daysUntilRevision = 0;
        if (currentMastery > masteryThreshold) {
          daysUntilRevision = Math.max(
            1,
            Math.ceil(-Math.log(masteryThreshold / currentMastery) / decayConstant)
          );
        } else {
          daysUntilRevision = 0; // Needs immediate revision
        }

        // Calculate revision due date
        const today = new Date();
        const dueDate = new Date(today.getTime() + daysUntilRevision * 24 * 60 * 60 * 1000);

        // Determine urgency
        let urgency = 'Low';
        let revisionType = 'Optional Review';
        if (daysUntilRevision <= 3) {
          urgency = 'Critical';
          revisionType = 'Urgent: Review Today';
        } else if (daysUntilRevision <= 7) {
          urgency = 'High';
          revisionType = 'Review This Week';
        } else if (daysUntilRevision <= 14) {
          urgency = 'Medium';
          revisionType = 'Review This Week or Next';
        }

        return {
          topicId,
          topicName: decayData.topicName || `Topic ${topicId.slice(0, 4)}`,
          currentMastery: (currentMastery * 100).toFixed(1),
          daysUntilRevision,
          revisionDueDate: dueDate.toISOString().split('T')[0],
          urgency,
          revisionType,
          decayRate: (decayConstant * 100).toFixed(2),
          projectedMasteryAt7Days: (currentMastery * Math.exp(-decayConstant * 7) * 100).toFixed(1),
        };
      });

      // Sort by urgency and days until revision
      topics.sort((a, b) => {
        const urgencyOrder: any = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        return a.daysUntilRevision - b.daysUntilRevision;
      });

      return {
        studentId: metric.studentId._id.toString(),
        studentName: metric.studentId.name || 'Unknown',
        topicsNeedingRevision: topics.filter(t => t.daysUntilRevision <= 14), // 2-week window
        allTopicSchedules: topics,
        nextUrgentRevision: topics.find(t => t.urgency === 'Critical' || t.urgency === 'High'),
        totalTopicNeedingReview: topics.filter(t => t.daysUntilRevision <= 14).length,
        recommendedRevisionFrequency: calculateOptimalRevisionFrequency(metric.learningVelocity || 0),
      };
    });

    // Calculate class-level revision patterns
    const allTopics = new Set<string>();
    const revisionCounts: any = {};

    schedules.forEach((schedule: any) => {
      schedule.allTopicSchedules.forEach((topic: any) => {
        allTopics.add(topic.topicName);
        if (!revisionCounts[topic.topicName]) {
          revisionCounts[topic.topicName] = 0;
        }
        if (topic.daysUntilRevision <= 14) {
          revisionCounts[topic.topicName]++;
        }
      });
    });

    const classRevisionSummary = Array.from(allTopics).map(topic => ({
      topic,
      studentsNeedingRevision: revisionCounts[topic] || 0,
      percentage: ((revisionCounts[topic] || 0) / schedules.length) * 100,
    })).sort(
      (a, b) => b.studentsNeedingRevision - a.studentsNeedingRevision
    );

    return NextResponse.json({
      success: true,
      revisionSchedule: schedules,
      classRevisionSummary,
      totalStudentsNeedingRevision: schedules.filter(s => s.totalTopicNeedingReview > 0).length,
      criticalRevisionsNeeded: schedules.flatMap(s => s.topicsNeedingRevision.filter(t => t.urgency === 'Critical')).length,
      insights: generateRevisionInsights(schedules),
    });
  } catch (error: any) {
    console.error('Revision schedule error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate revision schedule' },
      { status: 500 }
    );
  }
}

function calculateOptimalRevisionFrequency(learningVelocity: number): string {
  if (learningVelocity > 0.15) return 'Every 2-3 weeks';
  if (learningVelocity > 0.08) return 'Every 1-2 weeks';
  if (learningVelocity > 0) return 'Every 1 week';
  return 'Every 3-4 days (struggling learner)';
}

function generateRevisionInsights(schedules: any[]): string[] {
  const insights: string[] = [];

  const studentsNeedingUrgentRevision = schedules.filter(
    s => s.topicsNeedingRevision.some((t: any) => t.urgency === 'Critical')
  ).length;

  if (studentsNeedingUrgentRevision > 0) {
    insights.push(
      `⚠️ ${studentsNeedingUrgentRevision} student(s) need urgent revision today`
    );
  }

  const totalRevisionNeeded = schedules.reduce(
    (sum: number, s: any) => sum + s.totalTopicNeedingReview,
    0
  );

  if (totalRevisionNeeded > schedules.length * 2) {
    insights.push('📚 Class has significant revision needs - consider group review sessions');
  }

  const avgTopicsPerStudent = totalRevisionNeeded / schedules.length;
  if (avgTopicsPerStudent < 1) {
    insights.push('✅ Class is maintaining previous knowledge well');
  }

  // Find most commonly reviewed topics
  const topicFrequency: any = {};
  schedules.forEach(s => {
    s.topicsNeedingRevision.forEach((t: any) => {
      topicFrequency[t.topicName] = (topicFrequency[t.topicName] || 0) + 1;
    });
  });

  const mostCommon = Object.entries(topicFrequency)
    .sort(([, a]: any, [, b]: any) => (b as number) - (a as number))[0];

  if (mostCommon && (mostCommon[1] as number) >= schedules.length * 0.5) {
    insights.push(
      `🎯 "${mostCommon[0]}" needs revision for ${mostCommon[1]} students - group review recommended`
    );
  }

  return insights;
}
