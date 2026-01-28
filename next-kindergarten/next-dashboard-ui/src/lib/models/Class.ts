import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
  name: string;
  grade: string;
  capacity: number;
  teacherId: mongoose.Types.ObjectId;
  schedule?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    grade: { type: String, required: true },
    capacity: { type: Number, required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    schedule: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Class || mongoose.model<IClass>('Class', ClassSchema);
