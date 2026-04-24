import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

import { connectDB } from '@/lib/mongodb';
import AdmissionVerification from '@/lib/models/AdmissionVerification';
import Class from '@/lib/models/Class';
import { storeWebFileAsset } from '@/lib/serverStorage';
import { runServerDocumentOcr } from '@/lib/verification/serverDocumentOcr';
import {
  evaluateVerificationDocument,
  normalizeVerificationText,
} from '@/lib/verification/verificationMatch';
import { buildParentsXml, buildStudentsXml } from '@/lib/admissions/xml';
import { parseAdmissionWorkbook, parseExcelDate } from '@/lib/admissions/workbook';
import { resolveNextRollNo } from '@/lib/admissions/roll';

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

function uniqueStrings(values: Array<string | undefined | null>) {
  return Array.from(
    new Set(values.map((item) => String(item || '').trim()).filter(Boolean))
  );
}

function normalizeFieldKey(value: string) {
  return normalizeVerificationText(value).replace(/[^a-z0-9]+/g, '');
}

function getRowValue(row: Record<string, any>, candidates: string[]) {
  const keys = Object.keys(row);
  const normalizedCandidates = candidates.map((candidate) => normalizeFieldKey(candidate));
  const key = keys.find((entry) => normalizedCandidates.includes(normalizeFieldKey(entry)));
  return key ? row[key] : '';
}

function normalizeOptionalDigits(value: unknown) {
  return normalizeVerificationText(String(value || '')).replace(/\D/g, '');
}

function findDocumentFile(filesByName: Map<string, File>, expectedName: string) {
  const cleaned = String(expectedName || '').trim();
  if (!cleaned) return null;

  const fullKey = normalizeFieldKey(cleaned);
  const stemKey = normalizeFieldKey(cleaned.replace(/\.[^.]+$/, ''));

  return filesByName.get(fullKey) || filesByName.get(stemKey) || null;
}

function indexUploadedFiles(files: File[]) {
  const map = new Map<string, File>();

  for (const file of files) {
    const fullKey = normalizeFieldKey(file.name);
    const stemKey = normalizeFieldKey(file.name.replace(/\.[^.]+$/, ''));
    if (!map.has(fullKey)) map.set(fullKey, file);
    if (!map.has(stemKey)) map.set(stemKey, file);
  }

  return map;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const sessionUser = getSessionUser(request);
    if (!sessionUser?.id || String(sessionUser.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      message: 'Admission import template endpoint is ready',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load endpoint' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const sessionUser = getSessionUser(request);
    if (!sessionUser?.id || String(sessionUser.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const excelFile = formData.get('excelFile');
    const demoMode = String(formData.get('demoMode') || '').toLowerCase() === 'true';

    if (!(excelFile instanceof File)) {
      return NextResponse.json({ error: 'Excel file is required' }, { status: 400 });
    }

    const docFiles = formData.getAll('documentFiles').filter((item): item is File => item instanceof File);
    if (!docFiles.length) {
      return NextResponse.json({ error: 'At least one document image is required' }, { status: 400 });
    }

    for (const file of docFiles) {
      if (file.size <= 0) {
        return NextResponse.json({ error: `${file.name || 'Document'} is empty` }, { status: 400 });
      }

      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json({
          error: 'Only JPG, PNG, and WEBP images are supported for admission verification',
        }, { status: 400 });
      }
    }

    const batchId = `ADM-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const sourceFileName = excelFile.name || 'admission.xlsx';

    const workbookBuffer = Buffer.from(await excelFile.arrayBuffer());
    const rows = parseAdmissionWorkbook(workbookBuffer);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows found in the Excel sheet' }, { status: 400 });
    }

    const documentLookup = indexUploadedFiles(docFiles);
    const results: {
      processed: Array<Record<string, unknown>>;
      failed: Array<Record<string, unknown>>;
      total: number;
      autoVerified: number;
      needsReview: number;
      rejected: number;
    } = {
      processed: [],
      failed: [],
      total: rows.length,
      autoVerified: 0,
      needsReview: 0,
      rejected: 0,
    };

    const batchRollCounters = new Map<string, number>();
    const parentXmlEntries = new Map<string, { email: string; name: string; phone?: string; address?: string; occupation?: string }>();
    const studentXmlEntries: Array<{ parentEmail: string; name: string; classId: string; academicYear: string; roll: string }> = [];

    const resolveBatchRollNo = async (classObjectId: mongoose.Types.ObjectId, academicYear: string) => {
      const key = `${String(classObjectId)}::${academicYear}`;
      const cached = batchRollCounters.get(key);
      if (!cached) {
        const nextRoll = await resolveNextRollNo(classObjectId, academicYear);
        const initial = Number.parseInt(String(nextRoll || '1'), 10);
        batchRollCounters.set(key, Number.isFinite(initial) && initial > 0 ? initial : 1);
      }

      const current = batchRollCounters.get(key) || 1;
      batchRollCounters.set(key, current + 1);
      return String(current).padStart(3, '0');
    };

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i] || {};
      const rowNumber = i + 2;

      try {
        const studentName = String(getRowValue(row, ['student name', 'student_name', 'name']) || '').trim();
        const parentName = String(getRowValue(row, ['parent name', 'parent_name', 'guardian name']) || '').trim();
        const parentEmail = String(getRowValue(row, ['parent email', 'parent_email', 'email']) || '').trim();
        const parentPhone = String(getRowValue(row, ['parent phone', 'parent_phone', 'phone']) || '').trim();
        const address = String(getRowValue(row, ['address', 'parent address']) || '').trim();
        const occupation = String(getRowValue(row, ['occupation', 'job']) || '').trim();
        const classIdValue = String(getRowValue(row, ['class id', 'classid', 'class_id', 'class']) || '').trim();
        const academicYear = String(getRowValue(row, ['academic year', 'academicyear', 'academic_year', 'year']) || '').trim();
        const childDateOfBirth = parseExcelDate(getRowValue(row, ['date of birth', 'dob', 'birthday', 'child date of birth']));
        const parentNidNumber = normalizeOptionalDigits(getRowValue(row, ['parent nid number', 'nid number', 'nid']));
        const birthCertificateNumber = normalizeOptionalDigits(getRowValue(row, ['birth certificate number', 'birth registration number', 'brn']));
        const parentNidFileName = String(getRowValue(row, ['parent nid file', 'parent_nid_file', 'nid file']) || '').trim();
        const birthCertificateFileName = String(getRowValue(row, ['birth certificate file', 'birth_certificate_file', 'birth cert file']) || '').trim();

        if (!studentName || !parentName || !parentEmail || !classIdValue || !academicYear || !childDateOfBirth) {
          throw new Error('Missing required fields: Student Name, Parent Name, Parent Email, Class ID, Academic Year, and Date of Birth');
        }

        if (!parentNidFileName || !birthCertificateFileName) {
          throw new Error('Both Parent NID File and Birth Certificate File names are required');
        }

        const classDocById = mongoose.Types.ObjectId.isValid(String(classIdValue))
          ? await Class.findById(classIdValue).lean()
          : null;
        const classDocByCode = await Class.findOne({ classId: classIdValue }).lean();
        const classDoc = classDocById || classDocByCode;

        if (!classDoc) {
          throw new Error(`Class not found for Class ID: ${classIdValue}`);
        }

        const classCode = String(classDoc.classId || classIdValue);

        const parentNidFile = findDocumentFile(documentLookup, parentNidFileName);
        const birthCertificateFile = findDocumentFile(documentLookup, birthCertificateFileName);

        if (!parentNidFile) {
          throw new Error(`Parent NID file not found: ${parentNidFileName}`);
        }
        if (!birthCertificateFile) {
          throw new Error(`Birth certificate file not found: ${birthCertificateFileName}`);
        }

        const [parentStored, birthStored] = await Promise.all([
          storeWebFileAsset(parentNidFile, {
            purpose: 'admission-intake',
            docType: 'parent_nid',
            batchId,
            sourceFileName,
            rowNumber,
          }),
          storeWebFileAsset(birthCertificateFile, {
            purpose: 'admission-intake',
            docType: 'birth_certificate',
            batchId,
            sourceFileName,
            rowNumber,
          }),
        ]);

        const [parentOcr, birthOcr] = await Promise.all([
          runServerDocumentOcr(parentNidFile),
          runServerDocumentOcr(birthCertificateFile),
        ]);

        const parentDocResult = evaluateVerificationDocument({
          docType: 'parent_nid',
          ocrText: parentOcr.text,
          ocrConfidence: parentOcr.confidence,
          expectedParentName: parentName,
          expectedDocumentNumber: parentNidNumber || undefined,
          requireVisualEvidence: false,
        });

        const birthDocResult = evaluateVerificationDocument({
          docType: 'birth_certificate',
          ocrText: birthOcr.text,
          ocrConfidence: birthOcr.confidence,
          expectedParentName: parentName,
          expectedChildName: studentName,
          expectedChildDateOfBirth: childDateOfBirth,
          expectedDocumentNumber: birthCertificateNumber || undefined,
          requireVisualEvidence: false,
        });

        const overallConfidence = Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (parentOcr.confidence * 0.35) +
                (birthOcr.confidence * 0.35) +
                (parentDocResult.matchScore * 0.15) +
                (birthDocResult.matchScore * 0.15)
            )
          )
        );

        const allMatched =
          parentDocResult.matchStatus === 'matched' &&
          birthDocResult.matchStatus === 'matched';
        const confidenceStrong = parentOcr.confidence >= 55 && birthOcr.confidence >= 55;
        const authenticityInvalid =
          parentDocResult.authenticityStatus === 'invalid' ||
          birthDocResult.authenticityStatus === 'invalid';
        const allOfficial =
          parentDocResult.authenticityStatus === 'official' &&
          birthDocResult.authenticityStatus === 'official';

        const status = demoMode
          ? allMatched && confidenceStrong
            ? 'auto_verified'
            : 'needs_review'
          : authenticityInvalid
            ? 'rejected'
            : allOfficial && allMatched && confidenceStrong
              ? 'auto_verified'
              : 'needs_review';

        const notes = uniqueStrings([
          ...parentDocResult.reasons,
          ...birthDocResult.reasons,
          ...(demoMode ? ['Demo mode enabled; authenticity rules were relaxed for synthetic test documents.'] : []),
        ]);

        const admissionDocuments = [
          {
            docType: 'parent_nid' as const,
            filename: parentNidFile.name || parentStored.filename,
            fileUrl: parentStored.url,
            mimeType: parentNidFile.type || parentStored.mimeType,
            size: parentNidFile.size || parentStored.size,
            ocrText: parentOcr.text,
            ocrConfidence: parentOcr.confidence,
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
            docType: 'birth_certificate' as const,
            filename: birthCertificateFile.name || birthStored.filename,
            fileUrl: birthStored.url,
            mimeType: birthCertificateFile.type || birthStored.mimeType,
            size: birthCertificateFile.size || birthStored.size,
            ocrText: birthOcr.text,
            ocrConfidence: birthOcr.confidence,
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

        let rollNo: string | undefined;
        if (status === 'auto_verified') {
          const parentXmlKey = parentEmail.toLowerCase();
          if (!parentXmlEntries.has(parentXmlKey)) {
            parentXmlEntries.set(parentXmlKey, {
              email: parentEmail,
              name: parentName,
              phone: parentPhone || '',
              address: address || '',
              occupation: occupation || '',
            });
          }

          rollNo = await resolveBatchRollNo(classDoc._id as mongoose.Types.ObjectId, String(academicYear));
          studentXmlEntries.push({
            parentEmail,
            name: studentName,
            classId: classCode,
            academicYear: String(academicYear),
            roll: String(rollNo || 'N/A'),
          });
        }

        await AdmissionVerification.findOneAndUpdate(
          { batchId, sourceRowNumber: rowNumber },
          {
            $set: {
              batchId,
              sourceFileName,
              sourceRowNumber: rowNumber,
              studentName,
              parentName,
              parentEmail,
              parentPhone,
              address,
              occupation,
              classIdValue,
              classCode,
              academicYear: String(academicYear),
              childDateOfBirth: new Date(childDateOfBirth),
              parentNidNumber: parentNidNumber || undefined,
              birthCertificateNumber: birthCertificateNumber || undefined,
              status,
              overallConfidence,
              documents: admissionDocuments,
              notes,
              rollNo,
              generatedXmlStatus: status === 'auto_verified' ? 'generated' : 'not_generated',
              reviewedBy: undefined,
              reviewedAt: undefined,
              submittedAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );

        results.processed.push({
          row: rowNumber,
          studentName,
          parentName,
          parentEmail,
          classId: classCode,
          academicYear: String(academicYear),
          status,
          overallConfidence,
          roll: rollNo || '',
          xmlGenerated: status === 'auto_verified',
        });

        if (status === 'auto_verified') {
          results.autoVerified += 1;
        } else if (status === 'needs_review') {
          results.needsReview += 1;
        } else {
          results.rejected += 1;
        }
      } catch (error: any) {
        results.failed.push({
          row: rowNumber,
          data: row,
          error: error?.message || 'Admission verification failed',
        });
      }
    }

    const generatedParentXml = buildParentsXml(Array.from(parentXmlEntries.values()));
    const generatedStudentXml = buildStudentsXml(studentXmlEntries);

    return NextResponse.json({
      success: true,
      batchId,
      sourceFileName,
      results,
      generatedParentXml,
      generatedStudentXml,
      summary: {
      total: results.total,
      autoVerified: results.autoVerified,
      needsReview: results.needsReview,
      rejected: results.rejected,
      demoMode,
    },
  });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to import admissions' }, { status: 500 });
  }
}
