import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { adminSetupSchema, setupTokenQuerySchema } from '@/lib/admin/validators';
import { hashToken } from '@/lib/admin/security';
import { getRequestIP } from '@/lib/admin/ip';
import { logAdminAction } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    const parsed = setupTokenQuerySchema.safeParse({ token });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid setup token' }, { status: 400 });
    }

    await connectDB();

    const admin = await Admin.findOne({
      setupToken: hashToken(parsed.data.token),
      setupTokenExpiry: { $gt: new Date() },
    }).select('_id email setupTokenExpiry isFirstLogin');

    if (!admin) {
      return NextResponse.json({ error: 'Setup token is invalid or expired' }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: 'Setup token is valid',
        email: admin.email,
        expiresAt: admin.setupTokenExpiry,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to validate setup token' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = adminSetupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    await connectDB();

    const admin = await Admin.findOne({
      setupToken: hashToken(parsed.data.token),
      setupTokenExpiry: { $gt: new Date() },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Setup token is invalid or expired' }, { status: 400 });
    }

    admin.password = await bcrypt.hash(parsed.data.password, 12);
    admin.isFirstLogin = false;
    admin.setupToken = undefined;
    admin.setupTokenExpiry = undefined;
    admin.resetToken = undefined;
    admin.resetTokenExpiry = undefined;
    admin.isApprovedForReset = false;

    await admin.save();

    await logAdminAction(String(admin._id), 'ADMIN_INITIAL_SETUP', getRequestIP(request));
    return NextResponse.json({ message: 'Admin setup completed successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to complete setup' }, { status: 500 });
  }
}
