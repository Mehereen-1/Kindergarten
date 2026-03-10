import mongoose, { Schema, Document } from 'mongoose';

export interface INotice extends Document {
  title: string;
  description: string;
  date: Date;
  targetRole?: 'all' | 'teacher' | 'parent' | 'student';
  type?: 'notice' | 'event-reminder';
  sourceEventId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    targetRole: { 
      type: String, 
      enum: ['all', 'teacher', 'parent', 'student'],
      default: 'all'
    },
    type: {
      type: String,
      enum: ['notice', 'event-reminder'],
      default: 'notice',
    },
    sourceEventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Notice || mongoose.model<INotice>('Notice', NoticeSchema);
