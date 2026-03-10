import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export function chunkText(text: string, maxChars = 1000, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + maxChars, clean.length);
    const slice = clean.slice(start, end).trim();
    if (slice) {
      chunks.push(slice);
    }
    if (end >= clean.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    
    const embeddings: number[][] = [];
    
    // Process embeddings in parallel batches
    for (const text of texts) {
      const result = await model.embedContent(text);
      embeddings.push(result.embedding.values);
    }
    
    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    // Return zero vectors as fallback
    return texts.map(() => new Array(768).fill(0));
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
