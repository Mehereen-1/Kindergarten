import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Check if user is admin
    const userCookie = request.cookies.get('user')?.value;
    
    if (!userCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    try {
      const user = JSON.parse(decodeURIComponent(userCookie));
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Permission denied - admin only' },
          { status: 403 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid user cookie' },
        { status: 401 }
      );
    }

    // Fetch all users
    const users = await User.find().select(
      'name email role phone address bloodGroup birthday sex profilePic -password'
    ).lean();

    return NextResponse.json({
      users: users || []
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
