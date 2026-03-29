import mongoose, { Schema, Document } from 'mongoose';

export interface IExamSubjectSetup extends Document {
  examCycleId: mongoose.Types.ObjectId; // Reference to ExamCycle
  classId: mongoose.Types.ObjectId; // Which class this is configured for
  subjectId: mongoose.Types.ObjectId; // Which subject
  teacherId?: mongoose.Types.ObjectId; // Optional assigned teacher for this class+subject in the exam
  fullMarks: number; // e.g., 100
  passMarks: number; // e.g., 35
  components: {
    theory?: number; // e.g., 50
    mcq?: number; // e.g., 20
    practical?: number; // e.g., 30
    viva?: number; // e.g., 10
    classTest?: number; // e.g., 5
    attendance?: number; // e.g., 5
  };
  gradeSchemeId?: mongoose.Types.ObjectId; // Reference to GradeScheme if separate
  createdBy: mongoose.Types.ObjectId; // Admin
  createdAt: Date;
  updatedAt: Date;
}

const ComponentsSchema = new Schema({
  theory: { type: Number },
  mcq: { type: Number },
  practical: { type: Number },
  viva: { type: Number },
  classTest: { type: Number },
  attendance: { type: Number },
}, { _id: false });

const ExamSubjectSetupSchema: Schema = new Schema(
  {
    examCycleId: { type: Schema.Types.ObjectId, ref: 'ExamCycle', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User' },
    fullMarks: { type: Number, required: true, default: 100 },
    passMarks: { type: Number, required: true, default: 35 },
    components: { type: ComponentsSchema, required: true },
    gradeSchemeId: { type: Schema.Types.ObjectId, ref: 'GradeScheme' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: each exam cycle can have only one setup per class per subject
ExamSubjectSetupSchema.index(
  { examCycleId: 1, classId: 1, subjectId: 1 },
  { unique: true }
);

export default mongoose.models.ExamSubjectSetup || mongoose.model<IExamSubjectSetup>('ExamSubjectSetup', ExamSubjectSetupSchema);
