import mongoose, { Schema, Document } from 'mongoose';

export interface IMarkEntry extends Document {
  batchId: mongoose.Types.ObjectId; // Reference to MarksheetBatch
  studentId: mongoose.Types.ObjectId;
  examCycleId: mongoose.Types.ObjectId; // Denormalized for easy filtering
  subjectId: mongoose.Types.ObjectId;
  // Component marks
  theoryMarks?: number;
  mcqMarks?: number;
  practicalMarks?: number;
  vivaMarks?: number;
  classTestMarks?: number;
  attendanceMarks?: number;
  // Computed totals
  totalMarks: number; // Sum of all components
  fullMarks: number; // Max possible
  percentage: number; // (totalMarks / fullMarks) * 100
  grade?: string; // A+, A, B, etc. (if applicable)
  gradePoint?: number; // GPA/grade point (if applicable)
  isAbsent: boolean; // Special flag for absent students
  status: 'active' | 'absent'; // active or absent
  teacherRemark?: string; // Custom teacher comment
  academicRemark?: string; // Auto-generated remark (e.g., "Excellent", "Needs improvement")
  createdAt: Date;
  updatedAt: Date;
}

const MarkEntrySchema: Schema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'MarksheetBatch', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    examCycleId: { type: Schema.Types.ObjectId, ref: 'ExamCycle', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    // Component marks
    theoryMarks: { type: Number },
    mcqMarks: { type: Number },
    practicalMarks: { type: Number },
    vivaMarks: { type: Number },
    classTestMarks: { type: Number },
    attendanceMarks: { type: Number },
    // Computed fields
    totalMarks: { type: Number, required: true, default: 0 },
    fullMarks: { type: Number, required: true, default: 100 },
    percentage: { type: Number, required: true, default: 0 },
    grade: { type: String }, // A+, A, B, etc.
    gradePoint: { type: Number }, // GPA
    isAbsent: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'absent'], default: 'active' },
    teacherRemark: { type: String },
    academicRemark: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: only one entry per student per batch
MarkEntrySchema.index(
  { batchId: 1, studentId: 1 },
  { unique: true }
);

// Also compound on (examCyclId, subjectId, studentId) for quick lookup
MarkEntrySchema.index({ examCycleId: 1, subjectId: 1, studentId: 1 });

// Index for batch queries
MarkEntrySchema.index({ batchId: 1 });

export default mongoose.models.MarkEntry || mongoose.model<IMarkEntry>('MarkEntry', MarkEntrySchema);
