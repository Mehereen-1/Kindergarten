import mongoose, { Document, Schema } from 'mongoose';

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export type TimetableDay = (typeof DAY_OPTIONS)[number];

export interface ITimetableEntry extends Document {
  classId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  academicYear: string;
  dayOfWeek: TimetableDay;
  startTime: string;
  endTime: string;
  room?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TimetableEntrySchema: Schema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    academicYear: { type: String, required: true, index: true },
    dayOfWeek: { type: String, enum: DAY_OPTIONS, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    room: { type: String, default: '' },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TimetableEntrySchema.index({ teacherId: 1, academicYear: 1, dayOfWeek: 1, startTime: 1 });
TimetableEntrySchema.index({ classId: 1, academicYear: 1, dayOfWeek: 1, startTime: 1 });
TimetableEntrySchema.index(
  { classId: 1, academicYear: 1, dayOfWeek: 1, startTime: 1, endTime: 1 },
  { unique: true }
);

export { DAY_OPTIONS };

const existingModel = mongoose.models.TimetableEntry as mongoose.Model<ITimetableEntry> | undefined;

export default existingModel || mongoose.model<ITimetableEntry>('TimetableEntry', TimetableEntrySchema);
