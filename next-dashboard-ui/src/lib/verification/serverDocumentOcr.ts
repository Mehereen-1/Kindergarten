import { Buffer } from 'node:buffer';
import { PSM } from 'tesseract.js';
import { normalizeVerificationText } from './verificationMatch';

type OcrCandidate = {
  text: string;
  confidence: number;
  source: string;
  psm: number;
  lang: string;
};

let cachedWorkerPromise: Promise<any> | null = null;

async function createTesseractWorker() {
  const tesseract = await import('tesseract.js');

  const attempts: Array<string | string[]> = [
    ['eng', 'ben'],
    'eng',
  ];

  let lastError: unknown = null;

  for (const langs of attempts) {
    try {
      const worker = await tesseract.createWorker(langs as any, 1 as any, {
        logger: () => {
          // Server-side OCR does not stream progress to the client.
        },
      });
      await worker.setParameters({
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      } as any);
      return worker;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to initialize OCR worker');
}

async function getWorker() {
  if (!cachedWorkerPromise) {
    cachedWorkerPromise = createTesseractWorker().catch((error) => {
      cachedWorkerPromise = null;
      throw error;
    });
  }

  return cachedWorkerPromise;
}

function candidateScore(candidate: OcrCandidate) {
  return (
    candidate.confidence +
    Math.min(25, normalizeVerificationText(candidate.text).length * 0.45) +
    (candidate.source.startsWith('processed') ? 2 : 0)
  );
}

export async function runServerDocumentOcr(file: File) {
  const worker = await getWorker();
  const buffer = Buffer.from(await file.arrayBuffer());
  const candidates: OcrCandidate[] = [];
  const psmModes = [PSM.AUTO_OSD, PSM.SINGLE_BLOCK];

  for (const psm of psmModes) {
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: psm,
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      } as any);

      const result = await worker.recognize(buffer as any, {
        rotateAuto: true,
      } as any);

      candidates.push({
        text: String(result?.data?.text || '').trim(),
        confidence: Math.max(0, Math.round(Number(result?.data?.confidence || 0))),
        source: 'server',
        psm: Number(psm),
        lang: 'server',
      });
    } catch {
      // Try the next pageseg mode.
    }
  }

  if (!candidates.length) {
    throw new Error('OCR could not analyze the document');
  }

  const ranked = [...candidates].sort((a, b) => candidateScore(b) - candidateScore(a));
  const best = ranked[0];

  return {
    text: best.text,
    confidence: best.confidence,
    source: best.source,
    psm: best.psm,
    candidates: ranked,
  };
}
