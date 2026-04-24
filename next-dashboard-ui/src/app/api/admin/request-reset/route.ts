import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { requestResetSchema } from '@/lib/admin/validators';
import { ensureResetRateLimit } from '@/lib/admin/resetRateLimit';
import { generateTokenPair } from '@/lib/admin/security';
import { sendAdminResetEmail, sendAdminSetupEmail } from '@/lib/admin/email';
import { getRequestIP } from '@/lib/admin/ip';
import { logAdminAction } from '@/lib/admin/audit';

const RESET_WINDOW_MS = 30 * 60 * 1000;
const SETUP_WINDOW_MS = 30 * 60 * 1000;

export async function POST(request: NextRequest) {
  const genericMessage = 'If the email belongs to an admin account, recovery instructions have been sent.';

  try {
    const body = await request.json();
    const parsed = requestResetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    const requestIP = getRequestIP(request);
    const { email } = parsed.data;

    const limitResult = await ensureResetRateLimit(email, requestIP);
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many reset requests. Try again later.' },
        { status: 429 }
      );
    }

    await connectDB();

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return NextResponse.json({ message: genericMessage }, { status: 200 });
    }

    if (!admin.password || admin.isFirstLogin) {
      const { rawToken, hashedToken, expiry } = generateTokenPair(SETUP_WINDOW_MS);

      admin.setupToken = hashedToken;
      admin.setupTokenExpiry = expiry;
      admin.resetToken = undefined;
      admin.resetTokenExpiry = undefined;
      await admin.save();

      const emailResult = await sendAdminSetupEmail(admin.email, rawToken);
      await logAdminAction(String(admin._id), 'ADMIN_SETUP_LINK_RESENT', requestIP, {
        setupTokenExpiry: expiry,
      });

      return NextResponse.json(
        {
          message: genericMessage,
          previewUrl: emailResult.previewUrl,
          ...(process.env.NODE_ENV !== 'production'
            ? { setupLink: `/admin-setup?token=${encodeURIComponent(rawToken)}` }
            : {}),
        },
        { status: 200 }
      );
    }

    const { rawToken, hashedToken, expiry } = generateTokenPair(RESET_WINDOW_MS);

    admin.resetToken = hashedToken;
    admin.resetTokenExpiry = expiry;
    await admin.save();

    const emailResult = await sendAdminResetEmail(admin.email, rawToken);

    await logAdminAction(String(admin._id), 'ADMIN_RESET_REQUEST', requestIP, {
      resetTokenExpiry: expiry,
    });

    return NextResponse.json(
      {
        message: genericMessage,
        previewUrl: emailResult.previewUrl,
        ...(process.env.NODE_ENV !== 'production'
          ? { resetLink: `/admin-reset-password?token=${encodeURIComponent(rawToken)}` }
          : {}),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to request reset' }, { status: 500 });
  }
}
