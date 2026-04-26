import mongoose, { Document, Schema } from 'mongoose';

export type StudentHistoryEventType =
  | 'promotion'
  | 'profile_update'
  | 'result_published'
  | 'attendance_summary'
  | 'activity_record'
  | 'manual_note';

export interface IStudentHistoryEvent extends Document {
  studentId: mongoose.Types.ObjectId;
  eventType: StudentHistoryEventType;
  academicYear?: string;
  occurredAt: Date;
  title: string;
  summary?: string;
  metadata?: Record<string, any>;
  sourceRef?: {
    model: string;
    id: mongoose.Types.ObjectId;
  };
  createdBy?: mongoose.Types.ObjectId;
  createdByRole?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SourceRefSchema = new Schema(
  {
    model: { type: String, trim: true },
    id: { type: Schema.Types.ObjectId },
  },
  { _id: false }
);

const StudentHistoryEventSchema = new Schema<IStudentHistoryEvent>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    eventType: {
      type: String,
      enum: ['promotion', 'profile_update', 'result_published', 'attendance_summary', 'activity_record', 'manual_note'],
      required: true,
      index: true,
    },
    academicYear: { type: String, index: true },
    occurredAt: { type: Date, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    summary: { type: String, trim: true, maxlength: 1000 },
    metadata: { type: Schema.Types.Mixed },
    sourceRef: { type: SourceRefSchema },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByRole: { type: String, trim: true },
  },
  { timestamps: true }
);

StudentHistoryEventSchema.index({ studentId: 1, occurredAt: -1 });
StudentHistoryEventSchema.index({ studentId: 1, academicYear: 1, eventType: 1 });

export default mongoose.models.StudentHistoryEvent ||
  mongoose.model<IStudentHistoryEvent>('StudentHistoryEvent', StudentHistoryEventSchema);
