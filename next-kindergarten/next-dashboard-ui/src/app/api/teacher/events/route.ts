import { connectDB } from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    const events = await Event.find({ targetRole: { $in: ['all', 'teacher'] } })
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 });

    return NextResponse.json(events);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
