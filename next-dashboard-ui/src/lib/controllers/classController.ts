import { connectDB } from '../mongodb';
import Class from '../models/Class';
import Student from '../models/Student';

interface CreateClassInput {
  name: string;
  ageGroup: string;
  teacherId: string;
}

interface UpdateClassInput {
  name?: string;
  ageGroup?: string;
  teacherId?: string;
}

/**
 * Create a new class
 */
export async function createClass(input: CreateClassInput) {
  try {
    await connectDB();

    const classDoc = new Class({
      name: input.name,
      ageGroup: input.ageGroup,
      teacherId: input.teacherId,
    });

    await classDoc.save();

    return {
      success: true,
      message: 'Class created successfully',
      data: await classDoc.populate('teacherId'),
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error creating class:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create class',
      statusCode: 500,
    };
  }
}

/**
 * Get class by ID
 */
export async function getClassById(classId: string) {
  try {
    await connectDB();

    const classDoc = await Class.findById(classId).populate('teacherId');
    if (!classDoc) {
      return { success: false, message: 'Class not found', statusCode: 404 };
    }

    return { success: true, data: classDoc, statusCode: 200 };
  } catch (error) {
    console.error('Error getting class:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get class',
      statusCode: 500,
    };
  }
}

/**
 * Get all classes
 */
export async function getAllClasses() {
  try {
    await connectDB();

    const classes = await Class.find().populate('teacherId');

    return {
      success: true,
      data: classes,
      count: classes.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting classes:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get classes',
      statusCode: 500,
    };
  }
}

/**
 * Get classes by teacher ID
 */
export async function getClassesByTeacherId(teacherId: string) {
  try {
    await connectDB();

    const classes = await Class.find({ teacherId }).populate('teacherId');

    return {
      success: true,
      data: classes,
      count: classes.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting classes:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get classes',
      statusCode: 500,
    };
  }
}

/**
 * Update class
 */
export async function updateClass(classId: string, input: UpdateClassInput) {
  try {
    await connectDB();

    const classDoc = await Class.findByIdAndUpdate(
      classId,
      { ...input },
      { new: true }
    ).populate('teacherId');

    if (!classDoc) {
      return { success: false, message: 'Class not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Class updated successfully',
      data: classDoc,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error updating class:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update class',
      statusCode: 500,
    };
  }
}

/**
 * Delete class
 */
export async function deleteClass(classId: string) {
  try {
    await connectDB();

    // Check if class has students
    const studentCount = await Student.countDocuments({ classId });
    if (studentCount > 0) {
      return {
        success: false,
        message: `Cannot delete class with ${studentCount} students. Remove students first.`,
        statusCode: 400,
      };
    }

    const classDoc = await Class.findByIdAndDelete(classId);
    if (!classDoc) {
      return { success: false, message: 'Class not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Class deleted successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error deleting class:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete class',
      statusCode: 500,
    };
  }
}

/**
 * Get class students count
 */
export async function getClassStudentsCount(classId: string) {
  try {
    await connectDB();

    const count = await Student.countDocuments({ classId });

    return {
      success: true,
      data: { classId, studentCount: count },
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting student count:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get student count',
      statusCode: 500,
    };
  }
}
