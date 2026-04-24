'use client';

export type VisualMarkerSupportStatus = 'supported' | 'unsupported' | 'error';

export type VisualMarkerSummary = {
  supportStatus: VisualMarkerSupportStatus;
  barcodeCount: number;
  qrCount: number;
  barcodeKinds: string[];
  sealLikeScore: number;
  notes: string[];
};

function getCanvasContext(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }
  return ctx;
}

function computeSealLikeScore(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const step = Math.max(2, Math.round(Math.max(width, height) / 280));

  let redDominantPixels = 0;
  let saturatedPixels = 0;
  let samples = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;

      samples += 1;

      if (r > 140 && r > g * 1.15 && r > b * 1.15 && saturation > 0.25) {
        redDominantPixels += 1;
      }

      if (saturation > 0.35 && max < 245 && min > 20) {
        saturatedPixels += 1;
      }
    }
  }

  if (!samples) {
    return 0;
  }

  const redRatio = redDominantPixels / samples;
  const saturationRatio = saturatedPixels / samples;
  return Math.max(0, Math.min(100, Math.round(redRatio * 620 + saturationRatio * 220)));
}

export async function scanDocumentVisualMarkers(file: File): Promise<VisualMarkerSummary> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxWidth = 1600;
    const scale = Math.min(1.8, Math.max(1, maxWidth / Math.max(1, bitmap.width)));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = getCanvasContext(canvas);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const notes: string[] = [];
    const barcodeKinds = new Set<string>();
    let qrCount = 0;
    let barcodeCount = 0;
    let supportStatus: VisualMarkerSupportStatus = 'unsupported';

    const Detector = (globalThis as any).BarcodeDetector;
    if (typeof Detector === 'function') {
      supportStatus = 'supported';
      try {
        const detector = new Detector({
          formats: [
            'qr_code',
            'code_128',
            'code_39',
            'code_93',
            'ean_13',
            'ean_8',
            'upc_a',
            'upc_e',
            'itf',
            'pdf417',
            'data_matrix',
            'aztec',
          ],
        });

        const detections = await detector.detect(canvas);
        barcodeCount = Array.isArray(detections) ? detections.length : 0;

        for (const detection of detections || []) {
          if (detection?.format) {
            barcodeKinds.add(String(detection.format));
            if (String(detection.format) === 'qr_code') {
              qrCount += 1;
            }
          }
        }

        if (barcodeCount > 0) {
          notes.push(`Detected ${barcodeCount} barcode or QR code marker${barcodeCount === 1 ? '' : 's'}.`);
        } else {
          notes.push('No barcode or QR code was detected.');
        }
      } catch {
        supportStatus = 'error';
        notes.push('Barcode/QR detection failed in this browser.');
      }
    } else {
      notes.push('Barcode/QR detection is not supported in this browser.');
    }

    const sealLikeScore = computeSealLikeScore(ctx, width, height);
    if (sealLikeScore >= 18) {
      notes.push('A seal or stamp-like color mark was detected.');
    } else {
      notes.push('No clear seal or stamp-like color mark was detected.');
    }

    return {
      supportStatus,
      barcodeCount,
      qrCount,
      barcodeKinds: Array.from(barcodeKinds),
      sealLikeScore,
      notes,
    };
  } finally {
    bitmap.close();
  }
}
