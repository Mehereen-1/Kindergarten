import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TeacherClassAssignment from '@/lib/models/TeacherClassAssignment';
import Class from '@/lib/models/Class';
import User from '@/lib/models/User';

/**
 * GET /api/admin/assign-teachers
 * Get all teacher-class assignments or filter by teacherId/classId
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    const academicYear = searchParams.get('academicYear') || String(new Date().getFullYear());

    let query: any = { academicYear };
    if (teacherId) query.teacherId = teacherId;
    if (classId) query.classId = classId;

    const assignments = await TeacherClassAssignment.find(query)
      .populate('teacherId', 'name email')
      .populate('classId', 'name grade classId')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      assignments,
      count: assignments.length,
    });
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/assign-teachers
 * Assign a teacher to a class
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { teacherId, classId, academicYear, role } = body;

    if (!teacherId || !classId) {
      return NextResponse.json(
        { success: false, error: 'Teacher ID and Class ID are required' },
        { status: 400 }
      );
    }

    const currentYear = academicYear || String(new Date().getFullYear());

    // Check if teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: 'Teacher not found' },
        { status: 404 }
      );
    }

    // Check if class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    // Check if assignment already exists
    const existing = await TeacherClassAssignment.findOne({
      teacherId,
      classId,
      academicYear: currentYear,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Teacher is already assigned to this class' },
        { status: 400 }
      );
    }

    // Create assignment
    const assignment = await TeacherClassAssignment.create({
      teacherId,
      classId,
      academicYear: currentYear,
      role: role || 'Class Teacher',
      status: 'active',
    });

    const populatedAssignment = await TeacherClassAssignment.findById(assignment._id)
      .populate('teacherId', 'name email')
      .populate('classId', 'name grade classId')
      .lean();

    return NextResponse.json({
      success: true,
      message: `${teacher.name} assigned to ${classDoc.name} successfully`,
      assignment: populatedAssignment,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/assign-teachers
 * Remove a teacher-class assignment
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json(
        { success: false, error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    const assignment = await TeacherClassAssignment.findByIdAndDelete(assignmentId);

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment removed successfully',
    });

  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
