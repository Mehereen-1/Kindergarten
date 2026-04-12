import mongoose, { Document, Schema } from 'mongoose';

export interface IAssignment extends Document {
  title: string;
  subject: string;
  className: string;
  classId?: mongoose.Types.ObjectId;
  dueDate?: Date;
  prompt?: string;
  expectedAnswer?: string;
  assignmentType:
    | 'letter_tracing'
    | 'number_tracing'
    | 'match_same'
    | 'circle_underline'
    | 'color_instruction'
    | 'phonics'
    | 'picture_vocabulary'
    | 'oral_to_written'
    | 'pattern_completion'
    | 'life_skill';
  gradingMode: 'auto_text' | 'manual_review';
  language: 'bangla' | 'english' | 'mixed' | 'unknown';
  createdBy: mongoose.Types.ObjectId;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class' },
    dueDate: { type: Date },
    prompt: { type: String, default: '' },
    expectedAnswer: { type: String, default: '', trim: true },
    assignmentType: {
      type: String,
      enum: [
        'letter_tracing',
        'number_tracing',
        'match_same',
        'circle_underline',
        'color_instruction',
        'phonics',
        'picture_vocabulary',
        'oral_to_written',
        'pattern_completion',
        'life_skill',
      ],
      default: 'letter_tracing',
    },
    gradingMode: {
      type: String,
      enum: ['auto_text', 'manual_review'],
      default: 'auto_text',
    },
    language: {
      type: String,
      enum: ['bangla', 'english', 'mixed', 'unknown'],
      default: 'unknown',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AssignmentSchema.index({ createdBy: 1, createdAt: -1 });
AssignmentSchema.index({ className: 1, subject: 1 });

export default mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);
