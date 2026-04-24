import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { adminLoginSchema } from '@/lib/admin/validators';
import { createAdminSessionToken, setAdminSessionCookie } from '@/lib/admin/session';
import { getRequestIP } from '@/lib/admin/ip';
import { logAdminAction } from '@/lib/admin/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    await connectDB();

    const admin = await Admin.findOne({ email: parsed.data.email });
    if (!admin || !admin.password) {
      if (admin?._id) {
        await logAdminAction(String(admin._id), 'ADMIN_LOGIN_FAIL', getRequestIP(request), {
          reason: 'INVALID_CREDENTIALS',
        });
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (admin.isFirstLogin) {
      await logAdminAction(String(admin._id), 'ADMIN_LOGIN_FAIL', getRequestIP(request), {
        reason: 'INITIAL_SETUP_REQUIRED',
      });
      return NextResponse.json(
        { error: 'Initial setup is required before login' },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(parsed.data.password, admin.password);
    if (!passwordMatch) {
      await logAdminAction(String(admin._id), 'ADMIN_LOGIN_FAIL', getRequestIP(request), {
        reason: 'INVALID_CREDENTIALS',
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await logAdminAction(String(admin._id), 'ADMIN_LOGIN_SUCCESS', getRequestIP(request));

    const response = NextResponse.json(
      {
        message: 'Admin login successful',
        admin: {
          id: String(admin._id),
          email: admin.email,
        },
      },
      { status: 200 }
    );

    const token = createAdminSessionToken(String(admin._id), admin.email);
    setAdminSessionCookie(response, token);

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to login admin' }, { status: 500 });
  }
}
