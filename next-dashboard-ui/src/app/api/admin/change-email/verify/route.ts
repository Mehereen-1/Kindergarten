import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { verifyEmailChangeSchema } from '@/lib/admin/validators';
import { hashToken } from '@/lib/admin/security';
import { getRequestIP } from '@/lib/admin/ip';
import { logAdminAction } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    const parsed = verifyEmailChangeSchema.safeParse({ token });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
    }

    await connectDB();

    const admin = await Admin.findOne({
      emailChangeToken: hashToken(parsed.data.token),
      emailChangeTokenExpiry: { $gt: new Date() },
    });

    if (!admin || !admin.pendingEmail) {
      return NextResponse.json({ error: 'Verification token is invalid or expired' }, { status: 400 });
    }

    const emailInUse = await Admin.findOne({ email: admin.pendingEmail, _id: { $ne: admin._id } });
    if (emailInUse) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 409 });
    }

    const previousEmail = admin.email;

    admin.email = admin.pendingEmail;
    admin.pendingEmail = undefined;
    admin.emailChangeToken = undefined;
    admin.emailChangeTokenExpiry = undefined;
    await admin.save();

    await logAdminAction(String(admin._id), 'ADMIN_EMAIL_CHANGED', getRequestIP(request), {
      previousEmail,
      updatedEmail: admin.email,
    });

    return NextResponse.redirect(new URL('/admin/settings?emailUpdated=1', request.url));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to verify email' }, { status: 500 });
  }
}
