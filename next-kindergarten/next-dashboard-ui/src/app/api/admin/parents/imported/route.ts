import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import ParentProfile from '@/lib/models/ParentProfile';

/**
 * Get imported parents with status
 * GET /api/admin/parents/imported
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get parents imported recently (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const importedParents = await User.find({
      role: 'parent',
      importedAt: { $gte: thirtyDaysAgo }
    }).select('name email phone passwordExpiry importedAt firstLogin profileUpdated createdAt');

    const parentsWithStatus = await Promise.all(
      importedParents.map(async (parent) => {
        const profile = await ParentProfile.findOne({ userId: parent._id }).select('address occupation children parentId');

        const now = new Date();
        const isExpired = parent.passwordExpiry && parent.passwordExpiry < now;
        const hasResponded = parent.firstLogin || parent.profileUpdated;

        return {
          id: parent._id,
          name: parent.name,
          email: parent.email,
          phone: parent.phone,
          address: profile?.address,
          occupation: profile?.occupation,
          children: profile?.children,
          parentId: profile?.parentId,
          importedAt: parent.importedAt,
          passwordExpiry: parent.passwordExpiry,
          firstLogin: parent.firstLogin,
          profileUpdated: parent.profileUpdated,
          status: isExpired ? 'expired' : hasResponded ? 'responded' : 'pending',
        };
      })
    );

    return NextResponse.json({ parents: parentsWithStatus }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}