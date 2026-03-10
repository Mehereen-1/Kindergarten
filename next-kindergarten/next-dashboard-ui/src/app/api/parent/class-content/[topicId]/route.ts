import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Topic from '@/lib/models/Topic';
import Quiz from '@/lib/models/Quiz';
import ContentChunk from '@/lib/models/ContentChunk';

const { createAutoSummary, generateQuizQuestions, generateLlmText } = require('@/lib/aiProcessingLayer');
const TopicModel: any = Topic as any;
const QuizModel: any = Quiz as any;

function parseJsonSafely(rawText: string) {
  if (!rawText) return null;

  let cleanContent = rawText.trim();
  if (cleanContent.includes('```json')) {
    cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  }

  try {
    return JSON.parse(cleanContent);
  } catch (_error) {
    const firstBrace = cleanContent.indexOf('{');
    const lastBrace = cleanContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const slice = cleanContent.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(slice);
      } catch (_nestedError) {
        return null;
      }
    }
    return null;
  }
}

async function fallbackGenerateMcq(contentText: string, count = 10) {
  const prompt = `Return only JSON. Create exactly ${count} multiple choice questions from the content below. Each question must have 4 options and one correct answer.\n\nJSON format:\n{\n  "mcq": [\n    {\n      "question": "",\n      "options": ["", "", "", ""],\n      "correct_answer": "",\n      "difficulty": 3,\n      "concept_tag": "",\n      "explanation": ""\n    }\n  ]\n}\n\nCONTENT:\n${contentText}`;

  const rawText = await generateLlmText(prompt, { temperature: 0.2, maxTokens: 2400 });
  const parsed = parseJsonSafely(rawText);
  return Array.isArray(parsed?.mcq) ? parsed.mcq.slice(0, count) : [];
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

    const quiz = await QuizModel.findOne({ topicId: topic._id })
      .select('_id total_questions')
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
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching parent class content detail:', error);
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
      const generated = await generateQuizQuestions(topic.content_text || '', 10, 0, 0);
      let mcq = Array.isArray(generated?.mcq) ? generated.mcq.slice(0, 10) : [];

      if (!mcq.length) {
        mcq = await fallbackGenerateMcq(topic.content_text || '', 10);
      }

      if (!mcq.length) {
        return NextResponse.json({ error: 'AI could not generate MCQ at this time' }, { status: 500 });
      }

      const questions = mcq.map((q: any) => ({
        question_text: q.question || 'Question',
        question_type: 'mcq',
        options: Array.isArray(q.options) ? q.options : [],
        correct_answer: q.correct_answer || '',
        difficulty: Math.max(1, Math.min(5, Number(q.difficulty || 3))),
        concept_tag: q.concept_tag || '',
        explanation: q.explanation || '',
      }));

      let quiz = await QuizModel.findOne({ topicId: topic._id });

      if (!quiz) {
        quiz = await QuizModel.create({
          topicId: topic._id,
          teacherId: topic.teacherId,
          title: `${topic.topic_name} - Parent Practice Quiz`,
          description: `AI-generated 10 MCQ quiz for ${topic.topic_name}`,
          questions,
          is_ai_generated: true,
          total_questions: questions.length,
          updated_at: new Date(),
        });
      } else {
        quiz.questions = questions;
        quiz.total_questions = questions.length;
        quiz.is_ai_generated = true;
        quiz.updated_at = new Date();
        await quiz.save();
      }

      return NextResponse.json({
        success: true,
        message: 'Quiz generated successfully',
        quiz: {
          quizId: quiz._id.toString(),
          totalQuestions: quiz.total_questions,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error processing topic AI action:', error);
    const message = String(error?.message || 'AI processing failed');
    const isQuota = message.toLowerCase().includes('quota') || message.includes('429');
    return NextResponse.json(
      { error: isQuota ? 'AI quota exceeded. Please retry after 1 minute or enable billing for Gemini API.' : message },
      { status: isQuota ? 429 : 500 }
    );
  }
}
