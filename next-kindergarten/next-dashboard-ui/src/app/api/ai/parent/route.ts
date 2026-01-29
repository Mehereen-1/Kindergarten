import { NextRequest, NextResponse } from 'next/server';
import { getStudentsByParentId, getStudentDetails } from '@/lib/ai/dataFetcher';

/**
 * GET /api/ai/parent/students?parentId=xxx
 * Get all students belonging to a parent
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');

    if (!parentId) {
      return NextResponse.json(
        { success: false, message: 'Parent ID is required' },
        { status: 400 }
      );
    }

    const students = await getStudentsByParentId(parentId);

    return NextResponse.json({
      success: students.length > 0,
      data: students,
      message: `Found ${students.length} student(s)`,
      count: students.length,
    });
  } catch (error) {
    console.error('Error fetching parent students:', error);
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
 * POST /api/ai/parent/student-details
 * Get detailed information about a specific student
 * 
 * Request body:
 * {
 *   "studentId": "student_id",
 *   "parentId": "parent_id"  // for verification
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { studentId, parentId } = await req.json();

    if (!studentId) {
      return NextResponse.json(
        { success: false, message: 'Student ID is required' },
        { status: 400 }
      );
    }

    const student = await getStudentDetails(studentId);

    // Optional: Verify the student belongs to the parent
    if (student && parentId && student.id !== parentId) {
      // You might want to check if parentId actually owns this student
      // This is a security consideration
    }

    return NextResponse.json({
      success: !!student,
      data: student,
      message: student ? 'Student details retrieved successfully' : 'Student not found',
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
