import { connectDB } from '../mongodb';
import { Teacher } from '../models/User';
import { Class } from '../models/Class';
import mongoose from 'mongoose';

interface CreateTeacherInput {
  userId: string;
  name: string;
  phone?: string;
  photo?: string;
}

interface UpdateTeacherInput {
  name?: string;
  phone?: string;
  photo?: string;
}

/**
 * Create a new teacher
 */
export async function createTeacher(input: CreateTeacherInput) {
  try {
    await connectDB();

    // Check if teacher already exists for this user
    const existingTeacher = await Teacher.findOne({ userId: input.userId });
    if (existingTeacher) {
      return { success: false, message: 'Teacher already exists for this user', statusCode: 400 };
    }

    const teacher = new Teacher({
      userId: input.userId,
      name: input.name,
      phone: input.phone,
      photo: input.photo,
      classes: [],
    });

    await teacher.save();

    return {
      success: true,
      message: 'Teacher created successfully',
      data: await teacher.populate('userId').execPopulate(),
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error creating teacher:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create teacher',
      statusCode: 500,
    };
  }
}

/**
 * Get teacher by ID
 */
export async function getTeacherById(teacherId: string) {
  try {
    await connectDB();

    const teacher = await Teacher.findById(teacherId)
      .populate('userId')
      .populate({
        path: 'classes',
        populate: { path: 'classId' },
      });

    if (!teacher) {
      return { success: false, message: 'Teacher not found', statusCode: 404 };
    }

    return { success: true, data: teacher, statusCode: 200 };
  } catch (error) {
    console.error('Error getting teacher:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get teacher',
      statusCode: 500,
    };
  }
}

/**
 * Get teacher by user ID
 */
export async function getTeacherByUserId(userId: string) {
  try {
    await connectDB();

    const teacher = await Teacher.findOne({ userId })
      .populate('userId')
      .populate('classes');

    if (!teacher) {
      return { success: false, message: 'Teacher not found', statusCode: 404 };
    }

    return { success: true, data: teacher, statusCode: 200 };
  } catch (error) {
    console.error('Error getting teacher:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get teacher',
      statusCode: 500,
    };
  }
}

/**
 * Get all teachers
 */
export async function getAllTeachers() {
  try {
    await connectDB();

    const teachers = await Teacher.find()
      .populate('userId')
      .populate('classes');

    return {
      success: true,
      data: teachers,
      count: teachers.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting teachers:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get teachers',
      statusCode: 500,
    };
  }
}

/**
 * Update teacher
 */
export async function updateTeacher(teacherId: string, input: UpdateTeacherInput) {
  try {
    await connectDB();

    const teacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { ...input },
      { new: true }
    )
      .populate('userId')
      .populate('classes');

    if (!teacher) {
      return { success: false, message: 'Teacher not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Teacher updated successfully',
      data: teacher,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error updating teacher:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update teacher',
      statusCode: 500,
    };
  }
}

/**
 * Delete teacher
 */
export async function deleteTeacher(teacherId: string) {
  try {
    await connectDB();

    const teacher = await Teacher.findByIdAndDelete(teacherId);
    if (!teacher) {
      return { success: false, message: 'Teacher not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Teacher deleted successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete teacher',
      statusCode: 500,
    };
  }
}

/**
 * Add class to teacher
 */
export async function addClassToTeacher(teacherId: string, classId: string) {
  try {
    await connectDB();

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return { success: false, message: 'Teacher not found', statusCode: 404 };
    }

    if (teacher.classes.includes(new mongoose.Types.ObjectId(classId))) {
      return { success: false, message: 'Class already assigned', statusCode: 400 };
    }

    teacher.classes.push(new mongoose.Types.ObjectId(classId));
    await teacher.save();

    return {
      success: true,
      message: 'Class added to teacher',
      data: await teacher.populate('classes'),
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error adding class:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add class',
      statusCode: 500,
    };
  }
}

/**
 * Remove class from teacher
 */
export async function removeClassFromTeacher(teacherId: string, classId: string) {
  try {
    await connectDB();

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return { success: false, message: 'Teacher not found', statusCode: 404 };
    }

    teacher.classes = teacher.classes.filter(
      (id) => id.toString() !== classId
    );
    await teacher.save();

    return {
      success: true,
      message: 'Class removed from teacher',
      data: await teacher.populate('classes'),
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error removing class:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to remove class',
      statusCode: 500,
    };
  }
}

/**
 * Get teacher's classes
 */
export async function getTeacherClasses(teacherId: string) {
  try {
    await connectDB();

    const teacher = await Teacher.findById(teacherId).populate('classes');
    if (!teacher) {
      return { success: false, message: 'Teacher not found', statusCode: 404 };
    }

    return {
      success: true,
      data: teacher.classes,
      count: teacher.classes.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting teacher classes:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get classes',
      statusCode: 500,
    };
  }
}
