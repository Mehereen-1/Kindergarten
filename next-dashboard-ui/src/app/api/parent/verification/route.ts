import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ParentVerification from '@/lib/models/ParentVerification';
import { deleteStoredAssetByUrl, storeWebFileAsset } from '@/lib/serverStorage';
import { runServerDocumentOcr } from '@/lib/verification/serverDocumentOcr';
import {
  evaluateVerificationDocument,
  normalizeVerificationText,
} from '@/lib/verification/verificationMatch';
import type { VisualMarkerSummary } from '@/lib/verification/verificationMatch';

export const runtime = 'nodejs';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getSessionUser(request: NextRequest) {
  const userCookie = request.cookies.get('user')?.value;
  if (!userCookie) return null;

  try {
    return JSON.parse(decodeURIComponent(userCookie));
  } catch {
    return null;
  }
}

function plainify<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function toNumber(value: FormDataEntryValue | null) {
  const parsed = Number(String(value || 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeOptionalNumber(value: FormDataEntryValue | null) {
  return normalizeVerificationText(String(value || '')).replace(/\s+/g, '').replace(/\D/g, '');
}

function parseVisualMarkerReport(value: FormDataEntryValue | null): VisualMarkerSummary | null {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      supportStatus: parsed.supportStatus === 'supported' || parsed.supportStatus === 'unsupported' || parsed.supportStatus === 'error'
        ? parsed.supportStatus
        : 'unsupported',
      barcodeCount: Number.isFinite(Number(parsed.barcodeCount)) ? Math.max(0, Number(parsed.barcodeCount)) : 0,
      qrCount: Number.isFinite(Number(parsed.qrCount)) ? Math.max(0, Number(parsed.qrCount)) : 0,
      barcodeKinds: Array.isArray(parsed.barcodeKinds)
        ? parsed.barcodeKinds.map((item: unknown) => String(item || '').trim()).filter(Boolean)
        : [],
      sealLikeScore: Number.isFinite(Number(parsed.sealLikeScore)) ? Math.max(0, Math.min(100, Number(parsed.sealLikeScore))) : 0,
      notes: Array.isArray(parsed.notes)
        ? parsed.notes.map((item: unknown) => String(item || '').trim()).filter(Boolean)
        : [],
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const sessionUser = getSessionUser(request);
    if (!sessionUser?.id || String(sessionUser.role || '').toLowerCase() !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const record = await ParentVerification.findOne({ userId: sessionUser.id }).lean();

    return NextResponse.json({
      verification: record ? plainify(record) : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const sessionUser = getSessionUser(request);
    if (!sessionUser?.id || String(sessionUser.role || '').toLowerCase() !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const parentName = String(formData.get('parentName') || sessionUser.name || '').trim();
    const parentPhone = String(formData.get('parentPhone') || '').trim();
    const childName = String(formData.get('childName') || '').trim();
    const childDateOfBirth = String(formData.get('childDateOfBirth') || '').trim();
    const parentNidNumber = normalizeOptionalNumber(formData.get('parentNidNumber')) || undefined;
    const birthCertificateNumber = normalizeOptionalNumber(formData.get('birthCertificateNumber')) || undefined;
    const parentVisualReport = parseVisualMarkerReport(formData.get('parentNidVisualReport'));
    const birthVisualReport = parseVisualMarkerReport(formData.get('birthCertificateVisualReport'));

    const parentNidFile = formData.get('parentNidFile');
    const birthCertificateFile = formData.get('birthCertificateFile');

    if (!parentName || !childName || !childDateOfBirth) {
      return NextResponse.json({ error: 'Parent name, child name, and child date of birth are required' }, { status: 400 });
    }

    if (!(parentNidFile instanceof File) || !(birthCertificateFile instanceof File)) {
      return NextResponse.json({ error: 'Both document files are required' }, { status: 400 });
    }

    for (const file of [parentNidFile, birthCertificateFile]) {
      if (file.size <= 0) {
        return NextResponse.json({ error: `${file.name || 'Document'} is empty` }, { status: 400 });
      }

      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json({
          error: 'Only JPG, PNG, and WEBP images are supported for automatic OCR verification',
        }, { status: 400 });
      }
    }

    const previousRecord = await ParentVerification.findOne({ userId: sessionUser.id }).lean();
    const previousDocumentUrls = Array.isArray(previousRecord?.documents)
      ? previousRecord.documents
          .map((doc: any) => String(doc?.fileUrl || '').trim())
          .filter(Boolean)
      : [];

    const [parentStored, birthStored] = await Promise.all([
      storeWebFileAsset(parentNidFile, {
        purpose: 'parent-verification',
        docType: 'parent_nid',
        userId: sessionUser.id,
      }),
      storeWebFileAsset(birthCertificateFile, {
        purpose: 'parent-verification',
        docType: 'birth_certificate',
        userId: sessionUser.id,
      }),
    ]);

    const parentClientOcrText = String(formData.get('parentNidOcrText') || '').trim();
    const birthClientOcrText = String(formData.get('birthCertificateOcrText') || '').trim();
    const parentClientOcrConfidence = Math.max(0, Math.min(100, toNumber(formData.get('parentNidOcrConfidence'))));
    const birthClientOcrConfidence = Math.max(0, Math.min(100, toNumber(formData.get('birthCertificateOcrConfidence'))));

    let parentOcrText = parentClientOcrText;
    let birthOcrText = birthClientOcrText;
    let parentOcrConfidence = parentClientOcrConfidence;
    let birthOcrConfidence = birthClientOcrConfidence;

    try {
      const [parentServerOcr, birthServerOcr] = await Promise.all([
        runServerDocumentOcr(parentNidFile),
        runServerDocumentOcr(birthCertificateFile),
      ]);

      parentOcrText = parentServerOcr.text;
      parentOcrConfidence = parentServerOcr.confidence;
      birthOcrText = birthServerOcr.text;
      birthOcrConfidence = birthServerOcr.confidence;
    } catch {
      // If server OCR cannot initialize, fall back to the browser OCR preview values.
    }

    const parentDocResult = evaluateVerificationDocument({
      docType: 'parent_nid',
      ocrText: parentOcrText,
      ocrConfidence: parentOcrConfidence,
      expectedParentName: parentName,
      expectedDocumentNumber: parentNidNumber,
      visualEvidence: parentVisualReport,
    });

    const birthDocResult = evaluateVerificationDocument({
      docType: 'birth_certificate',
      ocrText: birthOcrText,
      ocrConfidence: birthOcrConfidence,
      expectedParentName: parentName,
      expectedChildName: childName,
      expectedChildDateOfBirth: childDateOfBirth,
      expectedDocumentNumber: birthCertificateNumber,
      visualEvidence: birthVisualReport,
    });

    const docs = [
      {
        docType: 'parent_nid',
        filename: parentNidFile.name || parentStored.filename,
        fileUrl: parentStored.url,
        mimeType: parentNidFile.type || parentStored.mimeType,
        size: parentNidFile.size || parentStored.size,
        ocrText: parentOcrText,
        ocrConfidence: parentOcrConfidence,
        matchScore: parentDocResult.matchScore,
        matchStatus: parentDocResult.matchStatus,
        authenticityScore: parentDocResult.authenticityScore,
        authenticityStatus: parentDocResult.authenticityStatus,
        authenticityReasons: parentDocResult.authenticityReasons,
        matchedIndicators: parentDocResult.matchedIndicators,
        missingIndicators: parentDocResult.missingIndicators,
        visualMarkerStatus: parentDocResult.visualMarkerStatus,
        visualMarkerScore: parentDocResult.visualMarkerScore,
        visualMarkerReasons: parentDocResult.visualMarkerReasons,
        barcodeCount: parentDocResult.barcodeCount,
        qrCount: parentDocResult.qrCount,
        barcodeKinds: parentDocResult.barcodeKinds,
        sealLikeScore: parentDocResult.sealLikeScore,
        extractedDocumentNumbers: parentDocResult.extractedDocumentNumbers,
        extractedDates: parentDocResult.extractedDates,
        reasons: parentDocResult.reasons,
      },
      {
        docType: 'birth_certificate',
        filename: birthCertificateFile.name || birthStored.filename,
        fileUrl: birthStored.url,
        mimeType: birthCertificateFile.type || birthStored.mimeType,
        size: birthCertificateFile.size || birthStored.size,
        ocrText: birthOcrText,
        ocrConfidence: birthOcrConfidence,
        matchScore: birthDocResult.matchScore,
        matchStatus: birthDocResult.matchStatus,
        authenticityScore: birthDocResult.authenticityScore,
        authenticityStatus: birthDocResult.authenticityStatus,
        authenticityReasons: birthDocResult.authenticityReasons,
        matchedIndicators: birthDocResult.matchedIndicators,
        missingIndicators: birthDocResult.missingIndicators,
        visualMarkerStatus: birthDocResult.visualMarkerStatus,
        visualMarkerScore: birthDocResult.visualMarkerScore,
        visualMarkerReasons: birthDocResult.visualMarkerReasons,
        barcodeCount: birthDocResult.barcodeCount,
        qrCount: birthDocResult.qrCount,
        barcodeKinds: birthDocResult.barcodeKinds,
        sealLikeScore: birthDocResult.sealLikeScore,
        extractedDocumentNumbers: birthDocResult.extractedDocumentNumbers,
        extractedDates: birthDocResult.extractedDates,
        reasons: birthDocResult.reasons,
      },
    ];

    const overallConfidence = Math.max(0, Math.min(100, Math.round(
      (parentOcrConfidence * 0.35) +
      (birthOcrConfidence * 0.35) +
      (parentDocResult.matchScore * 0.15) +
      (birthDocResult.matchScore * 0.15)
    )));

    const allMatched = parentDocResult.matchStatus === 'matched' && birthDocResult.matchStatus === 'matched';
    const confidenceStrong = parentOcrConfidence >= 55 && birthOcrConfidence >= 55;
    const authenticityInvalid =
      parentDocResult.authenticityStatus === 'invalid' || birthDocResult.authenticityStatus === 'invalid';
    const allOfficial =
      parentDocResult.authenticityStatus === 'official' && birthDocResult.authenticityStatus === 'official';
    const status = authenticityInvalid
      ? 'rejected'
      : allOfficial && allMatched && confidenceStrong
        ? 'auto_verified'
        : 'needs_review';
    const notes = Array.from(
      new Set([
        ...parentDocResult.reasons,
        ...birthDocResult.reasons,
        ...(parentVisualReport?.notes || []),
        ...(birthVisualReport?.notes || []),
      ])
    );

    const record = await ParentVerification.findOneAndUpdate(
      { userId: sessionUser.id },
      {
        $set: {
          parentName,
          parentPhone,
          childName,
          childDateOfBirth: new Date(childDateOfBirth),
          parentNidNumber,
          birthCertificateNumber,
          status,
          overallConfidence,
          documents: docs,
          notes,
          reviewedBy: undefined,
          reviewedAt: undefined,
          submittedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    if (previousDocumentUrls.length) {
      await Promise.allSettled(
        previousDocumentUrls.map(async (fileUrl) => {
          if (fileUrl !== parentStored.url && fileUrl !== birthStored.url) {
            await deleteStoredAssetByUrl(fileUrl);
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      verification: plainify(record),
      status,
      overallConfidence,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
