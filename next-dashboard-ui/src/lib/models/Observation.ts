import mongoose, { Schema, Document } from 'mongoose';

export interface IObservation extends Document {
  studentId: mongoose.Types.ObjectId;
  note: string;
  category: 'BEHAVIOR' | 'SOCIAL' | 'LANGUAGE' | 'MOTOR_SKILLS' | 'EMOTIONAL';
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ObservationSchema: Schema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    note: { type: String, required: true },
    category: {
      type: String,
      enum: ['BEHAVIOR', 'SOCIAL', 'LANGUAGE', 'MOTOR_SKILLS', 'EMOTIONAL'],
      required: true,
    },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Observation || mongoose.model<IObservation>('Observation', ObservationSchema);
