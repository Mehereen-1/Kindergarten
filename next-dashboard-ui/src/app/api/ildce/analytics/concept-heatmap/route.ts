import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import StudentQuizAttempt from '@/lib/models/StudentQuizAttempt';
import StudentMetrics from '@/lib/models/StudentMetrics';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const topicId = searchParams.get('topicId');

    if (!classId) {
      return NextResponse.json(
        { error: 'classId is required' },
        { status: 400 }
      );
    }

    // Get all attempts for this class
    const attempts = await StudentQuizAttempt.find({ classId })
      .populate('studentId', 'name')
      .populate('quizId', 'concepts');

    // Build concept × student mastery matrix
    const conceptMatrix: any = {};
    const studentSet: Set<string> = new Set();
    const conceptSet: Set<string> = new Set();

    // Initialize matrix
    attempts.forEach((attempt: any) => {
      const studentId = attempt.studentId._id.toString();
      const studentName = attempt.studentId.name || `Student ${studentId.slice(0, 4)}`;

      studentSet.add(studentId);

      // Extract concepts from quiz and score per concept
      if (attempt.quizId?.concepts) {
        attempt.quizId.concepts.forEach((concept: any) => {
          conceptSet.add(concept);

          if (!conceptMatrix[concept]) {
            conceptMatrix[concept] = {};
          }

          // Calculate mastery for this concept (based on score %)
          const mastery = attempt.scorePercentage || 0;
          const count = (conceptMatrix[concept][studentId]?.attempts || 0) + 1;
          const prevMastery = conceptMatrix[concept][studentId]?.mastery || 0;
          const newMastery = (prevMastery * (count - 1) + mastery) / count;

          conceptMatrix[concept][studentId] = {
            mastery: newMastery,
            attempts: count,
            lastAttemptDate: attempt.attemptedAt,
          };
        });
      }
    });

    // Get student metrics for additional context
    const studentMetrics = await StudentMetrics.find({
      classId,
      studentId: { $in: Array.from(studentSet) }
    });

    const metricsMap: any = {};
    studentMetrics.forEach((metric: any) => {
      metricsMap[metric.studentId.toString()] = metric;
    });

    // Build heatmap data
    const heatmapData = Array.from(conceptSet).map(concept => ({
      concept,
      students: Array.from(studentSet).map(studentId => {
        const data = conceptMatrix[concept]?.[studentId] || { mastery: 0, attempts: 0 };
        return {
          studentId,
          studentName: studentMetrics.find(m => m.studentId.toString() === studentId)?.studentId || `S${studentId.slice(0, 3)}`,
          mastery: data.mastery,
          attempts: data.attempts,
          color: getMasteryColor(data.mastery),
        };
      }),
      avgMastery: Array.from(studentSet)
        .reduce((sum, sid) => sum + (conceptMatrix[concept]?.[sid]?.mastery || 0), 0) / studentSet.size,
    }));

    // Overall statistics
    const overallStats = {
      totalStudents: studentSet.size,
      totalConcepts: conceptSet.size,
      totalAttempts: attempts.length,
      avgMastery: attempts.length > 0
        ? attempts.reduce((sum, a) => sum + (a.scorePercentage || 0), 0) / attempts.length
        : 0,
      strongConcepts: heatmapData.filter(h => h.avgMastery >= 0.7).map(h => h.concept),
      weakConcepts: heatmapData.filter(h => h.avgMastery < 0.5).map(h => h.concept),
    };

    // Find concept-student combinations needing attention
    const needsAttention = heatmapData.flatMap(row =>
      row.students
        .filter(s => s.mastery < 0.5)
        .map(s => ({
          concept: row.concept,
          studentId: s.studentId,
          mastery: s.mastery,
          recommendations: getConceptRecommendation(row.concept, s.mastery),
        }))
    );

    return NextResponse.json({
      success: true,
      heatmap: heatmapData,
      stats: overallStats,
      needsAttention: needsAttention.slice(0, 10), // Top 10 attention items
    });
  } catch (error: any) {
    console.error('Concept heatmap error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate concept heatmap' },
      { status: 500 }
    );
  }
}

function getMasteryColor(mastery: number): string {
  if (mastery >= 0.8) return 'bg-green-500';
  if (mastery >= 0.6) return 'bg-green-300';
  if (mastery >= 0.4) return 'bg-yellow-300';
  if (mastery >= 0.2) return 'bg-orange-400';
  return 'bg-red-500';
}

function getConceptRecommendation(concept: string, mastery: number): string {
  if (mastery < 0.3) return `Student needs intensive practice with ${concept}`;
  if (mastery < 0.5) return `Student should practice more ${concept} problems`;
  return `Consider additional review of ${concept}`;
}
