import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import ParentProfile from '@/lib/models/ParentProfile';
import Student from '@/lib/models/Student';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const parents = await User.find({ role: 'parent' }).select('-password').lean();
    const parentIds = parents.map((parent: any) => parent._id);

    const students = await Student.find({ parentId: { $in: parentIds } })
      .select('name parentId')
      .lean();

    const studentNamesByParent = new Map<string, string[]>();
    students.forEach((student: any) => {
      const parentId = String(student.parentId);
      if (!studentNamesByParent.has(parentId)) {
        studentNamesByParent.set(parentId, []);
      }
      studentNamesByParent.get(parentId)?.push(student.name);
    });

    const response = parents.map((parent: any) => ({
      ...parent,
      students: studentNamesByParent.get(String(parent._id)) || [],
    }));

    return NextResponse.json({ parents: response, count: response.length });
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
