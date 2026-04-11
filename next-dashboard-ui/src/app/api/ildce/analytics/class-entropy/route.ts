import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TopicMetrics from '@/lib/models/TopicMetrics';
import StudentMetrics from '@/lib/models/StudentMetrics';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    if (!classId) {
      return NextResponse.json(
        { error: 'classId is required' },
        { status: 400 }
      );
    }

    // Get student metrics for entropy calculation
    const studentMetrics = await StudentMetrics.find({ classId });

    if (studentMetrics.length === 0) {
      return NextResponse.json({
        success: true,
        classEntropy: 0,
        distribution: {
          weak: { count: 0, percentage: 0, students: [] },
          moderate: { count: 0, percentage: 0, students: [] },
          strong: { count: 0, percentage: 0, students: [] },
        },
        insights: ['No student data available yet'],
        interpretation: 'Unable to calculate entropy with no students',
      });
    }

    // Distribute students by performance level based on avg mastery
    const weak: any[] = [];
    const moderate: any[] = [];
    const strong: any[] = [];

    studentMetrics.forEach((metric: any) => {
      const masteryLevel = metric.avgMastery || 0;
      const studentInfo = {
        studentId: metric.studentId.toString(),
        mastery: masteryLevel,
        velocity: metric.learningVelocity || 0,
      };

      if (masteryLevel < 0.4) weak.push(studentInfo);
      else if (masteryLevel < 0.7) moderate.push(studentInfo);
      else strong.push(studentInfo);
    });

    const total = studentMetrics.length;

    // Calculate Shannon Entropy for class distribution
    // H = -Σ(p_i * log2(p_i)) where p_i is proportion in each group
    const pWeak = weak.length / total;
    const pModerate = moderate.length / total;
    const pStrong = strong.length / total;

    const entropy = calculateEntropy([pWeak, pModerate, pStrong]);

    // Get topic-level metrics for class entropy
    const topicMetrics = await TopicMetrics.find({ classId });

    // Calculate topic coverage entropy
    const topicEntropy = topicMetrics.length > 0
      ? calculateEntropy(
          topicMetrics.map((t: any) => (t.masterByCount || 0) / total)
        )
      : 0;

    // Generate insights
    const insights = generateEntropyInsights(
      weak.length,
      moderate.length,
      strong.length,
      total
    );

    // Performance velocity insight
    const avgVelocity = studentMetrics.reduce(
      (sum: number, m: any) => sum + (m.learningVelocity || 0),
      0
    ) / studentMetrics.length;

    const interpretation = getEntropyInterpretation(entropy, pWeak, pStrong);

    return NextResponse.json({
      success: true,
      classEntropy: {
        value: entropy,
        normalized: entropy / Math.log2(3), // Normalized to 0-1 for 3 categories
        interpretation,
      },
      distribution: {
        weak: {
          count: weak.length,
          percentage: (weak.length / total) * 100,
          students: weak,
          avgMastery: weak.length > 0
            ? weak.reduce((sum: number, s: any) => sum + s.mastery, 0) / weak.length
            : 0,
        },
        moderate: {
          count: moderate.length,
          percentage: (moderate.length / total) * 100,
          students: moderate,
          avgMastery: moderate.length > 0
            ? moderate.reduce((sum: number, s: any) => sum + s.mastery, 0) / moderate.length
            : 0,
        },
        strong: {
          count: strong.length,
          percentage: (strong.length / total) * 100,
          students: strong,
          avgMastery: strong.length > 0
            ? strong.reduce((sum: number, s: any) => sum + s.mastery, 0) / strong.length
            : 0,
        },
      },
      topicCoverageEntropy: topicEntropy,
      avgClassVelocity: avgVelocity,
      insights,
      recommendations: generateRecommendations(
        weak.length,
        moderate.length,
        strong.length,
        total,
        entropy,
        avgVelocity
      ),
    });
  } catch (error: any) {
    console.error('Class entropy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate class entropy' },
      { status: 500 }
    );
  }
}

function calculateEntropy(probabilities: number[]): number {
  return -probabilities
    .filter(p => p > 0)
    .reduce((sum, p) => sum + p * Math.log2(p), 0);
}

function generateEntropyInsights(
  weakCount: number,
  moderateCount: number,
  strongCount: number,
  total: number
): string[] {
  const insights: string[] = [];

  const weakPct = (weakCount / total) * 100;
  const moderatePct = (moderateCount / total) * 100;
  const strongPct = (strongCount / total) * 100;

  if (weakPct > 40) {
    insights.push(`⚠️ ${weakCount} students (${weakPct.toFixed(0)}%) are struggling significantly`);
  }

  if (strongPct > 60) {
    insights.push(`✅ Majority of class (${strongPct.toFixed(0)}%) demonstrates strong mastery`);
  }

  if (moderatePct > 50) {
    insights.push(
      `📊 Class shows moderate spread - many students need targeted support`
    );
  }

  if (weakCount + moderateCount > total * 0.7) {
    insights.push(`📉 Consider reteaching or alternative instruction strategies`);
  }

  if (strongCount > total * 0.5 && weakCount < total * 0.2) {
    insights.push(`🎯 Class demonstrates balanced performance`);
  }

  return insights;
}

function getEntropyInterpretation(
  entropy: number,
  weakProportion: number,
  strongProportion: number
): string {
  const maxEntropy = Math.log2(3); // Max entropy for 3 categories
  const normalizedEntropy = entropy / maxEntropy;

  if (normalizedEntropy > 0.8) {
    return 'HIGH ENTROPY: Class performance is highly polarized. Students have very different mastery levels.';
  } else if (normalizedEntropy > 0.5) {
    return 'MODERATE ENTROPY: Class shows varied performance. Multiple intervention strategies needed.';
  } else if (normalizedEntropy > 0.2) {
    return 'LOW ENTROPY: Class performance is relatively uniform. Consistent teaching strategy working well.';
  } else {
    return 'MINIMAL ENTROPY: Almost all students at same level (concentrated distribution).';
  }
}

function generateRecommendations(
  weakCount: number,
  moderateCount: number,
  strongCount: number,
  total: number,
  entropy: number,
  avgVelocity: number
): string[] {
  const recommendations: string[] = [];

  if (weakCount > total * 0.3) {
    recommendations.push('Provide small group / one-on-one tutoring for struggling students');
  }

  if (strongCount > total * 0.5) {
    recommendations.push('Create enrichment activities or advanced challenges for advanced learners');
  }

  if (moderateCount > total * 0.5) {
    recommendations.push('Use targeted practice problems to move moderate students toward mastery');
  }

  if (avgVelocity < 0.05) {
    recommendations.push('Students progressing slowly - consider review sessions before new content');
  }

  if (avgVelocity > 0.2) {
    recommendations.push('Strong class progress - ready to introduce advanced topics');
  }

  const maxEntropy = Math.log2(3);
  if (entropy / maxEntropy > 0.8) {
    recommendations.push(
      'High polarization detected - consider differentiated instruction strategies'
    );
  }

  return recommendations;
}
