import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Topic from '@/lib/models/Topic';
import Quiz from '@/lib/models/Quiz';

const { generateQuizQuestions, generateLlmText } = require('@/lib/aiProcessingLayer');

function detectPrimaryContentLanguage(text: string = '') {
  const sample = String(text || '').slice(0, 8000);
  const banglaChars = (sample.match(/[\u0980-\u09FF]/g) || []).length;
  const latinChars = (sample.match(/[A-Za-z]/g) || []).length;
  const totalLetters = banglaChars + latinChars;
  const banglaRatio = totalLetters > 0 ? banglaChars / totalLetters : 0;
  const banglaMarkers = /\b(bangla|bengali|kobita|kabita|sahitto|sahitya|bhasha)\b/i.test(sample);

  if (banglaChars > 0 && latinChars === 0) {
    return 'bn';
  }

  if (banglaChars >= 8 || banglaRatio >= 0.02) {
    return 'bn';
  }

  if (banglaMarkers) {
    return 'bn';
  }

  return 'en';
}

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
  const detectedLanguage = detectPrimaryContentLanguage(contentText);
  const languageInstruction = detectedLanguage === 'bn'
    ? 'Use Bangla (Bengali script) for every field in the output. Do not translate to English.'
    : 'Use English for every field in the output.';

  const prompt = `Return only JSON. Create exactly ${count} multiple choice questions from the content below. Each question must have 4 options and one correct answer.\n\n${languageInstruction}\n\nJSON format:\n{\n  "mcq": [\n    {\n      "question": "",\n      "options": ["", "", "", ""],\n      "correct_answer": "",\n      "difficulty": 3,\n      "concept_tag": "",\n      "explanation": ""\n    }\n  ]\n}\n\nCONTENT:\n${contentText}`;

  const rawText = await generateLlmText(prompt, { temperature: 0.2, maxTokens: 2400 });
  const parsed = parseJsonSafely(rawText);
  return Array.isArray(parsed?.mcq) ? parsed.mcq.slice(0, count) : [];
}

function normalizeTextForCompare(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/^\s*[q০-৯0-9]+[.)\-:：]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueQuestionsByText(items: any[]) {
  const seen = new Set<string>();
  const unique: any[] = [];

  for (const item of items || []) {
    const key = normalizeTextForCompare(item?.question || item?.question_text || '');
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function isLowQualityMcqSet(mcq: any[]) {
  if (!Array.isArray(mcq) || mcq.length < 5) return true;

  const normalizedQuestions = mcq.map((q) => normalizeTextForCompare(q?.question || q?.question_text || ''));
  const uniqueQuestionCount = new Set(normalizedQuestions).size;
  const uniquenessRatio = uniqueQuestionCount / Math.max(mcq.length, 1);

  const invalidOptionsCount = mcq.filter((q) => !Array.isArray(q?.options) || q.options.length < 4).length;
  const repeatedCorrectAnswers = mcq.map((q) => normalizeTextForCompare(q?.correct_answer || ''));
  const maxSameCorrect = Math.max(
    ...Object.values(
      repeatedCorrectAnswers.reduce((acc: Record<string, number>, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
      }, {})
    ) as number[]
  );

  return uniquenessRatio < 0.7 || invalidOptionsCount > 0 || maxSameCorrect >= Math.ceil(mcq.length * 0.8);
}

function extractKeywords(contentText: string, detectedLanguage: 'bn' | 'en') {
  const words = String(contentText || '')
    .match(/[\u0980-\u09FFA-Za-z]{3,}/g) || [];

  const stopWordsBn = new Set(['এবং', 'যে', 'এই', 'একটি', 'করে', 'হয়', 'থেকে', 'নিয়ে', 'জন্য', 'কোন', 'কী', 'বা']);
  const stopWordsEn = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'have', 'has', 'had']);
  const stopWords = detectedLanguage === 'bn' ? stopWordsBn : stopWordsEn;

  const keywords: string[] = [];
  for (const raw of words) {
    const token = raw.trim();
    const normalized = token.toLowerCase();
    if (stopWords.has(normalized)) continue;
    if (!keywords.find((k) => k.toLowerCase() === normalized)) {
      keywords.push(token);
    }
    if (keywords.length >= 24) break;
  }

  return keywords;
}

function buildLocalFallbackMcq(contentText: string, count = 10) {
  const detectedLanguage = detectPrimaryContentLanguage(contentText);
  const cleaned = String(contentText || '')
    .replace(/\s+/g, ' ')
    .trim();

  const chunks = cleaned
    .split(/[.!?\n।]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, count);

  const keywords = extractKeywords(cleaned, detectedLanguage as 'bn' | 'en');

  const source = chunks.length ? chunks : [cleaned.slice(0, 180) || 'Topic content'];
  const result: any[] = [];

  const bnTemplates = [
    (term: string) => `'${term}' সম্পর্কে নিচের কোন বক্তব্যটি সঠিক?`,
    (term: string) => `পাঠ্যবস্তুর আলোকে '${term}' এর বৈশিষ্ট্য কোনটি?`,
    (term: string) => `'${term}' এর সাথে সবচেয়ে সম্পর্কিত ধারণা কোনটি?`,
    (term: string) => `'${term}' নিয়ে পাঠ্যাংশে কোন বিষয়টি উল্লেখ আছে?`,
    (term: string) => `'${term}' কোন প্রেক্ষাপটে ব্যবহৃত হয়েছে?`,
    (term: string) => `'${term}' সম্পর্কে পাঠ্যাংশের মূল বার্তা কী?`,
    (term: string) => `'${term}' এর সাথে যুক্ত সঠিক ধারণা নির্বাচন করো।`,
    (term: string) => `'${term}' সম্পর্কে ভুল নয় এমন বক্তব্য কোনটি?`,
  ];

  const enTemplates = [
    (term: string) => `Which statement best describes '${term}'?`,
    (term: string) => `Based on the passage, what is true about '${term}'?`,
    (term: string) => `Which idea is most closely related to '${term}'?`,
    (term: string) => `What does the content highlight about '${term}'?`,
    (term: string) => `In what context is '${term}' used in the passage?`,
    (term: string) => `What is the main message connected to '${term}'?`,
    (term: string) => `Choose the most accurate concept associated with '${term}'.`,
    (term: string) => `Which statement about '${term}' is NOT incorrect according to the content?`,
  ];

  for (let i = 0; i < count; i += 1) {
    const statement = source[i % source.length];
    const keyTerm = keywords.length ? keywords[i % keywords.length] : detectedLanguage === 'bn' ? 'বিষয়' : 'topic';
    const alt1 = keywords.length > 1 ? keywords[(i + 1) % keywords.length] : detectedLanguage === 'bn' ? 'অন্য ধারণা' : 'another concept';
    const alt2 = keywords.length > 2 ? keywords[(i + 2) % keywords.length] : detectedLanguage === 'bn' ? 'সম্পর্কিত ধারণা' : 'related idea';
    const alt3 = keywords.length > 3 ? keywords[(i + 3) % keywords.length] : detectedLanguage === 'bn' ? 'ভুল ধারণা' : 'incorrect idea';

    if (detectedLanguage === 'bn') {
      const questionBuilder = bnTemplates[i % bnTemplates.length];
      const question = questionBuilder(keyTerm);
      const correctOption = statement.length >= 16 ? statement : `'${keyTerm}' পাঠ্যবস্তুর একটি গুরুত্বপূর্ণ অংশ।`;
      result.push({
        question,
        options: [
          `${correctOption}`,
          `'${alt1}' এই বিষয়ের মূল ধারণা নয়।`,
          `'${alt2}' পাঠ্যবস্তুর বাইরে একটি ধারণা।`,
          `'${alt3}' বিষয়টির সাথে সরাসরি সম্পর্কিত নয়।`,
        ],
        correct_answer: `${correctOption}`,
        difficulty: 2 + (i % 3),
        concept_tag: keyTerm || 'মূল ধারণা',
        explanation: `পাঠ্যবস্তুর তথ্য অনুযায়ী '${keyTerm}' সম্পর্কে সঠিক বক্তব্যটি নির্বাচন করা হয়েছে।`,
      });
    } else {
      const questionBuilder = enTemplates[i % enTemplates.length];
      const question = questionBuilder(keyTerm);
      const correctOption = statement.length >= 16 ? statement : `'${keyTerm}' is a key part of this topic.`;
      result.push({
        question,
        options: [
          `${correctOption}`,
          `'${alt1}' is not a central focus in this passage.`,
          `'${alt2}' is outside the main discussion in the content.`,
          `'${alt3}' is not directly related to the described concept.`,
        ],
        correct_answer: `${correctOption}`,
        difficulty: 2 + (i % 3),
        concept_tag: keyTerm || 'core concept',
        explanation: `The selected option best matches what the content states about '${keyTerm}'.`,
      });
    }
  }

  return result.slice(0, count);
}

async function forceRegenerateUniqueMcq(contentText: string, count = 10) {
  const detectedLanguage = detectPrimaryContentLanguage(contentText);
  const languageInstruction = detectedLanguage === 'bn'
    ? 'Use Bangla Bengali script only.'
    : 'Use English only.';

  const strictPrompt = `Return ONLY valid JSON. Create ${count} unique multiple choice questions from the content.\n\nHard rules:\n- No repeated or near-duplicate questions\n- Every question must target a different idea\n- 4 options per question\n- Correct answer must be one of the options\n- Keep questions concise and specific\n- ${languageInstruction}\n\nJSON format:\n{\n  "mcq": [\n    {\n      "question": "",\n      "options": ["", "", "", ""],\n      "correct_answer": "",\n      "difficulty": 3,\n      "concept_tag": "",\n      "explanation": ""\n    }\n  ]\n}\n\nCONTENT:\n${contentText}`;

  const raw = await generateLlmText(strictPrompt, { temperature: 0.35, maxTokens: 2600 });
  const parsed = parseJsonSafely(raw);
  return Array.isArray(parsed?.mcq) ? parsed.mcq.slice(0, count) : [];
}

async function buildQuizQuestions(contentText: string) {
  const TARGET_COUNT = 10;

  const generated = await generateQuizQuestions(contentText || '', 10, 0, 0);
  let mcq = uniqueQuestionsByText(Array.isArray(generated?.mcq) ? generated.mcq : []);

  if (!mcq.length || isLowQualityMcqSet(mcq) || mcq.length < TARGET_COUNT) {
    mcq = await fallbackGenerateMcq(contentText || '', 10);
    mcq = uniqueQuestionsByText(mcq);
  }

  if (!mcq.length || isLowQualityMcqSet(mcq) || mcq.length < TARGET_COUNT) {
    const strictMcq = await forceRegenerateUniqueMcq(contentText || '', 20);
    const merged = uniqueQuestionsByText([...(mcq || []), ...(strictMcq || [])]);
    if (merged.length && !isLowQualityMcqSet(merged)) {
      mcq = merged;
    }
  }

  if (!mcq.length || isLowQualityMcqSet(mcq) || mcq.length < TARGET_COUNT) {
    const local = buildLocalFallbackMcq(contentText || '', 20);
    mcq = uniqueQuestionsByText([...(mcq || []), ...local]);
  }

  mcq = uniqueQuestionsByText(mcq).slice(0, TARGET_COUNT);

  if (!mcq.length || isLowQualityMcqSet(mcq) || mcq.length < TARGET_COUNT) {
    throw new Error('Could not generate 10 unique questions from this content. Please upload richer/clearer text or add manual notes.');
  }

  return mcq.map((q: any) => ({
    question_text: q.question || 'Question',
    question_type: 'mcq',
    options: Array.isArray(q.options) ? q.options : [],
    correct_answer: q.correct_answer || '',
    difficulty: Math.max(1, Math.min(5, Number(q.difficulty || 3))),
    concept_tag: q.concept_tag || '',
    explanation: q.explanation || '',
  }));
}

async function saveQuizDraft(topic: any, teacherId: string, questions: any[]) {
  let quiz = await Quiz.findOne({ topicId: topic._id });

  if (!quiz) {
    quiz = await Quiz.create({
      topicId: topic._id,
      teacherId: teacherId || topic.teacherId,
      title: `${topic.topic_name} - Teacher Quiz`,
      description: `Teacher-generated quiz for ${topic.topic_name}`,
      questions,
      is_ai_generated: true,
      is_published: false,
      total_questions: questions.length,
      updated_at: new Date(),
    });
  } else {
    quiz.questions = questions;
    quiz.total_questions = questions.length;
    quiz.is_ai_generated = true;
    quiz.is_published = false;
    quiz.published_at = null;
    quiz.published_by = null;
    quiz.updated_at = new Date();
    await quiz.save();
  }

  return quiz;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    await connectDB();

    const teacherId = request.nextUrl.searchParams.get('teacherId') || '';
    const includeDetails = request.nextUrl.searchParams.get('details') === '1';

    const topic = await Topic.findById(params.topicId).lean();
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    if (teacherId && String((topic as any).teacherId || '') !== teacherId) {
      return NextResponse.json({ error: 'You are not allowed to view this topic quiz' }, { status: 403 });
    }

    const quiz = await Quiz.findOne({ topicId: topic._id })
      .select(includeDetails ? '_id title description questions total_questions is_published published_at' : '_id total_questions is_published published_at')
      .lean();

    return NextResponse.json({
      quiz: quiz
        ? {
            quizId: quiz._id.toString(),
            title: (quiz as any).title || '',
            description: (quiz as any).description || '',
            totalQuestions: quiz.total_questions || 0,
            isPublished: Boolean(quiz.is_published),
            publishedAt: quiz.published_at || null,
            questions: includeDetails ? ((quiz as any).questions || []).map((q: any) => ({
              question_text: q.question_text || '',
              question_type: q.question_type || 'mcq',
              options: Array.isArray(q.options) ? q.options : [],
              correct_answer: q.correct_answer || '',
              explanation: q.explanation || '',
              concept_tag: q.concept_tag || '',
              difficulty: Number(q.difficulty || 3),
            })) : undefined,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Error fetching topic quiz:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch quiz' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const teacherId = String(body?.teacherId || '');

    if (!teacherId) {
      return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 });
    }

    const topic = await Topic.findById(params.topicId);
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    if (String(topic.teacherId || '') !== teacherId) {
      return NextResponse.json({ error: 'You can only generate quiz drafts for your own topics' }, { status: 403 });
    }

    const questions = await buildQuizQuestions(topic.content_text || '');
    if (!questions.length) {
      return NextResponse.json({ error: 'AI could not generate quiz questions at this time' }, { status: 500 });
    }

    const quiz = await saveQuizDraft(topic, teacherId, questions);

    return NextResponse.json({
      success: true,
      message: 'Quiz draft generated successfully',
      quiz: {
        quizId: quiz._id.toString(),
        totalQuestions: quiz.total_questions,
        isPublished: Boolean(quiz.is_published),
      },
    });
  } catch (error: any) {
    console.error('Error generating topic quiz draft:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate quiz draft' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const teacherId = String(body?.teacherId || '');

    if (!teacherId) {
      return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 });
    }

    const topic = await Topic.findById(params.topicId);
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    if (String(topic.teacherId || '') !== teacherId) {
      return NextResponse.json({ error: 'You can only publish quiz for your own topics' }, { status: 403 });
    }

    let quiz = await Quiz.findOne({ topicId: topic._id });
    if (!quiz) {
      const questions = await buildQuizQuestions(topic.content_text || '');
      if (!questions.length) {
        return NextResponse.json({ error: 'AI could not generate quiz questions at this time' }, { status: 500 });
      }

      quiz = await saveQuizDraft(topic, teacherId, questions);
    }

    quiz.is_published = true;
    quiz.published_at = new Date();
    quiz.published_by = teacherId || topic.teacherId;
    quiz.updated_at = new Date();
    await quiz.save();

    return NextResponse.json({
      success: true,
      message: 'Quiz published successfully',
      quiz: {
        quizId: quiz._id.toString(),
        totalQuestions: quiz.total_questions,
        isPublished: true,
      },
    });
  } catch (error: any) {
    console.error('Error publishing topic quiz:', error);
    return NextResponse.json({ error: error.message || 'Failed to publish quiz' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const teacherId = String(body?.teacherId || '');

    if (!teacherId) {
      return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 });
    }

    const topic = await Topic.findById(params.topicId);
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    if (String(topic.teacherId || '') !== teacherId) {
      return NextResponse.json({ error: 'You can only delete quiz for your own topics' }, { status: 403 });
    }

    const quiz = await Quiz.findOne({ topicId: topic._id });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found for this topic' }, { status: 404 });
    }

    await Quiz.deleteOne({ _id: quiz._id });

    return NextResponse.json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting topic quiz:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete quiz' }, { status: 500 });
  }
}
