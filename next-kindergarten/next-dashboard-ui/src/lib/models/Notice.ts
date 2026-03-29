import mongoose, { Schema, Document } from 'mongoose';

export interface INotice extends Document {
  title: string;
  description: string;
  date: Date;
  targetRole?: 'all' | 'admin' | 'teacher' | 'parent' | 'student';
  type?: 'notice' | 'event-reminder' | 'anomaly-alert';
  metadata?: Record<string, any>;
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
      enum: ['all', 'admin', 'teacher', 'parent', 'student'],
      default: 'all'
    },
    type: {
      type: String,
      enum: ['notice', 'event-reminder', 'anomaly-alert'],
      default: 'notice',
    },
    metadata: { type: Schema.Types.Mixed },
    sourceEventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Notice || mongoose.model<INotice>('Notice', NoticeSchema);
