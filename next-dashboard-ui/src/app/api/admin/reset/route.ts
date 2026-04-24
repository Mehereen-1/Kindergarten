import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { resetPasswordSchema, resetTokenQuerySchema } from '@/lib/admin/validators';
import { hashToken } from '@/lib/admin/security';
import { getRequestIP } from '@/lib/admin/ip';
import { logAdminAction } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    const parsed = resetTokenQuerySchema.safeParse({ token });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid reset token' }, { status: 400 });
    }

    await connectDB();

    const admin = await Admin.findOne({
      resetToken: hashToken(parsed.data.token),
      resetTokenExpiry: { $gt: new Date() },
    }).select('_id email resetTokenExpiry');

    if (!admin) {
      return NextResponse.json({ error: 'Reset token is invalid or expired' }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: 'Reset token is valid',
        email: admin.email,
        expiresAt: admin.resetTokenExpiry,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to validate reset token' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    await connectDB();

    const admin = await Admin.findOne({
      resetToken: hashToken(parsed.data.token),
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Reset token is invalid or expired' }, { status: 400 });
    }

    admin.password = await bcrypt.hash(parsed.data.password, 12);
    admin.isFirstLogin = false;
    admin.resetToken = undefined;
    admin.resetTokenExpiry = undefined;
    admin.isApprovedForReset = false;
    await admin.save();

    await logAdminAction(String(admin._id), 'ADMIN_RESET_COMPLETED', getRequestIP(request), {
      resetRecoveredAt: new Date().toISOString(),
    });

    return NextResponse.json({ message: 'Password reset completed successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to reset password' }, { status: 500 });
  }
}
