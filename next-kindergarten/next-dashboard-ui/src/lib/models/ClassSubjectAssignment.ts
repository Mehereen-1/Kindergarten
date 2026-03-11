import mongoose, { Document, Schema } from 'mongoose';

export interface IClassSubjectAssignment extends Document {
  classId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  teacherRole: 'class_teacher' | 'assistant_teacher' | 'course_teacher';
  academicYear: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const ClassSubjectAssignmentSchema: Schema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teacherRole: {
      type: String,
      enum: ['class_teacher', 'assistant_teacher', 'course_teacher'],
      default: 'course_teacher',
      required: true,
    },
    academicYear: { type: String, required: true, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

ClassSubjectAssignmentSchema.index({ teacherId: 1, academicYear: 1, status: 1 });
ClassSubjectAssignmentSchema.index({ classId: 1, academicYear: 1, status: 1 });
ClassSubjectAssignmentSchema.index({ classId: 1, subjectId: 1, academicYear: 1 }, { unique: true });

const existingModel = mongoose.models.ClassSubjectAssignment as mongoose.Model<IClassSubjectAssignment> | undefined;

if (process.env.NODE_ENV !== 'production' && existingModel && !existingModel.schema.path('teacherRole')) {
  delete mongoose.models.ClassSubjectAssignment;
}

export default (mongoose.models.ClassSubjectAssignment as mongoose.Model<IClassSubjectAssignment> | undefined) ||
  mongoose.model<IClassSubjectAssignment>('ClassSubjectAssignment', ClassSubjectAssignmentSchema);
