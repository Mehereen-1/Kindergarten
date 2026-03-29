import { connectDB } from '../mongodb';
import User from '../models/User';
import TeacherProfile from '../models/TeacherProfile';
import ParentProfile from '../models/ParentProfile';
import Student from '../models/Student';
import ClassModel from '../models/Class';
import bcrypt from 'bcrypt';

// User CRUD
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
  passwordExpiry?: Date;
  importedAt?: Date;
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
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      return { success: false, message: 'User already exists', statusCode: 400 };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(input.password, salt);

    const user = new User({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      phone: input.phone,
      role: input.role,
      address: input.address,
      bloodGroup: input.bloodGroup,
      birthday: input.birthday,
      sex: input.sex,
      passwordExpiry: input.passwordExpiry,
      importedAt: input.importedAt,
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
 * Get all users
 */
export async function getUsers(role?: string) {
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
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
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
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        bloodGroup: user.bloodGroup,
        birthday: user.birthday,
        sex: user.sex,
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
 * Update user
 */
export async function updateUser(userId: string, input: UpdateUserInput) {
  try {
    await connectDB();

    const user = await User.findById(userId);
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

// Teacher Profile CRUD
interface CreateTeacherProfileInput {
  userId: string;
  qualification?: string;
  subjects?: string[];
  joiningDate?: Date;
  employeeId?: string;
  photo?: string;
  classes?: string[];
}

interface UpdateTeacherProfileInput {
  qualification?: string;
  subjects?: string[];
  joiningDate?: Date;
  employeeId?: string;
  photo?: string;
  classes?: string[];
}

/**
 * Create teacher profile
 */
export async function createTeacherProfile(input: CreateTeacherProfileInput) {
  try {
    await connectDB();

    // Check if profile already exists
    const existingProfile = await TeacherProfile.findOne({ userId: input.userId });
    if (existingProfile) {
      return { success: false, message: 'Teacher profile already exists', statusCode: 400 };
    }

    const profile = new TeacherProfile({
      userId: input.userId,
      qualification: input.qualification,
      subjects: input.subjects,
      joiningDate: input.joiningDate,
      employeeId: input.employeeId,
      photo: input.photo,
      classes: input.classes,
    });

    await profile.save();

    return {
      success: true,
      message: 'Teacher profile created successfully',
      data: await profile.populate('userId classes'),
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error creating teacher profile:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create teacher profile',
      statusCode: 500,
    };
  }
}

/**
 * Get all teacher profiles
 */
export async function getTeacherProfiles() {
  try {
    await connectDB();

    const profiles = await TeacherProfile.find().populate('userId classes');

    return {
      success: true,
      data: profiles,
      count: profiles.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting teacher profiles:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get teacher profiles',
      statusCode: 500,
    };
  }
}

/**
 * Get teacher profile by ID
 */
export async function getTeacherProfileById(profileId: string) {
  try {
    await connectDB();

    const profile = await TeacherProfile.findById(profileId).populate('userId classes');
    if (!profile) {
      return { success: false, message: 'Teacher profile not found', statusCode: 404 };
    }

    return {
      success: true,
      data: profile,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting teacher profile:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get teacher profile',
      statusCode: 500,
    };
  }
}

/**
 * Update teacher profile
 */
export async function updateTeacherProfile(profileId: string, input: UpdateTeacherProfileInput) {
  try {
    await connectDB();

    const profile = await TeacherProfile.findById(profileId);
    if (!profile) {
      return { success: false, message: 'Teacher profile not found', statusCode: 404 };
    }

    if (input.qualification !== undefined) profile.qualification = input.qualification;
    if (input.subjects !== undefined) profile.subjects = input.subjects;
    if (input.joiningDate !== undefined) profile.joiningDate = input.joiningDate;
    if (input.employeeId !== undefined) profile.employeeId = input.employeeId;
    if (input.photo !== undefined) profile.photo = input.photo;
    if (input.classes !== undefined) profile.classes = input.classes;

    await profile.save();

    return {
      success: true,
      message: 'Teacher profile updated successfully',
      data: await profile.populate('userId classes'),
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update teacher profile',
      statusCode: 500,
    };
  }
}

/**
 * Delete teacher profile
 */
export async function deleteTeacherProfile(profileId: string) {
  try {
    await connectDB();

    const profile = await TeacherProfile.findByIdAndDelete(profileId);
    if (!profile) {
      return { success: false, message: 'Teacher profile not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Teacher profile deleted successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error deleting teacher profile:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete teacher profile',
      statusCode: 500,
    };
  }
}

// Parent Profile CRUD
interface CreateParentProfileInput {
  userId: string;
  address?: string;
  occupation?: string;
  children?: string[];
  parentId?: string;
}

interface UpdateParentProfileInput {
  address?: string;
  occupation?: string;
  children?: string[];
}

/**
 * Create parent profile
 */
export async function createParentProfile(input: CreateParentProfileInput) {
  try {
    await connectDB();

    // Check if profile already exists
    const existingProfile = await ParentProfile.findOne({ userId: input.userId });
    if (existingProfile) {
      return { success: false, message: 'Parent profile already exists', statusCode: 400 };
    }

    const profile = new ParentProfile({
      userId: input.userId,
      address: input.address,
      occupation: input.occupation,
      children: input.children,
      parentId: input.parentId,
    });

    await profile.save();

    return {
      success: true,
      message: 'Parent profile created successfully',
      data: await profile.populate('userId children'),
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error creating parent profile:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create parent profile',
      statusCode: 500,
    };
  }
}

/**
 * Get all parent profiles
 */
export async function getParentProfiles() {
  try {
    await connectDB();

    const profiles = await ParentProfile.find().populate('userId children');

    return {
      success: true,
      data: profiles,
      count: profiles.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting parent profiles:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get parent profiles',
      statusCode: 500,
    };
  }
}

/**
 * Get parent profile by ID
 */
export async function getParentProfileById(profileId: string) {
  try {
    await connectDB();

    const profile = await ParentProfile.findById(profileId).populate('userId children');
    if (!profile) {
      return { success: false, message: 'Parent profile not found', statusCode: 404 };
    }

    return {
      success: true,
      data: profile,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting parent profile:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get parent profile',
      statusCode: 500,
    };
  }
}

/**
 * Update parent profile
 */
export async function updateParentProfile(profileId: string, input: UpdateParentProfileInput) {
  try {
    await connectDB();

    const profile = await ParentProfile.findById(profileId);
    if (!profile) {
      return { success: false, message: 'Parent profile not found', statusCode: 404 };
    }

    if (input.address !== undefined) profile.address = input.address;
    if (input.occupation !== undefined) profile.occupation = input.occupation;
    if (input.children !== undefined) profile.children = input.children;

    await profile.save();

    return {
      success: true,
      message: 'Parent profile updated successfully',
      data: await profile.populate('userId children'),
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error updating parent profile:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update parent profile',
      statusCode: 500,
    };
  }
}

/**
 * Delete parent profile
 */
export async function deleteParentProfile(profileId: string) {
  try {
    await connectDB();

    const profile = await ParentProfile.findByIdAndDelete(profileId);
    if (!profile) {
      return { success: false, message: 'Parent profile not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Parent profile deleted successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error deleting parent profile:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete parent profile',
      statusCode: 500,
    };
  }
}

// Student CRUD
interface CreateStudentInput {
  name: string;
  email?: string;
  phone?: string;
  parentId: string;
  classId?: string;
  grade?: string;
  roll?: string;
  address?: string;
  bloodGroup?: string;
  birthday?: Date;
  sex?: 'male' | 'female';
  profilePic?: string;
}

interface UpdateStudentInput {
  name?: string;
  email?: string;
  phone?: string;
  classId?: string;
  grade?: string;
  roll?: string;
  address?: string;
  bloodGroup?: string;
  birthday?: Date;
  sex?: 'male' | 'female';
  profilePic?: string;
}

/**
 * Create student
 */
export async function createStudent(input: CreateStudentInput) {
  try {
    await connectDB();

    const student = new Student({
      name: input.name,
      email: input.email,
      phone: input.phone,
      parentId: input.parentId,
      classId: input.classId,
      grade: input.grade,
      roll: input.roll,
      address: input.address,
      bloodGroup: input.bloodGroup,
      birthday: input.birthday,
      sex: input.sex,
      profilePic: input.profilePic,
    });

    await student.save();

    // Add to parent's children
    const parentProfile = await ParentProfile.findOne({ userId: input.parentId });
    if (parentProfile && !parentProfile.children?.includes(student._id.toString())) {
      parentProfile.children = parentProfile.children || [];
      parentProfile.children.push(student._id);
      await parentProfile.save();
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
 * Get all students
 */
export async function getStudents() {
  try {
    await connectDB();

    const students = await Student.find().populate('parentId classId');

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
 * Get student by ID
 */
export async function getStudentById(studentId: string) {
  try {
    await connectDB();

    const student = await Student.findById(studentId).populate('parentId classId');
    if (!student) {
      return { success: false, message: 'Student not found', statusCode: 404 };
    }

    return {
      success: true,
      data: student,
      statusCode: 200,
    };
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
 * Update student
 */
export async function updateStudent(studentId: string, input: UpdateStudentInput) {
  try {
    await connectDB();

    const student = await Student.findById(studentId);
    if (!student) {
      return { success: false, message: 'Student not found', statusCode: 404 };
    }

    if (input.name) student.name = input.name;
    if (input.email !== undefined) student.email = input.email;
    if (input.phone !== undefined) student.phone = input.phone;
    if (input.classId !== undefined) student.classId = input.classId;
    if (input.grade !== undefined) student.grade = input.grade;
    if (input.roll !== undefined) student.roll = input.roll;
    if (input.address !== undefined) student.address = input.address;
    if (input.bloodGroup !== undefined) student.bloodGroup = input.bloodGroup;
    if (input.birthday !== undefined) student.birthday = input.birthday;
    if (input.sex !== undefined) student.sex = input.sex;
    if (input.profilePic !== undefined) student.profilePic = input.profilePic;

    await student.save();

    return {
      success: true,
      message: 'Student updated successfully',
      data: await student.populate(['parentId', 'classId']),
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

    // Remove from parent's children
    const parentProfile = await ParentProfile.findOne({ userId: student.parentId });
    if (parentProfile && parentProfile.children) {
      parentProfile.children = parentProfile.children.filter(id => id.toString() !== studentId);
      await parentProfile.save();
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

// Class CRUD
interface CreateClassInput {
  classId: string;
  name: string;
  grade: string;
  capacity: number;
  teacherId: string;
  schedule?: string;
}

interface UpdateClassInput {
  classId?: string;
  name?: string;
  grade?: string;
  capacity?: number;
  teacherId?: string;
  schedule?: string;
}

/**
 * Create class
 */
export async function createClass(input: CreateClassInput) {
  try {
    await connectDB();

    // Check if classId already exists
    const existingClass = await ClassModel.findOne({ classId: input.classId });
    if (existingClass) {
      return { success: false, message: 'Class ID already exists', statusCode: 400 };
    }

    const classDoc = new ClassModel({
      classId: input.classId,
      name: input.name,
      grade: input.grade,
      capacity: input.capacity,
      teacherId: input.teacherId,
      schedule: input.schedule,
    });

    await classDoc.save();

    // Add to teacher's classes
    const teacherProfile = await TeacherProfile.findOne({ userId: input.teacherId });
    if (teacherProfile && !teacherProfile.classes?.includes(classDoc._id.toString())) {
      teacherProfile.classes = teacherProfile.classes || [];
      teacherProfile.classes.push(classDoc._id);
      await teacherProfile.save();
    }

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
 * Get all classes
 */
export async function getClasses() {
  try {
    await connectDB();

    const classes = await ClassModel.find().populate('teacherId');

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
 * Get class by ID
 */
export async function getClassById(classId: string) {
  try {
    await connectDB();

    const classDoc = await ClassModel.findById(classId).populate('teacherId');
    if (!classDoc) {
      return { success: false, message: 'Class not found', statusCode: 404 };
    }

    return {
      success: true,
      data: classDoc,
      statusCode: 200,
    };
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
 * Update class
 */
export async function updateClass(classId: string, input: UpdateClassInput) {
  try {
    await connectDB();

    const classDoc = await ClassModel.findById(classId);
    if (!classDoc) {
      return { success: false, message: 'Class not found', statusCode: 404 };
    }

    // Check classId uniqueness if changing
    if (input.classId && input.classId !== classDoc.classId) {
      const existingClass = await ClassModel.findOne({ classId: input.classId });
      if (existingClass) {
        return { success: false, message: 'Class ID already exists', statusCode: 400 };
      }
      classDoc.classId = input.classId;
    }

    if (input.name) classDoc.name = input.name;
    if (input.grade) classDoc.grade = input.grade;
    if (input.capacity !== undefined) classDoc.capacity = input.capacity;
    if (input.schedule !== undefined) classDoc.schedule = input.schedule;

    if (input.teacherId) {
      // Remove from old teacher
      const oldTeacherProfile = await TeacherProfile.findOne({ userId: classDoc.teacherId });
      if (oldTeacherProfile && oldTeacherProfile.classes) {
        oldTeacherProfile.classes = oldTeacherProfile.classes.filter(id => id.toString() !== classId);
        await oldTeacherProfile.save();
      }

      classDoc.teacherId = input.teacherId;

      // Add to new teacher
      const newTeacherProfile = await TeacherProfile.findOne({ userId: input.teacherId });
      if (newTeacherProfile && !newTeacherProfile.classes?.includes(classDoc._id.toString())) {
        newTeacherProfile.classes = newTeacherProfile.classes || [];
        newTeacherProfile.classes.push(classDoc._id);
        await newTeacherProfile.save();
      }
    }

    await classDoc.save();

    return {
      success: true,
      message: 'Class updated successfully',
      data: await classDoc.populate('teacherId'),
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

    const classDoc = await ClassModel.findByIdAndDelete(classId);
    if (!classDoc) {
      return { success: false, message: 'Class not found', statusCode: 404 };
    }

    // Remove from teacher's classes
    const teacherProfile = await TeacherProfile.findOne({ userId: classDoc.teacherId });
    if (teacherProfile && teacherProfile.classes) {
      teacherProfile.classes = teacherProfile.classes.filter(id => id.toString() !== classId);
      await teacherProfile.save();
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