import { NextRequest, NextResponse } from 'next/server';
import TopicMetrics from '@/lib/models/TopicMetrics';
import StudentMetrics from '@/lib/models/StudentMetrics';
import StudentQuizAttempt from '@/lib/models/StudentQuizAttempt';
import Topic from '@/lib/models/Topic';
import Quiz from '@/lib/models/Quiz';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/ildce/metrics/class-topics
 * Get class overview: All topics with metrics
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');
    const teacherId = searchParams.get('teacherId');

    if (!classId) {
      return NextResponse.json(
        { error: 'Missing classId' },
        { status: 400 }
      );
    }

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Missing teacherId' },
        { status: 400 }
      );
    }

    // Show only topics uploaded by the active teacher in the selected class.
    const topics = await Topic.find({ classId, teacherId });

    // Get metrics for each topic
    const topicMetricsData = await Promise.all(
      topics.map(async (topic) => {
        const metrics = await TopicMetrics.findOne({
          topicId: topic._id,
          classId,
        });

        const quiz = await Quiz.findOne({
          topicId: topic._id,
        })
          .select('_id total_questions is_published published_at')
          .lean();

        const attempts = await StudentQuizAttempt.find({
          topicId: topic._id,
          classId,
        });

        const hasUsableQuiz = Boolean(
          quiz &&
          ((quiz as any).total_questions || 0) > 0
        );

        return {
          topic: {
            _id: topic._id,
            topic_name: topic.topic_name,
            file_url: topic.file_url || null,
            file_name: topic.file_name || null,
            files: Array.isArray(topic.files) && topic.files.length > 0
              ? topic.files.map((file: any) => ({
                  url: file.url,
                  name: file.name || 'Attachment',
                  type: file.type || '',
                  size: file.size || 0,
                }))
              : [],
            difficulty_weight: topic.difficulty_weight,
            concepts: topic.concepts,
          },
          quiz: hasUsableQuiz && quiz
            ? {
                quizId: quiz._id,
                totalQuestions: quiz.total_questions || 0,
                isPublished: Boolean(quiz.is_published),
                publishedAt: quiz.published_at || null,
              }
            : null,
          metrics: metrics || null,
          attempt_count: attempts.length,
        };
      })
    );

    return NextResponse.json(
      {
        topics: topicMetricsData,
        count: topicMetricsData.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching class topic metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching metrics' },
      { status: 500 }
    );
  }
}
