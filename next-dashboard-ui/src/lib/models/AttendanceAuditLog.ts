import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceAuditLog extends Document {
  teacherId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  date: Date;
  source: 'manual' | 'cctv';
  action: 'create' | 'update';
  previousStatus?: 'present' | 'absent' | 'late' | null;
  newStatus: 'present' | 'absent' | 'late';
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceAuditLogSchema: Schema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    date: { type: Date, required: true },
    source: {
      type: String,
      enum: ['manual', 'cctv'],
      required: true,
    },
    action: {
      type: String,
      enum: ['create', 'update'],
      required: true,
    },
    previousStatus: {
      type: String,
      enum: ['present', 'absent', 'late', null],
      default: null,
    },
    newStatus: {
      type: String,
      enum: ['present', 'absent', 'late'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

AttendanceAuditLogSchema.index({ createdAt: -1 });
AttendanceAuditLogSchema.index({ teacherId: 1, createdAt: -1 });
AttendanceAuditLogSchema.index({ classId: 1, date: 1, createdAt: -1 });
AttendanceAuditLogSchema.index({ source: 1, createdAt: -1 });

export default mongoose.models.AttendanceAuditLog ||
  mongoose.model<IAttendanceAuditLog>('AttendanceAuditLog', AttendanceAuditLogSchema);
