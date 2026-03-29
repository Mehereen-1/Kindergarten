import mongoose, { Document, Schema } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  code?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, trim: true },
  },
  { timestamps: true }
);

SubjectSchema.index({ name: 1 }, { unique: true });

export default mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);
