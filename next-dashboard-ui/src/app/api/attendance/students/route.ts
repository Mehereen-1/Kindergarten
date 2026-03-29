import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import { NextRequest, NextResponse } from 'next/server';

// Simple students endpoint for attendance system
// Less strict auth for internal use
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Check for user cookie but be more lenient for internal attendance system
    const userCookie = request.cookies.get('user')?.value;

    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie));
        // Accept admin, teacher, or any authenticated user for this endpoint
        if (!user.role) {
          return NextResponse.json(
            { error: 'Invalid user session' },
            { status: 401 }
          );
        }
      } catch {
        // Invalid cookie format - continue anyway for internal use
        console.warn('Invalid user cookie format, allowing for internal attendance');
      }
    }

    const students = await Student.find().select('_id name classId grade roll').lean();

    return NextResponse.json(students || []);

  } catch (error: any) {
    console.error('Error fetching students for attendance:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
