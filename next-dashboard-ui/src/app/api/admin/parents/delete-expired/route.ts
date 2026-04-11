import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import ParentProfile from '@/lib/models/ParentProfile';

/**
 * Delete expired imported parents
 * POST /api/admin/parents/delete-expired
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const now = new Date();

    // Find expired parents who haven't responded
    const expiredParents = await User.find({
      role: 'parent',
      passwordExpiry: { $lt: now },
      $or: [
        { firstLogin: { $exists: false } },
        { firstLogin: null }
      ],
      importedAt: { $exists: true }
    });

    const deletedIds: string[] = [];

    for (const parent of expiredParents) {
      // Delete parent profile
      await ParentProfile.findOneAndDelete({ userId: parent._id });

      // Delete user
      await User.findByIdAndDelete(parent._id);

      deletedIds.push(String(parent._id));
    }

    return NextResponse.json({
      message: `Deleted ${deletedIds.length} expired parents`,
      deletedIds
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}