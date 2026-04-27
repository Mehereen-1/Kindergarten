import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeacherProfile from '@/lib/models/TeacherProfile';
import Class from '@/lib/models/Class';
import TeacherClassAssignment from '@/lib/models/TeacherClassAssignment';
import ClassSubjectAssignment from '@/lib/models/ClassSubjectAssignment';

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const data = await request.json();
    const teacher = await User.findOne({ _id: params.id, role: 'teacher' });
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const email = String(data.email || '').trim().toLowerCase();
    if (!data.name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const existingEmail = await User.findOne({
      _id: { $ne: params.id },
      email,
    }).lean();
    if (existingEmail) {
      return NextResponse.json({ error: 'Another user already uses this email' }, { status: 400 });
    }

    teacher.name = String(data.name).trim();
    teacher.email = email;
    teacher.phone = data.phone ? String(data.phone).trim() : undefined;
    teacher.address = data.address ? String(data.address).trim() : undefined;
    await teacher.save();

    const subjects = String(data.subjects || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    await TeacherProfile.findOneAndUpdate(
      { userId: teacher._id },
      {
        userId: teacher._id,
        employeeId: data.teacherId ? String(data.teacherId).trim() : undefined,
        qualification: data.qualification ? String(data.qualification).trim() : undefined,
        subjects,
      },
      { upsert: true, new: true }
    );

    const refreshed = await User.findById(params.id).select('-password').lean();
    return NextResponse.json({ teacher: refreshed, message: 'Teacher updated successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update teacher';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const teacher = await User.findOneAndDelete({ _id: params.id, role: 'teacher' });
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    await Promise.all([
      TeacherProfile.deleteOne({ userId: teacher._id }),
      TeacherClassAssignment.deleteMany({ teacherId: teacher._id }),
      ClassSubjectAssignment.deleteMany({ teacherId: teacher._id }),
      Class.updateMany({ teacherId: teacher._id }, { $unset: { teacherId: '' } }),
    ]);

    return NextResponse.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete teacher';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
