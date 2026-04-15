import mongoose from 'mongoose';
import { Readable } from 'stream';

import { connectDB } from '@/lib/mongodb';

const STORAGE_ROUTE_PREFIX = '/api/storage';
const BUCKET_NAME = 'app_uploads';

type StoredAssetInput = {
  buffer: Buffer;
  filename: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
};

type StoredAssetRecord = {
  _id: mongoose.Types.ObjectId;
  filename?: string;
  contentType?: string;
  length?: number;
  uploadDate?: Date;
  metadata?: Record<string, unknown>;
};

function getStorageBucket() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB connection is not ready');
  }

  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export function buildStoredAssetUrl(assetId: string) {
  return `${STORAGE_ROUTE_PREFIX}/${assetId}`;
}

export function extractStoredAssetId(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = value.startsWith('http')
      ? new URL(value)
      : new URL(value, 'http://localhost');
    const match = parsed.pathname.match(/\/api\/storage\/([a-fA-F0-9]{24})$/);
    return match?.[1] || null;
  } catch {
    const match = value.match(/\/api\/storage\/([a-fA-F0-9]{24})/);
    return match?.[1] || null;
  }
}

export async function storeBufferAsset({ buffer, filename, mimeType, metadata }: StoredAssetInput) {
  await connectDB();
  const bucket = getStorageBucket();

  const uploadStream = bucket.openUploadStream(filename, {
    contentType: mimeType || 'application/octet-stream',
    metadata: metadata || {},
  });

  await new Promise<void>((resolve, reject) => {
    uploadStream.once('finish', () => resolve());
    uploadStream.once('error', reject);
    uploadStream.end(buffer);
  });

  const assetId = String(uploadStream.id);

  return {
    id: assetId,
    url: buildStoredAssetUrl(assetId),
    filename,
    mimeType: mimeType || 'application/octet-stream',
    size: buffer.length,
  };
}

export async function storeWebFileAsset(
  file: File,
  metadata?: Record<string, unknown>
) {
  const buffer = Buffer.from(await file.arrayBuffer());

  return storeBufferAsset({
    buffer,
    filename: file.name || `upload-${Date.now()}`,
    mimeType: file.type || 'application/octet-stream',
    metadata,
  });
}

export async function getStoredAsset(assetId: string) {
  await connectDB();
  const bucket = getStorageBucket();
  const objectId = new mongoose.Types.ObjectId(assetId);
  const files = await bucket.find({ _id: objectId }).toArray();
  const file = files[0] as StoredAssetRecord | undefined;

  if (!file) {
    return null;
  }

  const downloadStream = bucket.openDownloadStream(objectId);
  const buffer = await streamToBuffer(downloadStream);

  return {
    file,
    buffer,
  };
}

export async function deleteStoredAssetByUrl(url?: string | null) {
  const assetId = extractStoredAssetId(url);

  if (!assetId) {
    return false;
  }

  await connectDB();
  const bucket = getStorageBucket();

  try {
    await bucket.delete(new mongoose.Types.ObjectId(assetId));
    return true;
  } catch {
    return false;
  }
}

export function buildInlineAssetResponse(
  buffer: Buffer,
  file: StoredAssetRecord,
  forceDownload = false
) {
  const inferMimeTypeFromFilename = (name: string) => {
    const lower = String(name || '').toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8';
    if (lower.endsWith('.md')) return 'text/markdown; charset=utf-8';
    if (lower.endsWith('.csv')) return 'text/csv; charset=utf-8';
    if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
    if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html; charset=utf-8';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'application/octet-stream';
  };

  const disposition = forceDownload ? 'attachment' : 'inline';
  const filename = file.filename || 'download.bin';
  const storedContentType = String(file.contentType || 'application/octet-stream');
  const effectiveContentType = storedContentType === 'application/octet-stream'
    ? inferMimeTypeFromFilename(filename)
    : storedContentType;
  const asciiFilename = filename
    .replace(/[\r\n"]/g, '')
    .replace(/[^\x20-\x7E]/g, '_') || 'download.bin';
  const encodedFilename = encodeURIComponent(filename.replace(/[\r\n]/g, '') || 'download.bin');

  return new Response(Readable.toWeb(Readable.from(buffer)) as ReadableStream, {
    headers: {
      'Content-Type': effectiveContentType,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `${disposition}; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
