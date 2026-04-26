import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import { extractSessionUser } from '@/lib/auth';

/**
 * GET /api/parent/children?parentId={id}
 * Get all children for a parent
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    const userRole = String(sessionUser?.role || request.cookies.get('userRole')?.value || '')
      .trim()
      .toLowerCase();
    const requestedParentId = request.nextUrl.searchParams.get('parentId');
    let parentId = sessionUser?.id || '';
    const academicYear = request.nextUrl.searchParams.get('academicYear') || String(new Date().getFullYear());

    if (!sessionUser?.id) {
      return NextResponse.json(
        { error: 'Unauthorized: sign in required to access parent children data' },
        { status: 401 }
      );
    }

    if (userRole !== 'parent' && userRole !== 'admin') {
      return NextResponse.json(
        { error: `Forbidden: role "${userRole || 'unknown'}" cannot access parent children data` },
        { status: 403 }
      );
    }

    if (userRole === 'admin') {
      parentId = requestedParentId || '';
      if (!parentId) {
        return NextResponse.json(
          { error: 'parentId is required for admin requests' },
          { status: 400 }
        );
      }
    } else if (requestedParentId && requestedParentId !== sessionUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: parents can only access their own children records' },
        { status: 403 }
      );
    }

    if (!parentId) {
      return NextResponse.json(
        { error: 'parentId is required' },
        { status: 400 }
      );
    }

    const children = await Student.find({ parentId }).select(
      'name email phone address bloodGroup birthday sex profilePic'
    );

    const histories = await StudentClassHistory.find({
      studentId: { $in: children.map((child) => child._id) },
      academicYear,
    })
      .populate('classId', 'name classId grade')
      .lean();

    const historyByStudent = new Map(
      histories.map((history) => [history.studentId.toString(), history])
    );

    const response = children.map((child) => {
      const history = historyByStudent.get(child._id.toString());
      return {
        ...child.toObject(),
        currentClass: history?.classId || null,
        academicYear: history?.academicYear || academicYear,
        rollNo: history?.rollNo || null,
      };
    });

    return NextResponse.json({
      children: response || []
    });
  } catch (error: any) {
    console.error('Error fetching children:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
