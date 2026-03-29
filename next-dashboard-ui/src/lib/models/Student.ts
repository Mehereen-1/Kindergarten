import mongoose, { Schema, Document } from 'mongoose';
import './User';

export interface IStudent extends Document {
  name: string;
  email?: string;
  phone?: string;
  parentId: mongoose.Types.ObjectId;
  address?: string;
  bloodGroup?: string;
  birthday?: Date;
  sex?: 'male' | 'female';
  profilePic?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    address: { type: String },
    bloodGroup: { type: String },
    birthday: { type: Date },
    sex: { type: String, enum: ['male', 'female'] },
    profilePic: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
