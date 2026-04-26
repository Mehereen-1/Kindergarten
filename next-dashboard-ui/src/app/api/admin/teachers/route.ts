import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeacherProfile from '@/lib/models/TeacherProfile';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const teachers = await User.find({ role: 'teacher' }).select('-password').lean();
    const teacherIds = teachers.map((teacher) => teacher._id);

    const profiles = await TeacherProfile.find({ userId: { $in: teacherIds } })
      .populate('classes', 'name')
      .lean();

    const profileByUserId = new Map(
      profiles.map((profile) => [profile.userId.toString(), profile])
    );

    const response = teachers.map((teacher) => {
      const profile = profileByUserId.get(teacher._id.toString());
      const classes = Array.isArray(profile?.classes)
        ? profile?.classes.map((classDoc: any) => classDoc?.name).filter(Boolean)
        : [];

      return {
        ...teacher,
        teacherId: profile?.employeeId || '',
        subjects: profile?.subjects || [],
        classes,
        photo: profile?.photo || teacher.profilePic || '',
      };
    });

    return NextResponse.json({
      teachers: response,
      count: response.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load teachers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.email || !data.phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if teacher already exists
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return NextResponse.json(
        { error: 'Teacher already exists' },
        { status: 400 }
      );
    }

    const teacher = await User.create({
      ...data,
      role: 'teacher'
    });

    return NextResponse.json(teacher, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create teacher';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
