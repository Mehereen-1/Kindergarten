import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  entityType: 'ExamCycle' | 'MarksheetBatch' | 'MarkEntry' | 'ResultSummary';
  entityId: mongoose.Types.ObjectId;
  action: 'create' | 'update' | 'delete' | 'submit' | 'approve' | 'publish' | 'lock' | 'reopen';
  oldValue?: any; // Previous value(s)
  newValue?: any; // New value(s)
  changedBy: mongoose.Types.ObjectId; // User ID who made the change
  changedByRole: string; // Role of the user (admin, teacher, etc.)
  reason?: string; // Why was this changed?
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    entityType: {
      type: String,
      enum: ['ExamCycle', 'MarksheetBatch', 'MarkEntry', 'ResultSummary'],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'submit', 'approve', 'publish', 'lock', 'reopen'],
      required: true,
    },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedByRole: { type: String },
    reason: { type: String },
    ipAddress: { type: String },
  },
  {
    timestamps: true,
  }
);

// Index for quick audit trail lookup
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ changedBy: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 }); // For admin audit dashboard

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
