import User from "@/models/User";
import Teacher from "@/models/Teacher";
import bcrypt from "bcryptjs";

export const createTeacher = async (data: {
  name: string;
  email: string;
  password: string;
}) => {
  const { name, email, password } = data;

  // 1. Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // 2. Hash password (ADMIN sets password)
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Create USER first
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: "teacher",
  });

  // 4. Create TEACHER using user._id
  const teacher = await Teacher.create({
    u_id: user._id,
    name,
    email,
  });

  return { user, teacher };
};
