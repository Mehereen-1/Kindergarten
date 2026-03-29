import { connectDB } from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const role = (searchParams.get('role') || 'admin').toLowerCase();

    const events = await Event.find()
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 });

    const filtered = role === 'all' ? events : events.filter((event: any) => ['all', role].includes(event.targetRole || 'all'));
    
    return NextResponse.json(filtered);
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
    if (!data.title || !data.startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const event = await Event.create({
      title: data.title,
      description: data.description || '',
      startDate: data.startDate,
      endDate: data.endDate || data.startDate,
      allDay: data.allDay ?? true,
      location: data.location || '',
      targetRole: data.targetRole || 'all',
      createdBy: data.createdBy,
      createdByRole: 'admin',
      sourceType: 'manual',
    });
    const populatedEvent = await event.populate('createdBy', 'name email');

    return NextResponse.json(populatedEvent, { status: 201 });
  } catch (error) {
    // @ts-ignore
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
