import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ContentChunk from '@/lib/models/ContentChunk';
import Topic from '@/lib/models/Topic';
const { generateLlmText } = require('@/lib/aiProcessingLayer');
const TopicModel: any = Topic as any;

function tokenize(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function lexicalSimilarity(question: string, chunkText: string): number {
  const qTokens = new Set(tokenize(question));
  if (!qTokens.size) return 0;

  const cTokens = tokenize(chunkText);
  if (!cTokens.length) return 0;

  let match = 0;
  for (const token of cTokens) {
    if (qTokens.has(token)) match += 1;
  }

  return match / Math.max(cTokens.length, 1);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { question, classId, topicId } = body;

    if (!question || !classId) {
      return NextResponse.json(
        { error: 'question and classId are required' },
        { status: 400 }
      );
    }

    const chunkQuery: any = { classId };
    if (topicId) chunkQuery.topicId = topicId;

    const chunks = await ContentChunk.find(chunkQuery)
      .select('chunk_text embedding topicId file_name')
      .limit(200)
      .lean();

    const scored = chunks.map((chunk: any) => ({
      ...chunk,
      score: lexicalSimilarity(question, chunk.chunk_text || ''),
    }));

    scored.sort((a: any, b: any) => b.score - a.score);
    const topChunks = scored.slice(0, 6);

    const topicIds: string[] = [];
    for (const chunk of topChunks) {
      const id = chunk.topicId?.toString();
      if (id && !topicIds.includes(id)) {
        topicIds.push(id);
      }
    }
    const topics = await TopicModel.find({ _id: { $in: topicIds } })
      .select('topic_name category')
      .lean();

    const topicMap: Map<string, any> = new Map(topics.map((t: any) => [t._id.toString(), t]));

    const context = topChunks
      .map((c: any, idx: number) => {
        const topic = c.topicId ? topicMap.get(c.topicId.toString()) : null;
        const label = topic ? `${topic.topic_name} (${topic.category || 'General'})` : 'Class Content';
        return `Source ${idx + 1} - ${label}:\n${c.chunk_text}`;
      })
      .join('\n\n');

    const prompt = `You are a helpful assistant for parents. Answer using ONLY the provided class content context. If the answer is not found in the context, say you do not have enough information and suggest asking the teacher.

Context:
${context}

Question: ${question}

Provide a clear, concise answer based only on the context above.`;

  const answer = (await generateLlmText(prompt, { temperature: 0.2, maxTokens: 900 })) || 'No answer generated.';

    return NextResponse.json({
      answer,
      sources: topChunks.map((c: any) => ({
        topicId: c.topicId,
        fileName: c.file_name || null,
        score: Number(c.score.toFixed(4)),
      })),
    });
  } catch (error: any) {
    console.error('Ask AI error:', error);
    const message = String(error?.message || 'Ask AI failed');
    const isQuota = message.toLowerCase().includes('quota') || message.includes('429');
    return NextResponse.json(
      { error: isQuota ? 'AI quota exceeded. Please retry after 1 minute or configure an alternate provider (Groq/OpenAI).' : message },
      { status: isQuota ? 429 : 500 }
    );
  }
}
