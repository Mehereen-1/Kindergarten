import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ParentVerification from '@/lib/models/ParentVerification';

export const runtime = 'nodejs';

function getSessionUser(request: NextRequest) {
  const userCookie = request.cookies.get('user')?.value;
  if (!userCookie) return null;

  try {
    return JSON.parse(decodeURIComponent(userCookie));
  } catch {
    return null;
  }
}

function plainify<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const sessionUser = getSessionUser(request);
    if (!sessionUser?.id || String(sessionUser.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status') || '';
    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }

    const verifications = await ParentVerification.find(filter)
      .populate('userId', 'name email phone role')
      .populate('reviewedBy', 'name email role')
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ verifications: plainify(verifications) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const sessionUser = getSessionUser(request);
    if (!sessionUser?.id || String(sessionUser.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const verificationId = String(body?.verificationId || '').trim();
    const status = String(body?.status || '').trim();

    if (!verificationId) {
      return NextResponse.json({ error: 'verificationId is required' }, { status: 400 });
    }

    if (!['approved', 'rejected', 'needs_review', 'auto_verified'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const verification = await ParentVerification.findByIdAndUpdate(
      verificationId,
      {
        $set: {
          status,
          reviewedBy: sessionUser.id,
          reviewedAt: new Date(),
        },
      },
      { new: true }
    )
      .populate('userId', 'name email phone role')
      .populate('reviewedBy', 'name email role');

    if (!verification) {
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, verification: plainify(verification) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

