import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Event from '@/lib/models/Event';

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const role = (searchParams.get('role') || 'all').toLowerCase();
    const fromDate = parseDate(searchParams.get('from'));
    const toDate = parseDate(searchParams.get('to'));

    const query: any = {};

    if (role !== 'all') {
      query.targetRole = { $in: ['all', role] };
    }

    if (fromDate || toDate) {
      query.startDate = {};
      if (fromDate) query.startDate.$gte = fromDate;
      if (toDate) query.startDate.$lte = toDate;
    }

    const events = await Event.find(query)
      .populate('createdBy', 'name email role')
      .sort({ startDate: 1 })
      .lean();

    return NextResponse.json({ events, count: events.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      title,
      description,
      startDate,
      endDate,
      allDay,
      location,
      targetRole,
      createdBy,
      createdByRole,
    } = body || {};

    if (!title || !startDate) {
      return NextResponse.json({ error: 'title and startDate are required' }, { status: 400 });
    }

    if (!['admin', 'teacher'].includes(String(createdByRole || ''))) {
      return NextResponse.json({ error: 'Only admin or teacher can create events' }, { status: 403 });
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate or endDate' }, { status: 400 });
    }

    if (end < start) {
      return NextResponse.json({ error: 'endDate cannot be earlier than startDate' }, { status: 400 });
    }

    const event = await Event.create({
      title: String(title).trim(),
      description: String(description || '').trim(),
      startDate: start,
      endDate: end,
      allDay: Boolean(allDay ?? true),
      location: String(location || '').trim(),
      targetRole: ['all', 'teacher', 'parent', 'student'].includes(targetRole) ? targetRole : 'all',
      createdBy: createdBy || undefined,
      createdByRole,
      sourceType: 'manual',
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('createdBy', 'name email role')
      .lean();

    return NextResponse.json(populatedEvent, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create event' }, { status: 500 });
  }
}
