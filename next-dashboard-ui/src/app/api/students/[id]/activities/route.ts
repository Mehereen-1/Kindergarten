import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '../../../../../lib/mongodb';
import ActivityPerformance from '../../../../../lib/models/ActivityPerformance';
import '../../../../../lib/models/ActivityRecord';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid student id' }, { status: 400 });
    }

    await connectDB();

    const records = await ActivityPerformance.find({ studentId: params.id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'activityId',
        select: 'title subject date',
      })
      .lean();

    const items = records
      .filter((r: any) => r.activityId)
      .map((r: any) => ({
        activityId: r.activityId._id,
        title: r.activityId.title,
        subject: r.activityId.subject,
        date: r.activityId.date,
        performanceLevel: r.performanceLevel,
        remarks: r.remarks || '',
      }));

    return NextResponse.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}