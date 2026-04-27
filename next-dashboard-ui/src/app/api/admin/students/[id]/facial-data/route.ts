import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import path from 'path';
import { readdir } from 'fs/promises';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import FacialDatabase from '@/lib/models/FacialDatabase';
import { getServerCctvBackendUrl } from '@/lib/serverConfig';

const PYTHON_BACKEND = getServerCctvBackendUrl();
const PUBLIC_FACIAL_DIR = path.join(process.cwd(), 'public', 'facial-data');

function normalizeFaceImageUrl(rawUrl?: string) {
  if (!rawUrl) return '';

  if (rawUrl.startsWith('/api/attendance/backend/')) return rawUrl;
  if (rawUrl.startsWith('/secure-face-image')) return `/api/attendance/backend${rawUrl}`;

  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1') {
      return `/api/attendance/backend${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Keep non-URL values as they are; the image proxy will validate them.
  }

  return rawUrl;
}

function buildAdminFaceImageProxyUrl(studentId: string, sourceUrl?: string) {
  if (!sourceUrl) return '';
  if (sourceUrl.startsWith('/facial-data/') && !sourceUrl.includes('_StudentFolder/')) {
    return sourceUrl;
  }
  return `/api/admin/students/${encodeURIComponent(studentId)}/facial-data/image?src=${encodeURIComponent(
    sourceUrl
  )}`;
}

function mapFacialRecord(record: any) {
  const studentId = String(record?.student_id || record?.studentId || '');
  const embeddings = Array.isArray(record?.embeddings)
    ? record.embeddings.map((item: any) => ({
        id: String(item?._id || item?.image_sha256 || item?.imageHash || ''),
        imageUrl: buildAdminFaceImageProxyUrl(
          studentId,
          normalizeFaceImageUrl(item?.image_url || item?.imageUrl || '')
        ),
        imageHash: item?.image_sha256 || item?.image_hash || item?.imageHash || '',
        uploadedAt: item?.uploaded_at || item?.uploadedAt || null,
        imageRef: item?.image_file || item?.imageRef || '',
        embeddingRef: item?.embedding_file || item?.embeddingRef || '',
      }))
    : [];

  const previewImageUrl = buildAdminFaceImageProxyUrl(
    studentId,
    normalizeFaceImageUrl(record?.preview_image_url || record?.previewImageUrl || '')
  );

  const numberOfSamples =
    typeof record?.number_of_samples === 'number'
      ? record.number_of_samples
      : typeof record?.numberOfSamples === 'number'
      ? record.numberOfSamples
      : embeddings.length;

  return {
    studentId,
    numberOfSamples,
    previewImageUrl,
    isProcessed:
      typeof record?.is_processed === 'boolean'
        ? record.is_processed
        : Boolean(record?.isProcessed),
    confidence: Number(record?.confidence || 0),
    embeddings:
      embeddings.length === 0 && previewImageUrl
        ? [
            {
              id: 'preview-image',
              imageUrl: previewImageUrl,
              imageHash: '',
              uploadedAt: null,
              imageRef: '',
              embeddingRef: '',
            },
          ]
        : embeddings,
  };
}

type BackendFaceItem = {
  embedding_id?: string;
  image_url?: string;
  image_ref?: string;
  embedding_ref?: string;
  image_sha256?: string;
  uploaded_at?: string | null;
};

const LEGACY_STUDENT_FOLDER_PATTERN = /\/facial-data\/.+_StudentFolder\/.+\/photo\d+\.[A-Za-z0-9]+$/i;

function isLegacyStudentFolderPath(url?: string) {
  return Boolean(url && LEGACY_STUDENT_FOLDER_PATTERN.test(url));
}

function extractTimestampFromFilename(filename: string) {
  const match = filename.match(/^[a-f0-9]{24}_(\d+)_/i);
  return match ? Number(match[1]) : 0;
}

async function getPublicFaceImageUrls(studentId: string) {
  try {
    const entries = await readdir(PUBLIC_FACIAL_DIR, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.startsWith(`${studentId}_`))
      .map((entry) => entry.name)
      .sort((a, b) => extractTimestampFromFilename(a) - extractTimestampFromFilename(b));

    return files.map((name) => `/facial-data/${encodeURIComponent(name)}`);
  } catch {
    return [] as string[];
  }
}

async function getBackendFaceImages(studentId: string) {
  try {
    const response = await fetch(`${PYTHON_BACKEND}/student-face-images/${encodeURIComponent(studentId)}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (data) {
        const items: BackendFaceItem[] = Array.isArray(data.images) ? data.images : [];
        const previewImageUrl = data.preview_image_url || '';
        const publicFaceUrls = await getPublicFaceImageUrls(studentId);
        const numberOfSamples =
          typeof data.number_of_samples === 'number' ? data.number_of_samples : items.length;

        const mappedEmbeddings = items.map((item, index) => {
          const rawImageUrl = String(item.image_url || '');
          const usePublicFallback =
            !item.image_ref && isLegacyStudentFolderPath(rawImageUrl) && Boolean(publicFaceUrls[index]);
          const resolvedSource = usePublicFallback ? publicFaceUrls[index] : normalizeFaceImageUrl(rawImageUrl);

          return {
            id: String(item.embedding_id || item.image_sha256 || item.image_ref || `face-${index + 1}`),
            imageUrl: buildAdminFaceImageProxyUrl(studentId, resolvedSource),
            imageHash: item.image_sha256 || '',
            uploadedAt: item.uploaded_at || null,
            imageRef: item.image_ref || '',
            embeddingRef: item.embedding_ref || '',
          };
        });

        const previewSource = (() => {
          if (isLegacyStudentFolderPath(String(previewImageUrl || '')) && publicFaceUrls.length > 0) {
            return publicFaceUrls[0];
          }
          return normalizeFaceImageUrl(previewImageUrl);
        })();

        const normalizedEmbeddings =
          mappedEmbeddings.length > 0
            ? mappedEmbeddings
            : previewSource
            ? [
                {
                  id: 'preview-image',
                  imageUrl: buildAdminFaceImageProxyUrl(studentId, previewSource),
                  imageHash: '',
                  uploadedAt: null,
                  imageRef: '',
                  embeddingRef: '',
                },
              ]
            : publicFaceUrls.map((url, index) => ({
                id: `public-face-${index + 1}`,
                imageUrl: url,
                imageHash: '',
                uploadedAt: null,
                imageRef: '',
                embeddingRef: '',
              }));

        return {
          studentId: String(data.student_id || studentId),
          numberOfSamples: Math.max(numberOfSamples, normalizedEmbeddings.length),
          previewImageUrl: buildAdminFaceImageProxyUrl(studentId, previewSource),
          isProcessed: numberOfSamples > 0 || normalizedEmbeddings.length > 0,
          confidence: 0,
          embeddings: normalizedEmbeddings,
        };
      }
    }
  } catch {
    // Fall through to Mongo fallback.
  }

  return null;
}

async function deleteFaceOnBackend(params: {
  studentId: string;
  imageRef?: string;
  imageSha256?: string;
  embeddingRef?: string;
}) {
  const query = new URLSearchParams();
  if (params.imageRef) query.set('image_ref', params.imageRef);
  if (params.imageSha256) query.set('image_sha256', params.imageSha256);
  if (params.embeddingRef) query.set('embedding_ref', params.embeddingRef);

  const response = await fetch(
    `${PYTHON_BACKEND}/student-face-images/${encodeURIComponent(params.studentId)}/delete?${query.toString()}`,
    { method: 'POST' }
  );
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

async function getEmptyOrStoredFacialData(studentId: string) {
  const backendFacialData = await getBackendFaceImages(studentId);
  if (backendFacialData) return backendFacialData;

  const facialRecord = await FacialDatabase.findOne({ student_id: studentId }).lean();
  if (facialRecord) return mapFacialRecord(facialRecord);

  return {
    studentId,
    numberOfSamples: 0,
    previewImageUrl: '',
    isProcessed: false,
    confidence: 0,
    embeddings: [],
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const student = await Student.findById(params.id).select('_id').lean();
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ facialData: await getEmptyOrStoredFacialData(params.id) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load facial data' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const student = await Student.findById(params.id).select('_id').lean();
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const replaceEmbeddingId = String(formData.get('replaceEmbeddingId') || '');
    const replaceImageRef = String(formData.get('replaceImageRef') || '');
    const replaceImageSha256 = String(formData.get('replaceImageSha256') || '');
    const replaceEmbeddingRef = String(formData.get('replaceEmbeddingRef') || '');
    const files = formData.getAll('files').filter((file): file is File => file instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: 'At least one image file is required' }, { status: 400 });
    }

    const pythonFormData = new FormData();
    pythonFormData.append('student_id', params.id);
    files.forEach((file) => pythonFormData.append('files', file));

    let backendResult: any = {};
    try {
      const backendResponse = await fetch(`${PYTHON_BACKEND}/upload-student-images`, {
        method: 'POST',
        body: pythonFormData,
      });
      const backendText = await backendResponse.text();
      backendResult = backendText ? JSON.parse(backendText) : {};
      if (!backendResponse.ok) {
        return NextResponse.json(
          { error: backendResult?.error || 'Failed to process image in face service' },
          { status: backendResponse.status }
        );
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Failed to connect to face service' },
        { status: 502 }
      );
    }

    if (replaceImageRef || replaceImageSha256 || replaceEmbeddingRef) {
      const deletion = await deleteFaceOnBackend({
        studentId: params.id,
        imageRef: replaceImageRef || undefined,
        imageSha256: replaceImageSha256 || undefined,
        embeddingRef: replaceEmbeddingRef || undefined,
      });

      if (!deletion.ok) {
        if (replaceEmbeddingId && mongoose.Types.ObjectId.isValid(replaceEmbeddingId)) {
          await FacialDatabase.updateOne(
            { student_id: params.id },
            {
              $pull: { embeddings: { _id: new mongoose.Types.ObjectId(replaceEmbeddingId) } },
              $set: { last_updated: new Date() },
            }
          );
        } else {
          return NextResponse.json(
            { error: deletion.payload?.error || 'Failed to replace existing facial image' },
            { status: deletion.status || 500 }
          );
        }
      }
    } else if (replaceEmbeddingId && mongoose.Types.ObjectId.isValid(replaceEmbeddingId)) {
      await FacialDatabase.updateOne(
        { student_id: params.id },
        {
          $pull: { embeddings: { _id: new mongoose.Types.ObjectId(replaceEmbeddingId) } },
          $set: { last_updated: new Date() },
        }
      );
    }

    return NextResponse.json({
      message: 'Facial image(s) updated successfully',
      backend: {
        filesProcessed: Number(backendResult?.files_processed || 0),
        embeddingsCreated: Number(backendResult?.embeddings_created || 0),
      },
      facialData: await getEmptyOrStoredFacialData(params.id),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to upload facial image' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const student = await Student.findById(params.id).select('_id').lean();
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const embeddingId = String(body?.embeddingId || '');
    const imageRef = String(body?.imageRef || '');
    const imageSha256 = String(body?.imageSha256 || '');
    const embeddingRef = String(body?.embeddingRef || '');

    if (!imageRef && !imageSha256 && !embeddingRef && !mongoose.Types.ObjectId.isValid(embeddingId)) {
      return NextResponse.json({ error: 'Image reference is required' }, { status: 400 });
    }

    if (imageRef || imageSha256 || embeddingRef) {
      const backendDelete = await deleteFaceOnBackend({
        studentId: params.id,
        imageRef: imageRef || undefined,
        imageSha256: imageSha256 || undefined,
        embeddingRef: embeddingRef || undefined,
      });

      if (!backendDelete.ok) {
        if (embeddingId && mongoose.Types.ObjectId.isValid(embeddingId)) {
          await FacialDatabase.updateOne(
            { student_id: params.id },
            {
              $pull: { embeddings: { _id: new mongoose.Types.ObjectId(embeddingId) } },
              $set: { last_updated: new Date() },
            }
          );
        } else {
          return NextResponse.json(
            { error: backendDelete.payload?.error || 'Failed to delete image from storage' },
            { status: backendDelete.status || 500 }
          );
        }
      }
    } else if (embeddingId && mongoose.Types.ObjectId.isValid(embeddingId)) {
      await FacialDatabase.updateOne(
        { student_id: params.id },
        {
          $pull: { embeddings: { _id: new mongoose.Types.ObjectId(embeddingId) } },
          $set: { last_updated: new Date() },
        }
      );
    }

    return NextResponse.json({
      message: 'Facial image deleted',
      facialData: await getEmptyOrStoredFacialData(params.id),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete image' }, { status: 500 });
  }
}
