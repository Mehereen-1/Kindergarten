import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Event from '@/lib/models/Event';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await connectDB();

    const body = await request.json();
    const updates: any = {};

    if (body.title !== undefined) updates.title = String(body.title || '').trim();
    if (body.description !== undefined) updates.description = String(body.description || '').trim();
    if (body.location !== undefined) updates.location = String(body.location || '').trim();
    if (body.targetRole !== undefined) updates.targetRole = body.targetRole;
    if (body.allDay !== undefined) updates.allDay = Boolean(body.allDay);

    if (body.startDate !== undefined) {
      const start = new Date(body.startDate);
      if (Number.isNaN(start.getTime())) {
        return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
      }
      updates.startDate = start;
    }

    if (body.endDate !== undefined) {
      const end = new Date(body.endDate);
      if (Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
      }
      updates.endDate = end;
    }

    if (updates.startDate && updates.endDate && updates.endDate < updates.startDate) {
      return NextResponse.json({ error: 'endDate cannot be earlier than startDate' }, { status: 400 });
    }

    const event = await Event.findByIdAndUpdate(params.eventId, updates, { new: true })
      .populate('createdBy', 'name email role')
      .lean();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await connectDB();

    const event = await Event.findByIdAndDelete(params.eventId).lean();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete event' }, { status: 500 });
  }
}
