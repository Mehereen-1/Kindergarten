/**
 * AI PROCESSING LAYER
 * 
 * Handles:
 * A. Auto Summarizer - Create summaries & key points
 * B. AI Question Generator - Generate MCQ, Short Answer, True/False
 * C. Concept Extraction - Extract learning concepts
 * 
 * Using Google Gemini API (Free Tier)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiProvider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

const openAiCompatibleKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '';
const openAiCompatibleClient = openAiCompatibleKey
  ? new OpenAI({
      apiKey: openAiCompatibleKey,
      baseURL:
        process.env.OPENAI_BASE_URL ||
        (aiProvider === 'groq' ? 'https://api.groq.com/openai/v1' : undefined),
    })
  : null;

function getOpenAiCompatibleModel() {
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  if (aiProvider === 'groq') return process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

async function generateLlmText(prompt, options = {}) {
  const { temperature = 0.2, maxTokens = 1800 } = options;

  if ((aiProvider === 'groq' || aiProvider === 'openai') && openAiCompatibleClient) {
    const completion = await openAiCompatibleClient.chat.completions.create({
      model: getOpenAiCompatibleModel(),
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    return completion.choices?.[0]?.message?.content || '';
  }

  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text() || '';
}

function parseModelJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  let cleanContent = rawText.trim();
  if (cleanContent.includes('```json')) {
    cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  }

  try {
    return JSON.parse(cleanContent);
  } catch (_error) {
    const firstBrace = cleanContent.indexOf('{');
    const lastBrace = cleanContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
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

function detectPrimaryContentLanguage(text = '') {
  const sample = String(text || '').slice(0, 8000);
  const banglaChars = (sample.match(/[\u0980-\u09FF]/g) || []).length;
  const latinChars = (sample.match(/[A-Za-z]/g) || []).length;
  const totalLetters = banglaChars + latinChars;
  const banglaRatio = totalLetters > 0 ? banglaChars / totalLetters : 0;
  const banglaMarkers = /\b(bangla|bengali|kobita|kabita|sahitto|sahitya|bhasha)\b/i.test(sample);

  // Prefer Bangla aggressively whenever Bangla script is present.
  if (banglaChars > 0 && latinChars === 0) {
    return 'bn';
  }

  if (banglaChars >= 8 || banglaRatio >= 0.02) {
    return 'bn';
  }

  // Fallback for PDFs where Bangla text is extracted as transliterated Latin text.
  if (banglaMarkers) {
    return 'bn';
  }

  return 'en';
}

function hasBanglaInQuizPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;

  const segments = [];
  const pushQuestion = (q) => {
    if (!q) return;
    segments.push(String(q.question || ''));
    segments.push(String(q.correct_answer || ''));
    segments.push(String(q.concept_tag || ''));
    segments.push(String(q.explanation || ''));
    if (Array.isArray(q.options)) {
      q.options.forEach((opt) => segments.push(String(opt || '')));
    }
  };

  (parsed.mcq || []).forEach(pushQuestion);
  (parsed.short_answer || []).forEach(pushQuestion);
  (parsed.true_false || []).forEach(pushQuestion);

  const merged = segments.join(' ');
  const banglaChars = (merged.match(/[\u0980-\u09FF]/g) || []).length;
  return banglaChars >= 8;
}

/**
 * 🔥 A. AUTO SUMMARIZER
 * Converts content into structured summaries
 */
async function createAutoSummary(contentText, contentType = 'text') {
  try {
    const prompt = `
You are an expert educational content analyzer. Analyze the following ${contentType} content and provide:

1. A brief 2-3 sentence summary
2. Key points (maximum 5 bullet points)
3. Important definitions (as JSON array)
4. Mathematical formulas (if applicable)

Content:
${contentText}

Respond ONLY with valid JSON in this exact format:
{
  "summary": "...",
  "key_points": ["point1", "point2", ...],
  "definitions": [
    {"term": "...", "definition": "..."},
    ...
  ],
  "formulas": [
    {"formula": "...", "explanation": "..."},
    ...
  ]
}`;

    const content = await generateLlmText(prompt, { temperature: 0.2, maxTokens: 1600 });
    const parsed = parseModelJson(content);

    if (!parsed) {
      throw new Error('Failed to parse summary JSON from model output');
    }

    return {
      summary: parsed.summary || '',
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
      definitions: Array.isArray(parsed.definitions) ? parsed.definitions : [],
      formulas: Array.isArray(parsed.formulas) ? parsed.formulas : [],
    };
  } catch (error) {
    console.error('Error in auto summarizer:', error);
    return {
      summary: 'Unable to generate summary',
      key_points: [],
      definitions: [],
      formulas: [],
    };
  }
}

/**
 * 🔥 B. AI QUESTION GENERATOR
 * Generates quiz questions from content
 */
async function generateQuizQuestions(contentText, numMCQ = 5, numShortAnswer = 3, numTrueFalse = 2) {
  try {
    const detectedLanguage = detectPrimaryContentLanguage(contentText);
    const languageInstruction = detectedLanguage === 'bn'
      ? 'Important: Write every question, option, answer, concept_tag, and explanation in Bangla (Bengali script). NEVER translate to English.'
      : 'Important: Write every question, option, answer, concept_tag, and explanation in English.';

    const prompt = `
You are an expert quiz designer. Generate questions based on the following content.

CONTENT:
${contentText}

Generate questions in this EXACT JSON format:
{
  "mcq": [
    {
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A) ...",
      "difficulty": 2,
      "concept_tag": "concept_name",
      "explanation": "..."
    }
  ],
  "short_answer": [
    {
      "question": "...",
      "correct_answer": "...",
      "difficulty": 2,
      "concept_tag": "concept_name",
      "explanation": "..."
    }
  ],
  "true_false": [
    {
      "question": "...",
      "correct_answer": true/false,
      "difficulty": 1,
      "concept_tag": "concept_name",
      "explanation": "..."
    }
  ]
}

Requirements:
- Generate exactly ${numMCQ} MCQ questions
- Generate exactly ${numShortAnswer} Short Answer questions
- Generate exactly ${numTrueFalse} True/False questions
- Difficulty ranges from 1 (easy) to 5 (hard)
- Each question must have a concept_tag
- Each question must test different aspects of the content
- Ensure variety in difficulty levels
- ${languageInstruction}

Return ONLY valid JSON.`;

  const content = await generateLlmText(prompt, { temperature: 0.2, maxTokens: 2400 });
    let parsed = parseModelJson(content);

    // Retry with a stricter prompt if the model output is not parseable or lacks MCQs
    if (!parsed || !Array.isArray(parsed.mcq) || parsed.mcq.length === 0) {
      const retryPrompt = `Return only JSON. Generate exactly ${numMCQ} multiple-choice questions from the content below.\n\nEach question must include:\n- question\n- options (4 options)\n- correct_answer\n- difficulty (1-5)\n- concept_tag\n- explanation\n\nLanguage requirement: ${detectedLanguage === 'bn' ? 'Use Bangla (Bengali script) for all fields.' : 'Use English for all fields.'}\n\nReturn this exact JSON shape:\n{\n  "mcq": [ { "question": "", "options": ["", "", "", ""], "correct_answer": "", "difficulty": 3, "concept_tag": "", "explanation": "" } ],\n  "short_answer": [],\n  "true_false": []\n}\n\nCONTENT:\n${contentText}`;

      const retryContent = await generateLlmText(retryPrompt, { temperature: 0.1, maxTokens: 2200 });
      parsed = parseModelJson(retryContent);
    }

    // If detected Bangla but model responded in English, force one strict retry.
    if (detectedLanguage === 'bn' && parsed && !hasBanglaInQuizPayload(parsed)) {
      const strictBanglaPrompt = `Return only JSON. The source content is Bangla. Create quiz questions ONLY in Bangla Bengali script. Do not output any English words except unavoidable technical symbols.\n\nGenerate exactly ${numMCQ} MCQ, ${numShortAnswer} short answer, and ${numTrueFalse} true/false questions.\n\nRequired JSON format:\n{\n  "mcq": [\n    {\n      "question": "",\n      "options": ["", "", "", ""],\n      "correct_answer": "",\n      "difficulty": 3,\n      "concept_tag": "",\n      "explanation": ""\n    }\n  ],\n  "short_answer": [\n    {\n      "question": "",\n      "correct_answer": "",\n      "difficulty": 3,\n      "concept_tag": "",\n      "explanation": ""\n    }\n  ],\n  "true_false": [\n    {\n      "question": "",\n      "correct_answer": true,\n      "difficulty": 2,\n      "concept_tag": "",\n      "explanation": ""\n    }\n  ]\n}\n\nCONTENT:\n${contentText}`;

      const strictContent = await generateLlmText(strictBanglaPrompt, { temperature: 0.1, maxTokens: 2400 });
      const strictParsed = parseModelJson(strictContent);
      if (strictParsed && hasBanglaInQuizPayload(strictParsed)) {
        parsed = strictParsed;
      }
    }

    if (!parsed) {
      throw new Error('Failed to parse quiz JSON from model output');
    }

    return {
      mcq: Array.isArray(parsed.mcq) ? parsed.mcq : [],
      short_answer: Array.isArray(parsed.short_answer) ? parsed.short_answer : [],
      true_false: Array.isArray(parsed.true_false) ? parsed.true_false : [],
    };
  } catch (error) {
    console.error('Error in question generator:', error);
    return {
      mcq: [],
      short_answer: [],
      true_false: [],
    };
  }
}

/**
 * 🔥 C. CONCEPT EXTRACTION
 * Extracts learning concepts from content
 */
async function extractConcepts(contentText, topicName) {
  try {
    const prompt = `
You are an expert in educational taxonomy. Extract the primary learning concepts/topics from the following content.

Topic: ${topicName}
Content:
${contentText}

Respond with a JSON array of strings representing the key concepts students should master:
{
  "concepts": ["concept1", "concept2", "concept3", ...]
}

Guidelines:
- Extract 5-10 main concepts
- Each concept should be a learning objective
- Concepts should be atomic (not compound)
- Use clear, student-friendly language
- Order by importance

Example format:
{
  "concepts": ["Variables", "Linear equations", "Solving for unknown", "Graphing lines"]
}

Return ONLY valid JSON.`;

  const content = await generateLlmText(prompt, { temperature: 0.1, maxTokens: 1200 });
    const parsed = parseModelJson(content);

    if (!parsed) {
      throw new Error('Failed to parse concept JSON from model output');
    }

    return parsed.concepts || [];
  } catch (error) {
    console.error('Error in concept extraction:', error);
    return [];
  }
}

/**
 * COMPREHENSIVE CONTENT PROCESSING
 * Runs all AI processes on uploaded content
 */
async function processContentWithAI(contentText, contentType = 'text', topicName = 'Unknown Topic') {
  try {
    console.log('Starting AI content processing...');

    // Run all processes in parallel for efficiency
    const [summary, questions, concepts] = await Promise.all([
      createAutoSummary(contentText, contentType),
      generateQuizQuestions(contentText, 5, 3, 2),
      extractConcepts(contentText, topicName),
    ]);

    return {
      summary: summary.summary,
      key_points: summary.key_points,
      definitions: summary.definitions,
      formulas: summary.formulas,
      generated_questions: questions,
      concepts: concepts,
      processed_at: new Date(),
    };
  } catch (error) {
    console.error('Error in content processing:', error);
    throw error;
  }
}

module.exports = {
  generateLlmText,
  createAutoSummary,
  generateQuizQuestions,
  extractConcepts,
  processContentWithAI,
};
