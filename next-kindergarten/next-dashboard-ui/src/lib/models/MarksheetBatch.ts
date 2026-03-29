import mongoose, { Schema, Document } from 'mongoose';

export interface IMarksheetBatch extends Document {
  examCycleId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  sectionId?: string; // e.g., "A", "B"
  subjectId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId; // Who is entering marks
  status: 'draft' | 'submitted' | 'approved' | 'published' | 'locked' | 'reopened';
  totalStudents: number; // For tracking completeness
  entriesCompleted: number; // How many students have marks entered
  submittedAt?: Date;
  submittedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  publishedBy?: mongoose.Types.ObjectId;
  lockedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MarksheetBatchSchema: Schema = new Schema(
  {
    examCycleId: { type: Schema.Types.ObjectId, ref: 'ExamCycle', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    sectionId: { type: String }, // Optional section
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'published', 'locked', 'reopened'],
      default: 'draft',
    },
    totalStudents: { type: Number, default: 0 },
    entriesCompleted: { type: Number, default: 0 },
    submittedAt: { type: Date },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lockedAt: { type: Date },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: only one batch per teacher per exam+class+subject
MarksheetBatchSchema.index(
  { examCycleId: 1, classId: 1, subjectId: 1, teacherId: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'archived' } } }
);

// Index for teacher's batches
MarksheetBatchSchema.index({ teacherId: 1, status: 1 });

export default mongoose.models.MarksheetBatch || mongoose.model<IMarksheetBatch>('MarksheetBatch', MarksheetBatchSchema);
