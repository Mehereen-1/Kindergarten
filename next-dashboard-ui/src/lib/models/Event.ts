import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  targetRole?: 'all' | 'teacher' | 'parent' | 'student';
  createdBy?: mongoose.Types.ObjectId;
  createdByRole?: 'admin' | 'teacher';
  sourceType?: 'manual' | 'import';
  sourceFileName?: string;
  reminderDayBeforeSentAt?: Date;
  reminderDayOfSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    allDay: { type: Boolean, default: true },
    location: { type: String },
    targetRole: { 
      type: String, 
      enum: ['all', 'teacher', 'parent', 'student'],
      default: 'all'
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByRole: {
      type: String,
      enum: ['admin', 'teacher'],
    },
    sourceType: {
      type: String,
      enum: ['manual', 'import'],
      default: 'manual',
    },
    sourceFileName: { type: String },
    reminderDayBeforeSentAt: { type: Date },
    reminderDayOfSentAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

EventSchema.index({ startDate: 1 });
EventSchema.index({ targetRole: 1, startDate: 1 });

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
