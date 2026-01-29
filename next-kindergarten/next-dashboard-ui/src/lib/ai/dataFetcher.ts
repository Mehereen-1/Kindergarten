import { connectDB } from '../mongodb';
import Student from '../models/Student';
import TeacherProfile from '../models/TeacherProfile';
import Class from '../models/Class';
import User from '../models/User';
import mongoose from 'mongoose';

export interface StudentDetails {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  classId: string;
  grade?: string;
  roll?: string;
  address?: string;
  bloodGroup?: string;
  birthday?: string;
  sex?: string;
  profilePic?: string;
  attendance?: number;
  performance?: number;
}

export interface TeacherSchedule {
  id: string;
  name: string;
  email?: string;
  subjects?: string[];
  classSchedule?: Array<{
    className: string;
    grade: string;
    schedule?: string;
    dayTime?: string;
  }>;
  qualification?: string;
  joiningDate?: string;
  photo?: string;
}

/**
 * Fetch student details by ID
 */
export async function getStudentDetails(studentId: string): Promise<StudentDetails | null> {
  try {
    await connectDB();
    const student = await Student.findById(studentId)
      .populate('parentId', 'name email phone')
      .populate('classId', 'name grade schedule');
    
    if (!student) return null;

    return {
      id: student._id.toString(),
      name: student.name,
      email: student.email,
      phone: student.phone,
      classId: student.classId?.toString(),
      grade: student.grade,
      roll: student.roll,
      address: student.address,
      bloodGroup: student.bloodGroup,
      birthday: student.birthday?.toISOString(),
      sex: student.sex,
      profilePic: student.profilePic,
    };
  } catch (error) {
    console.error('Error fetching student details:', error);
    return null;
  }
}

/**
 * Fetch all students in a class
 */
export async function getClassStudents(classId: string): Promise<StudentDetails[]> {
  try {
    await connectDB();
    const students = await Student.find({ classId })
      .populate('classId', 'name grade schedule');

    return students.map((student) => ({
      id: student._id.toString(),
      name: student.name,
      email: student.email,
      phone: student.phone,
      classId: student.classId?.toString(),
      grade: student.grade,
      roll: student.roll,
      address: student.address,
      bloodGroup: student.bloodGroup,
      birthday: student.birthday?.toISOString(),
      sex: student.sex,
      profilePic: student.profilePic,
    }));
  } catch (error) {
    console.error('Error fetching class students:', error);
    return [];
  }
}

/**
 * Fetch teacher schedule by teacher ID
 */
export async function getTeacherSchedule(teacherId: string): Promise<TeacherSchedule | null> {
  try {
    await connectDB();
    
    // Get teacher profile
    const teacherProfile = await TeacherProfile.findOne({ userId: teacherId })
      .populate('userId', 'name email');
    
    if (!teacherProfile) return null;

    // Get all classes taught by this teacher
    const classes = await Class.find({ teacherId });

    return {
      id: teacherProfile._id.toString(),
      name: teacherProfile.userId?.name || 'Unknown',
      email: teacherProfile.userId?.email,
      subjects: teacherProfile.subjects || [],
      qualification: teacherProfile.qualification,
      joiningDate: teacherProfile.joiningDate?.toISOString(),
      photo: teacherProfile.photo,
      classSchedule: classes.map((cls) => ({
        className: cls.name,
        grade: cls.grade,
        schedule: cls.schedule,
        dayTime: cls.schedule, // You can enhance this with proper time parsing
      })),
    };
  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    return null;
  }
}

/**
 * Search students by name or class
 */
export async function searchStudents(
  query: string,
  searchBy: 'name' | 'class' = 'name'
): Promise<StudentDetails[]> {
  try {
    await connectDB();
    
    const searchQuery = searchBy === 'name'
      ? { name: { $regex: query, $options: 'i' } }
      : { classId: query };

    const students = await Student.find(searchQuery)
      .limit(10)
      .populate('classId', 'name grade');

    return students.map((student) => ({
      id: student._id.toString(),
      name: student.name,
      email: student.email,
      phone: student.phone,
      classId: student.classId?.toString(),
      grade: student.grade,
      roll: student.roll,
      address: student.address,
      bloodGroup: student.bloodGroup,
      birthday: student.birthday?.toISOString(),
      sex: student.sex,
      profilePic: student.profilePic,
    }));
  } catch (error) {
    console.error('Error searching students:', error);
    return [];
  }
}

/**
 * Get students by parent ID
 */
export async function getStudentsByParentId(parentId: string): Promise<StudentDetails[]> {
  try {
    await connectDB();
    const students = await Student.find({ parentId })
      .populate('classId', 'name grade schedule');

    return students.map((student) => ({
      id: student._id.toString(),
      name: student.name,
      email: student.email,
      phone: student.phone,
      classId: student.classId?.toString(),
      grade: student.grade,
      roll: student.roll,
      address: student.address,
      bloodGroup: student.bloodGroup,
      birthday: student.birthday?.toISOString(),
      sex: student.sex,
      profilePic: student.profilePic,
    }));
  } catch (error) {
    console.error('Error fetching parent students:', error);
    return [];
  }
}

/**
 * Get teacher by user ID
 */
export async function getTeacherByUserId(userId: string): Promise<TeacherSchedule | null> {
  try {
    await connectDB();
    return await getTeacherSchedule(userId);
  } catch (error) {
    console.error('Error fetching teacher by user ID:', error);
    return null;
  }
}
