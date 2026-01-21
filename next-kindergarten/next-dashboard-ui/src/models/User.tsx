import mongoose, { Schema, models, model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["admin", "teacher", "parent"],
      required: true,
    },
    password: { type: String }, // if you had it
  },
  { timestamps: true }
);

export default models.User || model("User", UserSchema);
