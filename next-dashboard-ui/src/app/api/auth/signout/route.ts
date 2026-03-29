import { NextRequest, NextResponse } from 'next/server';

/**
 * Sign out user
 * POST /api/auth/signout
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      message: 'Sign out successful'
    }, { status: 200 });

    // Clear cookies
    response.cookies.set('user', '', { maxAge: 0, path: '/' });
    response.cookies.set('userRole', '', { maxAge: 0, path: '/' });

    return response;

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}