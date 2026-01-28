import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  try {
    await connectDB();
    
    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId required' },
        { status: 400 }
      );
    }

    const attendance = await Attendance.find({ studentId })
      .sort({ date: -1 });
    
    // Calculate stats
    const stats = {
      total: attendance.length,
      present: attendance.filter((a: any) => a.status === 'Present').length,
      absent: attendance.filter((a: any) => a.status === 'Absent').length,
      percentage: attendance.length > 0 
        ? Math.round((attendance.filter((a: any) => a.status === 'Present').length / attendance.length) * 100)
        : 0
    };

    return NextResponse.json({ data: attendance, stats });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
