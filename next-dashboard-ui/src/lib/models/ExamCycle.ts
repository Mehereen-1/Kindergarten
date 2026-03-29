import mongoose, { Schema, Document } from 'mongoose';

export interface IExamCycle extends Document {
  academicYear: string; // e.g., "2025-2026"
  termId: mongoose.Types.ObjectId; // Reference to Term (if you have a separate Term model)
  termName: string; // e.g., "Term 1", "Midterm"
  examName: string; // e.g., "Midterm Exam", "Final Exam"
  examType: 'class-test' | 'midterm' | 'final' | 'annual' | 'other';
  classIds: mongoose.Types.ObjectId[]; // Classes/sections included
  subjectIds: mongoose.Types.ObjectId[]; // Subjects in this exam cycle
  marksEntryStartDate: Date; // Window opens
  marksEntryEndDate: Date; // Window closes
  publishDate: Date; // When parent portal opens
  status: 'draft' | 'open' | 'closed' | 'published'; // draft = setup, open = entry allowed, closed = entry locked, published = visible to parents
  createdBy: mongoose.Types.ObjectId; // Admin user
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

const ExamCycleSchema: Schema = new Schema(
  {
    academicYear: { type: String, required: true, index: true }, // "2025-2026"
    termId: { type: Schema.Types.ObjectId, ref: 'Term' },
    termName: { type: String, required: true }, // "Term 1"
    examName: { type: String, required: true }, // "Midterm Exam"
    examType: { 
      type: String, 
      enum: ['class-test', 'midterm', 'final', 'annual', 'other'],
      required: true 
    },
    classIds: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
    subjectIds: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    marksEntryStartDate: { type: Date, required: true },
    marksEntryEndDate: { type: Date, required: true },
    publishDate: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['draft', 'open', 'closed', 'published'],
      default: 'draft'
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound index for academic year + term + exam type
ExamCycleSchema.index({ academicYear: 1, termName: 1, examType: 1 });

export default mongoose.models.ExamCycle || mongoose.model<IExamCycle>('ExamCycle', ExamCycleSchema);
