'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Brain, CheckCircle2, FileImage, Loader2, Sparkles, Upload, Wand2 } from 'lucide-react';
import Image from 'next/image';
import { useCallback } from 'react';

type AssignmentItem = {
  _id: string;
  title: string;
  subject: string;
  className: string;
  dueDate?: string;
  prompt?: string;
  expectedAnswer: string;
  assignmentType?: string;
  gradingMode?: 'auto_text' | 'manual_review';
  language?: 'bangla' | 'english' | 'mixed' | 'unknown';
  studentLevel?: 'nursery' | 'kindergarten';
  repeatCount?: number;
  caseSensitive?: boolean;
  worksheetTemplate?:
    | 'tracing_sheet'
    | 'match_sheet'
    | 'circle_underline_sheet'
    | 'coloring_sheet'
    | 'picture_vocab_sheet'
    | 'phonics_boxes_sheet'
    | 'pattern_sheet'
    | 'life_skill_sheet'
    | 'alphabet_practice_sheet'
    | 'sentence_repeat_sheet'
    | 'spelling_repeat_sheet'
    | 'number_practice_sheet';
};

type SubmissionItem = {
  _id: string;
  studentName: string;
  finalText?: string;
  ocrText?: string;
  similarity?: number;
  ocrConfidence?: number;
  finalScore: number;
  autoScore: number;
  autoFeedback?: string;
  reviewStatus: 'pending' | 'reviewed';
  finalFeedback: string;
  matchedWords?: string[];
  missingWords?: string[];
  evaluationBreakdown?: {
    jaccard?: number;
    f1?: number;
    editSimilarity?: number;
    weightedSimilarity?: number;
  };
  issueStatus?: 'none' | 'open' | 'resolved';
  issueReported?: boolean;
  issueMessage?: string;
  createdAt: string;
};

type SubmissionStats = {
  deadlinePassed: boolean;
  totalSubmissions: number;
  missingCount: number;
};

type MissingStudent = {
  studentId: string;
  name: string;
  rollNo?: string;
};

type GradingResult = {
  score: number;
  similarity: number;
  confidence: number;
  language: 'bangla' | 'english' | 'mixed' | 'unknown';
  feedback: string;
  badge: string;
  matchedWords: string[];
  missingWords: string[];
};

type AssignmentPreset = {
  label: string;
  subject: string;
  prompt: string;
  expectedAnswer: string;
  gradingMode: 'auto_text' | 'manual_review';
  recommendedTemplate:
    | 'tracing_sheet'
    | 'match_sheet'
    | 'circle_underline_sheet'
    | 'coloring_sheet'
    | 'picture_vocab_sheet'
    | 'phonics_boxes_sheet'
    | 'pattern_sheet'
    | 'life_skill_sheet'
    | 'alphabet_practice_sheet'
    | 'sentence_repeat_sheet'
    | 'spelling_repeat_sheet'
    | 'number_practice_sheet';
  repeatCount: number;
  caseSensitive: boolean;
};

type WorksheetTemplateProfile = {
  label: string;
  description: string;
  nurseryNotes: string;
  kindergartenNotes: string;
  designRules: string[];
};

const ASSIGNMENT_PRESETS: Record<string, AssignmentPreset> = {
  letter_tracing: {
    label: 'Letter tracing and writing',
    subject: 'Language',
    prompt: 'Trace and write the given letters neatly.',
    expectedAnswer: 'Correct letter writing and neat tracing',
    gradingMode: 'manual_review',
    recommendedTemplate: 'alphabet_practice_sheet',
    repeatCount: 1,
    caseSensitive: true,
  },
  number_tracing: {
    label: 'Number tracing and counting',
    subject: 'Math',
    prompt: 'Trace the numbers and write the total count.',
    expectedAnswer: 'Correct number sequence and count',
    gradingMode: 'auto_text',
    recommendedTemplate: 'number_practice_sheet',
    repeatCount: 1,
    caseSensitive: false,
  },
  match_same: {
    label: 'Match the same',
    subject: 'General',
    prompt: 'Match each item with the correct pair.',
    expectedAnswer: '',
    gradingMode: 'manual_review',
    recommendedTemplate: 'match_sheet',
    repeatCount: 1,
    caseSensitive: false,
  },
  circle_underline: {
    label: 'Circle/underline correct picture',
    subject: 'General',
    prompt: 'Circle or underline the correct picture.',
    expectedAnswer: '',
    gradingMode: 'manual_review',
    recommendedTemplate: 'circle_underline_sheet',
    repeatCount: 1,
    caseSensitive: false,
  },
  color_instruction: {
    label: 'Color by instruction',
    subject: 'Art',
    prompt: 'Color objects according to instructions.',
    expectedAnswer: '',
    gradingMode: 'manual_review',
    recommendedTemplate: 'coloring_sheet',
    repeatCount: 1,
    caseSensitive: false,
  },
  phonics: {
    label: 'Simple phonics task',
    subject: 'Phonics',
    prompt: 'Write the beginning sound for each picture.',
    expectedAnswer: 'Correct beginning sounds',
    gradingMode: 'auto_text',
    recommendedTemplate: 'phonics_boxes_sheet',
    repeatCount: 1,
    caseSensitive: false,
  },
  picture_vocabulary: {
    label: 'Picture-based vocabulary',
    subject: 'Vocabulary',
    prompt: 'Write the names of the shown objects.',
    expectedAnswer: 'Correct object names',
    gradingMode: 'auto_text',
    recommendedTemplate: 'picture_vocab_sheet',
    repeatCount: 1,
    caseSensitive: false,
  },
  oral_to_written: {
    label: 'Very short oral-to-written',
    subject: 'Language',
    prompt: 'Write the words spoken by teacher.',
    expectedAnswer: 'Correctly written target words',
    gradingMode: 'auto_text',
    recommendedTemplate: 'sentence_repeat_sheet',
    repeatCount: 10,
    caseSensitive: true,
  },
  pattern_completion: {
    label: 'Pattern completion',
    subject: 'Logic',
    prompt: 'Complete the pattern sequence correctly.',
    expectedAnswer: '',
    gradingMode: 'manual_review',
    recommendedTemplate: 'pattern_sheet',
    repeatCount: 1,
    caseSensitive: false,
  },
  life_skill: {
    label: 'Life-skill worksheet',
    subject: 'Life Skill',
    prompt: 'Complete worksheet on daily habits and safety.',
    expectedAnswer: 'Key life-skill words and understanding',
    gradingMode: 'auto_text',
    recommendedTemplate: 'life_skill_sheet',
    repeatCount: 1,
    caseSensitive: false,
  },
};

const WORKSHEET_TEMPLATES: Record<string, WorksheetTemplateProfile> = {
  tracing_sheet: {
    label: 'Tracing practice sheet',
    description: 'Large guided rows with dotted strokes and direction arrows.',
    nurseryNotes: 'Use 1 task per page with thick lines and plenty of writing space.',
    kindergartenNotes: 'Use 2 tasks max with ruled helper lines for cleaner writing.',
    designRules: ['High-contrast guide lines', 'Big writing boxes', 'Minimal text instructions'],
  },
  match_sheet: {
    label: 'Match-the-same sheet',
    description: 'Left-right pairing layout with safe spacing for line drawing.',
    nurseryNotes: 'Keep 3 to 4 pairs only with picture clues.',
    kindergartenNotes: 'Use up to 6 pairs and optionally include word labels.',
    designRules: ['Wide center connector zone', 'Picture-first items', 'No clutter background'],
  },
  circle_underline_sheet: {
    label: 'Circle or underline sheet',
    description: 'Choice cards where child marks the correct option.',
    nurseryNotes: 'Use 2 to 3 choices with very clear image difference.',
    kindergartenNotes: 'Use 3 to 5 choices and include short word prompts.',
    designRules: ['Thick option borders', 'One prompt per row', 'Large marking area'],
  },
  coloring_sheet: {
    label: 'Color-by-instruction sheet',
    description: 'Outlined shapes with simple color instructions.',
    nurseryNotes: 'Keep big shapes and one instruction at a time.',
    kindergartenNotes: 'Use small multi-step coloring tasks.',
    designRules: ['White fill region', 'Heavy outlines', 'Instruction banner on top'],
  },
  picture_vocab_sheet: {
    label: 'Picture vocabulary sheet',
    description: 'Image tiles with answer lines underneath each picture.',
    nurseryNotes: 'Use simple familiar objects and single-word responses.',
    kindergartenNotes: 'Add themed groups and 1 to 2-word responses.',
    designRules: ['Large image cards', 'Single answer line', 'Clean spacing between cards'],
  },
  phonics_boxes_sheet: {
    label: 'Phonics box sheet',
    description: 'Letter boxes to write sounds or short words.',
    nurseryNotes: 'Focus on first sound only with 2 to 3 letter boxes.',
    kindergartenNotes: 'Allow CVC word boxes and short spoken-to-written tasks.',
    designRules: ['Equal-size letter boxes', 'Audio cue icon', 'Short prompt text'],
  },
  pattern_sheet: {
    label: 'Pattern completion sheet',
    description: 'Visual sequence rows with blank continuation slots.',
    nurseryNotes: 'Simple ABAB patterns using pictures/shapes.',
    kindergartenNotes: 'Introduce AAB/ABC patterns and symbol variety.',
    designRules: ['Fixed row rhythm', 'Blank continuation slots', 'Clear repeated motif'],
  },
  life_skill_sheet: {
    label: 'Life-skill worksheet',
    description: 'Daily habit and safety scenarios with guided response area.',
    nurseryNotes: 'Use yes/no tick marks with simple visuals.',
    kindergartenNotes: 'Allow short phrase answers with scenario cards.',
    designRules: ['Scenario picture first', 'Simple checklist area', 'Friendly icons'],
  },
  alphabet_practice_sheet: {
    label: 'Alphabet practice sheet',
    description: 'Uppercase and lowercase box rows for case-sensitive alphabet checking.',
    nurseryNotes: 'Use one large letter row at a time with thick writing boxes.',
    kindergartenNotes: 'Use uppercase and lowercase rows with repeat counts printed clearly.',
    designRules: ['Separate upper and lower rows', 'One letter per box', 'Fixed repetition count'],
  },
  sentence_repeat_sheet: {
    label: 'Sentence repeat sheet',
    description: 'One sentence or short phrase repeated across fixed lines.',
    nurseryNotes: 'Use very short teacher-approved phrases and large line spacing.',
    kindergartenNotes: 'Use one sentence repeated many times with clear writing lanes.',
    designRules: ['Single sentence per line', 'Large line spacing', 'Visible repeat counter'],
  },
  spelling_repeat_sheet: {
    label: 'Spelling repeat sheet',
    description: 'A list of spellings that each must be written several times.',
    nurseryNotes: 'Use 2 to 3 simple spellings only.',
    kindergartenNotes: 'Use short spelling lists with a clear repeat count beside each word.',
    designRules: ['One spelling per block', 'Repeat count marker', 'High whitespace'],
  },
  number_practice_sheet: {
    label: 'Number practice sheet',
    description: 'Number tracing and counting boxes with structured rows.',
    nurseryNotes: 'Use big numbers and more room for tracing.',
    kindergartenNotes: 'Use counting rows, number grids, and repetition markers.',
    designRules: ['Big digit boxes', 'Consistent row spacing', 'Simple count cues'],
  },
};

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

function detectLanguage(value: string): GradingResult['language'] {
  const sample = String(value || '');
  const banglaChars = (sample.match(/[\u0980-\u09FF]/g) || []).length;
  const latinChars = (sample.match(/[A-Za-z]/g) || []).length;

  if (banglaChars > 0 && latinChars === 0) return 'bangla';
  if (banglaChars > 0 && latinChars > 0) return 'mixed';
  if (latinChars > 0) return 'english';
  return 'unknown';
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

function buildFeedback(score: number, similarity: number, confidence: number) {
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
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[m][n];
}

function editSimilarity(a: string, b: string, preserveCase = false) {
  const maxLen = Math.max(normalizeText(a, preserveCase).length, normalizeText(b, preserveCase).length);
  if (!maxLen) return 0;
  return Math.max(0, 1 - levenshteinDistance(a, b, preserveCase) / maxLen);
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
  const editScore = editSimilarity(a, b, preserveCase);
  return Math.max(0, Math.min(1, tokenScore * 0.35 + editScore * 0.65));
}

function evaluateRepeatedText(params: {
  expectedAnswer: string;
  studentText: string;
  repeatCount: number;
  preserveCase: boolean;
}) {
  const expectedUnits = splitMeaningfulLines(params.expectedAnswer, params.preserveCase);
  const studentLines = splitMeaningfulLines(params.studentText, params.preserveCase);
  const sequence = Array.from({ length: Math.max(1, params.repeatCount) }, () => expectedUnits).flat();
  const perUnitCoverage = expectedUnits.map((unit) => Math.min(1, countOccurrences(params.studentText, unit, params.preserveCase) / Math.max(1, params.repeatCount)));

  const coverageScore = perUnitCoverage.length ? perUnitCoverage.reduce((sum, value) => sum + value, 0) / perUnitCoverage.length : 0;

  const alignedCount = Math.min(studentLines.length, sequence.length);
  let orderSum = 0;
  for (let index = 0; index < alignedCount; index += 1) {
    orderSum += lineSimilarity(studentLines[index], sequence[index], params.preserveCase);
  }
  const orderScore = alignedCount ? orderSum / alignedCount : 0;

  const lineMatches = studentLines.filter((line) => expectedUnits.some((unit) => normalizeText(line, params.preserveCase) === normalizeText(unit, params.preserveCase))).length;
  const lineScore = sequence.length ? lineMatches / sequence.length : 0;

  const weightedSimilarity = coverageScore * 0.45 + orderScore * 0.35 + lineScore * 0.2;

  return {
    similarity: Math.round(weightedSimilarity * 100),
    coverageScore: Math.round(coverageScore * 100),
    orderScore: Math.round(orderScore * 100),
    lineScore: Math.round(lineScore * 100),
    matchedWords: expectedUnits.filter((unit) => countOccurrences(params.studentText, unit, params.preserveCase) >= 1),
    missingWords: expectedUnits.filter((unit) => countOccurrences(params.studentText, unit, params.preserveCase) < params.repeatCount),
  };
}

export default function AssignmentHandwritingChecker() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [viewerRole, setViewerRole] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [submissionStats, setSubmissionStats] = useState<SubmissionStats | null>(null);
  const [missingStudents, setMissingStudents] = useState<MissingStudent[]>([]);
  const [studentName, setStudentName] = useState('');
  const [manualScores, setManualScores] = useState<Record<string, string>>({});
  const [manualFeedbacks, setManualFeedbacks] = useState<Record<string, string>>({});
  const [issueMessages, setIssueMessages] = useState<Record<string, string>>({});
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [savingSubmission, setSavingSubmission] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [notice, setNotice] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [assignmentType, setAssignmentType] = useState<string>('letter_tracing');
  const [gradingMode, setGradingMode] = useState<'auto_text' | 'manual_review'>('manual_review');
  const [studentLevel, setStudentLevel] = useState<'nursery' | 'kindergarten'>('kindergarten');
  const [repeatCount, setRepeatCount] = useState(1);
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [worksheetTemplate, setWorksheetTemplate] = useState<
    | 'tracing_sheet'
    | 'match_sheet'
    | 'circle_underline_sheet'
    | 'coloring_sheet'
    | 'picture_vocab_sheet'
    | 'phonics_boxes_sheet'
    | 'pattern_sheet'
    | 'life_skill_sheet'
    | 'alphabet_practice_sheet'
    | 'sentence_repeat_sheet'
    | 'spelling_repeat_sheet'
    | 'number_practice_sheet'
  >('tracing_sheet');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [studentHint, setStudentHint] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [editableText, setEditableText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [progress, setProgress] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState('');

  const selectedAssignment = useMemo(
    () => assignments.find((item) => item._id === selectedAssignmentId) || null,
    [assignments, selectedAssignmentId]
  );

  const deadlinePassed = useMemo(() => {
    if (submissionStats?.deadlinePassed !== undefined) {
      return submissionStats.deadlinePassed;
    }
    if (!selectedAssignment?.dueDate) return false;
    return new Date() > new Date(selectedAssignment.dueDate);
  }, [submissionStats, selectedAssignment?.dueDate]);

  const currentGradingMode = useMemo<'auto_text' | 'manual_review'>(
    () => (selectedAssignment?.gradingMode || gradingMode || 'auto_text') as 'auto_text' | 'manual_review',
    [selectedAssignment?.gradingMode, gradingMode]
  );

  const isAutoTextAssignment = currentGradingMode === 'auto_text';

  const activeTemplateProfile = useMemo(() => {
    const key = selectedAssignment?.worksheetTemplate || worksheetTemplate;
    return WORKSHEET_TEMPLATES[key] || WORKSHEET_TEMPLATES.tracing_sheet;
  }, [selectedAssignment?.worksheetTemplate, worksheetTemplate]);

  const activeStudentLevel = (selectedAssignment?.studentLevel || studentLevel) as 'nursery' | 'kindergarten';

  const isTeacherOrAdmin = viewerRole === 'teacher' || viewerRole === 'admin';

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const roleCookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith('userRole='))
      ?.split('=')[1];

    if (roleCookie) {
      setViewerRole(decodeURIComponent(roleCookie));
      return;
    }

    const userCookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith('user='))
      ?.split('=')[1];

    if (userCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(userCookie));
        if (parsed?.role) setViewerRole(String(parsed.role));
      } catch {
        setViewerRole('');
      }
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    try {
      const response = await fetch('/api/assignments', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load assignments');
      }

      const list = Array.isArray(data.assignments) ? data.assignments : [];
      setAssignments(list);

      if (list.length > 0) {
        setSelectedAssignmentId((current) => current || String(list[0]._id));
      }
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load assignments');
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  const fetchSubmissions = useCallback(async (assignmentId: string) => {
    if (!assignmentId) {
      setSubmissions([]);
      setSubmissionStats(null);
      setMissingStudents([]);
      return;
    }

    setLoadingSubmissions(true);
    try {
      const response = await fetch(`/api/assignments/${assignmentId}/submissions`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load submissions');
      }

      setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
      setSubmissionStats(data?.stats || null);
      setMissingStudents(Array.isArray(data?.missingStudents) ? data.missingStudents : []);
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load submissions');
      setSubmissions([]);
      setSubmissionStats(null);
      setMissingStudents([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    if (!selectedAssignment) return;
    setExpectedAnswer(selectedAssignment.expectedAnswer || '');
    setStudentHint(selectedAssignment.prompt || '');
    setStudentLevel((selectedAssignment.studentLevel || 'kindergarten') as 'nursery' | 'kindergarten');
    setRepeatCount(Math.max(1, Number(selectedAssignment.repeatCount || 1)));
    setCaseSensitive(Boolean(selectedAssignment.caseSensitive ?? true));
    setWorksheetTemplate(
      (selectedAssignment.worksheetTemplate || 'tracing_sheet') as
        | 'tracing_sheet'
        | 'match_sheet'
        | 'circle_underline_sheet'
        | 'coloring_sheet'
        | 'picture_vocab_sheet'
        | 'phonics_boxes_sheet'
        | 'pattern_sheet'
        | 'life_skill_sheet'
        | 'alphabet_practice_sheet'
        | 'sentence_repeat_sheet'
        | 'spelling_repeat_sheet'
        | 'number_practice_sheet'
    );
    fetchSubmissions(selectedAssignment._id);
  }, [selectedAssignment, fetchSubmissions]);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const detectedLanguage = useMemo(() => detectLanguage(editableText || ocrText || expectedAnswer || studentHint), [editableText, ocrText, expectedAnswer, studentHint]);

  const handleDetectHandwriting = async () => {
    if (!imageFile) {
      setError('Please upload a handwriting image first.');
      return;
    }

    setRunning(true);
    setError('');
    setResult(null);
    setProgress('Loading OCR engine...');

    try {
      const tesseract = await import('tesseract.js');
      const guessBangla = /[\u0980-\u09FF]/.test(expectedAnswer + ' ' + studentHint);
      const lang = guessBangla ? 'ben+eng' : 'eng';

      const response = await tesseract.recognize(imageFile, lang as any, {
        logger: (message: any) => {
          if (message?.status) {
            const pct = typeof message.progress === 'number' ? Math.round(message.progress * 100) : 0;
            setProgress(`${message.status}${pct ? ` • ${pct}%` : ''}`);
          }
        },
      } as any);

      const text = String(response?.data?.text || '').trim();
      const ocrConfidence = Math.max(0, Math.round(Number(response?.data?.confidence || 0)));

      setOcrText(text);
      setEditableText(text);
      setConfidence(ocrConfidence);
      setProgress('OCR complete');
    } catch (ocrError: any) {
      setError(ocrError?.message || 'Failed to detect handwriting.');
      setProgress('OCR failed');
    } finally {
      setRunning(false);
    }
  };

  const handleCreateAssignment = async () => {
        if (!isTeacherOrAdmin) {
          setError('Only teachers/admin can create assignments.');
          return;
        }

    if (!newTitle.trim() || !newSubject.trim() || !newClassName.trim()) {
      setError('Please fill title, subject, and class before creating assignment.');
      return;
    }

    if (gradingMode === 'auto_text' && !expectedAnswer.trim()) {
      setError('Expected answer is required for auto-check assignments.');
      return;
    }

    setSavingAssignment(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        title: newTitle.trim(),
        subject: newSubject.trim(),
        className: newClassName.trim(),
        dueDate: newDueDate || undefined,
        prompt: studentHint,
        expectedAnswer,
        assignmentType,
        gradingMode,
        language: detectLanguage(expectedAnswer + ' ' + studentHint),
        studentLevel,
        repeatCount,
        caseSensitive,
        worksheetTemplate,
      };

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to create assignment');
      }

      setNotice('Assignment created successfully.');
      await fetchAssignments();
      const createdId = String(data.assignment?._id || '');
      if (createdId) {
        setSelectedAssignmentId(createdId);
      }
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to create assignment');
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleScoreAnswer = () => {
    if (!isAutoTextAssignment) {
      setError('This assignment is visual/manual-review type. Submit directly for teacher review.');
      return;
    }

    const studentAnswer = String(editableText || ocrText || '');
    const modelAnswer = String(expectedAnswer || '');
    const templateName = selectedAssignment?.worksheetTemplate || worksheetTemplate;
    const repeatTotal = Math.max(1, Number(selectedAssignment?.repeatCount || repeatCount || 1));
    const preserveCase = Boolean(selectedAssignment?.caseSensitive ?? caseSensitive);
    const repeatedTemplate =
      repeatTotal > 1 ||
      ['alphabet_practice_sheet', 'sentence_repeat_sheet', 'spelling_repeat_sheet', 'number_practice_sheet'].includes(templateName) ||
      modelAnswer.includes('\n');

    if (!normalizeText(studentAnswer, true)) {
      setError('Please run OCR or type the detected answer first.');
      return;
    }

    if (!normalizeText(modelAnswer, true)) {
      setError('Please enter the expected answer for checking.');
      return;
    }

    setError('');

    let similarity = 0;
    let cappedScore = 0;
    let matchedWords: string[] = [];
    let missingWords: string[] = [];

    if (repeatedTemplate) {
      const repeatEvaluation = evaluateRepeatedText({
        expectedAnswer: modelAnswer,
        studentText: studentAnswer,
        repeatCount: repeatTotal,
        preserveCase,
      });

      similarity = repeatEvaluation.similarity / 100;
      cappedScore = Math.max(0, Math.min(100, Math.round(repeatEvaluation.similarity * 0.8 + confidence * 0.2)));
      matchedWords = repeatEvaluation.matchedWords;
      missingWords = repeatEvaluation.missingWords;
    } else {
      similarity = jaccardSimilarity(studentAnswer, modelAnswer, preserveCase);
      cappedScore = Math.max(0, Math.min(100, Math.round(similarity * 70 + Math.min(confidence, 100) * 0.3)));
      const words = extractMatchedWords(studentAnswer, modelAnswer, preserveCase);
      matchedWords = words.matchedWords;
      missingWords = words.missingWords;
    }

    const feedbackPack = buildFeedback(cappedScore, similarity * 100, confidence);

    setResult({
      score: cappedScore,
      similarity: Math.round(similarity * 100),
      confidence,
      language: detectedLanguage,
      feedback: feedbackPack.feedback,
      badge: feedbackPack.badge,
      matchedWords,
      missingWords,
    });
  };

  const handleSaveSubmission = async () => {
    if (!selectedAssignmentId) {
      setError('Please select an assignment first.');
      return;
    }

    if (!result) {
      if (isAutoTextAssignment) {
        setError('Please run Check answer first.');
        return;
      }
    }

    setSavingSubmission(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/assignments/${selectedAssignmentId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName.trim() || 'Student',
          handwritingImageName: imageFile?.name || '',
          ocrText,
          finalText: editableText,
          similarity: result?.similarity || 0,
          ocrConfidence: result?.confidence || confidence,
          autoScore: result?.score || 0,
          autoFeedback: result?.feedback || '',
          badge: result?.badge || '',
          matchedWords: result?.matchedWords || [],
          missingWords: result?.missingWords || [],
          gradingMode: currentGradingMode,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to save submission');
      }

      setNotice('Submission saved successfully.');
      fetchSubmissions(selectedAssignmentId);
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save submission');
    } finally {
      setSavingSubmission(false);
    }
  };

  const handleReviewSubmission = async (submissionId: string) => {
        if (!isTeacherOrAdmin) {
          setError('Only teachers/admin can review submissions.');
          return;
        }

    const scoreText = manualScores[submissionId] ?? '';
    const feedbackText = manualFeedbacks[submissionId] ?? '';
    const scoreNumber = Number(scoreText);

    if (Number.isNaN(scoreNumber) || scoreNumber < 0 || scoreNumber > 100) {
      setError('Manual score must be between 0 and 100.');
      return;
    }

    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/assignments/submissions/${submissionId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalScore: scoreNumber,
          finalFeedback: feedbackText,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to review submission');
      }

      setNotice('Submission reviewed and final score updated.');
      fetchSubmissions(selectedAssignmentId);
    } catch (reviewError: any) {
      setError(reviewError?.message || 'Failed to review submission');
    }
  };

  const handleReportIssue = async (submissionId: string) => {
    const issueMessage = String(issueMessages[submissionId] || '').trim();
    if (!issueMessage) {
      setError('Please describe the issue before reporting.');
      return;
    }

    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/assignments/submissions/${submissionId}/issue`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report',
          issueMessage,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to report issue');
      }

      setNotice('Issue reported to teacher successfully.');
      fetchSubmissions(selectedAssignmentId);
    } catch (reportError: any) {
      setError(reportError?.message || 'Failed to report issue');
    }
  };

  const handleResolveIssue = async (submissionId: string) => {
    if (!isTeacherOrAdmin) return;

    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/assignments/submissions/${submissionId}/issue`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve' }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to resolve issue');
      }

      setNotice('Reported issue marked as resolved.');
      fetchSubmissions(selectedAssignmentId);
    } catch (resolveError: any) {
      setError(resolveError?.message || 'Failed to resolve issue');
    }
  };

  const resetAll = () => {
    setImageFile(null);
    setExpectedAnswer('');
    setStudentHint('');
    setOcrText('');
    setEditableText('');
    setConfidence(0);
    setProgress('');
    setRunning(false);
    setResult(null);
    setError('');
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 via-white to-indigo-50 rounded-2xl border border-amber-100 shadow-sm p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Brain size={18} />
            </div>

            {selectedAssignment?.dueDate ? (
              <div
                className={`text-sm rounded-lg px-3 py-2 border ${
                  deadlinePassed
                    ? 'bg-rose-50 text-rose-700 border-rose-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                }`}
              >
                Deadline: {new Date(selectedAssignment.dueDate).toLocaleString()} {deadlinePassed ? '(passed)' : '(open)'}
              </div>
            ) : null}
            <h2 className="text-2xl font-bold text-gray-900">Handwriting Assignment Checker</h2>
          </div>
          <p className="text-sm text-gray-600 max-w-2xl">
            Upload a handwritten answer, read it with OCR, compare meaning, and give cute, fair feedback with partial marks.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-2 rounded-full">
          <Sparkles size={14} />
          Cute grading mode
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-bold text-gray-900">Assignment setup</h3>
              {loadingAssignments ? <span className="text-xs text-gray-500">Loading assignments...</span> : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700 mb-2 block">Select assignment</span>
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-3 bg-white"
                >
                  <option value="">Choose assignment</option>
                  {assignments.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.title} • {item.className} • {item.subject} • {item.studentLevel || 'kindergarten'}
                    </option>
                  ))}
                </select>
              </label>

              {isTeacherOrAdmin ? (
                <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  Teacher mode: students submit from their own account. You can review submissions below.
                </div>
              ) : (
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700 mb-2 block">Student name</span>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter student name"
                    className="w-full rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-3 bg-white"
                  />
                </label>
              )}
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
              <p className="font-semibold">Active worksheet style: {activeTemplateProfile.label}</p>
              <p className="mt-1">Level: {activeStudentLevel === 'nursery' ? 'Nursery' : 'Kindergarten'}</p>
              <p className="mt-1 text-xs">{activeTemplateProfile.description}</p>
            </div>

            {isTeacherOrAdmin ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="New assignment title"
                    className="rounded-xl border border-gray-300 p-3"
                  />
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="Class name"
                    className="rounded-xl border border-gray-300 p-3"
                  />
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Subject"
                    className="rounded-xl border border-gray-300 p-3"
                  />
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="rounded-xl border border-gray-300 p-3"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={assignmentType}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      const preset = ASSIGNMENT_PRESETS[nextType];
                      setAssignmentType(nextType);
                      if (preset) {
                        setNewSubject((current) => current || preset.subject);
                        setStudentHint((current) => current || preset.prompt);
                        setExpectedAnswer((current) => current || preset.expectedAnswer);
                        setGradingMode(preset.gradingMode);
                        setRepeatCount(preset.repeatCount);
                        setCaseSensitive(preset.caseSensitive);
                        setWorksheetTemplate(preset.recommendedTemplate);
                      }
                    }}
                    className="rounded-xl border border-gray-300 p-3"
                  >
                    {Object.entries(ASSIGNMENT_PRESETS).map(([value, preset]) => (
                      <option key={value} value={value}>{preset.label}</option>
                    ))}
                  </select>

                  <select
                    value={gradingMode}
                    onChange={(e) => setGradingMode(e.target.value as 'auto_text' | 'manual_review')}
                    className="rounded-xl border border-gray-300 p-3"
                  >
                    <option value="auto_text">Auto text check</option>
                    <option value="manual_review">Manual teacher review</option>
                  </select>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {gradingMode === 'auto_text'
                      ? 'Auto text mode: OCR + expected answer comparison.'
                      : 'Manual review mode: visual worksheet evaluated by teacher.'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={studentLevel}
                    onChange={(e) => setStudentLevel(e.target.value as 'nursery' | 'kindergarten')}
                    className="rounded-xl border border-gray-300 p-3"
                  >
                    <option value="nursery">Nursery worksheet style</option>
                    <option value="kindergarten">Kindergarten worksheet style</option>
                  </select>

                  <select
                    value={worksheetTemplate}
                    onChange={(e) =>
                      setWorksheetTemplate(
                        e.target.value as
                          | 'tracing_sheet'
                          | 'match_sheet'
                          | 'circle_underline_sheet'
                          | 'coloring_sheet'
                          | 'picture_vocab_sheet'
                          | 'phonics_boxes_sheet'
                          | 'pattern_sheet'
                          | 'life_skill_sheet'
                          | 'alphabet_practice_sheet'
                          | 'sentence_repeat_sheet'
                          | 'spelling_repeat_sheet'
                          | 'number_practice_sheet'
                      )
                    }
                    className="rounded-xl border border-gray-300 p-3"
                  >
                    {Object.entries(WORKSHEET_TEMPLATES).map(([value, template]) => (
                      <option key={value} value={value}>{template.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700 mb-2 block">Repeat count</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={repeatCount}
                      onChange={(e) => setRepeatCount(Math.max(1, Number(e.target.value || 1)))}
                      className="w-full rounded-xl border border-gray-300 p-3"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-gray-300 p-3 bg-white">
                    <input
                      type="checkbox"
                      checked={caseSensitive}
                      onChange={(e) => setCaseSensitive(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Case sensitive checking</span>
                  </label>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
                  <p className="font-semibold">Worksheet template preview: {activeTemplateProfile.label}</p>
                  <p>{activeTemplateProfile.description}</p>
                  <p>Repeat count: {repeatCount}</p>
                  <p>Case sensitive: {caseSensitive ? 'Yes' : 'No'}</p>
                  <p>
                    {activeStudentLevel === 'nursery'
                      ? `Nursery guide: ${activeTemplateProfile.nurseryNotes}`
                      : `Kindergarten guide: ${activeTemplateProfile.kindergartenNotes}`}
                  </p>
                  <p className="text-xs">
                    Layout rules: {activeTemplateProfile.designRules.join(' • ')}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleCreateAssignment}
                    disabled={savingAssignment}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-white font-semibold hover:bg-slate-900 disabled:opacity-60"
                  >
                    {savingAssignment ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    Create assignment
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                Student mode: select an assignment, upload handwriting, and submit.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700 mb-2 block">Expected answer</span>
              <textarea
                value={expectedAnswer}
                onChange={(e) => setExpectedAnswer(e.target.value)}
                placeholder={isAutoTextAssignment ? 'Type the correct answer here...' : 'Optional for manual-review assignments'}
                rows={5}
                readOnly={!isTeacherOrAdmin}
                className="w-full rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-3 bg-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700 mb-2 block">Student hint / question prompt</span>
              <textarea
                value={studentHint}
                onChange={(e) => setStudentHint(e.target.value)}
                placeholder="Optional: add the question or hint shown to the student..."
                rows={5}
                className="w-full rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-3 bg-white"
              />
            </label>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="text-indigo-600" size={18} />
              <h3 className="font-bold text-gray-900">Upload handwriting image</h3>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white file:font-semibold hover:file:bg-indigo-700"
            />

            {previewUrl ? (
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-slate-50">
                <Image
                  src={previewUrl}
                  alt="Handwriting preview"
                  width={900}
                  height={450}
                  unoptimized
                  className="w-full max-h-[320px] object-contain"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                <FileImage className="mx-auto mb-2" size={28} />
                No image selected yet.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!isTeacherOrAdmin ? (
                <button
                  type="button"
                  onClick={handleDetectHandwriting}
                  disabled={running}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
                >
                  {running ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                  Detect handwriting
                </button>
              ) : null}

              {!isTeacherOrAdmin ? (
                <button
                  type="button"
                  onClick={handleScoreAnswer}
                  disabled={!isAutoTextAssignment}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-white font-semibold hover:bg-emerald-700"
                >
                  <CheckCircle2 size={16} />
                  Check answer
                </button>
              ) : null}

              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-gray-700 font-semibold border border-gray-300 hover:bg-gray-50"
              >
                Reset
              </button>

              {!isTeacherOrAdmin ? (
                <button
                  type="button"
                  onClick={handleSaveSubmission}
                  disabled={savingSubmission || deadlinePassed}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-white font-semibold hover:bg-rose-700 disabled:opacity-60"
                >
                  {savingSubmission ? <Loader2 className="animate-spin" size={16} /> : <BadgeCheck size={16} />}
                  Save submission
                </button>
              ) : null}
            </div>

            {!isTeacherOrAdmin && deadlinePassed ? (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                Deadline passed. You can no longer submit this assignment.
              </div>
            ) : null}

            {notice && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                {notice}
              </div>
            )}

            {progress && (
              <div className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                {progress}
              </div>
            )}

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-bold text-gray-900">OCR output</h3>
              <div className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                Detected language: {detectedLanguage}
              </div>
            </div>

            <textarea
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
              rows={7}
              placeholder={isAutoTextAssignment ? 'OCR text will appear here. You can edit it before scoring.' : 'Optional note from OCR/teacher for manual assignments.'}
              className="w-full rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-3 bg-white"
            />

            <p className="text-xs text-gray-500">
              OCR confidence: {confidence}%
            </p>
          </div>

          {isTeacherOrAdmin ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-gray-900">Submission review queue</h3>
              {loadingSubmissions ? <span className="text-xs text-gray-500">Loading...</span> : null}
            </div>

            {submissionStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  Total submissions: <span className="font-semibold">{submissionStats.totalSubmissions}</span>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Missing: <span className="font-semibold">{submissionStats.missingCount}</span>
                </div>
                <div className={`rounded-lg px-3 py-2 text-sm border ${submissionStats.deadlinePassed ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                  Deadline: <span className="font-semibold">{submissionStats.deadlinePassed ? 'Passed' : 'Open'}</span>
                </div>
              </div>
            ) : null}

            {missingStudents.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900 mb-2">Missing students</p>
                <div className="flex flex-wrap gap-2">
                  {missingStudents.slice(0, 20).map((student) => (
                    <span key={student.studentId || student.name} className="text-xs bg-white border border-amber-200 text-amber-900 px-2 py-1 rounded-full">
                      {student.name}{student.rollNo ? ` (${student.rollNo})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {submissions.length === 0 ? (
              <div className="text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 p-3">
                No saved submissions yet for this assignment.
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.slice(0, 8).map((submission) => (
                  <div key={submission._id} className="rounded-xl border border-gray-200 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{submission.studentName}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          submission.reviewStatus === 'reviewed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {submission.reviewStatus}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500">
                      Auto: {submission.autoScore} | Final: {submission.finalScore}
                    </p>

                    {submission.issueStatus === 'open' ? (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                        <p className="font-semibold">Student reported an issue</p>
                        <p className="mt-1">{submission.issueMessage || 'No details provided.'}</p>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={manualScores[submission._id] ?? String(submission.finalScore)}
                        onChange={(e) =>
                          setManualScores((prev) => ({
                            ...prev,
                            [submission._id]: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-gray-300 p-2 text-sm"
                      />
                      <input
                        type="text"
                        value={manualFeedbacks[submission._id] ?? submission.finalFeedback}
                        onChange={(e) =>
                          setManualFeedbacks((prev) => ({
                            ...prev,
                            [submission._id]: e.target.value,
                          }))
                        }
                        placeholder="Teacher feedback"
                        className="rounded-lg border border-gray-300 p-2 text-sm"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleReviewSubmission(submission._id)}
                      className="rounded-lg bg-indigo-700 text-white text-sm px-3 py-1.5 hover:bg-indigo-800"
                    >
                      Save teacher review
                    </button>

                    {submission.issueStatus === 'open' ? (
                      <button
                        type="button"
                        onClick={() => handleResolveIssue(submission._id)}
                        className="rounded-lg bg-emerald-700 text-white text-sm px-3 py-1.5 hover:bg-emerald-800 ml-2"
                      >
                        Mark issue resolved
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          ) : null}

          {!isTeacherOrAdmin ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900">My submission history</h3>
                {loadingSubmissions ? <span className="text-xs text-gray-500">Loading...</span> : null}
              </div>

              {submissions.length === 0 ? (
                <div className="text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 p-3">
                  You have not submitted this assignment yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((submission) => (
                    <div key={submission._id} className="rounded-xl border border-gray-200 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">
                          Submitted {new Date(submission.createdAt).toLocaleString()}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            submission.issueStatus === 'open'
                              ? 'bg-rose-100 text-rose-800'
                              : submission.issueStatus === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          Issue: {submission.issueStatus || 'none'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600">
                        Score: <span className="font-semibold">{submission.finalScore}</span> | Similarity:{' '}
                        <span className="font-semibold">{submission.similarity ?? 0}%</span> | OCR:{' '}
                        <span className="font-semibold">{submission.ocrConfidence ?? 0}%</span>
                      </p>

                      {submission.evaluationBreakdown ? (
                        <p className="text-xs text-gray-600">
                          Metrics: Jaccard {submission.evaluationBreakdown.jaccard ?? 0}% | F1{' '}
                          {submission.evaluationBreakdown.f1 ?? 0}% | Edit{' '}
                          {submission.evaluationBreakdown.editSimilarity ?? 0}% | Weighted{' '}
                          {submission.evaluationBreakdown.weightedSimilarity ?? 0}%
                        </p>
                      ) : null}

                      <p className="text-xs text-gray-700">
                        Feedback: {submission.finalFeedback || submission.autoFeedback || 'No feedback yet.'}
                      </p>

                      {submission.matchedWords?.length ? (
                        <p className="text-xs text-emerald-700">Matched: {submission.matchedWords.join(', ')}</p>
                      ) : null}

                      {submission.missingWords?.length ? (
                        <p className="text-xs text-rose-700">Missing: {submission.missingWords.join(', ')}</p>
                      ) : null}

                      {submission.issueStatus === 'open' ? (
                        <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800">
                          Report sent: {submission.issueMessage || 'No message'}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            value={issueMessages[submission._id] ?? ''}
                            onChange={(e) =>
                              setIssueMessages((prev) => ({
                                ...prev,
                                [submission._id]: e.target.value,
                              }))
                            }
                            placeholder="If score seems wrong, explain what looks incorrect..."
                            className="w-full rounded-lg border border-gray-300 p-2 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleReportIssue(submission._id)}
                            className="rounded-lg bg-rose-600 text-white text-xs px-3 py-1.5 hover:bg-rose-700"
                          >
                            Report evaluation issue
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <BadgeCheck size={18} className="text-amber-600" />
              Score summary
            </h3>

            {result ? (
              <div className="space-y-4">
                <div className="text-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] opacity-80">Score</p>
                  <p className="text-5xl font-black">{result.score}</p>
                  <p className="text-sm opacity-90">out of 100</p>
                </div>

                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                  <p className="text-sm font-semibold text-amber-800">{result.badge}</p>
                  <p className="text-sm text-amber-900 mt-1">{result.feedback}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-gray-500">Meaning match</p>
                    <p className="text-xl font-bold text-gray-900">{result.similarity}%</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-gray-500">OCR confidence</p>
                    <p className="text-xl font-bold text-gray-900">{result.confidence}%</p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Matched words</p>
                  <div className="flex flex-wrap gap-2">
                    {result.matchedWords.length > 0 ? result.matchedWords.map((word) => (
                      <span key={word} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {word}
                      </span>
                    )) : <span className="text-sm text-gray-500">None</span>}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Missing words</p>
                  <div className="flex flex-wrap gap-2">
                    {result.missingWords.length > 0 ? result.missingWords.map((word) => (
                      <span key={word} className="text-xs bg-rose-100 text-rose-800 px-2 py-1 rounded-full">
                        {word}
                      </span>
                    )) : <span className="text-sm text-gray-500">None</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                {isAutoTextAssignment
                  ? <>Upload an answer image and press <span className="font-semibold">Detect handwriting</span> to start checking.</>
                  : <>Manual-review assignment selected. Upload and submit, then teacher reviews.</>}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-amber-100 to-pink-100 rounded-xl border border-amber-200 p-4">
            <p className="text-sm font-semibold text-amber-900 mb-1 flex items-center gap-2">
              <Sparkles size={16} /> Cute note
            </p>
            <p className="text-sm text-amber-900">
              The checker is fair, gentle, and ready for teacher review when handwriting is unclear.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}