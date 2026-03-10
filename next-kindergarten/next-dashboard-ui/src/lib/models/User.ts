import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'admin' | 'teacher' | 'parent';
  profilePic?: string;
  address?: string;
  bloodGroup?: string;
  birthday?: Date;
  sex?: 'male' | 'female';
  passwordExpiry?: Date;
  importedAt?: Date;
  firstLogin?: Date;
  profileUpdated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: { 
      type: String, 
      enum: ['admin', 'teacher', 'parent'],
      required: true 
    },
    profilePic: { type: String },
    address: { type: String },
    bloodGroup: { type: String },
    birthday: { type: Date },
    sex: { type: String, enum: ['male', 'female'] },
    passwordExpiry: { type: Date },
    importedAt: { type: Date },
    firstLogin: { type: Date },
    profileUpdated: { type: Date },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
