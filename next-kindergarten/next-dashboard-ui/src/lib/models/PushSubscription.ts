import mongoose, { Schema, Document } from 'mongoose';

export interface IPushSubscription extends Document {
  userEmail: string;
  userRole: 'admin' | 'teacher' | 'parent' | 'student';
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userEmail: { type: String, required: true },
    userRole: {
      type: String,
      enum: ['admin', 'teacher', 'parent', 'student'],
      required: true,
    },
    // endpoint is unique — one record per browser/device
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export default mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
