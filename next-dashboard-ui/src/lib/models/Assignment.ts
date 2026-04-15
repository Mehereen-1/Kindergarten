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
  studentLevel: 'nursery' | 'kindergarten';
  repeatCount: number;
  caseSensitive: boolean;
  worksheetTemplate:
    | 'tracing_sheet'
    | 'match_sheet'
    | 'circle_underline_sheet'
    | 'coloring_sheet'
    | 'picture_vocab_sheet'
    | 'phonics_boxes_sheet'
    | 'pattern_sheet'
    | 'life_skill_sheet'
    | 'alphabet_practice_sheet'
    | 'sentence_repeat_sheet'
    | 'spelling_repeat_sheet'
    | 'number_practice_sheet';
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
    studentLevel: {
      type: String,
      enum: ['nursery', 'kindergarten'],
      default: 'kindergarten',
      index: true,
    },
    repeatCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    caseSensitive: {
      type: Boolean,
      default: false,
    },
    worksheetTemplate: {
      type: String,
      enum: [
        'tracing_sheet',
        'match_sheet',
        'circle_underline_sheet',
        'coloring_sheet',
        'picture_vocab_sheet',
        'phonics_boxes_sheet',
        'pattern_sheet',
        'life_skill_sheet',
        'alphabet_practice_sheet',
        'sentence_repeat_sheet',
        'spelling_repeat_sheet',
        'number_practice_sheet',
      ],
      default: 'tracing_sheet',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AssignmentSchema.index({ createdBy: 1, createdAt: -1 });
AssignmentSchema.index({ className: 1, subject: 1 });

export default mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);
