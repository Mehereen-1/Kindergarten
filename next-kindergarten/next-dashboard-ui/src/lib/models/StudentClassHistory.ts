import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentClassHistory extends Document {
  studentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  academicYear: string;
  rollNo?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const StudentClassHistorySchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    academicYear: { type: String, required: true },
    rollNo: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: true,
  }
);

StudentClassHistorySchema.index({ studentId: 1, academicYear: 1 }, { unique: true });
StudentClassHistorySchema.index({ classId: 1, academicYear: 1 });

export default mongoose.models.StudentClassHistory ||
  mongoose.model<IStudentClassHistory>('StudentClassHistory', StudentClassHistorySchema);
