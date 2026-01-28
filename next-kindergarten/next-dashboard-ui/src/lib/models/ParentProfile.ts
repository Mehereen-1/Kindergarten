import mongoose, { Schema } from 'mongoose';

interface IParentProfile {
  userId: mongoose.Types.ObjectId;
  address?: string;
  occupation?: string;
}

const ParentProfileSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  address: String,
  occupation: String
});

export default mongoose.models.ParentProfile || mongoose.model<IParentProfile>('ParentProfile', ParentProfileSchema);
