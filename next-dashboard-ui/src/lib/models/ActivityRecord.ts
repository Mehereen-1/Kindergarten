import mongoose, { Document, Schema } from 'mongoose';
import './User';
import './Class';

export interface IActivityRecord extends Document {
  title: string;
  description: string;
  subject: string;
  date: Date;
  classId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityRecordSchema = new Schema<IActivityRecord>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    date: {
      type: Date,
      required: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'activities',
  }
);

ActivityRecordSchema.index({ classId: 1, date: -1 });
ActivityRecordSchema.index({ createdBy: 1, date: -1 });
ActivityRecordSchema.index({ subject: 1, date: -1 });

// Delete cached model so schema changes (e.g. adding classId) take effect in dev
if (mongoose.models.ActivityRecord) {
  delete mongoose.models.ActivityRecord;
}

const ActivityRecordModel =
  mongoose.model<IActivityRecord>('ActivityRecord', ActivityRecordSchema);

export default ActivityRecordModel;