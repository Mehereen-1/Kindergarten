import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
  title: string;
  description?: string;
  date: Date;
  classId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    date: { type: Date, default: Date.now },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);
