import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/requireAdmin';
import Admin from '@/lib/models/Admin';
import { changeEmailSchema } from '@/lib/admin/validators';
import { generateTokenPair } from '@/lib/admin/security';
import { sendAdminEmailVerification } from '@/lib/admin/email';
import { getRequestIP } from '@/lib/admin/ip';
import { logAdminAction } from '@/lib/admin/audit';

const EMAIL_VERIFY_WINDOW_MS = 30 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await requireAdminSession(request);
    if (!sessionResult.ok) {
      return sessionResult.response;
    }

    const body = await request.json();
    const parsed = changeEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    const { newEmail } = parsed.data;

    if (newEmail === sessionResult.admin.email) {
      return NextResponse.json({ error: 'New email must be different from current email' }, { status: 400 });
    }

    const existing = await Admin.findOne({ email: newEmail, _id: { $ne: sessionResult.admin._id } });
    if (existing) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 409 });
    }

    const { rawToken, hashedToken, expiry } = generateTokenPair(EMAIL_VERIFY_WINDOW_MS);

    sessionResult.admin.pendingEmail = newEmail;
    sessionResult.admin.emailChangeToken = hashedToken;
    sessionResult.admin.emailChangeTokenExpiry = expiry;
    await sessionResult.admin.save();

    const emailResult = await sendAdminEmailVerification(newEmail, rawToken);

    await logAdminAction(String(sessionResult.admin._id), 'ADMIN_EMAIL_CHANGE_REQUESTED', getRequestIP(request), {
      newEmail,
    });

    return NextResponse.json(
      {
        message: 'Verification link sent to new email address',
        previewUrl: emailResult.previewUrl,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to change email' }, { status: 500 });
  }
}
