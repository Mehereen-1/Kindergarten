import mongoose, { Schema } from 'mongoose';
import './User';

interface ITeacherProfile {
  userId: mongoose.Types.ObjectId;
  qualification?: string;
  subjects?: string[];
  joiningDate?: Date;
  employeeId?: string;
  photo?: string;
  classes?: mongoose.Types.ObjectId[];
}

const TeacherProfileSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  qualification: String,
  subjects: [String],
  joiningDate: Date,
  employeeId: String,
  photo: String,
  classes: [{ type: Schema.Types.ObjectId, ref: 'Class' }]
});

export default mongoose.models.TeacherProfile || mongoose.model<ITeacherProfile>('TeacherProfile', TeacherProfileSchema);
