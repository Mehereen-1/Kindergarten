import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/mongodb';
import ActivityRecord from '../../../../lib/models/ActivityRecord';
import '../../../../lib/models/Class';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const createdBy = searchParams.get('createdBy');
    const subject = searchParams.get('subject');
    const classId = searchParams.get('classId');

    await connectDB();

    const query: Record<string, unknown> = {};
    if (createdBy) query.createdBy = createdBy;
    if (subject) query.subject = subject;
    if (classId) query.classId = classId;

    const activities = await ActivityRecord.find(query)
      .sort({ date: -1 })
      .populate('createdBy', 'name email')
      .populate('classId', 'name grade')
      .lean();

    return NextResponse.json(activities);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}