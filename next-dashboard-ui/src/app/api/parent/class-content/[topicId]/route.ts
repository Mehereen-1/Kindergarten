import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Topic from '@/lib/models/Topic';
import Quiz from '@/lib/models/Quiz';
import ContentChunk from '@/lib/models/ContentChunk';

const { createAutoSummary } = require('@/lib/aiProcessingLayer');
const TopicModel: any = Topic as any;
const QuizModel: any = Quiz as any;

function isMongoConnectivityError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();

  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    message.includes('querysrv') ||
    message.includes('server selection timed out')
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    await connectDB();

    const topic = await TopicModel.findById(params.topicId)
      .populate('teacherId', 'name email')
      .lean();

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const quiz = await QuizModel.findOne({ topicId: topic._id, is_published: true })
      .select('_id total_questions is_published published_at')
      .lean();

    const ragChunkCount = await ContentChunk.countDocuments({ topicId: topic._id });

    return NextResponse.json({
      topic: {
        topicId: topic._id.toString(),
        classId: topic.classId?.toString?.() || String(topic.classId),
        topicName: topic.topic_name,
        category: topic.category,
        difficulty: topic.difficulty_weight,
        contentText: topic.content_text,
        uploadedAt: topic.created_at || topic.createdAt || null,
        teacher: topic.teacherId
          ? {
              teacherId: topic.teacherId._id?.toString?.() || String(topic.teacherId),
              name: topic.teacherId.name || 'Teacher',
              email: topic.teacherId.email || '',
            }
          : null,
        file: topic.file_url
          ? {
              url: topic.file_url,
              name: topic.file_name || 'Attachment',
              type: topic.file_type || '',
              size: topic.file_size || 0,
            }
          : null,
        files: Array.isArray(topic.files) && topic.files.length > 0
          ? topic.files.map((file: any) => ({
              url: file.url,
              name: file.name || 'Attachment',
              type: file.type || '',
              size: file.size || 0,
            }))
          : topic.file_url
            ? [{
                url: topic.file_url,
                name: topic.file_name || 'Attachment',
                type: topic.file_type || '',
                size: topic.file_size || 0,
              }]
            : [],
        ai: {
          summary: topic.ai_summary || '',
          keyPoints: topic.ai_key_points || [],
          concepts: topic.concepts || [],
          formulas: topic.ai_formulas || [],
        },
        rag: {
          ready: ragChunkCount > 0,
          chunkCount: ragChunkCount,
        },
        quiz: quiz
          ? {
              quizId: quiz._id.toString(),
              totalQuestions: quiz.total_questions || 0,
              isPublished: Boolean(quiz.is_published),
              publishedAt: quiz.published_at || null,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching parent class content detail:', error);
    if (isMongoConnectivityError(error)) {
      return NextResponse.json(
        { error: 'Topic details are temporarily unavailable because the database cannot be reached.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: error.message || 'Failed to fetch topic detail' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    await connectDB();

    const body = await request.json();
    const action = body?.action;

    const topic = await TopicModel.findById(params.topicId);
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    if (action === 'generate_summary') {
      const result = await createAutoSummary(topic.content_text || '', topic.content_type || 'text');

      if (!result?.summary || result.summary === 'Unable to generate summary') {
        return NextResponse.json(
          { error: 'Summary generation unavailable right now. AI quota may be exceeded, please retry in a minute.' },
          { status: 429 }
        );
      }

      topic.ai_summary = result.summary || '';
      topic.ai_key_points = result.key_points || [];
      topic.ai_definitions = result.definitions || [];
      topic.ai_formulas = result.formulas || [];
      topic.updated_at = new Date();
      await topic.save();

      return NextResponse.json({
        success: true,
        message: 'Summary generated successfully',
        summary: topic.ai_summary,
      });
    }

    if (action === 'generate_quiz') {
      return NextResponse.json(
        { error: 'Quiz generation is handled by the teacher now. Please ask the teacher to publish the quiz.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error processing topic AI action:', error);
    if (isMongoConnectivityError(error)) {
      return NextResponse.json(
        { error: 'AI actions are temporarily unavailable because the database cannot be reached.' },
        { status: 503 }
      );
    }

    const message = String(error?.message || 'AI processing failed');
    const isQuota = message.toLowerCase().includes('quota') || message.includes('429');
    return NextResponse.json(
      { error: isQuota ? 'AI quota exceeded. Please retry after 1 minute or enable billing for Gemini API.' : message },
      { status: isQuota ? 429 : 500 }
    );
  }
}
