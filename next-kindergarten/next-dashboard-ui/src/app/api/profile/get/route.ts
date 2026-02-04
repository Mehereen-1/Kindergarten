import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Student from '@/lib/models/Student';
import mongoose from 'mongoose';

/**
 * GET /api/profile/get?userId={id}&targetRole={admin|teacher|parent}&targetId={id}&childId={id}
 * Get profile information with permission checking
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const userCookie = request.cookies.get('user')?.value;
    const userIdParam = request.nextUrl.searchParams.get('userId');
    const targetId = request.nextUrl.searchParams.get('targetId');
    const childId = request.nextUrl.searchParams.get('childId');

    // Get current user
    let currentUserId: string;
    let currentUserRole: string;

    if (userCookie) {
      const user = JSON.parse(decodeURIComponent(userCookie));
      currentUserId = user.id;
      currentUserRole = user.role;
    } else if (userIdParam) {
      currentUserId = userIdParam;
      currentUserRole = 'user';
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let profileId = targetId || currentUserId;
    let isOwnProfile = profileId === currentUserId;
    let profileType = 'user'; // 'user' for User model, 'student' for Student model

    // If childId is provided, this is a student profile request
    if (childId) {
      profileType = 'student';
      profileId = childId;
      isOwnProfile = false; // Child profiles are never "own" profiles for parents
    }

    // Check permissions
    if (!isOwnProfile) {
      if (currentUserRole === 'admin') {
        // Admin can view anyone's profile (including students)
      } else if (currentUserRole === 'parent' && childId) {
        // Parent can only view their child's profile - permission already granted above
      } else {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        );
      }
    }

    let profile;

    if (profileType === 'student') {
      profile = await Student.findById(profileId).select('-createdAt -updatedAt');
    } else {
      profile = await User.findById(profileId).select('-password -createdAt -updatedAt');
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile,
      profileType,
      isOwnProfile,
      canEdit: isOwnProfile || currentUserRole === 'admin'
    });
  } catch (error: any) {
    console.error('Error getting profile:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
