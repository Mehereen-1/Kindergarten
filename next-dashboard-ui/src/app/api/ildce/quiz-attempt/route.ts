import { NextRequest, NextResponse } from 'next/server';
import StudentQuizAttempt from '@/lib/models/StudentQuizAttempt';
import StudentMetrics from '@/lib/models/StudentMetrics';
import { updateStudentMetrics, updateTopicMetrics } from '@/lib/mathIntelligenceEngine';
import { connectDB } from '@/lib/mongodb';

/**
 * POST /api/ildce/quiz-attempt
 * Submit a quiz attempt and update metrics
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      studentId,
      quizId,
      topicId,
      classId,
      answers,
      time_spent,
    } = body;

    if (!studentId || !quizId || !topicId || !classId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let correct_answers = 0;
    const concept_performance: any = {};
    const processedAnswers: Array<{
      questionId: any;
      student_answer: any;
      is_correct: boolean;
      time_spent: number;
    }> = [];

    // Process answers
    answers.forEach((answer: any) => {
      const isCorrect = answer.student_answer === answer.correct_answer;
      if (isCorrect) correct_answers++;

      // Track concept performance
      if (answer.concept_tag) {
        if (!concept_performance[answer.concept_tag]) {
          concept_performance[answer.concept_tag] = { score: 0, attempts: 0 };
        }
        concept_performance[answer.concept_tag].attempts++;
        if (isCorrect) concept_performance[answer.concept_tag].score++;
      }

      processedAnswers.push({
        questionId: answer.questionId,
        student_answer: answer.student_answer,
        is_correct: isCorrect,
        time_spent: answer.time_spent || 0,
      });
    });

    const total_questions = answers.length;
    const percentage = (correct_answers / total_questions) * 100;

    // Get previous attempt number
    const previousAttempts = await StudentQuizAttempt.countDocuments({
      studentId,
      quizId,
    });

    // Create quiz attempt record
    const quizAttempt = new StudentQuizAttempt({
      studentId,
      quizId,
      topicId,
      classId,
      total_questions,
      correct_answers,
      score: correct_answers,
      percentage,
      time_spent,
      attempt_number: previousAttempts + 1,
      answers: processedAnswers,
      concept_performance: Object.entries(concept_performance).map(([concept, data]: any) => ({
        concept,
        score: data.score,
        attempts: data.attempts,
      })),
    });

    await quizAttempt.save();

    // Update student metrics
    await updateStudentMetrics(studentId, topicId, classId);

    // Update topic metrics
    await updateTopicMetrics(topicId, classId, body.teacherId);

    // Get updated metrics
    const updatedMetrics = await StudentMetrics.findOne({
      studentId,
      topicId,
    });

    return NextResponse.json(
      {
        attempt: quizAttempt,
        metrics: updatedMetrics,
        message: 'Quiz attempt recorded successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error submitting quiz attempt:', error);
    return NextResponse.json(
      { error: error.message || 'Error submitting quiz' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ildce/quiz-attempt
 * Get quiz attempts for student or topic
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const quizId = searchParams.get('quizId');
    const topicId = searchParams.get('topicId');

    let query: any = {};
    if (studentId) query.studentId = studentId;
    if (quizId) query.quizId = quizId;
    if (topicId) query.topicId = topicId;

    const attempts = await StudentQuizAttempt.find(query)
      .sort({ timestamp: -1 })
      .limit(100);

    return NextResponse.json(
      {
        attempts,
        count: attempts.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching quiz attempts:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching attempts' },
      { status: 500 }
    );
  }
}
