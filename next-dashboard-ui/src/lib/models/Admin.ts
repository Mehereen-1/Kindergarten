import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminAuditLog {
  action: string;
  timestamp: Date;
  ip?: string;
  metadata?: Record<string, unknown>;
}

export interface IAdminResetRequestMeta {
  secretAnswer?: string;
  requestIP?: string;
  requestedAt?: Date;
}

export interface IAdmin extends Document {
  email: string;
  password: string | null;
  isFirstLogin: boolean;
  setupToken?: string;
  setupTokenExpiry?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  resetRequestMeta?: IAdminResetRequestMeta;
  isApprovedForReset: boolean;
  auditLogs: IAdminAuditLog[];
  pendingEmail?: string;
  emailChangeToken?: string;
  emailChangeTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    action: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now },
    ip: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const AdminResetRequestMetaSchema = new Schema<IAdminResetRequestMeta>(
  {
    secretAnswer: { type: String },
    requestIP: { type: String },
    requestedAt: { type: Date },
  },
  { _id: false }
);

const AdminSchema = new Schema<IAdmin>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      default: null,
    },
    isFirstLogin: {
      type: Boolean,
      default: true,
    },
    setupToken: {
      type: String,
      index: true,
    },
    setupTokenExpiry: {
      type: Date,
      index: true,
    },
    resetToken: {
      type: String,
      index: true,
    },
    resetTokenExpiry: {
      type: Date,
      index: true,
    },
    resetRequestMeta: {
      type: AdminResetRequestMetaSchema,
      default: {},
    },
    isApprovedForReset: {
      type: Boolean,
      default: false,
    },
    auditLogs: {
      type: [AdminAuditLogSchema],
      default: [],
    },
    pendingEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    emailChangeToken: {
      type: String,
      index: true,
    },
    emailChangeTokenExpiry: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Admin = mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);

export default Admin;
