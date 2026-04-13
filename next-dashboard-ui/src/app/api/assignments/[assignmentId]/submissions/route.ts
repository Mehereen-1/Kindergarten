import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Assignment from '@/lib/models/Assignment';
import AssignmentSubmission from '@/lib/models/AssignmentSubmission';
import ClassModel from '@/lib/models/Class';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import { extractSessionUser } from '@/lib/auth';

function normalizeText(value: string, preserveCase = false) {
  const base = String(value || '').replace(/[\p{P}\p{S}]/gu, ' ');
  return (preserveCase ? base : base.toLowerCase())
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string, preserveCase = false) {
  return normalizeText(value, preserveCase)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);
}

function jaccardSimilarity(a: string, b: string, preserveCase = false) {
  const tokensA = new Set(tokenize(a, preserveCase));
  const tokensB = new Set(tokenize(b, preserveCase));

  if (!tokensA.size || !tokensB.size) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

function tokenF1Similarity(a: string, b: string, preserveCase = false) {
  const tokensA = tokenize(a, preserveCase);
  const tokensB = tokenize(b, preserveCase);
  if (!tokensA.length || !tokensB.length) return 0;

  const freqA = new Map<string, number>();
  const freqB = new Map<string, number>();

  for (const token of tokensA) {
    freqA.set(token, (freqA.get(token) || 0) + 1);
  }

  for (const token of tokensB) {
    freqB.set(token, (freqB.get(token) || 0) + 1);
  }

  let overlap = 0;
  for (const [token, countA] of freqA.entries()) {
    const countB = freqB.get(token) || 0;
    overlap += Math.min(countA, countB);
  }

  const precision = overlap / tokensA.length;
  const recall = overlap / tokensB.length;
  if (precision + recall === 0) return 0;

  return (2 * precision * recall) / (precision + recall);
}

function levenshteinDistance(a: string, b: string, preserveCase = false) {
  const s = normalizeText(a, preserveCase);
  const t = normalizeText(b, preserveCase);
  const m = s.length;
  const n = t.length;

  if (!m) return n;
  if (!n) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

function editSimilarity(a: string, b: string, preserveCase = false) {
  const maxLen = Math.max(normalizeText(a, preserveCase).length, normalizeText(b, preserveCase).length);
  if (!maxLen) return 0;
  const distance = levenshteinDistance(a, b, preserveCase);
  return Math.max(0, 1 - distance / maxLen);
}

function buildFeedback(score: number, confidence: number) {
  if (confidence < 35) {
    return {
      badge: 'Needs clearer handwriting',
      feedback: 'The handwriting is a little hard to read. Please upload a clearer image or let the teacher review it.',
    };
  }

  if (score >= 90) {
    return { badge: 'Super Star', feedback: 'Amazing! The answer is very strong and fully matches the expected idea.' };
  }

  if (score >= 75) {
    return { badge: 'Great Progress', feedback: 'Very good work. The meaning is mostly correct with only tiny gaps.' };
  }

  if (score >= 55) {
    return { badge: 'Nice Try', feedback: 'Good start! The main idea is there, but it needs a little more detail.' };
  }

  return { badge: 'Try Again', feedback: 'You are on the right path, but the answer needs a clearer idea or more complete wording.' };
}

function extractMatchedWords(student: string, expected: string, preserveCase = false) {
  const expectedTokens = tokenize(expected, preserveCase);
  const studentTokens = new Set(tokenize(student, preserveCase));
  const matchedWords = expectedTokens.filter((token) => studentTokens.has(token));
  const missingWords = expectedTokens.filter((token) => !studentTokens.has(token));
  return { matchedWords: Array.from(new Set(matchedWords)), missingWords: Array.from(new Set(missingWords)) };
}

function splitMeaningfulLines(value: string, preserveCase = false) {
  return String(value || '')
    .split(/\r?\n+/)
    .map((line) => normalizeText(line, preserveCase))
    .filter(Boolean);
}

function countOccurrences(source: string, target: string, preserveCase = false) {
  const haystack = normalizeText(source, preserveCase);
  const needle = normalizeText(target, preserveCase);
  if (!needle) return 0;

  let count = 0;
  let index = 0;
  while (index <= haystack.length) {
    const found = haystack.indexOf(needle, index);
    if (found === -1) break;
    count += 1;
    index = found + needle.length;
  }
  return count;
}

function lineSimilarity(a: string, b: string, preserveCase = false) {
  const exactA = normalizeText(a, preserveCase);
  const exactB = normalizeText(b, preserveCase);
  if (!exactA && !exactB) return 1;
  if (!exactA || !exactB) return 0;

  const tokenScore = jaccardSimilarity(a, b, preserveCase);
  const f1Score = tokenF1Similarity(a, b, preserveCase);
  const editScore = editSimilarity(a, b, preserveCase);
  return Math.max(0, Math.min(1, tokenScore * 0.2 + f1Score * 0.35 + editScore * 0.45));
}

function evaluateRepeatedText(params: {
  expectedAnswer: string;
  studentText: string;
  repeatCount: number;
  preserveCase: boolean;
}) {
  const expectedUnits = splitMeaningfulLines(params.expectedAnswer, params.preserveCase);
  const studentLines = splitMeaningfulLines(params.studentText, params.preserveCase);
  const expectedSequence = Array.from({ length: Math.max(1, params.repeatCount) }, () => expectedUnits).flat();
  const totalExpected = Math.max(1, expectedSequence.length);

  const perUnitCoverage = expectedUnits.map((unit) => {
    const occurrences = countOccurrences(params.studentText, unit, params.preserveCase);
    return Math.min(1, occurrences / Math.max(1, params.repeatCount));
  });

  const coverageScore = perUnitCoverage.length
    ? perUnitCoverage.reduce((sum, value) => sum + value, 0) / perUnitCoverage.length
    : 0;

  const alignedCount = Math.min(studentLines.length, expectedSequence.length);
  let orderSum = 0;
  for (let index = 0; index < alignedCount; index += 1) {
    orderSum += lineSimilarity(studentLines[index], expectedSequence[index], params.preserveCase);
  }
  const orderScore = alignedCount ? orderSum / alignedCount : 0;

  const exactMatches = studentLines.filter((line) => expectedUnits.some((unit) => normalizeText(line, params.preserveCase) === normalizeText(unit, params.preserveCase))).length;
  const lineScore = expectedSequence.length ? exactMatches / totalExpected : 0;

  const weightedSimilarity = coverageScore * 0.45 + orderScore * 0.35 + lineScore * 0.2;
  const matchedWords = expectedUnits.filter((unit) => countOccurrences(params.studentText, unit, params.preserveCase) >= 1);
  const missingWords = expectedUnits.filter((unit) => countOccurrences(params.studentText, unit, params.preserveCase) < params.repeatCount);

  return {
    similarity: Math.round(weightedSimilarity * 100),
    coverageScore: Math.round(coverageScore * 100),
    orderScore: Math.round(orderScore * 100),
    lineScore: Math.round(lineScore * 100),
    matchedWords,
    missingWords,
  };
}

function defaultManualFeedback(assignmentType: string) {
  switch (assignmentType) {
    case 'match_same':
    case 'circle_underline':
    case 'color_instruction':
    case 'pattern_completion':
      return 'Visual worksheet received. Waiting for teacher review.';
    default:
      return 'Submission received. Waiting for teacher review.';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    if (!sessionUser?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const assignment = await Assignment.findById(params.assignmentId).lean();
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    const isOwner = String(assignment.createdBy) === sessionUser.id;
    const isAdmin = sessionUser.role === 'admin';
    const isTeacherView = sessionUser.role === 'teacher' || isAdmin;

    if (isTeacherView && !isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const submissionQuery: any = { assignmentId: assignment._id };
    if (!isTeacherView) {
      submissionQuery.createdBy = sessionUser.id;
    }

    const submissions = await AssignmentSubmission.find(submissionQuery)
      .sort({ createdAt: -1 })
      .lean();

    const deadlinePassed = Boolean(assignment.dueDate && new Date() > new Date(assignment.dueDate));

    // Teacher/admin dashboard: derive missing students from class roster.
    let missingStudents: Array<{ studentId: string; name: string; rollNo?: string }> = [];

    if (isTeacherView) {
      const { searchParams } = new URL(request.url);
      const academicYear =
        searchParams.get('academicYear') ||
        (assignment.dueDate ? String(new Date(assignment.dueDate).getFullYear()) : String(new Date().getFullYear()));

      let classDoc: any = null;
      if (assignment.classId) {
        classDoc = await ClassModel.findById(assignment.classId).lean();
      }

      if (!classDoc && assignment.className) {
        classDoc = await ClassModel.findOne({
          $or: [{ classId: assignment.className }, { name: assignment.className }],
        }).lean();
      }

      if (classDoc?._id) {
        const histories = await StudentClassHistory.find({
          classId: classDoc._id,
          academicYear,
          status: 'active',
        })
          .populate('studentId', 'name')
          .lean();

        const roster = histories.map((history: any) => ({
          studentId: String(history.studentId?._id || history.studentId || ''),
          name: String(history.studentId?.name || ''),
          rollNo: String(history.rollNo || ''),
        }));

        const submittedByStudentId = new Set(
          submissions
            .filter((item: any) => item.studentId)
            .map((item: any) => String(item.studentId))
        );

        const submittedByName = new Set(
          submissions
            .map((item: any) => String(item.studentName || '').trim().toLowerCase())
            .filter(Boolean)
        );

        missingStudents = roster.filter((student) => {
          if (!student.name) return false;
          const byId = student.studentId && submittedByStudentId.has(student.studentId);
          const byName = submittedByName.has(student.name.trim().toLowerCase());
          return !byId && !byName;
        });
      }
    }

    return NextResponse.json({
      success: true,
      submissions,
      stats: {
        deadlinePassed,
        totalSubmissions: submissions.length,
        missingCount: missingStudents.length,
      },
      missingStudents,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    if (!sessionUser?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const assignment = await Assignment.findById(params.assignmentId).lean();
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    if (!assignment.isPublished && String(assignment.createdBy) !== sessionUser.id && sessionUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
      return NextResponse.json(
        { success: false, error: 'Deadline passed. Submission is no longer allowed.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const studentName = String(body?.studentName || '').trim() || (sessionUser.name || 'Unknown Student');
    const ocrText = String(body?.ocrText || '');
    const finalText = String(body?.finalText || '');
    const ocrConfidence = Math.max(0, Math.min(100, Number(body?.ocrConfidence || 0)));
    const gradingMode = String((assignment as any).gradingMode || 'auto_text');
    const assignmentType = String((assignment as any).assignmentType || 'letter_tracing');
    const worksheetTemplate = String((assignment as any).worksheetTemplate || 'tracing_sheet');
    const repeatCount = Math.max(1, Number((assignment as any).repeatCount || 1));
    const caseSensitive = Boolean((assignment as any).caseSensitive);
    const studentText = String(finalText || ocrText || '');

    let similarity = 0;
    let autoScore = 0;
    let autoFeedback = defaultManualFeedback(assignmentType);
    let badge = 'Teacher Review Needed';
    let matchedWords: string[] = [];
    let missingWords: string[] = [];
    let evaluationBreakdown: {
      jaccard: number;
      f1: number;
      editSimilarity: number;
      weightedSimilarity: number;
    } | undefined;

    if (gradingMode === 'auto_text') {
      const expectedAnswer = String(assignment.expectedAnswer || '');
      const isRepeatedTemplate =
        repeatCount > 1 ||
        ['alphabet_practice_sheet', 'sentence_repeat_sheet', 'spelling_repeat_sheet', 'number_practice_sheet'].includes(worksheetTemplate) ||
        expectedAnswer.includes('\n');

      if (isRepeatedTemplate) {
        const repeatEvaluation = evaluateRepeatedText({
          expectedAnswer,
          studentText,
          repeatCount,
          preserveCase: caseSensitive,
        });

        similarity = repeatEvaluation.similarity;
        autoScore = Math.max(0, Math.min(100, Math.round(repeatEvaluation.similarity * 0.8 + ocrConfidence * 0.2)));
        const feedbackPack = buildFeedback(autoScore, ocrConfidence);
        autoFeedback = feedbackPack.feedback;
        badge = feedbackPack.badge;
        matchedWords = repeatEvaluation.matchedWords;
        missingWords = repeatEvaluation.missingWords;
        evaluationBreakdown = {
          jaccard: repeatEvaluation.coverageScore,
          f1: repeatEvaluation.orderScore,
          editSimilarity: repeatEvaluation.lineScore,
          weightedSimilarity: repeatEvaluation.similarity,
        };
      } else {
        const jaccardRaw = jaccardSimilarity(studentText, expectedAnswer, caseSensitive);
        const f1Raw = tokenF1Similarity(studentText, expectedAnswer, caseSensitive);
        const editRaw = editSimilarity(studentText, expectedAnswer, caseSensitive);
        const weightedSimilarityRaw = jaccardRaw * 0.2 + f1Raw * 0.45 + editRaw * 0.35;

        similarity = Math.round(weightedSimilarityRaw * 100);
        autoScore = Math.max(0, Math.min(100, Math.round(weightedSimilarityRaw * 80 + ocrConfidence * 0.2)));
        const feedbackPack = buildFeedback(autoScore, ocrConfidence);
        const words = extractMatchedWords(studentText, expectedAnswer, caseSensitive);
        autoFeedback = feedbackPack.feedback;
        badge = feedbackPack.badge;
        matchedWords = words.matchedWords;
        missingWords = words.missingWords;

        evaluationBreakdown = {
          jaccard: Math.round(jaccardRaw * 100),
          f1: Math.round(f1Raw * 100),
          editSimilarity: Math.round(editRaw * 100),
          weightedSimilarity: Math.round(weightedSimilarityRaw * 100),
        };
      }
    }

    const submissionPayload = {
      studentId: body?.studentId || undefined,
      studentName,
      handwritingImageName: String(body?.handwritingImageName || ''),
      ocrText,
      finalText,
      similarity,
      ocrConfidence,
      autoScore,
      finalScore: autoScore,
      autoFeedback,
      finalFeedback: autoFeedback,
      badge,
      matchedWords,
      missingWords,
      evaluationBreakdown,
      reviewStatus: 'pending' as const,
      issueStatus: 'none' as const,
      issueReported: false,
    };

    const existing = await AssignmentSubmission.findOne({
      assignmentId: assignment._id,
      createdBy: sessionUser.id,
    });

    const submission = existing
      ? await AssignmentSubmission.findByIdAndUpdate(existing._id, { $set: submissionPayload }, { new: true })
      : await AssignmentSubmission.create({
          assignmentId: assignment._id,
          ...submissionPayload,
          createdBy: sessionUser.id,
        });

    return NextResponse.json({ success: true, submission }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
