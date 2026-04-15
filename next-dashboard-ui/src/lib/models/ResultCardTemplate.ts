import mongoose, { Document, Schema } from 'mongoose';

export interface IResultCardRow {
  key: string;
  label: string;
  subjectId?: mongoose.Types.ObjectId;
}

export interface IResultCardTemplate extends Document {
  examCycleId: mongoose.Types.ObjectId;
  schoolName: string;
  affiliationLine?: string;
  contactLine?: string;
  cardTitle: string;
  sessionLabel?: string;
  promotionMessage?: string;
  classTeacherSignatureLabel?: string;
  principalSignatureLabel?: string;
  studentFieldLabels: {
    name: string;
    rollNumber: string;
    guardianPrimary: string;
    guardianSecondary: string;
    dateOfBirth: string;
    admissionNo: string;
  };
  summaryFieldLabels: {
    totalMarks: string;
    percentage: string;
    grade: string;
    rank: string;
  };
  colors: {
    headerStart: string;
    headerEnd: string;
    frame: string;
    accent: string;
    tableHeader: string;
    summaryOne: string;
    summaryTwo: string;
    summaryThree: string;
    summaryFour: string;
    coScholastic: string;
    discipline: string;
    watermark: string;
  };
  subjectRows: IResultCardRow[];
  coScholasticRows: Array<{ key: string; label: string }>;
  disciplineRows: Array<{ key: string; label: string }>;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RowSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
  },
  { _id: false }
);

const ResultCardTemplateSchema: Schema = new Schema(
  {
    examCycleId: { type: Schema.Types.ObjectId, ref: 'ExamCycle', required: true, unique: true },
    schoolName: { type: String, required: true, default: 'Your School Name' },
    affiliationLine: { type: String, default: '' },
    contactLine: { type: String, default: '' },
    cardTitle: { type: String, required: true, default: 'Academic Record' },
    sessionLabel: { type: String, default: '' },
    promotionMessage: {
      type: String,
      default: 'Congratulations! Result published successfully.',
    },
    classTeacherSignatureLabel: {
      type: String,
      default: "Class Teacher's Signature",
    },
    principalSignatureLabel: {
      type: String,
      default: "Principal's Signature",
    },
    studentFieldLabels: {
      name: { type: String, default: 'Student Name' },
      rollNumber: { type: String, default: 'Roll No.' },
      guardianPrimary: { type: String, default: "Guardian's Name" },
      guardianSecondary: { type: String, default: 'Secondary Guardian' },
      dateOfBirth: { type: String, default: 'Date of Birth' },
      admissionNo: { type: String, default: 'Admission No.' },
    },
    summaryFieldLabels: {
      totalMarks: { type: String, default: 'Overall Marks' },
      percentage: { type: String, default: 'Percentage' },
      grade: { type: String, default: 'Grade' },
      rank: { type: String, default: 'Rank' },
    },
    colors: {
      headerStart: { type: String, default: '#8f1d1d' },
      headerEnd: { type: String, default: '#d64242' },
      frame: { type: String, default: '#d7c6a1' },
      accent: { type: String, default: '#7c3aed' },
      tableHeader: { type: String, default: '#efe2b5' },
      summaryOne: { type: String, default: '#16a34a' },
      summaryTwo: { type: String, default: '#ea580c' },
      summaryThree: { type: String, default: '#2563eb' },
      summaryFour: { type: String, default: '#db2777' },
      coScholastic: { type: String, default: '#d18f1f' },
      discipline: { type: String, default: '#d61f92' },
      watermark: { type: String, default: '#f6edd7' },
    },
    subjectRows: { type: [RowSchema], default: [] },
    coScholasticRows: {
      type: [RowSchema],
      default: [
        { key: 'activity', label: 'Activity' },
        { key: 'work-education', label: 'Work Education' },
        { key: 'art-education', label: 'Art Education' },
        { key: 'health-education', label: 'Health Physical Education' },
        { key: 'social-skills', label: 'Social Skills' },
        { key: 'sports', label: 'Sports' },
      ],
    },
    disciplineRows: {
      type: [RowSchema],
      default: [
        { key: 'punctuality', label: 'Regularity & Punctuality' },
        { key: 'sincerity', label: 'Sincerity' },
        { key: 'values', label: 'Behaviour & Values' },
        { key: 'respect', label: 'Respect for Rules' },
        { key: 'teachers', label: 'Attitude Towards Teachers' },
        { key: 'society', label: 'Attitude Towards Society' },
      ],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

ResultCardTemplateSchema.index({ examCycleId: 1 }, { unique: true });

export default mongoose.models.ResultCardTemplate ||
  mongoose.model<IResultCardTemplate>('ResultCardTemplate', ResultCardTemplateSchema);
