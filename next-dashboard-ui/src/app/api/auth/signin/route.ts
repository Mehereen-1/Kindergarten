import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/lib/controllers/userController';

/**
 * Sign in user
 * POST /api/auth/signin
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await signIn(email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: result.statusCode }
      );
    }

      const user = result.data;
      if (!user) {
        return NextResponse.json({ error: 'Authentication succeeded without user payload' }, { status: 500 });
      }

    // For first login, return flag to redirect to change password
    return NextResponse.json({
      message: result.message,
        user,
        redirectToChangePassword: user.isFirstLogin
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}