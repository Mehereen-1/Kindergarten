import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import { extractSessionUser } from '@/lib/auth';

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    const sessionRole = String(sessionUser?.role || request.cookies.get('userRole')?.value || '')
      .trim()
      .toLowerCase();

    if (!sessionUser?.id) {
      return NextResponse.json(
        { error: 'Unauthorized: sign in required to access events' },
        { status: 401 }
      );
    }

    if (sessionRole !== 'admin' && sessionRole !== 'teacher' && sessionRole !== 'parent') {
      return NextResponse.json(
        { error: `Forbidden: role "${sessionRole || 'unknown'}" cannot access events` },
        { status: 403 }
      );
    }

    const requestedRole = (searchParams.get('role') || 'all').toLowerCase();
    const role = sessionRole === 'admin' ? requestedRole : sessionRole;
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

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    const sessionRole = String(sessionUser?.role || request.cookies.get('userRole')?.value || '')
      .trim()
      .toLowerCase();

    if (!sessionUser?.id) {
      return NextResponse.json(
        { error: 'Unauthorized: sign in required to create events' },
        { status: 401 }
      );
    }

    if (sessionRole !== 'admin' && sessionRole !== 'teacher') {
      return NextResponse.json(
        { error: `Forbidden: role "${sessionRole || 'unknown'}" cannot create events` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      startDate,
      endDate,
      allDay,
      location,
      targetRole,
    } = body || {};

    if (!title || !startDate) {
      return NextResponse.json({ error: 'title and startDate are required' }, { status: 400 });
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
      createdBy: sessionUser.id,
      createdByRole: sessionRole,
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
