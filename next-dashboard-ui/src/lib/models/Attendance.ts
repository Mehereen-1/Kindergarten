import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  studentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  date: Date;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    date: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['present', 'absent', 'late'], 
      required: true 
    },
    remarks: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);
