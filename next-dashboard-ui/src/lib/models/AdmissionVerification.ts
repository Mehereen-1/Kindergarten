import mongoose, { Schema, Document } from 'mongoose';

export type AdmissionStatus = 'pending' | 'auto_verified' | 'needs_review' | 'approved' | 'rejected';
export type AdmissionDocType = 'parent_nid' | 'birth_certificate';
export type AdmissionDocMatchStatus = 'matched' | 'partial' | 'mismatch';
export type AdmissionAuthenticityStatus = 'official' | 'suspicious' | 'invalid';

export interface IAdmissionDocument extends Document {
  docType: AdmissionDocType;
  filename: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  ocrText?: string;
  ocrConfidence?: number;
  matchScore?: number;
  matchStatus?: AdmissionDocMatchStatus;
  authenticityScore?: number;
  authenticityStatus?: AdmissionAuthenticityStatus;
  authenticityReasons?: string[];
  matchedIndicators?: string[];
  missingIndicators?: string[];
  visualMarkerStatus?: 'present' | 'missing' | 'unsupported';
  visualMarkerScore?: number;
  visualMarkerReasons?: string[];
  barcodeCount?: number;
  qrCount?: number;
  barcodeKinds?: string[];
  sealLikeScore?: number;
  extractedDocumentNumbers?: string[];
  extractedDates?: string[];
  reasons?: string[];
  uploadedAt: Date;
}

export interface IAdmissionVerification extends Document {
  batchId: string;
  sourceFileName: string;
  sourceRowNumber: number;
  studentName: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  address?: string;
  occupation?: string;
  classIdValue: string;
  classCode?: string;
  academicYear: string;
  childDateOfBirth: Date;
  parentNidNumber?: string;
  birthCertificateNumber?: string;
  status: AdmissionStatus;
  overallConfidence: number;
  documents: IAdmissionDocument[];
  notes?: string[];
  parentUserId?: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  studentClassHistoryId?: mongoose.Types.ObjectId;
  rollNo?: string;
  generatedXmlStatus?: 'generated' | 'partial' | 'not_generated';
  submittedAt: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdmissionDocumentSchema = new Schema(
  {
    docType: { type: String, enum: ['parent_nid', 'birth_certificate'], required: true },
    filename: { type: String, required: true },
    fileUrl: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    ocrText: { type: String, default: '' },
    ocrConfidence: { type: Number, default: 0 },
    matchScore: { type: Number, default: 0 },
    matchStatus: { type: String, enum: ['matched', 'partial', 'mismatch'], default: 'partial' },
    authenticityScore: { type: Number, default: 0 },
    authenticityStatus: { type: String, enum: ['official', 'suspicious', 'invalid'], default: 'suspicious' },
    authenticityReasons: [{ type: String }],
    matchedIndicators: [{ type: String }],
    missingIndicators: [{ type: String }],
    visualMarkerStatus: { type: String, enum: ['present', 'missing', 'unsupported'], default: 'missing' },
    visualMarkerScore: { type: Number, default: 0 },
    visualMarkerReasons: [{ type: String }],
    barcodeCount: { type: Number, default: 0 },
    qrCount: { type: Number, default: 0 },
    barcodeKinds: [{ type: String }],
    sealLikeScore: { type: Number, default: 0 },
    extractedDocumentNumbers: [{ type: String }],
    extractedDates: [{ type: String }],
    reasons: [{ type: String }],
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AdmissionVerificationSchema = new Schema(
  {
    batchId: { type: String, required: true, index: true },
    sourceFileName: { type: String, required: true },
    sourceRowNumber: { type: Number, required: true },
    studentName: { type: String, required: true },
    parentName: { type: String, required: true },
    parentEmail: { type: String, required: true },
    parentPhone: { type: String },
    address: { type: String },
    occupation: { type: String },
    classIdValue: { type: String, required: true },
    classCode: { type: String },
    academicYear: { type: String, required: true },
    childDateOfBirth: { type: Date, required: true },
    parentNidNumber: { type: String },
    birthCertificateNumber: { type: String },
    status: {
      type: String,
      enum: ['pending', 'auto_verified', 'needs_review', 'approved', 'rejected'],
      default: 'pending',
    },
    overallConfidence: { type: Number, default: 0 },
    documents: { type: [AdmissionDocumentSchema], default: [] },
    notes: [{ type: String }],
    parentUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    studentClassHistoryId: { type: Schema.Types.ObjectId, ref: 'StudentClassHistory' },
    rollNo: { type: String },
    generatedXmlStatus: { type: String, enum: ['generated', 'partial', 'not_generated'], default: 'not_generated' },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

AdmissionVerificationSchema.index({ batchId: 1, sourceRowNumber: 1 }, { unique: true });
AdmissionVerificationSchema.index({ status: 1, updatedAt: -1 });

export default mongoose.models.AdmissionVerification ||
  mongoose.model<IAdmissionVerification>('AdmissionVerification', AdmissionVerificationSchema);
