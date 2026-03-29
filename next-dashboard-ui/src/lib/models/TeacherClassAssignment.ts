import mongoose, { Schema, Document } from 'mongoose';

export interface ITeacherClassAssignment extends Document {
  teacherId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  academicYear: string;
  role?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const TeacherClassAssignmentSchema: Schema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    academicYear: { type: String, required: true },
    role: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: true,
  }
);

TeacherClassAssignmentSchema.index({ teacherId: 1, academicYear: 1 });
TeacherClassAssignmentSchema.index({ classId: 1, academicYear: 1 });
TeacherClassAssignmentSchema.index({ teacherId: 1, classId: 1, academicYear: 1 }, { unique: true });

export default mongoose.models.TeacherClassAssignment ||
  mongoose.model<ITeacherClassAssignment>('TeacherClassAssignment', TeacherClassAssignmentSchema);
