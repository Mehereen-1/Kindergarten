import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeacherProfile from '@/lib/models/TeacherProfile';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const teacher = await User.findOne({ _id: params.id, role: 'teacher' })
      .select('-password')
      .lean();

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const profile = await TeacherProfile.findOne({ userId: teacher._id })
      .populate('classes', 'name classId')
      .lean();

    const classes = Array.isArray(profile?.classes)
      ? profile.classes
          .map((classDoc: any) => classDoc?.name || classDoc?.classId)
          .filter(Boolean)
      : [];

    return NextResponse.json({
      teacher: {
        ...teacher,
        teacherId: profile?.employeeId || '',
        subjects: profile?.subjects || [],
        classes,
        qualification: profile?.qualification || '',
        joiningDate: profile?.joiningDate || null,
        photo: profile?.photo || (teacher as any).profilePic || '',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load teacher';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

