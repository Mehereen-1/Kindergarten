import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

// ─── model discovery ─────────────────────────────────────────────────────────

function findModelPath(): string | null {
  const dir = path.join(process.cwd(), 'src', 'app', 'api', 'security-alerts');
  try {
    const files = fs.readdirSync(dir);
    const onnxFiles = files.filter((f) => f.endsWith('.onnx') && !f.endsWith('.onnx.data'));
    if (onnxFiles.length === 0) return null;
    let best: string | null = null;
    let bestSize = 0;
    for (const f of onnxFiles) {
      try {
        const stat = fs.statSync(path.join(dir, f));
        if (stat.size > bestSize) {
          bestSize = stat.size;
          best = path.join(dir, f);
        }
      } catch {
        /* skip */
      }
    }
    return best;
  } catch {
    return null;
  }
}

// ─── ort module + session (loaded lazily once) ───────────────────────────────

type OrtModule = typeof import('onnxruntime-node');
let ortModule: OrtModule | null = null;
let cachedSession: import('onnxruntime-node').InferenceSession | null = null;

async function getOrt(): Promise<OrtModule> {
  if (!ortModule) {
    ortModule = (await new Function('m', 'return import(m)')('onnxruntime-node')) as OrtModule;
  }
  return ortModule;
}

async function getSession() {
  if (cachedSession) return { session: cachedSession, ort: await getOrt() };
  const ort = await getOrt();
  const modelPath = findModelPath();
  if (!modelPath) {
    throw new Error(
      'No ONNX model found in src/app/api/security-alerts/. ' +
        'Upload classroom_anomaly_multitask_augmented.onnx (+ .onnx.data) there.'
    );
  }
  cachedSession = await ort.InferenceSession.create(modelPath, {
    executionProviders: ['cpu'],
  });
  return { session: cachedSession, ort };
}

function getExpectedInputDims(
  session: import('onnxruntime-node').InferenceSession,
  inputName: string
): Array<number | string | null> {
  const meta = (session as unknown as {
    inputMetadata?:
      | Array<{ name?: string; shape?: Array<number | string | null>; dimensions?: Array<number | string | null> }>
      | Record<string, { shape?: Array<number | string | null>; dimensions?: Array<number | string | null> }>;
  }).inputMetadata;

  if (!meta) return [];

  if (Array.isArray(meta)) {
    const found = meta.find((item) => item?.name === inputName) ?? meta[0];
    if (Array.isArray(found?.shape) && found.shape.length > 0) return found.shape;
    if (Array.isArray(found?.dimensions) && found.dimensions.length > 0) return found.dimensions;
    return [];
  }

  const recordValue = meta[inputName] ?? Object.values(meta)[0];
  if (Array.isArray(recordValue?.shape) && recordValue.shape.length > 0) return recordValue.shape;
  if (Array.isArray(recordValue?.dimensions) && recordValue.dimensions.length > 0) return recordValue.dimensions;
  return [];
}

// ─── preprocessing ───────────────────────────────────────────────────────────

type InputBuildDebug = {
  layout: string;
  resolvedDims: number[];
  expectedDims: Array<number | string | null>;
};

function resolveDim(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return fallback;
}

function toResizedCHW(
  rgba: Uint8Array,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): Float32Array {
  const pixels = dstWidth * dstHeight;
  const chw = new Float32Array(3 * pixels);

  for (let y = 0; y < dstHeight; y++) {
    const srcY = Math.min(srcHeight - 1, Math.floor((y * srcHeight) / dstHeight));
    for (let x = 0; x < dstWidth; x++) {
      const srcX = Math.min(srcWidth - 1, Math.floor((x * srcWidth) / dstWidth));
      const srcIdx = (srcY * srcWidth + srcX) * 4;
      const dstIdx = y * dstWidth + x;

      chw[dstIdx] = rgba[srcIdx] / 255; // R
      chw[pixels + dstIdx] = rgba[srcIdx + 1] / 255; // G
      chw[2 * pixels + dstIdx] = rgba[srcIdx + 2] / 255; // B
    }
  }

  return chw;
}

function chwToHwc(chw: Float32Array, width: number, height: number): Float32Array {
  const pixels = width * height;
  const hwc = new Float32Array(pixels * 3);
  for (let i = 0; i < pixels; i++) {
    hwc[i * 3] = chw[i];
    hwc[i * 3 + 1] = chw[pixels + i];
    hwc[i * 3 + 2] = chw[2 * pixels + i];
  }
  return hwc;
}

function makeInputTensorForModel(
  ort: OrtModule,
  rgba: Uint8Array,
  srcWidth: number,
  srcHeight: number,
  inputName: string,
  expectedDimsRaw: Array<number | string | null>
): { tensor: import('onnxruntime-node').Tensor; debug: InputBuildDebug } {
  const rank = expectedDimsRaw.length || 4;

  if (rank === 5) {
    // Expected rank-5 video tensor, e.g. [N,T,C,H,W] or [N,C,T,H,W].
    const batch = resolveDim(expectedDimsRaw[0], 1);

    let channelAxis = expectedDimsRaw.findIndex((d, idx) => idx > 0 && d === 3);
    if (channelAxis === -1) {
      channelAxis = inputName.toLowerCase().includes('video') ? 2 : 1;
    }

    const candidateAxes = [1, 2, 3, 4].filter((axis) => axis !== channelAxis);
    const trailing = candidateAxes.slice(-2);
    const heightAxis = trailing[0];
    const widthAxis = trailing[1];
    const timeAxis = candidateAxes.find((axis) => axis !== heightAxis && axis !== widthAxis) ?? 1;

    const time = resolveDim(expectedDimsRaw[timeAxis], 8);
    const channels = resolveDim(expectedDimsRaw[channelAxis], 3);
    const height = resolveDim(expectedDimsRaw[heightAxis], srcHeight);
    const width = resolveDim(expectedDimsRaw[widthAxis], srcWidth);

    const frameCHW = toResizedCHW(rgba, srcWidth, srcHeight, width, height);
    const resolvedDims = [batch, 1, 1, 1, 1];
    resolvedDims[timeAxis] = time;
    resolvedDims[channelAxis] = channels;
    resolvedDims[heightAxis] = height;
    resolvedDims[widthAxis] = width;

    const totalSize = resolvedDims.reduce((acc, v) => acc * v, 1);
    const out = new Float32Array(totalSize);

    const stride = new Array(5).fill(1);
    for (let i = 3; i >= 0; i--) {
      stride[i] = stride[i + 1] * resolvedDims[i + 1];
    }

    const hw = height * width;
    const batchCount = resolvedDims[0];

    const axisValue = (axis: number, t: number, c: number, y: number, x: number) => {
      if (axis === timeAxis) return t;
      if (axis === channelAxis) return c;
      if (axis === heightAxis) return y;
      return x;
    };

    for (let n = 0; n < batchCount; n++) {
      for (let t = 0; t < time; t++) {
        for (let c = 0; c < Math.min(channels, 3); c++) {
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const srcIdx = c * hw + y * width + x;
              const idx =
                n * stride[0] +
                axisValue(timeAxis, t, c, y, x) * stride[timeAxis] +
                axisValue(channelAxis, t, c, y, x) * stride[channelAxis] +
                axisValue(heightAxis, t, c, y, x) * stride[heightAxis] +
                axisValue(widthAxis, t, c, y, x) * stride[widthAxis];
              out[idx] = frameCHW[srcIdx];
            }
          }
        }
      }
    }

    return {
      tensor: new ort.Tensor('float32', out, resolvedDims),
      debug: {
        layout: `rank5(timeAxis=${timeAxis},channelAxis=${channelAxis},heightAxis=${heightAxis},widthAxis=${widthAxis})`,
        resolvedDims,
        expectedDims: expectedDimsRaw,
      },
    };
  }

  // Rank-4 input, commonly [N,C,H,W] or [N,H,W,C]
  const batch = resolveDim(expectedDimsRaw[0], 1);
  const isNCHW = expectedDimsRaw[1] === 3 || expectedDimsRaw[3] !== 3;

  const height = resolveDim(isNCHW ? expectedDimsRaw[2] : expectedDimsRaw[1], srcHeight);
  const width = resolveDim(isNCHW ? expectedDimsRaw[3] : expectedDimsRaw[2], srcWidth);
  const channels = resolveDim(isNCHW ? expectedDimsRaw[1] : expectedDimsRaw[3], 3);

  const frameCHW = toResizedCHW(rgba, srcWidth, srcHeight, width, height);
  if (isNCHW) {
    const dims = [batch, channels, height, width];
    const out = new Float32Array(batch * channels * height * width);
    const hw = height * width;
    for (let n = 0; n < batch; n++) {
      for (let c = 0; c < channels; c++) {
        const srcChannel = Math.min(c, 2);
        const srcOffset = srcChannel * hw;
        const dstOffset = (n * channels + c) * hw;
        out.set(frameCHW.subarray(srcOffset, srcOffset + hw), dstOffset);
      }
    }
    return {
      tensor: new ort.Tensor('float32', out, dims),
      debug: {
        layout: 'NCHW',
        resolvedDims: dims,
        expectedDims: expectedDimsRaw,
      },
    };
  }

  const frameHWC = chwToHwc(frameCHW, width, height);
  const dims = [batch, height, width, channels];
  const out = new Float32Array(batch * height * width * channels);
  const pixels = height * width;
  for (let n = 0; n < batch; n++) {
    for (let i = 0; i < pixels; i++) {
      for (let c = 0; c < channels; c++) {
        const srcChannel = Math.min(c, 2);
        out[(n * pixels + i) * channels + c] = frameHWC[i * 3 + srcChannel];
      }
    }
  }
  return {
    tensor: new ort.Tensor('float32', out, dims),
    debug: {
      layout: 'NHWC',
      resolvedDims: dims,
      expectedDims: expectedDimsRaw,
    },
  };
}

// ─── detection parsing ───────────────────────────────────────────────────────

function argMaxSlice(data: Float32Array, start: number, end: number) {
  let best = start;
  for (let i = start + 1; i < end; i++) if (data[i] > data[best]) best = i;
  return { idx: best - start, val: data[best] };
}

type DetectionResult = { classId: number; score: number };

function normalizeScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  if (score >= 0 && score <= 1) return score;
  // Many models emit logits instead of probabilities.
  // Convert logits to probability-like values for UI + threshold use.
  const sigmoid = 1 / (1 + Math.exp(-score));
  if (!Number.isFinite(sigmoid)) return score > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, sigmoid));
}

function parseDetections(data: Float32Array, shape: readonly number[]): DetectionResult[] {
  const results: DetectionResult[] = [];

  if (shape.length === 3 && shape[0] === 1) {
    const dim1 = shape[1];
    const dim2 = shape[2];

    if (dim2 >= 6) {
      // [1, N, attrs] – standard YOLO-ish export
      for (let i = 0; i < dim1; i++) {
        const off = i * dim2;
        if (dim2 === 6) {
          const score = normalizeScore(data[off + 4]);
          const classId = Math.round(data[off + 5]);
          if (score > 0.05) results.push({ classId, score });
        } else {
          const objScore = data[off + 4];
          const best = argMaxSlice(data, off + 5, off + dim2);
          const score = normalizeScore(objScore * best.val);
          if (score > 0.05) results.push({ classId: best.idx, score });
        }
      }
      return results;
    }

    if (dim1 >= 6) {
      // [1, attrs, N] – transposed YOLO export
      for (let j = 0; j < dim2; j++) {
        const objScore = data[4 * dim2 + j];
        let bestCls = 0;
        let bestScore = 0;
        for (let c = 5; c < dim1; c++) {
          const v = data[c * dim2 + j];
          if (v > bestScore) { bestScore = v; bestCls = c - 5; }
        }
        const score = normalizeScore(objScore * bestScore);
        if (score > 0.05) results.push({ classId: bestCls, score });
      }
      return results;
    }
  }

  // 2-D classification [1, C] or [C]
  if (shape.length <= 2) {
    const cls = argMaxSlice(data, 0, data.length);
    if (cls.val > 0) results.push({ classId: cls.idx, score: normalizeScore(cls.val) });
    return results;
  }

  // Generic flat fallback – treat max element as confidence, index as class
  const cls = argMaxSlice(data, 0, data.length);
  if (cls.val > 0) results.push({ classId: cls.idx, score: normalizeScore(cls.val) });
  return results;
}

// ─── mobile class check ──────────────────────────────────────────────────────

const MOBILE_KEYWORDS = ['mobile', 'phone', 'cell', 'smartphone', 'handphone'];
const DEFAULT_MOBILE_CLASS_IDS = [67]; // COCO default only

function parseMobileClassIds(raw: string | undefined): Set<number> {
  if (!raw || !raw.trim()) return new Set(DEFAULT_MOBILE_CLASS_IDS);
  const ids = raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value));
  return new Set(ids);
}

function isMobileClass(classId: number, labels: string[], mobileClassIds: Set<number>): boolean {
  if (mobileClassIds.has(classId)) return true;
  const label = (labels[classId] || '').toLowerCase();
  return MOBILE_KEYWORDS.some((kw) => label.includes(kw));
}

// ─── route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pixels, width, height } = body as {
      pixels?: string;
      width?: number;
      height?: number;
      mobileClassIds?: string;
    };
    const mobileClassIds = parseMobileClassIds(
      String(body?.mobileClassIds || process.env.ANOMALY_MOBILE_CLASS_IDS || '')
    );

    if (!pixels || !width || !height) {
      return NextResponse.json(
        { error: 'Request must include pixels (base64 RGBA), width, and height' },
        { status: 400 }
      );
    }

    // Decode base64 RGBA buffer sent from the browser canvas
    const buf = Buffer.from(pixels, 'base64');
    const rgba = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

    const { session, ort } = await getSession();
    const inputName = session.inputNames[0];
    const expectedDimsRaw = getExpectedInputDims(session, inputName);
    const fallbackDims = expectedDimsRaw.length > 0 ? expectedDimsRaw : [1, 3, 640, 640];
    const { tensor: inputTensor, debug: inputDebug } = makeInputTensorForModel(
      ort,
      rgba,
      width,
      height,
      inputName,
      fallbackDims
    );

    const feeds: Record<string, import('onnxruntime-node').Tensor> = {
      [inputName]: inputTensor,
    };
    const output = await session.run(feeds);

    // Collect all detections across all output tensors
    let allDetections: DetectionResult[] = [];
    for (const name of session.outputNames) {
      const tensor = output[name];
      if (!tensor) continue;
      const data = tensor.data as Float32Array;
      const shape = tensor.dims;
      const dets = parseDetections(data, shape);
      allDetections = allDetections.concat(dets);
    }

    // Find highest confidence mobile detection
    const labels: string[] = []; // No label file in scope; rely on class ID heuristics
    let maxMobileConf = 0;
    let detectedLabel = '';

    for (const det of allDetections) {
      if (isMobileClass(det.classId, labels, mobileClassIds) && det.score > maxMobileConf) {
        maxMobileConf = det.score;
        detectedLabel = labels[det.classId] || 'mobile_phone';
      }
    }

    // Also check overall max confidence (useful for binary/single-class models)
    const overallMax = allDetections.reduce((acc, d) => Math.max(acc, d.score), 0);

    const normalizedConfidence = normalizeScore(maxMobileConf);
    const normalizedOverallMax = normalizeScore(overallMax);

    return NextResponse.json({
      detected: maxMobileConf > 0,
      label: detectedLabel || 'mobile_phone',
      confidence: normalizedConfidence,
      overallMax: normalizedOverallMax,
      confidenceRaw: maxMobileConf,
      overallMaxRaw: overallMax,
      totalDetections: allDetections.length,
      modelInputName: inputName,
      modelInputExpectedDims: fallbackDims,
      modelInputUsedDims: inputDebug.resolvedDims,
      modelInputLayout: inputDebug.layout,
      mobileClassIds: Array.from(mobileClassIds),
      // Top 5 detections for debug display in UI
      topDetections: allDetections
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((d) => ({ classId: d.classId, score: Number(d.score.toFixed(4)) })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[run-inference] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
