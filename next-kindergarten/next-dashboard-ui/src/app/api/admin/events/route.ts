import { connectDB } from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const events = await Event.find()
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
    
    return NextResponse.json(events);
  } catch (error) {
    // @ts-ignore
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    // Validate required fields
    if (!data.title || !data.date || !data.type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const event = await Event.create(data);
    const populatedEvent = await event.populate('createdBy', 'name email');

    return NextResponse.json(populatedEvent, { status: 201 });
  } catch (error) {
    // @ts-ignore
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
