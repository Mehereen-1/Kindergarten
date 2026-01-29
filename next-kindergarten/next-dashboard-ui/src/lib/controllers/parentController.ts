import { connectDB } from '../mongodb';
import { Parent } from '../models/User';
import mongoose from 'mongoose';

interface CreateParentInput {
  userId: string;
  name: string;
  phone: string;
  address?: string;
}

interface UpdateParentInput {
  name?: string;
  phone?: string;
  address?: string;
}

/**
 * Create a new parent
 */
export async function createParent(input: CreateParentInput) {
  try {
    await connectDB();

    // Check if parent already exists for this user
    const existingParent = await Parent.findOne({ userId: input.userId });
    if (existingParent) {
      return { success: false, message: 'Parent already exists for this user', statusCode: 400 };
    }

    const parent = new Parent({
      userId: input.userId,
      name: input.name,
      phone: input.phone,
      address: input.address,
      children: [],
    });

    await parent.save();

    return {
      success: true,
      message: 'Parent created successfully',
      data: await parent.populate('userId'),
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error creating parent:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create parent',
      statusCode: 500,
    };
  }
}

/**
 * Get parent by ID
 */
export async function getParentById(parentId: string) {
  try {
    await connectDB();

    const parent = await Parent.findById(parentId)
      .populate('userId')
      .populate({
        path: 'children',
        populate: [{ path: 'classId' }],
      });

    if (!parent) {
      return { success: false, message: 'Parent not found', statusCode: 404 };
    }

    return { success: true, data: parent, statusCode: 200 };
  } catch (error) {
    console.error('Error getting parent:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get parent',
      statusCode: 500,
    };
  }
}

/**
 * Get parent by user ID
 */
export async function getParentByUserId(userId: string) {
  try {
    await connectDB();

    const parent = await Parent.findOne({ userId })
      .populate('userId')
      .populate({
        path: 'children',
        populate: [{ path: 'classId' }],
      });

    if (!parent) {
      return { success: false, message: 'Parent not found', statusCode: 404 };
    }

    return { success: true, data: parent, statusCode: 200 };
  } catch (error) {
    console.error('Error getting parent:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get parent',
      statusCode: 500,
    };
  }
}

/**
 * Get all parents
 */
export async function getAllParents() {
  try {
    await connectDB();

    const parents = await Parent.find()
      .populate('userId')
      .populate({
        path: 'children',
        populate: [{ path: 'classId' }],
      });

    return {
      success: true,
      data: parents,
      count: parents.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting parents:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get parents',
      statusCode: 500,
    };
  }
}

/**
 * Update parent
 */
export async function updateParent(parentId: string, input: UpdateParentInput) {
  try {
    await connectDB();

    const parent = await Parent.findByIdAndUpdate(
      parentId,
      { ...input },
      { new: true }
    )
      .populate('userId')
      .populate('children');

    if (!parent) {
      return { success: false, message: 'Parent not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Parent updated successfully',
      data: parent,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error updating parent:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update parent',
      statusCode: 500,
    };
  }
}

/**
 * Delete parent
 */
export async function deleteParent(parentId: string) {
  try {
    await connectDB();

    const parent = await Parent.findByIdAndDelete(parentId);
    if (!parent) {
      return { success: false, message: 'Parent not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Parent deleted successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error deleting parent:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete parent',
      statusCode: 500,
    };
  }
}

/**
 * Add child to parent
 */
export async function addChildToParent(parentId: string, studentId: string) {
  try {
    await connectDB();

    const parent = await Parent.findById(parentId);
    if (!parent) {
      return { success: false, message: 'Parent not found', statusCode: 404 };
    }

    if (parent.children.includes(new mongoose.Types.ObjectId(studentId))) {
      return { success: false, message: 'Child already assigned', statusCode: 400 };
    }

    parent.children.push(new mongoose.Types.ObjectId(studentId));
    await parent.save();

    return {
      success: true,
      message: 'Child added to parent',
      data: await parent.populate('children'),
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error adding child:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add child',
      statusCode: 500,
    };
  }
}

/**
 * Remove child from parent
 */
export async function removeChildFromParent(parentId: string, studentId: string) {
  try {
    await connectDB();

    const parent = await Parent.findById(parentId);
    if (!parent) {
      return { success: false, message: 'Parent not found', statusCode: 404 };
    }

    parent.children = parent.children.filter(
      (id) => id.toString() !== studentId
    );
    await parent.save();

    return {
      success: true,
      message: 'Child removed from parent',
      data: await parent.populate('children'),
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error removing child:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to remove child',
      statusCode: 500,
    };
  }
}

/**
 * Get parent's children
 */
export async function getParentChildren(parentId: string) {
  try {
    await connectDB();

    const parent = await Parent.findById(parentId).populate({
      path: 'children',
      populate: [{ path: 'classId' }],
    });

    if (!parent) {
      return { success: false, message: 'Parent not found', statusCode: 404 };
    }

    return {
      success: true,
      data: parent.children,
      count: parent.children.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting parent children:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get children',
      statusCode: 500,
    };
  }
}
