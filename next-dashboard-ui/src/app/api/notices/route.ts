import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Notice from '@/lib/models/Notice';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const role = (request.nextUrl.searchParams.get('role') || 'all').toLowerCase();
    const limit = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get('limit') || 50), 200));

    const query: any = {};
    if (role !== 'all') {
      query.targetRole = { $in: ['all', role] };
    }

    const notices = await Notice.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ notices, count: notices.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch notices' }, { status: 500 });
  }
}
