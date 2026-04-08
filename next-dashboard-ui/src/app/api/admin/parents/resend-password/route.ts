import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { generatePassword } from '@/lib/utils/generators';
import { sendPasswordEmail } from '@/lib/utils/email';
import bcrypt from 'bcryptjs';

/**
 * Resend password to imported parent
 * POST /api/admin/parents/resend-password
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'parent') {
      return NextResponse.json(
        { error: 'Parent not found' },
        { status: 404 }
      );
    }

    // Generate new password
    const newPassword = generatePassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user with new password and expiry
    const newExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
      passwordExpiry: newExpiry,
    });

    // Send email
    const emailRes = await sendPasswordEmail(user.email, newPassword);
    if (!emailRes.success) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Password resent successfully',
      newExpiry
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
