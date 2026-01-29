import { NextRequest, NextResponse } from 'next/server';
import { getClassStudents, getTeacherSchedule } from '@/lib/ai/dataFetcher';

/**
 * GET /api/ai/teacher/schedule?teacherId=xxx
 * Get teacher's schedule and assigned classes
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json(
        { success: false, message: 'Teacher ID is required' },
        { status: 400 }
      );
    }

    const schedule = await getTeacherSchedule(teacherId);

    return NextResponse.json({
      success: !!schedule,
      data: schedule,
      message: schedule ? 'Schedule retrieved successfully' : 'Teacher not found',
    });
  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/teacher/class-students
 * Get all students in a specific class
 * 
 * Request body:
 * {
 *   "classId": "class_id",
 *   "teacherId": "teacher_id"  // for verification
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { classId, teacherId } = await req.json();

    if (!classId) {
      return NextResponse.json(
        { success: false, message: 'Class ID is required' },
        { status: 400 }
      );
    }

    // Get students in the class
    const students = await getClassStudents(classId);

    return NextResponse.json({
      success: students.length > 0,
      data: students,
      message: `Found ${students.length} students in the class`,
      count: students.length,
    });
  } catch (error) {
    console.error('Error fetching class students:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
