import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

/**
 * Get all parents for teacher to browse and contact
 * GET /api/teacher/parents
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get teacher from cookies
    const userCookie = request.cookies.get('user')?.value;
    if (!userCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = JSON.parse(decodeURIComponent(userCookie));
    
    if (user.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can access this endpoint' }, { status: 403 });
    }

    // Get all parents
    const parents = await User.find({ role: 'parent' })
      .select('name email phone')
      .sort({ name: 1 })
      .lean();

    const formattedParents = parents.map(parent => ({
      id: parent._id,
      name: parent.name,
      email: parent.email,
      phone: parent.phone || 'N/A'
    }));

    return NextResponse.json({ parents: formattedParents }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
