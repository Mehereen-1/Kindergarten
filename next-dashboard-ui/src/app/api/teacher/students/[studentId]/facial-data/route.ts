import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import path from 'path';
import { readdir } from 'fs/promises';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import TeacherClassAssignment from '@/lib/models/TeacherClassAssignment';
import ClassSubjectAssignment from '@/lib/models/ClassSubjectAssignment';
import FacialDatabase from '@/lib/models/FacialDatabase';
import { getServerCctvBackendUrl } from '@/lib/serverConfig';

const PYTHON_BACKEND = getServerCctvBackendUrl();
const PUBLIC_FACIAL_DIR = path.join(process.cwd(), 'public', 'facial-data');

const toId = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

async function canTeacherAccessStudent(
  teacherId: string,
  studentId: string,
  academicYear: string
) {
  const student = await Student.findById(studentId).lean();
  if (!student) {
    return { ok: false, status: 404, error: 'Student not found', student: null, classDoc: null };
  }

  const history = await StudentClassHistory.findOne({
    studentId: student._id,
    academicYear,
    status: 'active',
  })
    .populate('classId', 'name classId grade teacherId')
    .lean();

  const classDoc: any = history?.classId || null;
  if (!classDoc?._id) {
    return {
      ok: false,
      status: 404,
      error: 'Student is not assigned to a class for this academic year',
      student,
      classDoc: null,
    };
  }

  const teacherMatch = mongoose.Types.ObjectId.isValid(teacherId)
    ? [{ teacherId }, { teacherId: new mongoose.Types.ObjectId(teacherId) }]
    : [{ teacherId }];

  const [isAssignedBySubject, isAssignedLegacy] = await Promise.all([
    ClassSubjectAssignment.exists({
      classId: classDoc._id,
      academicYear,
      status: 'active',
      $or: teacherMatch,
    }),
    TeacherClassAssignment.exists({
      classId: classDoc._id,
      academicYear,
      status: 'active',
      $or: teacherMatch,
    }),
  ]);

  const isAssignedDirect = toId(classDoc.teacherId) === teacherId;

  if (!isAssignedBySubject && !isAssignedLegacy && !isAssignedDirect) {
    return { ok: false, status: 403, error: 'Permission denied', student, classDoc };
  }

  return { ok: true, status: 200, error: '', student, classDoc };
}

function mapFacialRecord(record: any) {
  const studentId = String(record?.student_id || record?.studentId || '');
  const embeddings = Array.isArray(record?.embeddings)
    ? record.embeddings.map((item: any) => ({
        id: String(item?._id || ''),
        imageUrl: buildTeacherFaceImageProxyUrl(
          studentId,
          normalizeFaceImageUrl(item?.image_url || item?.imageUrl || '')
        ),
        imageHash: item?.image_hash || item?.imageHash || '',
        uploadedAt: item?.uploaded_at || item?.uploadedAt || null,
      }))
    : [];

  const previewImageUrl = buildTeacherFaceImageProxyUrl(
    studentId,
    normalizeFaceImageUrl(record?.preview_image_url || record?.previewImageUrl || '')
  );
  const numberOfSamples =
    typeof record?.number_of_samples === 'number'
      ? record.number_of_samples
      : typeof record?.numberOfSamples === 'number'
      ? record.numberOfSamples
      : embeddings.length;

  const normalizedEmbeddings =
    embeddings.length === 0 && previewImageUrl
      ? [
          {
            id: 'preview-image',
            imageUrl: previewImageUrl,
            imageHash: '',
            uploadedAt: null,
          },
        ]
      : embeddings;

  return {
    studentId,
    numberOfSamples,
    previewImageUrl,
    isProcessed:
      typeof record?.is_processed === 'boolean'
        ? record.is_processed
        : Boolean(record?.isProcessed),
    confidence: Number(record?.confidence || 0),
    embeddings: normalizedEmbeddings,
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

function normalizeFaceImageUrl(rawUrl?: string) {
  if (!rawUrl) return '';

  // Already a proxy/local relative URL.
  if (rawUrl.startsWith('/api/attendance/backend/')) {
    return rawUrl;
  }

  // Backend may return local service-relative URL.
  if (rawUrl.startsWith('/secure-face-image')) {
    return `/api/attendance/backend${rawUrl}`;
  }

  // If backend returns localhost/loopback absolute URLs, route through Next proxy.
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1') {
      return `/api/attendance/backend${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Keep raw URL if parsing fails.
  }

  return rawUrl;
}

function buildTeacherFaceImageProxyUrl(studentId: string, sourceUrl?: string) {
  if (!sourceUrl) return '';
  if (sourceUrl.startsWith('/facial-data/') && !sourceUrl.includes('_StudentFolder/')) {
    return sourceUrl;
  }
  return `/api/teacher/students/${encodeURIComponent(studentId)}/facial-data/image?src=${encodeURIComponent(
    sourceUrl
  )}`;
}

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
  // First preference: explicit per-student image listing from attendance backend.
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
        const mappedEmbeddings = items.map((item, index) => ({
          imageUrl: (() => {
            const rawImageUrl = String(item.image_url || '');
            const usePublicFallback = !item.image_ref && isLegacyStudentFolderPath(rawImageUrl) && Boolean(publicFaceUrls[index]);
            const resolvedSource = usePublicFallback ? publicFaceUrls[index] : normalizeFaceImageUrl(rawImageUrl);
            return buildTeacherFaceImageProxyUrl(studentId, resolvedSource);
          })(),
          id: String(item.embedding_id || item.image_sha256 || item.image_ref || `face-${index + 1}`),
          imageHash: item.image_sha256 || '',
          uploadedAt: item.uploaded_at || null,
          imageRef: item.image_ref || '',
          embeddingRef: item.embedding_ref || '',
        }));
        const previewSource = (() => {
          const legacyPreview = isLegacyStudentFolderPath(String(previewImageUrl || ''));
          if (legacyPreview && publicFaceUrls.length > 0) {
            return publicFaceUrls[0];
          }
          return normalizeFaceImageUrl(previewImageUrl);
        })();
        const normalizedEmbeddings =
          mappedEmbeddings.length === 0 && previewSource
            ? [
                {
                  id: 'preview-image',
                  imageUrl: buildTeacherFaceImageProxyUrl(studentId, previewSource),
                  imageHash: '',
                  uploadedAt: null,
                  imageRef: '',
                  embeddingRef: '',
                },
              ]
            : mappedEmbeddings.length === 0 && publicFaceUrls.length > 0
            ? publicFaceUrls.map((url, index) => ({
                id: `public-face-${index + 1}`,
                imageUrl: url,
                imageHash: '',
                uploadedAt: null,
                imageRef: '',
                embeddingRef: '',
              }))
            : mappedEmbeddings;

        return {
          studentId: String(data.student_id || studentId),
          numberOfSamples: Math.max(numberOfSamples, normalizedEmbeddings.length),
          previewImageUrl: buildTeacherFaceImageProxyUrl(studentId, previewSource),
          isProcessed: numberOfSamples > 0 || normalizedEmbeddings.length > 0,
          confidence: 0,
          embeddings: normalizedEmbeddings,
        };
      }
    }
  } catch {
    // Fall through to known-faces fallback
  }

  // Fallback: use known-faces endpoint for a fresh storage-backed preview URL.
  try {
    const knownFacesResponse = await fetch(`${PYTHON_BACKEND}/known-faces`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!knownFacesResponse.ok) {
      return null;
    }

    const knownFacesData = await knownFacesResponse.json().catch(() => null);
    const faces = Array.isArray(knownFacesData?.faces) ? knownFacesData.faces : [];
    const matched = faces.find((item: any) => String(item?.student_id || '') === String(studentId));

    if (!matched?.image_url) {
      return null;
    }

    const imageUrl = normalizeFaceImageUrl(String(matched.image_url));
    const sampleCount =
      typeof matched?.num_samples === 'number' && matched.num_samples > 0 ? matched.num_samples : 1;

    return {
      studentId: String(studentId),
      numberOfSamples: sampleCount,
      previewImageUrl: imageUrl,
      isProcessed: true,
      confidence: 0,
      embeddings: [
        {
          id: 'known-face-preview',
          imageUrl: buildTeacherFaceImageProxyUrl(studentId, imageUrl),
          imageHash: '',
          uploadedAt: null,
          imageRef: '',
          embeddingRef: '',
        },
      ],
    };
  } catch {
    return null;
  }
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

export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    await connectDB();

    const teacherId = request.nextUrl.searchParams.get('teacherId');
    const academicYear = request.nextUrl.searchParams.get('academicYear') || String(new Date().getFullYear());

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId is required' }, { status: 400 });
    }

    const access = await canTeacherAccessStudent(teacherId, params.studentId, academicYear);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const backendFacialData = await getBackendFaceImages(params.studentId);
    if (backendFacialData) {
      return NextResponse.json({ facialData: backendFacialData });
    }

    const facialRecord = await FacialDatabase.findOne({ student_id: params.studentId }).lean();
    if (!facialRecord) {
      return NextResponse.json({
        facialData: {
          studentId: params.studentId,
          numberOfSamples: 0,
          previewImageUrl: '',
          isProcessed: false,
          confidence: 0,
          embeddings: [],
        },
      });
    }

    return NextResponse.json({ facialData: mapFacialRecord(facialRecord) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load facial data' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    await connectDB();

    const formData = await request.formData();
    const teacherId = String(formData.get('teacherId') || '');
    const academicYear = String(formData.get('academicYear') || new Date().getFullYear());
    const replaceEmbeddingId = String(formData.get('replaceEmbeddingId') || '');
    const replaceImageRef = String(formData.get('replaceImageRef') || '');
    const replaceImageSha256 = String(formData.get('replaceImageSha256') || '');
    const replaceEmbeddingRef = String(formData.get('replaceEmbeddingRef') || '');
    const files = formData.getAll('files').filter((file): file is File => file instanceof File);

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId is required' }, { status: 400 });
    }

    if (!files.length) {
      return NextResponse.json({ error: 'At least one image file is required' }, { status: 400 });
    }

    const access = await canTeacherAccessStudent(teacherId, params.studentId, academicYear);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const pythonFormData = new FormData();
    pythonFormData.append('student_id', params.studentId);
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

    if (replaceImageRef || replaceImageSha256 || replaceEmbeddingRef || replaceEmbeddingId) {
      const deletion = await deleteFaceOnBackend({
        studentId: params.studentId,
        imageRef: replaceImageRef || undefined,
        imageSha256: replaceImageSha256 || undefined,
        embeddingRef: replaceEmbeddingRef || undefined,
      });
      if (!deletion.ok) {
        if (replaceEmbeddingId && mongoose.Types.ObjectId.isValid(replaceEmbeddingId)) {
          await FacialDatabase.updateOne(
            { student_id: params.studentId },
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
    }
    const backendFacialData = await getBackendFaceImages(params.studentId);

    return NextResponse.json({
      message: 'Facial image(s) updated successfully',
      backend: {
        filesProcessed: Number(backendResult?.files_processed || 0),
        embeddingsCreated: Number(backendResult?.embeddings_created || 0),
      },
      facialData:
        backendFacialData ||
        ({
          studentId: params.studentId,
          numberOfSamples: 0,
          previewImageUrl: '',
          isProcessed: false,
          confidence: 0,
          embeddings: [],
        } as const),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to upload facial image' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const teacherId = String(body?.teacherId || '');
    const embeddingId = String(body?.embeddingId || '');
    const imageRef = String(body?.imageRef || '');
    const imageSha256 = String(body?.imageSha256 || '');
    const embeddingRef = String(body?.embeddingRef || '');
    const academicYear = String(body?.academicYear || new Date().getFullYear());

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId is required' }, { status: 400 });
    }

    if (!imageRef && !imageSha256 && !embeddingRef && !embeddingId) {
      return NextResponse.json({ error: 'Image reference is required' }, { status: 400 });
    }

    const access = await canTeacherAccessStudent(teacherId, params.studentId, academicYear);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const backendDelete = await deleteFaceOnBackend({
      studentId: params.studentId,
      imageRef: imageRef || undefined,
      imageSha256: imageSha256 || undefined,
      embeddingRef: embeddingRef || undefined,
    });

    if (!backendDelete.ok) {
      if (embeddingId && mongoose.Types.ObjectId.isValid(embeddingId)) {
        await FacialDatabase.updateOne(
          { student_id: params.studentId },
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

    const backendFacialData = await getBackendFaceImages(params.studentId);

    return NextResponse.json({
      message: 'Facial image deleted',
      facialData:
        backendFacialData ||
        ({
          studentId: params.studentId,
          numberOfSamples: 0,
          previewImageUrl: '',
          isProcessed: false,
          confidence: 0,
          embeddings: [],
        } as const),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete image' }, { status: 500 });
  }
}
