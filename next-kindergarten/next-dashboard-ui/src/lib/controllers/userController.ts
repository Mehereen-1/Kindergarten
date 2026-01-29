import { connectDB } from '../mongodb';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';

interface CreateUserInput {
  email: string;
  password: string;
  role: 'ADMIN' | 'TEACHER' | 'PARENT';
}

interface UpdateUserInput {
  email?: string;
  password?: string;
  role?: 'ADMIN' | 'TEACHER' | 'PARENT';
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput) {
  try {
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      return { success: false, message: 'User already exists', statusCode: 400 };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(input.password, salt);

    const user = new User({
      email: input.email,
      password: hashedPassword,
      role: input.role,
    });

    await user.save();

    return {
      success: true,
      message: 'User created successfully',
      data: {
        id: user._id,
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

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    return {
      success: true,
      data: {
        id: user._id,
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

    const user = await User.findOne({ email }).select('-password');
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    return {
      success: true,
      data: {
        id: user._id,
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

    const users = await User.find(query).select('-password');

    return {
      success: true,
      data: users.map((user) => ({
        id: user._id,
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

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }

    // Check if email is already taken
    if (input.email && input.email !== user.email) {
      const existingUser = await User.findOne({ email: input.email });
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

    const user = await User.findByIdAndDelete(userId);
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

    const user = await User.findOne({ email });
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
