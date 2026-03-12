import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import ActivityRecord from '@/lib/models/ActivityRecord';
import ActivityPerformance from '@/lib/models/ActivityPerformance';
import '@/lib/models/Class';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 });
    }

    await connectDB();

    const activity = await ActivityRecord.findById(params.id)
      .populate('createdBy', 'name email')
      .populate('classId', 'name grade')
      .lean();

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json(activity);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid activity id' }, { status: 400 });
    }

    await connectDB();

    const activity = await ActivityRecord.findByIdAndDelete(params.id);
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Clean up related performance records
    await ActivityPerformance.deleteMany({ activityId: params.id });

    return NextResponse.json({ message: 'Activity deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
