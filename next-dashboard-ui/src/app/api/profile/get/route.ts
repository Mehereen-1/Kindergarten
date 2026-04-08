import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Student from '@/lib/models/Student';
import StudentClassHistory from '@/lib/models/StudentClassHistory';

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
    const academicYear = request.nextUrl.searchParams.get('academicYear') || String(new Date().getFullYear());

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
        const ownedChild = await Student.findOne({ _id: childId, parentId: currentUserId }).select('_id').lean();
        if (!ownedChild) {
          return NextResponse.json(
            { error: 'Permission denied' },
            { status: 403 }
          );
        }
      } else if (currentUserRole === 'teacher' && childId) {
        // Teacher can view student profile in read-only mode.
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

      if (profile) {
        const history = await StudentClassHistory.findOne({
          studentId: profile._id,
          academicYear,
          status: 'active',
        })
          .populate('classId', 'name classId grade')
          .lean();

        const classDoc = history?.classId as any;
        profile = {
          ...profile.toObject(),
          grade: classDoc?.grade || null,
          classId: classDoc?.classId || null,
          className: classDoc?.name || null,
          roll: history?.rollNo || null,
          academicYear,
        };
      }
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
      canEdit:
        isOwnProfile ||
        currentUserRole === 'admin' ||
        (currentUserRole === 'parent' && profileType === 'student' && Boolean(childId))
    });
  } catch (error: any) {
    console.error('Error getting profile:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
