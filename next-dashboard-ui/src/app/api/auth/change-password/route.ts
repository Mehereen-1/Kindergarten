import { NextRequest, NextResponse } from 'next/server';
import { changePassword, changePasswordFirstLogin } from '@/lib/controllers/userController';

/**
 * Change password
 * POST /api/auth/change-password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, currentPassword, newPassword, isFirstLogin } = body;

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'User ID and new password are required' },
        { status: 400 }
      );
    }

    let result;
    if (isFirstLogin) {
      result = await changePasswordFirstLogin(userId, newPassword);
    } else {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required' },
          { status: 400 }
        );
      }
      result = await changePassword(userId, currentPassword, newPassword);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: result.statusCode }
      );
    }

    return NextResponse.json({
      message: result.message
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}