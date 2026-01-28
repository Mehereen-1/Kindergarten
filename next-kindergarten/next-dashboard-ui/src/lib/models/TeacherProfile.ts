import mongoose, { Schema } from 'mongoose';

interface ITeacherProfile {
  userId: mongoose.Types.ObjectId;
  qualification?: string;
  subjects?: string[];
  joiningDate?: Date;
  employeeId?: string;
  photo?: string;
}

const TeacherProfileSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  qualification: String,
  subjects: [String],
  joiningDate: Date,
  employeeId: String,
  photo: String
});

export default mongoose.models.TeacherProfile || mongoose.model<ITeacherProfile>('TeacherProfile', TeacherProfileSchema);
