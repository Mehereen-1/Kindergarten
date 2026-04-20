import mongoose, { Document, Schema } from 'mongoose';
import './Student';

export type PerformanceLevel = 'Excellent' | 'Good' | 'Needs Practice';

export interface IActivityPerformance extends Document {
  studentId: mongoose.Types.ObjectId;
  activityId: mongoose.Types.ObjectId;
  performanceLevel: PerformanceLevel;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityPerformanceSchema = new Schema<IActivityPerformance>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: 'ActivityRecord',
      required: true,
      index: true,
    },
    performanceLevel: {
      type: String,
      enum: ['Excellent', 'Good', 'Needs Practice'],
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    collection: 'activity_performance',
  }
);

ActivityPerformanceSchema.index(
  { studentId: 1, activityId: 1 },
  { unique: true, name: 'uniq_student_activity_performance' }
);

ActivityPerformanceSchema.index({ studentId: 1, createdAt: -1 });

const ActivityPerformanceModel =
  mongoose.models.ActivityPerformance ||
  mongoose.model<IActivityPerformance>(
    'ActivityPerformance',
    ActivityPerformanceSchema
  );

export default ActivityPerformanceModel;