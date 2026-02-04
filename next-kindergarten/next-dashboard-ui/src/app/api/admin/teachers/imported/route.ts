import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeacherProfile from '@/lib/models/TeacherProfile';

/**
 * Get imported teachers with status
 * GET /api/admin/teachers/imported
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get teachers imported recently (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const importedTeachers = await User.find({
      role: 'teacher',
      importedAt: { $gte: thirtyDaysAgo }
    }).select('name email phone passwordExpiry importedAt firstLogin profileUpdated createdAt');

    const teachersWithStatus = await Promise.all(
      importedTeachers.map(async (teacher) => {
        const profile = await TeacherProfile.findOne({ userId: teacher._id }).select('employeeId qualification subjects');

        const now = new Date();
        const isExpired = teacher.passwordExpiry && teacher.passwordExpiry < now;
        const hasResponded = teacher.firstLogin || teacher.profileUpdated;

        return {
          id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone,
          employeeId: profile?.employeeId,
          qualification: profile?.qualification,
          subjects: profile?.subjects,
          importedAt: teacher.importedAt,
          passwordExpiry: teacher.passwordExpiry,
          firstLogin: teacher.firstLogin,
          profileUpdated: teacher.profileUpdated,
          status: isExpired ? 'expired' : hasResponded ? 'responded' : 'pending',
        };
      })
    );

    return NextResponse.json({ teachers: teachersWithStatus }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}