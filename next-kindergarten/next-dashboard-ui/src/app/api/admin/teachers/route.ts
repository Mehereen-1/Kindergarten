import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeacherProfile from '@/lib/models/TeacherProfile';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const teachers = await User.find({ role: 'teacher' }).select('-password');
    return NextResponse.json(teachers);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
