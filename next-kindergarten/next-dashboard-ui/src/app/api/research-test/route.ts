import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StudentQuizAttempt from '@/models/StudentQuizAttempt';
import StudentMetrics from '@/models/StudentMetrics';

const {
  calculatePersonalizedForgettingRate,
  calculatePersonalizedKnowledgeDecay,
  calculateTopicVolatilityIndex,
  calculateCompositeIntelligenceScore,
  calculateIRTParameters,
  bayesianKnowledgeTracing,
  tTest,
  analyzeLongitudinalTrends,
  analyzeClassTrends,
} = require('@/lib/mathIntelligenceEngine');

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const testType = searchParams.get('test') || 'all';
    const studentId = searchParams.get('studentId');
    const topicId = searchParams.get('topicId');
    const classId = searchParams.get('classId');

    // Get sample IDs from database if not provided
    let sampleStudentId = studentId;
    let sampleTopicId = topicId;
    let sampleClassId = classId;

    if (!sampleStudentId || !sampleTopicId || !sampleClassId) {
      const sampleAttempt = await StudentQuizAttempt.findOne().lean();
      if (sampleAttempt) {
        sampleStudentId = sampleStudentId || sampleAttempt.studentId?.toString();
        sampleTopicId = sampleTopicId || sampleAttempt.topicId?.toString();
        sampleClassId = sampleClassId || sampleAttempt.classId?.toString();
      }
    }

    const results: any = {
      testType,
      dataAvailable: {
        studentId: !!sampleStudentId,
        topicId: !!sampleTopicId,
        classId: !!sampleClassId,
      },
      usedIds: {
        studentId: sampleStudentId,
        topicId: sampleTopicId,
        classId: sampleClassId,
      },
      tests: {},
    };

    // Get data stats
    const totalAttempts = await StudentQuizAttempt.countDocuments();
    const totalStudents = await StudentQuizAttempt.distinct('studentId').then(arr => arr.length);
    const totalTopics = await StudentQuizAttempt.distinct('topicId').then(arr => arr.length);
    const totalClasses = await StudentQuizAttempt.distinct('classId').then(arr => arr.length);

    results.dataStats = {
      totalAttempts,
      totalStudents,
      totalTopics,
      totalClasses,
      hasEnoughData: totalAttempts >= 10 && totalStudents >= 3,
    };

    if (!sampleStudentId || !sampleTopicId || !sampleClassId) {
      return NextResponse.json({
        success: false,
        error: 'No data found in database. Create quiz attempts first.',
        results,
      });
    }

    // Test 1: Personalized Forgetting Rate
    if (testType === 'all' || testType === 'lambda') {
      try {
        const lambdaData = await calculatePersonalizedForgettingRate(sampleStudentId, sampleTopicId);
        const decayData = await calculatePersonalizedKnowledgeDecay(sampleStudentId, sampleTopicId);
        
        results.tests.personalizedLambda = {
          success: true,
          model: 'Personalized Forgetting Rate (λ)',
          data: {
            lambda: lambdaData.lambda,
            classification: lambdaData.classification,
            interpretation: lambdaData.interpretation,
            attemptsAnalyzed: lambdaData.attemptsAnalyzed,
            currentKnowledge: decayData.currentKnowledge,
            daysUntilDecay: decayData.daysUntilThreshold,
            predictedDecayDate: decayData.predictedDecayDate,
          },
        };
      } catch (error: any) {
        results.tests.personalizedLambda = {
          success: false,
          error: error.message,
          requirement: 'Needs at least 3 quiz attempts per student',
        };
      }
    }

    // Test 2: Topic Volatility Index
    if (testType === 'all' || testType === 'tvi') {
      try {
        const tviData = await calculateTopicVolatilityIndex(sampleTopicId, sampleClassId);
        
        results.tests.topicVolatility = {
          success: true,
          model: 'Topic Volatility Index (TVI)',
          data: {
            tvi: tviData.tvi,
            stability: tviData.stability,
            mean: tviData.mean,
            stdDev: tviData.stdDev,
            interpretation: tviData.interpretation,
            recommendation: tviData.recommendation,
            sampleSize: tviData.sampleSize,
          },
        };
      } catch (error: any) {
        results.tests.topicVolatility = {
          success: false,
          error: error.message,
          requirement: 'Needs at least 3 students with attempts',
        };
      }
    }

    // Test 3: Composite Intelligence Score
    if (testType === 'all' || testType === 'cis') {
      try {
        const cisData = await calculateCompositeIntelligenceScore(sampleTopicId, sampleClassId);
        
        results.tests.compositeIntelligence = {
          success: true,
          model: 'Composite Intelligence Score (CIS) ⭐',
          data: {
            cis: cisData.cis,
            grade: cisData.grade,
            interpretation: cisData.interpretation,
            components: cisData.components,
            actionItems: cisData.actionItems,
            studentsAnalyzed: cisData.metadata?.studentsAnalyzed,
            attemptsAnalyzed: cisData.metadata?.attemptsAnalyzed,
          },
        };
      } catch (error: any) {
        results.tests.compositeIntelligence = {
          success: false,
          error: error.message,
          requirement: 'Needs at least 5 students',
        };
      }
    }

    // Test 4: Item Response Theory
    if (testType === 'all' || testType === 'irt') {
      try {
        const irtData = await calculateIRTParameters(sampleTopicId, sampleClassId);
        
        results.tests.itemResponseTheory = {
          success: true,
          model: 'Item Response Theory (IRT)',
          data: {
            studentsAnalyzed: Object.keys(irtData.studentAbilities || {}).length,
            questionsAnalyzed: Object.keys(irtData.questionDifficulties || {}).length,
            avgStudentAbility: irtData.avgStudentAbility,
            avgQuestionDifficulty: irtData.avgQuestionDifficulty,
            interpretation: irtData.interpretation,
            nextQuestionDifficulty: irtData.nextQuestionDifficulty,
            sampleAbilities: Object.entries(irtData.studentAbilities || {}).slice(0, 3),
            sampleDifficulties: Object.entries(irtData.questionDifficulties || {}).slice(0, 3),
          },
        };
      } catch (error: any) {
        results.tests.itemResponseTheory = {
          success: false,
          error: error.message,
          requirement: 'Needs at least 5 students with quiz attempts',
        };
      }
    }

    // Test 5: Bayesian Knowledge Tracing
    if (testType === 'all' || testType === 'bkt') {
      try {
        const bktData = await bayesianKnowledgeTracing(sampleStudentId, sampleTopicId);
        
        results.tests.bayesianKnowledge = {
          success: true,
          model: 'Bayesian Knowledge Tracing (BKT)',
          data: {
            knowledgeState: bktData.knowledgeState,
            confidence: bktData.confidence,
            mastered: bktData.mastered,
            attemptsToMastery: bktData.attemptsToMastery,
            interpretation: bktData.interpretation,
          },
        };
      } catch (error: any) {
        results.tests.bayesianKnowledge = {
          success: false,
          error: error.message,
          requirement: 'Needs quiz attempts for the student',
        };
      }
    }

    // Test 6: Statistical Testing (with dummy data)
    if (testType === 'all' || testType === 'stats') {
      try {
        const group1 = [0.6, 0.65, 0.7, 0.62, 0.68];
        const group2 = [0.75, 0.8, 0.78, 0.82, 0.77];
        const testResult = tTest(group1, group2);
        
        results.tests.statisticalTesting = {
          success: true,
          model: 'Statistical Significance Testing',
          data: {
            tStatistic: testResult.tStatistic,
            pValue: testResult.pValue,
            significant: testResult.significant,
            effectSize: testResult.effectSize,
            interpretation: testResult.interpretation,
            note: 'Using sample data: before [0.6, 0.65, 0.7...] vs after [0.75, 0.8, 0.78...]',
          },
        };
      } catch (error: any) {
        results.tests.statisticalTesting = {
          success: false,
          error: error.message,
        };
      }
    }

    // Test 7: Longitudinal Trend Analysis
    if (testType === 'all' || testType === 'trends') {
      try {
        const trendData = await analyzeLongitudinalTrends(sampleStudentId, sampleTopicId, 90);
        
        results.tests.longitudinalTrends = {
          success: true,
          model: 'Longitudinal Trend Analysis',
          data: {
            trend: trendData.trend,
            interpretation: trendData.interpretation,
            dailyRate: trendData.dailyRate,
            rSquared: trendData.rSquared,
            confidence: trendData.confidence,
            dataPoints: trendData.dataPoints,
            forecast: trendData.forecast,
            changePoints: trendData.changePoints,
            overallChange: trendData.overallChange,
          },
        };
      } catch (error: any) {
        results.tests.longitudinalTrends = {
          success: false,
          error: error.message,
          requirement: 'Needs at least 3 attempts spanning 7+ days',
        };
      }
    }

    // Calculate success rate
    const testsRun = Object.keys(results.tests).length;
    const testsSucceeded = Object.values(results.tests).filter((t: any) => t.success).length;
    results.summary = {
      testsRun,
      testsSucceeded,
      testsFailed: testsRun - testsSucceeded,
      successRate: testsRun > 0 ? ((testsSucceeded / testsRun) * 100).toFixed(1) + '%' : '0%',
    };

    return NextResponse.json({
      success: true,
      message: 'Research-grade mathematical models tested successfully',
      results,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
