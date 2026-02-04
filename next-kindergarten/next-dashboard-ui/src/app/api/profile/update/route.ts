import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Student from '@/lib/models/Student';
import mongoose from 'mongoose';

/**
 * PUT /api/profile/update
 * Update profile with permission checking
 */
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const userCookie = request.cookies.get('user')?.value;
    const body = await request.json();
    const { targetId, childId, updates, profileType } = body;

    // Get current user
    let currentUserId: string;
    let currentUserRole: string;

    if (userCookie) {
      const user = JSON.parse(decodeURIComponent(userCookie));
      currentUserId = user.id;
      currentUserRole = user.role;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let profileId = targetId || currentUserId;
    let isOwnProfile = profileId === currentUserId;

    // Check permissions
    if (!isOwnProfile) {
      if (currentUserRole === 'admin') {
        // Admin can edit anyone
      } else if (currentUserRole === 'parent' && childId && profileType === 'student') {
        // Parent can edit their child's student profile with restrictions
        profileId = childId;

        // Restrict what parents can edit
        const restrictedFields = [
          'roll',
          'grade',
          'classId',
          'createdAt',
          'updatedAt',
          '_id'
        ];

        restrictedFields.forEach(field => {
          delete updates[field];
        });
      } else {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        );
      }
    }

    // For users updating own profile, restrict password changes here
    if (isOwnProfile && currentUserRole !== 'admin') {
      delete updates.password;
      delete updates.role;
      delete updates.passwordExpiry;
    }

    let updatedProfile;

    if (profileType === 'student') {
      updatedProfile = await Student.findByIdAndUpdate(
        profileId,
        updates,
        { new: true, runValidators: true }
      ).select('-createdAt -updatedAt');
    } else {
      updatedProfile = await User.findByIdAndUpdate(
        profileId,
        updates,
        { new: true, runValidators: true }
      ).select('-password -createdAt -updatedAt');
    }

    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
