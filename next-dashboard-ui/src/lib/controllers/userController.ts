import { connectDB } from '../mongodb';
import { IUser as User } from '../models/User';
import UserModel from '../models/User';
import bcrypt from 'bcryptjs';

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'admin' | 'teacher' | 'parent';
  address?: string;
  bloodGroup?: string;
  birthday?: Date;
  sex?: 'male' | 'female';
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: 'admin' | 'teacher' | 'parent';
  address?: string;
  bloodGroup?: string;
  birthday?: Date;
  sex?: 'male' | 'female';
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput) {
  try {
    await connectDB();

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: input.email });
    if (existingUser) {
      return { success: false, message: 'User already exists', statusCode: 400 };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(input.password, salt);

    const user = new UserModel({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      phone: input.phone,
      role: input.role,
      address: input.address,
      bloodGroup: input.bloodGroup,
      birthday: input.birthday,
      sex: input.sex,
    });

    await user.save();

    return {
      success: true,
      message: 'User created successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create user',
      statusCode: 500,
    };
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  try {
    await connectDB();

    const user = await UserModel.findById(userId).select('-password');
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    return {
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting user:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get user',
      statusCode: 500,
    };
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  try {
    await connectDB();

    const user = await UserModel.findOne({ email }).select('-password');
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    return {
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting user:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get user',
      statusCode: 500,
    };
  }
}

/**
 * Get all users
 */
export async function getAllUsers(role?: string) {
  try {
    await connectDB();

    let query: any = {};
    if (role) {
      query.role = role;
    }

    const users = await UserModel.find(query).select('-password');

    return {
      success: true,
      data: users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })),
      count: users.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting users:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get users',
      statusCode: 500,
    };
  }
}

/**
 * Update user
 */
export async function updateUser(userId: string, input: UpdateUserInput) {
  try {
    await connectDB();

    const user = await UserModel.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    // Update fields
    if (input.name) user.name = input.name;
    if (input.phone !== undefined) user.phone = input.phone;
    if (input.address !== undefined) user.address = input.address;
    if (input.bloodGroup !== undefined) user.bloodGroup = input.bloodGroup;
    if (input.birthday !== undefined) user.birthday = input.birthday;
    if (input.sex !== undefined) user.sex = input.sex;

    // Check if email is already taken
    if (input.email && input.email !== user.email) {
      const existingUser = await UserModel.findOne({ email: input.email });
      if (existingUser) {
        return { success: false, message: 'Email already in use', statusCode: 400 };
      }
      user.email = input.email;
    }

    // Hash new password if provided
    if (input.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(input.password, salt);
    }

    if (input.role) {
      user.role = input.role;
    }

    await user.save();

    return {
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update user',
      statusCode: 500,
    };
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId: string) {
  try {
    await connectDB();

    const user = await UserModel.findByIdAndDelete(userId);
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'User deleted successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete user',
      statusCode: 500,
    };
  }
}

/**
 * Verify password
 */
export async function verifyPassword(email: string, password: string) {
  try {
    await connectDB();

    const user = await UserModel.findOne({ email });
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { success: false, message: 'Invalid password', statusCode: 401 };
    }

    return {
      success: true,
      message: 'Password verified',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error verifying password:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify password',
      statusCode: 500,
    };
  }
}

/**
 * Sign in user
 */
export async function signIn(email: string, password: string) {
  try {
    await connectDB();

    const user = await UserModel.findOne({ email });
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { success: false, message: 'Invalid email or password', statusCode: 401 };
    }

    // Check if first login (for auto-generated passwords)
    const isFirstLogin = !user.firstLogin;

    return {
      success: true,
      message: 'Sign in successful',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isFirstLogin,
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error signing in:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to sign in',
      statusCode: 500,
    };
  }
}

/**
 * Change password
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  try {
    await connectDB();

    const user = await UserModel.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return { success: false, message: 'Current password is incorrect', statusCode: 401 };
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    return {
      success: true,
      message: 'Password changed successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error changing password:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to change password',
      statusCode: 500,
    };
  }
}

/**
 * Change password for first login (no current password required)
 */
export async function changePasswordFirstLogin(userId: string, newPassword: string) {
  try {
    await connectDB();

    const user = await UserModel.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    // Check if it's actually first login
    if (user.firstLogin) {
      return { success: false, message: 'You have already changed your password. Use the regular change password feature.', statusCode: 400 };
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.firstLogin = new Date();
    await user.save();

    return {
      success: true,
      message: 'Password changed successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error changing password:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to change password',
      statusCode: 500,
    };
  }
}
