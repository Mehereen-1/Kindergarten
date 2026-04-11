import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import Notice from '@/lib/models/Notice';
import User from '@/lib/models/User';
import PushSubscriptionModel from '@/lib/models/PushSubscription';
import { sendEmail, buildReminderEmail } from '@/lib/email';
import { sendPush } from '@/lib/webpush';

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

type ReminderTiming = 'day-before' | 'day-of';

async function processEvents(
  events: any[],
  timing: ReminderTiming,
  now: Date,
  emailResults: string[],
  pushResults: { sent: number; failed: number }
) {
  const fallbackCreator = await User.findOne().select('_id').lean();

  const roleSets: Record<string, string[]> = { all: ['admin', 'teacher', 'parent', 'student'] };

  for (const event of events) {
    const eventDate = new Date(event.startDate);
    const dateStr = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // 1. Create notice record
    await Notice.create({
      title: timing === 'day-before' ? `Reminder: ${event.title} is tomorrow` : `Today: ${event.title}`,
      description: event.description || (timing === 'day-before' ? 'Upcoming event reminder' : 'Event day reminder'),
      date: now,
      targetRole: event.targetRole || 'all',
      type: 'event-reminder',
      sourceEventId: event._id,
      createdBy: event.createdBy || fallbackCreator?._id,
    });

    // 2. Find target users
    const targetRole: string = event.targetRole || 'all';
    const roles: string[] = targetRole === 'all' ? roleSets.all : [targetRole];
    const users = await User.find({ role: { $in: roles } }).select('email name').lean();

    // 3. Send emails
    if (users.length > 0) {
      const emailPayload = buildReminderEmail({
        eventTitle: event.title,
        eventDate: dateStr,
        description: event.description,
        location: event.location,
        timing,
      });
      const emails = users.map((u: any) => u.email).filter(Boolean);
      try {
        const result = await sendEmail(emails, emailPayload);
        const msg = `Email sent for "${event.title}" to ${emails.length} users${result.previewUrl ? ' — Preview: ' + result.previewUrl : ''}`;
        emailResults.push(msg);
        console.log('[Reminder]', msg);
      } catch (err: any) {
        emailResults.push(`Email FAILED for "${event.title}": ${err?.message}`);
        console.error('[Reminder] Email error:', err?.message);
      }
    }

    // 4. Send Web Push to subscribed devices
    const targetRoles = targetRole === 'all' ? ['admin', 'teacher', 'parent', 'student'] : [targetRole];
    const pushPayload = {
      title: timing === 'day-before' ? `Reminder: ${event.title} is tomorrow` : `Today: ${event.title}`,
      body: event.description || (timing === 'day-before' ? 'Upcoming event at your school.' : 'Event is happening today!'),
      tag: `event-${event._id}-${timing}`,
      url: '/list/events',
    };

    const subscriptions = await PushSubscriptionModel.find({
      userRole: { $in: targetRoles },
    }).lean();

    for (const subDoc of subscriptions) {
      const sub = { endpoint: subDoc.endpoint, keys: subDoc.keys } as any;
      const ok = await sendPush(sub, pushPayload);
      if (ok) {
        pushResults.sent += 1;
      } else {
        pushResults.failed += 1;
        // Clean up expired subscriptions
        await PushSubscriptionModel.deleteOne({ endpoint: subDoc.endpoint });
      }
    }

    // 5. Mark event as reminded
    if (timing === 'day-before') {
      event.reminderDayBeforeSentAt = now;
    } else {
      event.reminderDayOfSentAt = now;
    }
    await event.save();
  }
}

async function runReminderJob(request: NextRequest) {
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

  const emailResults: string[] = [];
  const pushResults = { sent: 0, failed: 0 };

  await processEvents(dayBeforeEvents, 'day-before', now, emailResults, pushResults);
  await processEvents(dayOfEvents, 'day-of', now, emailResults, pushResults);

  return NextResponse.json({
    success: true,
    asOf: now.toISOString(),
    remindersCreated: dayBeforeEvents.length + dayOfEvents.length,
    dayBeforeEventsProcessed: dayBeforeEvents.length,
    dayOfEventsProcessed: dayOfEvents.length,
    emailsSent: emailResults,
    pushNotifications: pushResults,
  });
}

function hasValidCronSecret(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization') || '';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  try {
    return await runReminderJob(request);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to process reminders' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
  }

  try {
    return await runReminderJob(request);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to process reminders' }, { status: 500 });
  }
}
