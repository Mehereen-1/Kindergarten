import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { buildTeacherPasswordResetEmail, sendEmail } from '@/lib/email';
import { getServerAppUrl } from '@/lib/serverConfig';

const RESET_WINDOW_MS = 60 * 60 * 1000;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Teacher forgot password
 * POST /api/auth/forgot-password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const genericSuccessMessage =
      'If this email belongs to an active teacher account, a password reset link has been sent.';
    const isDev = process.env.NODE_ENV !== 'production';

    const teacher = await User.findOne({
      email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' },
      role: 'teacher',
    });

    if (!teacher) {
      return NextResponse.json({ message: genericSuccessMessage }, { status: 200 });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetExpiry = new Date(Date.now() + RESET_WINDOW_MS);

    teacher.resetPasswordToken = hashedToken;
    teacher.resetPasswordExpiry = resetExpiry;
    await teacher.save();

    const resetUrl = `${getServerAppUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
    await sendEmail(
      teacher.email,
      buildTeacherPasswordResetEmail({
        teacherName: teacher.name || 'Teacher',
        resetUrl,
        expiryMinutes: Math.round(RESET_WINDOW_MS / 60000),
      })
    );

    return NextResponse.json(
      {
        message: genericSuccessMessage,
        ...(isDev ? { debugResetUrl: resetUrl } : {}),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to send password reset email' },
      { status: 500 }
    );
  }
}
