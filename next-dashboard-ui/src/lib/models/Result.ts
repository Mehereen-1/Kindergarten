import mongoose, { Schema, Document } from 'mongoose';

export interface IResult extends Document {
  studentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  subject: string;
  exam: string;
  score: number;
  maxScore: number;
  date: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResultSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    subject: { type: String, required: true },
    exam: { type: String, required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    date: { type: Date, required: true },
    remarks: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Result || mongoose.model<IResult>('Result', ResultSchema);
