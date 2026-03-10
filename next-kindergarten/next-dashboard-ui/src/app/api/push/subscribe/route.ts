import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import PushSubscriptionModel from '@/lib/models/PushSubscription';

function getCookie(req: NextRequest, name: string): string {
  return req.cookies.get(name)?.value || '';
}

// POST /api/push/subscribe — save a push subscription for the current user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    const userEmail = getCookie(request, 'user');
    const userRole = getCookie(request, 'userRole') as 'admin' | 'teacher' | 'parent' | 'student';

    if (!userEmail || !userRole) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();

    // Upsert by endpoint — same device can re-subscribe without duplicates
    await PushSubscriptionModel.findOneAndUpdate(
      { endpoint },
      { endpoint, keys, userEmail, userRole },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save subscription' }, { status: 500 });
  }
}

// DELETE /api/push/subscribe — remove subscription (unsubscribe)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });

    await connectDB();
    await PushSubscriptionModel.deleteOne({ endpoint });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to remove subscription' }, { status: 500 });
  }
}
