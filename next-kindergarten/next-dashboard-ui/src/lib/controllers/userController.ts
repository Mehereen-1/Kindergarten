import User from "@/models/User";
import bcrypt from "bcryptjs";

export const createUser = async (data: any) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw new Error("User already exists");

  const user = await User.create(data);
  return user;
};

export const getUsers = async () => {
  return await User.find();
};

export const loginUser = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  return {
    user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
  };
};