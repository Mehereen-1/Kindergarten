import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

/**
 * Teacher reset password
 * POST /api/auth/reset-password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const normalizedToken = token.toLowerCase().replace(/[^a-f0-9]/g, '');
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!normalizedToken || !newPassword) {
      return NextResponse.json(
        { error: 'Reset token and new password are required' },
        { status: 400 }
      );
    }

    // Password reset tokens are generated as 32 random bytes encoded in hex.
    if (normalizedToken.length !== 64) {
      return NextResponse.json(
        { error: 'This reset link is invalid or incomplete' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    await connectDB();

    const hashedToken = crypto.createHash('sha256').update(normalizedToken).digest('hex');
    const teacher = await User.findOne({
      role: 'teacher',
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: new Date() },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired' },
        { status: 400 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    teacher.password = await bcrypt.hash(newPassword, salt);
    teacher.resetPasswordToken = undefined;
    teacher.resetPasswordExpiry = undefined;
    teacher.passwordExpiry = undefined;

    if (!teacher.firstLogin) {
      teacher.firstLogin = new Date();
    }

    await teacher.save();

    return NextResponse.json(
      { message: 'Password reset successfully. You can now sign in.' },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to reset password' },
      { status: 500 }
    );
  }
}
