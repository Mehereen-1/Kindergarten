import mongoose, { Schema, models, model } from "mongoose";

const TeacherSchema = new Schema(
  {
    u_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

export default models.Teacher || model("Teacher", TeacherSchema);
