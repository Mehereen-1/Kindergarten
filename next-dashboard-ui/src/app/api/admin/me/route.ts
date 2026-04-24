import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/requireAdmin';

export async function GET(request: NextRequest) {
  const sessionResult = await requireAdminSession(request);
  if (!sessionResult.ok) {
    return sessionResult.response;
  }

  return NextResponse.json(
    {
      admin: {
        id: String(sessionResult.admin._id),
        email: sessionResult.admin.email,
        isFirstLogin: sessionResult.admin.isFirstLogin,
      },
    },
    { status: 200 }
  );
}
