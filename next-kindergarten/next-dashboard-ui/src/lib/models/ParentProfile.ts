import mongoose, { Schema } from 'mongoose';

interface IParentProfile {
  userId: mongoose.Types.ObjectId;
  address?: string;
  occupation?: string;
  children?: mongoose.Types.ObjectId[];
  parentId?: string;
}

const ParentProfileSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  address: String,
  occupation: String,
  children: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
  parentId: String
});

export default mongoose.models.ParentProfile || mongoose.model<IParentProfile>('ParentProfile', ParentProfileSchema);
