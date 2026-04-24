import mongoose, { Schema, Document } from 'mongoose';

export type VerificationStatus = 'pending' | 'auto_verified' | 'needs_review' | 'approved' | 'rejected';
export type VerificationDocType = 'parent_nid' | 'birth_certificate';
export type VerificationDocMatchStatus = 'matched' | 'partial' | 'mismatch';
export type VerificationAuthenticityStatus = 'official' | 'suspicious' | 'invalid';

export interface IVerificationDocument extends Document {
  docType: VerificationDocType;
  filename: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  ocrText?: string;
  ocrConfidence?: number;
  matchScore?: number;
  matchStatus?: VerificationDocMatchStatus;
  authenticityScore?: number;
  authenticityStatus?: VerificationAuthenticityStatus;
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

export interface IParentVerification extends Document {
  userId: mongoose.Types.ObjectId;
  parentName: string;
  parentPhone?: string;
  childName: string;
  childDateOfBirth: Date;
  parentNidNumber?: string;
  birthCertificateNumber?: string;
  status: VerificationStatus;
  overallConfidence: number;
  documents: IVerificationDocument[];
  notes?: string[];
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationDocumentSchema = new Schema(
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

const ParentVerificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    parentName: { type: String, required: true },
    parentPhone: { type: String },
    childName: { type: String, required: true },
    childDateOfBirth: { type: Date, required: true },
    parentNidNumber: { type: String },
    birthCertificateNumber: { type: String },
    status: {
      type: String,
      enum: ['pending', 'auto_verified', 'needs_review', 'approved', 'rejected'],
      default: 'pending',
    },
    overallConfidence: { type: Number, default: 0 },
    documents: { type: [VerificationDocumentSchema], default: [] },
    notes: [{ type: String }],
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    submittedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

ParentVerificationSchema.index({ userId: 1 }, { unique: true });
ParentVerificationSchema.index({ status: 1, updatedAt: -1 });

export default mongoose.models.ParentVerification ||
  mongoose.model<IParentVerification>('ParentVerification', ParentVerificationSchema);
