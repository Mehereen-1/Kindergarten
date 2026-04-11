import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import StudentMetrics from '@/lib/models/StudentMetrics';
import StudentQuizAttempt from '@/lib/models/StudentQuizAttempt';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const daysAhead = parseInt(searchParams.get('daysAhead') || '14'); // default 14 days

    if (!classId) {
      return NextResponse.json(
        { error: 'classId is required' },
        { status: 400 }
      );
    }

    // Get student metrics and recent attempts
    const studentMetrics = await StudentMetrics.find({ classId })
      .populate('studentId', 'name');

    const attempts = await StudentQuizAttempt.find({ classId })
      .sort({ attemptedAt: -1 })
      .limit(1000);

    if (studentMetrics.length === 0) {
      return NextResponse.json({
        success: true,
        forecasts: [],
        classForecasts: {},
        message: 'No data for forecasting',
      });
    }

    // Calculate forecasts per student
    const forecasts = studentMetrics.map((metric: any) => {
      // Get student's recent attempts
      const studentAttempts = attempts
        .filter(a => a.studentId.toString() === metric.studentId._id.toString())
        .sort((a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime());

      if (studentAttempts.length < 2) {
        return {
          studentId: metric.studentId._id.toString(),
          studentName: metric.studentId.name || 'Unknown',
          currentMastery: metric.avgMastery || 0,
          forecast: null,
          confidence: 'Low',
          message: 'Insufficient data for forecasting',
        };
      }

      // Calculate linear trend from recent attempts
      const scores = studentAttempts.map(a => a.scorePercentage || 0);
      const trend = calculateTrend(scores);
      const velocity = metric.learningVelocity || 0;

      // Forecast future performance
      const currentScore = scores[scores.length - 1];
      const forecastedScore = Math.min(
        1,
        Math.max(0, currentScore + velocity * (daysAhead / 7))
      );

      // Confidence based on consistency
      const consistency = calculateConsistency(scores);
      const confidence = getConfidenceLevel(consistency, studentAttempts.length);

      // Generate forecast points for chart
      const forecastPoints: Array<{ day: number; predicted: number }> = [];
      for (let day = 0; day <= daysAhead; day += daysAhead / 6) {
        forecastPoints.push({
          day: Math.round(day),
          predicted: Math.min(1, Math.max(0, currentScore + velocity * (day / 7))),
        });
      }

      // Determine trajectory
      let trajectory = 'Stable';
      if (velocity > 0.02) trajectory = 'Improving';
      if (velocity < -0.02) trajectory = 'Declining';

      // Calculate projected performance status at forecast date
      const forecastedStatus = getPerformanceStatus(forecastedScore);

      return {
        studentId: metric.studentId._id.toString(),
        studentName: metric.studentId.name || 'Unknown',
        currentMastery: currentScore,
        forecastedMastery: forecastedScore,
        velocityPerDay: velocity,
        projecteddaysToMastery: velocity > 0
          ? Math.ceil((0.7 - currentScore) / velocity)
          : Number.MAX_SAFE_INTEGER,
        trajectory,
        confidence,
        performanceStatus: getPerformanceStatus(currentScore),
        forecastedStatus,
        forecastPoints,
        riskLevel: calculateRiskLevel(velocity, forecastedScore),
        recommendations: generateStudentRecommendations(
          velocity,
          forecastedScore,
          consistency,
          trajectory
        ),
      };
    });

    // Class-level forecasts
    const classForecasts = {
      avgCurrentMastery: forecasts.length > 0
        ? forecasts.reduce((sum, f: any) => sum + (f.currentMastery || 0), 0) / forecasts.length
        : 0,
      avgForecastedMastery: forecasts.length > 0
        ? forecasts.reduce((sum, f: any) => sum + (f.forecastedMastery || 0), 0) / forecasts.length
        : 0,
      improvingStudents: forecasts.filter((f: any) => f.trajectory === 'Improving').length,
      declineingStudents: forecasts.filter((f: any) => f.trajectory === 'Declining').length,
      stableStudents: forecasts.filter((f: any) => f.trajectory === 'Stable').length,
      atRisk: forecasts.filter((f: any) => f.riskLevel === 'High').length,
      onTrack: forecasts.filter((f: any) => f.riskLevel === 'Low').length,
      daysAhead,
      forecastDate: new Date(new Date().getTime() + daysAhead * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    };

    // Trend chart data
    const trendPoints: Array<{ day: number; strong: number; moderate: number; weak: number }> = [];
    for (let day = 0; day <= daysAhead; day += daysAhead / 10) {
      const studentsAtLevel = (level: number, margin: number = 0.05) =>
        forecasts.filter((f: any) => {
          const pred = Math.min(1, Math.max(0, 
            f.currentMastery + f.velocityPerDay * (day / 7)
          ));
          return Math.abs(pred - level) < margin;
        }).length;

      trendPoints.push({
        day: Math.round(day),
        strong: forecasts.filter((f: any) => {
          const pred = Math.min(1, Math.max(0, 
            f.currentMastery + f.velocityPerDay * (day / 7)
          ));
          return pred >= 0.7;
        }).length,
        moderate: forecasts.filter((f: any) => {
          const pred = Math.min(1, Math.max(0, 
            f.currentMastery + f.velocityPerDay * (day / 7)
          ));
          return pred >= 0.4 && pred < 0.7;
        }).length,
        weak: forecasts.filter((f: any) => {
          const pred = Math.min(1, Math.max(0, 
            f.currentMastery + f.velocityPerDay * (day / 7)
          ));
          return pred < 0.4;
        }).length,
      });
    }

    return NextResponse.json({
      success: true,
      forecasts: forecasts.sort(
        (a, b) => (b.riskLevel === 'High' ? 1 : 0) - (a.riskLevel === 'High' ? 1 : 0)
      ),
      classForecasts,
      trendPoints,
      insights: generateClassForecastInsights(classForecasts, forecasts),
      recommendations: generateClassRecommendations(classForecasts, forecasts),
    });
  } catch (error: any) {
    console.error('Performance forecast error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate performance forecast' },
      { status: 500 }
    );
  }
}

function calculateTrend(scores: number[]): number {
  if (scores.length < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < scores.length; i++) {
    sumX += i;
    sumY += scores[i];
    sumXY += i * scores[i];
    sumX2 += i * i;
  }

  const n = scores.length;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

function calculateConsistency(scores: number[]): number {
  if (scores.length < 2) return 1;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // CV = stddev / mean, smaller means more consistent
  return mean > 0 ? 1 - Math.min(1, stdDev / mean) : 0.5;
}

function getConfidenceLevel(consistency: number, attemptCount: number): string {
  if (attemptCount < 3) return 'Low';
  if (consistency > 0.8) return 'High';
  if (consistency > 0.6) return 'Medium';
  return 'Low';
}

function getPerformanceStatus(mastery: number): string {
  if (mastery >= 0.8) return 'Excellent';
  if (mastery >= 0.6) return 'Good';
  if (mastery >= 0.4) return 'Fair';
  return 'Poor';
}

function calculateRiskLevel(velocity: number, forecastedMastery: number): string {
  if (velocity < -0.05 || forecastedMastery < 0.4) return 'High';
  if (velocity < 0 || forecastedMastery < 0.6) return 'Medium';
  return 'Low';
}

function generateStudentRecommendations(
  velocity: number,
  forecastedScore: number,
  consistency: number,
  trajectory: string
): string[] {
  const recommendations: string[] = [];

  if (velocity < -0.02) {
    recommendations.push('Performance declining - review recent material');
  }

  if (forecastedScore < 0.5) {
    recommendations.push('May need additional support or tutoring');
  }

  if (consistency < 0.6) {
    recommendations.push('Performance is inconsistent - identify and address blockers');
  }

  if (velocity > 0.1) {
    recommendations.push('Strong progress - consider advanced topics');
  }

  return recommendations;
}

function generateClassForecastInsights(classForecasts: any, forecasts: any[]): string[] {
  const insights: string[] = [];

  if (classForecasts.avgForecastedMastery > classForecasts.avgCurrentMastery + 0.05) {
    insights.push('✅ Class expected to improve over next period');
  }

  if (classForecasts.avgForecastedMastery < classForecasts.avgCurrentMastery - 0.05) {
    insights.push('⚠️ Class performance expected to decline - intervention needed');
  }

  if (classForecasts.atRisk > classForecasts.onTrack) {
    insights.push('🚨 More students at-risk than on-track');
  }

  if (classForecasts.improvingStudents > forecasts.length * 0.6) {
    insights.push('🚀 Majority of class showing positive trajectory');
  }

  return insights;
}

function generateClassRecommendations(classForecasts: any, forecasts: any[]): string[] {
  const recommendations: string[] = [];

  if (classForecasts.atRisk > forecasts.length * 0.25) {
    recommendations.push('Schedule intensive review or intervention sessions');
  }

  if (classForecasts.declineingStudents > forecasts.length * 0.3) {
    recommendations.push('Identify common misconceptions and address them');
  }

  if (classForecasts.avgForecastedMastery > 0.75) {
    recommendations.push('Ready to introduce next topic or advanced concepts');
  }

  return recommendations;
}
