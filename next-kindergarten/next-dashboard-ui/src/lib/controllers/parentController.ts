import User from "@/models/User";
import Parent from "@/models/Parent";
import bcrypt from "bcryptjs";

export const createParent = async (data: {
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
    role: "parent",
  });

  // 4. Create TEACHER using user._id
  const parent = await Parent.create({
    u_id: user._id,
    name,
    email,
  });

  return { user, parent };
};
