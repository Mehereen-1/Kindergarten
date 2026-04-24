import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminResetThrottle extends Document {
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminResetThrottleSchema = new Schema<IAdminResetThrottle>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
    windowStart: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically remove stale limiter records.
AdminResetThrottleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AdminResetThrottle =
  mongoose.models.AdminResetThrottle ||
  mongoose.model<IAdminResetThrottle>('AdminResetThrottle', AdminResetThrottleSchema);

export default AdminResetThrottle;
