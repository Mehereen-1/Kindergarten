export type VerificationDocType = 'parent_nid' | 'birth_certificate';

export type VerificationMatchStatus = 'matched' | 'partial' | 'mismatch';

export type VerificationMatchResult = {
  matchScore: number;
  matchStatus: VerificationMatchStatus;
  reasons: string[];
  extractedDocumentNumbers: string[];
  extractedDates: string[];
  authenticityStatus: VerificationAuthenticityStatus;
  authenticityScore: number;
  authenticityReasons: string[];
  matchedIndicators: string[];
  missingIndicators: string[];
  visualMarkerStatus: VisualMarkerStatus;
  visualMarkerScore: number;
  visualMarkerReasons: string[];
  barcodeCount: number;
  qrCount: number;
  barcodeKinds: string[];
  sealLikeScore: number;
};

export type VerificationEvaluationOptions = {
  requireVisualEvidence?: boolean;
};

export type VerificationAuthenticityStatus = 'official' | 'suspicious' | 'invalid';
export type VisualMarkerStatus = 'present' | 'missing' | 'unsupported';

export type VisualMarkerSummary = {
  supportStatus: 'supported' | 'unsupported' | 'error';
  barcodeCount: number;
  qrCount: number;
  barcodeKinds: string[];
  sealLikeScore: number;
  notes?: string[];
};

type IndicatorGroup = string[];

type VerificationAuthenticityResult = {
  authenticityStatus: VerificationAuthenticityStatus;
  authenticityScore: number;
  authenticityReasons: string[];
  matchedIndicators: string[];
  missingIndicators: string[];
  visualMarkerStatus: VisualMarkerStatus;
  visualMarkerScore: number;
  visualMarkerReasons: string[];
  barcodeCount: number;
  qrCount: number;
  barcodeKinds: string[];
  sealLikeScore: number;
};

const NID_AUTHENTICITY_GROUPS: IndicatorGroup[] = [
  ['national identity card', 'nid', 'জাতীয় পরিচয়পত্র', 'জাতীয় পরিচয়পত্র'],
  ['bangladesh election commission', 'election commission', 'নির্বাচন কমিশন', 'বাংলাদেশ নির্বাচন কমিশন'],
  ['nid no', 'nid number', 'id no', 'smart card', 'card no', 'voter id', 'id number', 'পরিচয়পত্র নম্বর'],
  ['name', 'father', 'mother', 'date of birth', 'dob', 'address', 'ঠিকানা', 'জন্ম তারিখ'],
];

const BIRTH_CERTIFICATE_AUTHENTICITY_GROUPS: IndicatorGroup[] = [
  ['birth registration certificate', 'birth certificate', 'জন্ম নিবন্ধন সনদ', 'জন্ম নিবন্ধন'],
  ['birth and death registration', 'office of the registrar', 'local government division', 'জন্ম ও মৃত্যু নিবন্ধন', 'নিবন্ধন অধিদপ্তর'],
  ['birth registration number', 'registration number', 'brn', 'জন্ম নিবন্ধন নম্বর', '১৭ সংখ্যার জন্ম নিবন্ধন নম্বর'],
  ['date of birth', 'dob', 'জন্ম তারিখ'],
];

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeVerificationText(value?: string | null) {
  return stripAccents(String(value || '').toLowerCase())
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeVerificationText(value?: string | null) {
  return normalizeVerificationText(value)
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function levenshteinDistance(a: string, b: string) {
  const left = Array.from(a);
  const right = Array.from(b);

  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  const prev = new Array(right.length + 1);
  const curr = new Array(right.length + 1);

  for (let j = 0; j <= right.length; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= left.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }

    for (let j = 0; j <= right.length; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[right.length];
}

function tokenMatches(expected: string, actual: string) {
  if (!expected || !actual) return false;
  if (expected === actual) return true;
  if (expected.includes(actual) || actual.includes(expected)) return true;

  const length = Math.max(expected.length, actual.length);
  if (length <= 4) {
    return false;
  }

  const distance = levenshteinDistance(expected, actual);
  const maxAllowed = Math.max(1, Math.floor(length * 0.25));
  return distance <= maxAllowed;
}

function containsNormalizedPhrase(text: string, phrase: string) {
  const normalizedPhrase = normalizeVerificationText(phrase);
  if (!normalizedPhrase) return false;
  return text.includes(normalizedPhrase);
}

function evaluateVisualMarkerEvidence(
  docType: VerificationDocType,
  visualEvidence?: VisualMarkerSummary | null
): Pick<
  VerificationAuthenticityResult,
  | 'visualMarkerStatus'
  | 'visualMarkerScore'
  | 'visualMarkerReasons'
  | 'barcodeCount'
  | 'qrCount'
  | 'barcodeKinds'
  | 'sealLikeScore'
> {
  const supportStatus = visualEvidence?.supportStatus || 'unsupported';
  const barcodeCount = Math.max(0, Math.round(Number(visualEvidence?.barcodeCount || 0)));
  const qrCount = Math.max(0, Math.round(Number(visualEvidence?.qrCount || 0)));
  const sealLikeScore = Math.max(0, Math.min(100, Math.round(Number(visualEvidence?.sealLikeScore || 0))));
  const barcodeKinds = Array.isArray(visualEvidence?.barcodeKinds)
    ? Array.from(new Set(visualEvidence.barcodeKinds.map((item) => String(item).trim()).filter(Boolean)))
    : [];
  const hasCode = barcodeCount > 0 || qrCount > 0;
  const hasSeal = sealLikeScore >= 18;
  const visualEvidencePresent = hasCode || hasSeal;

  const visualMarkerReasons: string[] = [];
  if (supportStatus === 'unsupported') {
    visualMarkerReasons.push('Visual barcode/QR detection is not supported in this browser.');
  } else if (supportStatus === 'error') {
    visualMarkerReasons.push('Visual barcode/QR detection failed during analysis.');
  }

  if (!visualEvidencePresent) {
    if (docType === 'parent_nid') {
      visualMarkerReasons.push('No QR code, barcode, or seal-like mark was detected on the NID image.');
    } else {
      visualMarkerReasons.push('No QR code, barcode, or seal-like mark was detected on the birth certificate image.');
    }
  }

  const visualMarkerScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (hasCode ? Math.min(45, barcodeCount * 20 + qrCount * 12) : 0) +
          (hasSeal ? Math.min(30, Math.round(sealLikeScore * 0.5)) : 0) +
          (supportStatus === 'supported' ? 10 : 0)
      )
    )
  );

  let visualMarkerStatus: VisualMarkerStatus = 'missing';
  if (supportStatus === 'unsupported') {
    visualMarkerStatus = 'unsupported';
  } else if (visualEvidencePresent) {
    visualMarkerStatus = 'present';
  }

  return {
    visualMarkerStatus,
    visualMarkerScore,
    visualMarkerReasons,
    barcodeCount,
    qrCount,
    barcodeKinds,
    sealLikeScore,
  };
}

function evaluateAuthenticityIndicators(
  docType: VerificationDocType,
  text: string,
  visualEvidence?: VisualMarkerSummary | null,
  options?: VerificationEvaluationOptions
): VerificationAuthenticityResult {
  const requireVisualEvidence = options?.requireVisualEvidence ?? true;
  const groups = docType === 'parent_nid' ? NID_AUTHENTICITY_GROUPS : BIRTH_CERTIFICATE_AUTHENTICITY_GROUPS;
  const normalizedText = normalizeVerificationText(text);
  const visual = evaluateVisualMarkerEvidence(docType, visualEvidence);
  const matchedIndicators: string[] = [];
  const missingIndicators: string[] = [];
  const authenticityReasons: string[] = [];
  const groupMatches: boolean[] = [];

  let matchedGroupCount = 0;
  for (const group of groups) {
    const matchedIndicator = group.find((indicator) => containsNormalizedPhrase(normalizedText, indicator));
    if (matchedIndicator) {
      matchedGroupCount += 1;
      groupMatches.push(true);
      matchedIndicators.push(matchedIndicator);
    } else {
      groupMatches.push(false);
      missingIndicators.push(group[0]);
    }
  }

  const numericCandidates = extractNumericCandidates(text, 8, 20);
  const dateCandidates = extractDateCandidates(text);
  const hasLongNumber = numericCandidates.some((candidate) => candidate.length >= 10);
  const hasBirthRegistrationNumber = numericCandidates.some((candidate) => candidate.length === 17);
  const hasDate = dateCandidates.length > 0;
  const hasOfficialBranding = Boolean(groupMatches[0] || groupMatches[1]);
  const hasIdentityField = docType === 'parent_nid'
    ? groupMatches[2] ||
      containsNormalizedPhrase(normalizedText, 'nid no') ||
      containsNormalizedPhrase(normalizedText, 'nid number') ||
      containsNormalizedPhrase(normalizedText, 'id no') ||
      containsNormalizedPhrase(normalizedText, 'smart card') ||
      containsNormalizedPhrase(normalizedText, 'card no')
    : groupMatches[2] ||
      containsNormalizedPhrase(normalizedText, 'birth registration number') ||
      containsNormalizedPhrase(normalizedText, 'registration number') ||
      containsNormalizedPhrase(normalizedText, 'brn');
  const visualEvidencePresent = visual.visualMarkerStatus === 'present';
  const hasAnyOfficialEvidence = hasOfficialBranding || visualEvidencePresent;
  const visualEvidenceSatisfied = visualEvidencePresent || !requireVisualEvidence;

  let authenticityStatus: VerificationAuthenticityStatus = 'invalid';
  let authenticityScore = 0;

  if (docType === 'parent_nid') {
    authenticityScore =
      (hasOfficialBranding ? 35 : 0) +
      (hasIdentityField ? 25 : 0) +
      (hasLongNumber ? 20 : 0) +
      (hasDate ? 10 : 0) +
      Math.min(10, matchedGroupCount * 3) +
      (visualEvidencePresent ? Math.min(20, visual.visualMarkerScore) : 0);

    if (!hasOfficialBranding) {
      authenticityReasons.push('The image does not look like an official NID because the card title or issuer is missing.');
    }
    if (!hasIdentityField) {
      authenticityReasons.push('No NID number or card identifier was detected.');
    }
    if (!hasLongNumber) {
      authenticityReasons.push('No NID-like identification number was detected.');
    }
    if (visual.visualMarkerReasons.length && requireVisualEvidence) {
      authenticityReasons.push(...visual.visualMarkerReasons);
    }

    if (!hasAnyOfficialEvidence && requireVisualEvidence) {
      authenticityStatus = 'invalid';
    } else if (hasOfficialBranding && hasIdentityField && hasLongNumber && matchedGroupCount >= 2 && visualEvidenceSatisfied) {
      authenticityStatus = 'official';
    } else {
      authenticityStatus = 'suspicious';
    }
  } else {
    authenticityScore =
      (hasOfficialBranding ? 30 : 0) +
      (hasBirthRegistrationNumber ? 35 : 0) +
      (hasDate ? 20 : 0) +
      (hasIdentityField ? 10 : 0) +
      Math.min(5, matchedGroupCount * 2) +
      (visualEvidencePresent ? Math.min(20, visual.visualMarkerScore) : 0);

    if (!hasOfficialBranding) {
      authenticityReasons.push('The image does not look like an official birth certificate because the title or issuer is missing.');
    }
    if (!hasBirthRegistrationNumber) {
      authenticityReasons.push('A 17-digit birth registration number was not detected.');
    }
    if (!hasDate) {
      authenticityReasons.push('A date of birth was not detected in the birth certificate text.');
    }
    if (visual.visualMarkerReasons.length && requireVisualEvidence) {
      authenticityReasons.push(...visual.visualMarkerReasons);
    }

    if (!hasAnyOfficialEvidence && requireVisualEvidence) {
      authenticityStatus = 'invalid';
    } else if (hasOfficialBranding && hasBirthRegistrationNumber && hasDate && matchedGroupCount >= 2 && visualEvidenceSatisfied) {
      authenticityStatus = 'official';
    } else {
      authenticityStatus = 'suspicious';
    }
  }

  return {
    authenticityStatus,
    authenticityScore: Math.max(0, Math.min(100, Math.round(authenticityScore))),
    authenticityReasons,
    matchedIndicators,
    missingIndicators,
    visualMarkerStatus: visual.visualMarkerStatus,
    visualMarkerScore: visual.visualMarkerScore,
    visualMarkerReasons: visual.visualMarkerReasons,
    barcodeCount: visual.barcodeCount,
    qrCount: visual.qrCount,
    barcodeKinds: visual.barcodeKinds,
    sealLikeScore: visual.sealLikeScore,
  };
}

export function scoreTextMatch(expected?: string | null, actual?: string | null) {
  const expectedTokens = tokenizeVerificationText(expected);
  const actualTokens = tokenizeVerificationText(actual);

  if (!expectedTokens.length || !actualTokens.length) {
    return 0;
  }

  let matched = 0;
  for (const token of expectedTokens) {
    if (actualTokens.some((candidate) => tokenMatches(token, candidate))) {
      matched += 1;
    }
  }

  return matched / expectedTokens.length;
}

function toIsoDateString(value?: string | Date | null) {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const direct = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (direct) {
    return `${direct[1]}-${direct[2]}-${direct[3]}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isoToDigits(value: string) {
  return value.replace(/-/g, '');
}

function normalizeCapturedDate(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 8) {
    return digits;
  }
  return null;
}

export function extractNumericCandidates(text?: string | null, minLength = 8, maxLength = 20) {
  const normalized = String(text || '');
  const matches = new Set<string>();

  for (const match of normalized.match(/\d[\d\s-]{6,}\d/g) || []) {
    const digits = match.replace(/\D/g, '');
    if (digits.length >= minLength && digits.length <= maxLength) {
      matches.add(digits);
    }
  }

  for (const match of normalized.match(/\b\d{8,20}\b/g) || []) {
    const digits = match.replace(/\D/g, '');
    if (digits.length >= minLength && digits.length <= maxLength) {
      matches.add(digits);
    }
  }

  return Array.from(matches);
}

export function extractDateCandidates(text?: string | null) {
  const raw = String(text || '');
  const found = new Set<string>();

  const addCandidate = (year: number, month: number, day: number) => {
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return;
    }
    if (year < 1900 || year > 2100) return;
    if (month < 1 || month > 12) return;
    if (day < 1 || day > 31) return;
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    found.add(iso);
  };

  for (const match of raw.matchAll(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/g)) {
    addCandidate(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  for (const match of raw.matchAll(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/g)) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) {
      year += year >= 50 ? 1900 : 2000;
    }

    // Prefer day-month-year because most documents in the app use that format.
    addCandidate(year, second, first);
  }

  return Array.from(found);
}

function formatExpectedDateVariants(value?: string | Date | null) {
  const iso = toIsoDateString(value);
  if (!iso) return [];

  const [year, month, day] = iso.split('-');
  return [
    iso,
    `${day}/${month}/${year}`,
    `${day}-${month}-${year}`,
    `${year}/${month}/${day}`,
    `${day}.${month}.${year}`,
    `${isoToDigits(iso)}`,
  ];
}

function scoreDateMatch(expected?: string | Date | null, text?: string | null) {
  const expectedIso = toIsoDateString(expected);
  if (!expectedIso) {
    return { matched: false, score: 0, matchedDate: null as string | null, candidates: [] as string[] };
  }

  const actualText = String(text || '');
  const digitsOnly = actualText.replace(/\D/g, '');
  const expectedDigits = isoToDigits(expectedIso);

  const candidates = extractDateCandidates(actualText);
  for (const variant of formatExpectedDateVariants(expectedIso)) {
    if (!variant) continue;
    if (variant === expectedDigits && digitsOnly.includes(expectedDigits)) {
      return { matched: true, score: 1, matchedDate: expectedIso, candidates };
    }
    if (variant !== expectedDigits && normalizeCapturedDate(variant) && digitsOnly.includes(variant.replace(/\D/g, ''))) {
      return { matched: true, score: 1, matchedDate: expectedIso, candidates };
    }
  }

  if (candidates.includes(expectedIso)) {
    return { matched: true, score: 1, matchedDate: expectedIso, candidates };
  }

  return { matched: false, score: 0, matchedDate: null, candidates };
}

function scoreDocumentNumberMatch(expected?: string | null, text?: string | null) {
  const expectedDigits = String(expected || '').replace(/\D/g, '');
  if (!expectedDigits) {
    return { matched: false, score: 0, candidate: null as string | null };
  }

  const candidates = extractNumericCandidates(text, Math.min(8, expectedDigits.length), Math.max(20, expectedDigits.length));
  for (const candidate of candidates) {
    const candidateDigits = candidate.replace(/\D/g, '');
    if (candidateDigits === expectedDigits || candidateDigits.includes(expectedDigits) || expectedDigits.includes(candidateDigits)) {
      return { matched: true, score: 1, candidate: candidateDigits };
    }
  }

  return { matched: false, score: 0, candidate: candidates[0] || null };
}

export function evaluateVerificationDocument(params: {
  docType: VerificationDocType;
  ocrText: string;
  ocrConfidence: number;
  expectedParentName?: string;
  expectedChildName?: string;
  expectedChildDateOfBirth?: string | Date;
  expectedDocumentNumber?: string;
  visualEvidence?: VisualMarkerSummary | null;
  requireVisualEvidence?: boolean;
}): VerificationMatchResult {
  const text = params.ocrText || '';
  const reasons: string[] = [];
  const extractedDocumentNumbers = extractNumericCandidates(text);
  const extractedDates = extractDateCandidates(text);
  const authenticity = evaluateAuthenticityIndicators(
    params.docType,
    text,
    params.visualEvidence || null,
    {
      requireVisualEvidence: params.requireVisualEvidence,
    }
  );

  if (params.ocrConfidence < 35) {
    reasons.push('OCR confidence is low.');
  }

  reasons.push(...authenticity.authenticityReasons);

  let matchScore = 0;

  if (params.docType === 'parent_nid') {
    const nameScore = scoreTextMatch(params.expectedParentName, text);
    const numberMatch = scoreDocumentNumberMatch(params.expectedDocumentNumber, text);
    matchScore = params.expectedDocumentNumber
      ? (nameScore * 0.65 + numberMatch.score * 0.35)
      : nameScore;

    if (params.expectedParentName && nameScore < 0.55) {
      reasons.push('Parent name does not closely match the NID text.');
    }
    if (params.expectedDocumentNumber && !numberMatch.matched) {
      reasons.push('NID number did not match the extracted OCR text.');
    }
  } else {
    const nameScore = scoreTextMatch(params.expectedChildName, text);
    const dateMatch = scoreDateMatch(params.expectedChildDateOfBirth, text);
    const numberMatch = scoreDocumentNumberMatch(params.expectedDocumentNumber, text);

    matchScore = params.expectedDocumentNumber
      ? (nameScore * 0.45 + dateMatch.score * 0.35 + numberMatch.score * 0.20)
      : (nameScore * 0.55 + dateMatch.score * 0.45);

    if (params.expectedChildName && nameScore < 0.55) {
      reasons.push('Child name does not closely match the birth certificate text.');
    }
    if (params.expectedChildDateOfBirth && !dateMatch.matched) {
      reasons.push('Date of birth did not match the birth certificate OCR text.');
    }
    if (params.expectedDocumentNumber && !numberMatch.matched) {
      reasons.push('Birth certificate number did not match the OCR text.');
    }
  }

  const scaledScore = Math.max(0, Math.min(100, Math.round(matchScore * 100)));

  let matchStatus: VerificationMatchStatus = 'mismatch';
  if (authenticity.authenticityStatus === 'invalid') {
    matchStatus = 'mismatch';
  } else if (
    authenticity.authenticityStatus === 'official' &&
    scaledScore >= 72 &&
    params.ocrConfidence >= 55 &&
    reasons.length === authenticity.authenticityReasons.length
  ) {
    matchStatus = 'matched';
  } else if (authenticity.authenticityStatus === 'suspicious' || scaledScore >= 45 || params.ocrConfidence >= 45) {
    matchStatus = 'partial';
  }

  return {
    matchScore: scaledScore,
    matchStatus,
    reasons,
    extractedDocumentNumbers,
    extractedDates,
    authenticityStatus: authenticity.authenticityStatus,
    authenticityScore: authenticity.authenticityScore,
    authenticityReasons: authenticity.authenticityReasons,
    matchedIndicators: authenticity.matchedIndicators,
    missingIndicators: authenticity.missingIndicators,
    visualMarkerStatus: authenticity.visualMarkerStatus,
    visualMarkerScore: authenticity.visualMarkerScore,
    visualMarkerReasons: authenticity.visualMarkerReasons,
    barcodeCount: authenticity.barcodeCount,
    qrCount: authenticity.qrCount,
    barcodeKinds: authenticity.barcodeKinds,
    sealLikeScore: authenticity.sealLikeScore,
  };
}
