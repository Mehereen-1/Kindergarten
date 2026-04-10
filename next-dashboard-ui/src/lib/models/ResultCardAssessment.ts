import mongoose, { Document, Schema } from 'mongoose';

export interface IResultCardAssessment extends Document {
  examCycleId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  coScholasticValues: Map<string, string>;
  disciplineValues: Map<string, string>;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ResultCardAssessmentSchema: Schema = new Schema(
  {
    examCycleId: { type: Schema.Types.ObjectId, ref: 'ExamCycle', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    coScholasticValues: {
      type: Map,
      of: String,
      default: {},
    },
    disciplineValues: {
      type: Map,
      of: String,
      default: {},
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

ResultCardAssessmentSchema.index(
  { examCycleId: 1, studentId: 1 },
  { unique: true }
);

ResultCardAssessmentSchema.index({ examCycleId: 1, classId: 1 });

export default mongoose.models.ResultCardAssessment ||
  mongoose.model<IResultCardAssessment>('ResultCardAssessment', ResultCardAssessmentSchema);
