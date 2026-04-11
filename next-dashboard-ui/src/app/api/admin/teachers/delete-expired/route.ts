import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeacherProfile from '@/lib/models/TeacherProfile';

/**
 * Delete expired imported teachers
 * POST /api/admin/teachers/delete-expired
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const now = new Date();

    // Find expired teachers who haven't responded
    const expiredTeachers = await User.find({
      role: 'teacher',
      passwordExpiry: { $lt: now },
      $or: [
        { firstLogin: { $exists: false } },
        { firstLogin: null }
      ],
      importedAt: { $exists: true }
    });

    const deletedIds: string[] = [];

    for (const teacher of expiredTeachers) {
      // Delete teacher profile
      await TeacherProfile.findOneAndDelete({ userId: teacher._id });

      // Delete user
      await User.findByIdAndDelete(teacher._id);

      deletedIds.push(teacher._id.toString());
    }

    return NextResponse.json({
      message: `Deleted ${deletedIds.length} expired teachers`,
      deletedIds
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
