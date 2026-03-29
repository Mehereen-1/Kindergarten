import mongoose, { Schema, Document } from 'mongoose';

export interface IResultSummary extends Document {
  studentId: mongoose.Types.ObjectId;
  examCycleId: mongoose.Types.ObjectId;
  // Overall performance
  totalObtained: number; // Sum of all subject marks
  totalFullMarks: number; // Total possible marks
  percentage: number;
  gpa?: number; // Grade Point Average
  overallGrade?: string;
  // Subject-wise array (denormalized for fast read)
  subjectResults: Array<{
    subjectId: mongoose.Types.ObjectId;
    subjectName: string;
    obtained: number;
    fullMarks: number;
    percentage: number;
    grade?: string;
    isPassed: boolean;
  }>;
  // Ranking
  classRank?: number;
  classTotal?: number;
  rankEnabled: boolean;
  // Status
  promotionStatus?: 'promoted' | 'failed' | 'awaiting-review'; // If applicable
  publishedAt: Date;
  publishedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectResultSchema = new Schema({
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  subjectName: { type: String, required: true },
  obtained: { type: Number, required: true },
  fullMarks: { type: Number, required: true },
  percentage: { type: Number, required: true },
  grade: { type: String },
  isPassed: { type: Boolean, required: true },
}, { _id: false });

const ResultSummarySchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    examCycleId: { type: Schema.Types.ObjectId, ref: 'ExamCycle', required: true },
    totalObtained: { type: Number, required: true },
    totalFullMarks: { type: Number, required: true },
    percentage: { type: Number, required: true },
    gpa: { type: Number },
    overallGrade: { type: String },
    subjectResults: [SubjectResultSchema],
    classRank: { type: Number },
    classTotal: { type: Number },
    rankEnabled: { type: Boolean, default: false },
    promotionStatus: {
      type: String,
      enum: ['promoted', 'failed', 'awaiting-review'],
    },
    publishedAt: { type: Date, required: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one result per student per exam
ResultSummarySchema.index(
  { studentId: 1, examCycleId: 1 },
  { unique: true }
);

// For parent to see results by exam
ResultSummarySchema.index({ studentId: 1, publishedAt: -1 });

export default mongoose.models.ResultSummary || mongoose.model<IResultSummary>('ResultSummary', ResultSummarySchema);
