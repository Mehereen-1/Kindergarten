import mongoose, { Schema, Document } from 'mongoose';

export interface IParent extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  address?: string;
  children: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ParentSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: String,
    children: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
  },
  { timestamps: true }
);

export default mongoose.models.Parent || mongoose.model<IParent>('Parent', ParentSchema);
