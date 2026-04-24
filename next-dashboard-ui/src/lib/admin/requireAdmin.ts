import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin/session';

type RequireAdminSuccess = {
  ok: true;
  admin: any;
  payload: {
    sub: string;
    email: string;
    role: 'admin';
    iat: number;
    exp: number;
  };
};

type RequireAdminFailure = {
  ok: false;
  response: NextResponse;
};

export async function requireAdminSession(
  request: NextRequest
): Promise<RequireAdminSuccess | RequireAdminFailure> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const payload = verifyAdminSessionToken(token);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }),
    };
  }

  await connectDB();
  const admin = await Admin.findById(payload.sub);

  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Admin session not found' }, { status: 401 }),
    };
  }

  return { ok: true, admin, payload };
}
