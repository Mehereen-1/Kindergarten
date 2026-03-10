import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import Notice from '@/lib/models/Notice';
import User from '@/lib/models/User';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const asOfParam = request.nextUrl.searchParams.get('asOf');
    const asOfDate = asOfParam ? new Date(asOfParam) : null;
    const now = asOfDate && !Number.isNaN(asOfDate.getTime()) ? asOfDate : new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const tomorrowStart = startOfDay(addDays(now, 1));
    const tomorrowEnd = endOfDay(addDays(now, 1));

    const dayBeforeEvents = await Event.find({
      startDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
      reminderDayBeforeSentAt: { $exists: false },
    });

    const dayOfEvents = await Event.find({
      startDate: { $gte: todayStart, $lte: todayEnd },
      reminderDayOfSentAt: { $exists: false },
    });

    const fallbackCreator = await User.findOne().select('_id').lean();
    const fallbackCreatorId = fallbackCreator?._id;

    let createdNotices = 0;

    for (const event of dayBeforeEvents) {
      await Notice.create({
        title: `Reminder: ${event.title} is tomorrow`,
        description: event.description || 'Upcoming event reminder',
        date: now,
        targetRole: event.targetRole || 'all',
        type: 'event-reminder',
        sourceEventId: event._id,
        createdBy: event.createdBy || fallbackCreatorId,
      });

      event.reminderDayBeforeSentAt = now;
      await event.save();
      createdNotices += 1;
    }

    for (const event of dayOfEvents) {
      await Notice.create({
        title: `Today: ${event.title}`,
        description: event.description || 'Event day reminder',
        date: now,
        targetRole: event.targetRole || 'all',
        type: 'event-reminder',
        sourceEventId: event._id,
        createdBy: event.createdBy || fallbackCreatorId,
      });

      event.reminderDayOfSentAt = now;
      await event.save();
      createdNotices += 1;
    }

    return NextResponse.json({
      success: true,
      asOf: now.toISOString(),
      remindersCreated: createdNotices,
      dayBeforeEventsProcessed: dayBeforeEvents.length,
      dayOfEventsProcessed: dayOfEvents.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to process reminders' }, { status: 500 });
  }
}
