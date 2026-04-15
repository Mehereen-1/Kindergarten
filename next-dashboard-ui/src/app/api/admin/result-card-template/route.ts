import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ResultCardTemplate from '@/lib/models/ResultCardTemplate';
import User from '@/lib/models/User';
import { extractSessionUserId } from '@/lib/auth';
import {
  getResolvedResultCardTemplate,
  normalizeResultCardTemplateInput,
} from '@/lib/result-card';

async function resolveAdminUserId(rawCookieValue?: string) {
  const sessionUserId = extractSessionUserId(rawCookieValue);
  if (sessionUserId) return sessionUserId;

  const fallbackAdmin = await User.findOne({ role: 'admin' }).select('_id').lean();
  return fallbackAdmin?._id ? String(fallbackAdmin._id) : null;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const examCycleId = request.nextUrl.searchParams.get('examCycleId');
    if (!examCycleId) {
      return NextResponse.json(
        { success: false, error: 'examCycleId is required' },
        { status: 400 }
      );
    }

    const template = await getResolvedResultCardTemplate(examCycleId);
    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const examCycleId = String(body?.examCycleId || '').trim();

    if (!examCycleId) {
      return NextResponse.json(
        { success: false, error: 'examCycleId is required' },
        { status: 400 }
      );
    }

    const adminUserId = await resolveAdminUserId(request.cookies.get('user')?.value);
    if (!adminUserId) {
      return NextResponse.json(
        { success: false, error: 'Admin session not found' },
        { status: 401 }
      );
    }

    const normalized = normalizeResultCardTemplateInput(body);

    const template = await ResultCardTemplate.findOneAndUpdate(
      { examCycleId },
      {
        $set: {
          examCycleId,
          ...normalized,
          updatedBy: adminUserId,
        },
        $setOnInsert: {
          createdBy: adminUserId,
        },
      },
      {
        upsert: true,
        new: true,
      }
    ).lean();

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
