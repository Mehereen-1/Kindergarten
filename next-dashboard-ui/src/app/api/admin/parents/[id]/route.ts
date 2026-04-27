import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import ParentProfile from '@/lib/models/ParentProfile';
import Student from '@/lib/models/Student';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const data = await request.json();
    const parent = await User.findOne({ _id: params.id, role: 'parent' });
    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
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

    parent.name = String(data.name).trim();
    parent.email = email;
    parent.phone = data.phone ? String(data.phone).trim() : undefined;
    parent.address = data.address ? String(data.address).trim() : undefined;
    await parent.save();

    await ParentProfile.findOneAndUpdate(
      { userId: parent._id },
      {
        userId: parent._id,
        address: parent.address,
        occupation: data.occupation ? String(data.occupation).trim() : undefined,
      },
      { upsert: true, new: true }
    );

    const updatedParent = await User.findById(params.id).select('-password').lean();
    return NextResponse.json({ parent: updatedParent, message: 'Parent updated successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update parent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const childCount = await Student.countDocuments({ parentId: params.id });
    if (childCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete this parent while students are assigned to them' },
        { status: 400 }
      );
    }

    const parent = await User.findOneAndDelete({ _id: params.id, role: 'parent' });
    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    await ParentProfile.deleteOne({ userId: parent._id });
    return NextResponse.json({ message: 'Parent deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete parent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
