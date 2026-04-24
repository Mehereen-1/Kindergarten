'use client';

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
      const worker = await tesseract.createWorker(langs as any, 1, {
        logger: () => {
          // The caller manages progress messaging separately.
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

function getCanvasContext(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }
  return ctx;
}

async function fileToProcessedBlob(file: File, mode: 'contrast' | 'threshold') {
  const bitmap = await createImageBitmap(file);
  try {
    const maxWidth = 2200;
    const scale = Math.min(2.25, Math.max(1, maxWidth / Math.max(1, bitmap.width)));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = getCanvasContext(canvas);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const grayscale = new Uint8Array(width * height);

    let total = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      grayscale[p] = gray;
      total += gray;
    }

    const mean = total / Math.max(1, grayscale.length);
    const threshold = Math.max(72, Math.min(205, mean - 10));

    for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
      const gray = grayscale[p];
      const contrasted = Math.max(0, Math.min(255, Math.round((gray - 128) * 1.35 + 128)));
      const bw = mode === 'threshold' ? (contrasted > threshold ? 255 : 0) : contrasted;
      data[i] = bw;
      data[i + 1] = bw;
      data[i + 2] = bw;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Failed to preprocess document image'));
        }
      }, 'image/png');
    });
  } finally {
    bitmap.close();
  }
}

function candidateScore(candidate: OcrCandidate) {
  return (
    candidate.confidence +
    Math.min(25, normalizeVerificationText(candidate.text).length * 0.45) +
    (candidate.source.startsWith('processed') ? 2 : 0)
  );
}

export async function runDocumentOcr(
  file: File,
  options?: {
    onProgress?: (message: string) => void;
  }
) {
  const worker = await getWorker();

  const sources: Array<{ name: string; image: Blob | File }> = [];
  try {
    const processedContrast = await fileToProcessedBlob(file, 'contrast');
    const processedThreshold = await fileToProcessedBlob(file, 'threshold');
    sources.push({ name: 'processed-contrast', image: processedContrast });
    sources.push({ name: 'processed-threshold', image: processedThreshold });
  } catch {
    // If preprocessing fails, fall back to the original image.
  }

  sources.push({ name: 'raw', image: file });

  const candidates: OcrCandidate[] = [];
  const psmModes = [PSM.AUTO_OSD, PSM.SINGLE_BLOCK];

  for (const source of sources) {
    for (const psm of psmModes) {
      options?.onProgress?.(`OCR scan: ${source.name} / PSM ${psm}`);

      try {
        await worker.setParameters({
          tessedit_pageseg_mode: psm,
          preserve_interword_spaces: '1',
          user_defined_dpi: '300',
        } as any);

        const result = await worker.recognize(source.image as any, {
          rotateAuto: true,
        } as any);

        candidates.push({
          text: String(result?.data?.text || '').trim(),
          confidence: Math.max(0, Math.round(Number(result?.data?.confidence || 0))),
          source: source.name,
          psm: Number(psm),
          lang: 'eng+ben',
        });
      } catch (error) {
        options?.onProgress?.(`OCR scan: ${source.name} / PSM ${psm} failed`);
      }
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
