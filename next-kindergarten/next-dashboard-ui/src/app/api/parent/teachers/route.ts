import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeacherProfile from '@/lib/models/TeacherProfile';
import Student from '@/lib/models/Student';

/**
 * Get all teachers for parent to browse and contact
 * GET /api/parent/teachers
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get parent from cookies
    const userCookie = request.cookies.get('user')?.value;
    if (!userCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = JSON.parse(decodeURIComponent(userCookie));
    const parentId = user.id;

    // Get parent's children to find their teachers
    const children = await Student.find({ parentId })
      .select('name className')
      .lean();

    // Get all teachers with their profiles
    const teachers = await User.find({ role: 'teacher' })
      .select('name email')
      .lean();

    const teachersWithDetails = await Promise.all(
      teachers.map(async (teacher) => {
        const profile = await TeacherProfile.findOne({ userId: teacher._id })
          .select('subject phone')
          .lean();

        // Check if this teacher teaches any of the parent's children
        const isChildTeacher = children.some(
          child => profile && child.className === profile.subject
        );

        return {
          id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          subject: profile?.subject || 'N/A',
          phone: profile?.phone || 'N/A',
          isChildTeacher, // Highlight if this is their child's teacher
        };
      })
    );

    // Sort: child's teachers first, then alphabetically
    teachersWithDetails.sort((a, b) => {
      if (a.isChildTeacher && !b.isChildTeacher) return -1;
      if (!a.isChildTeacher && b.isChildTeacher) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ teachers: teachersWithDetails }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
