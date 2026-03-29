import { connectDB } from '../mongodb';
import { Student } from '../models/Student';
import ParentProfile from '../models/ParentProfile';

interface CreateStudentInput {
  name: string;
  dateOfBirth: Date;
  parentId: string;
  classId: string;
  photo?: string;
}

interface UpdateStudentInput {
  name?: string;
  dateOfBirth?: Date;
  classId?: string;
  photo?: string;
}

/**
 * Create a new student
 */
export async function createStudent(input: CreateStudentInput) {
  try {
    await connectDB();

    // Verify parent exists
    const parent = await Parent.findById(input.parentId);
    if (!parent) {
      return { success: false, message: 'Parent not found', statusCode: 404 };
    }

    const student = new Student({
      name: input.name,
      dateOfBirth: input.dateOfBirth,
      parentId: input.parentId,
      classId: input.classId,
      photo: input.photo,
    });

    await student.save();

    // Add student to parent's children
    if (!parent.children.includes(student._id)) {
      parent.children.push(student._id);
      await parent.save();
    }

    return {
      success: true,
      message: 'Student created successfully',
      data: await student.populate(['parentId', 'classId']),
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error creating student:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create student',
      statusCode: 500,
    };
  }
}

/**
 * Get student by ID
 */
export async function getStudentById(studentId: string) {
  try {
    await connectDB();

    const student = await Student.findById(studentId)
      .populate('parentId')
      .populate('classId');

    if (!student) {
      return { success: false, message: 'Student not found', statusCode: 404 };
    }

    return { success: true, data: student, statusCode: 200 };
  } catch (error) {
    console.error('Error getting student:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get student',
      statusCode: 500,
    };
  }
}

/**
 * Get all students
 */
export async function getAllStudents() {
  try {
    await connectDB();

    const students = await Student.find()
      .populate('parentId')
      .populate('classId');

    return {
      success: true,
      data: students,
      count: students.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting students:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get students',
      statusCode: 500,
    };
  }
}

/**
 * Get students by class ID
 */
export async function getStudentsByClassId(classId: string) {
  try {
    await connectDB();

    const students = await Student.find({ classId })
      .populate('parentId')
      .populate('classId');

    return {
      success: true,
      data: students,
      count: students.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting students:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get students',
      statusCode: 500,
    };
  }
}

/**
 * Get students by parent ID
 */
export async function getStudentsByParentId(parentId: string) {
  try {
    await connectDB();

    const students = await Student.find({ parentId })
      .populate('parentId')
      .populate('classId');

    return {
      success: true,
      data: students,
      count: students.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting students:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get students',
      statusCode: 500,
    };
  }
}

/**
 * Update student
 */
export async function updateStudent(studentId: string, input: UpdateStudentInput) {
  try {
    await connectDB();

    const student = await Student.findByIdAndUpdate(
      studentId,
      { ...input },
      { new: true }
    )
      .populate('parentId')
      .populate('classId');

    if (!student) {
      return { success: false, message: 'Student not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Student updated successfully',
      data: student,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error updating student:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update student',
      statusCode: 500,
    };
  }
}

/**
 * Delete student
 */
export async function deleteStudent(studentId: string) {
  try {
    await connectDB();

    const student = await Student.findByIdAndDelete(studentId);
    if (!student) {
      return { success: false, message: 'Student not found', statusCode: 404 };
    }

    // Remove from parent
    if (student.parentId) {
      await Parent.findByIdAndUpdate(
        student.parentId,
        { $pull: { children: student._id } }
      );
    }

    return {
      success: true,
      message: 'Student deleted successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error deleting student:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete student',
      statusCode: 500,
    };
  }
}

/**
 * Search students by name
 */
export async function searchStudentsByName(name: string) {
  try {
    await connectDB();

    const students = await Student.find({
      name: { $regex: name, $options: 'i' },
    })
      .populate('parentId')
      .populate('classId');

    return {
      success: true,
      data: students,
      count: students.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error searching students:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to search students',
      statusCode: 500,
    };
  }
}

/**
 * Get student age
 */
export function getStudentAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return age;
}
