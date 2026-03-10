import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  message: string;
  classId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class', // optional (null = whole school)
    },
  },
  { timestamps: true }
);

export default mongoose.models.Announcement || mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
