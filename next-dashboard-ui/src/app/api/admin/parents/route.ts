import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import ParentProfile from '@/lib/models/ParentProfile';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const parents = await User.find({ role: 'parent' }).select('-password');
    return NextResponse.json(parents);
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

    // Check if parent already exists
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return NextResponse.json(
        { error: 'Parent already exists' },
        { status: 400 }
      );
    }

    const parent = await User.create({
      ...data,
      role: 'parent'
    });

    return NextResponse.json(parent, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
