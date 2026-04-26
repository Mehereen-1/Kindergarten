import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TimetableEntry, { DAY_OPTIONS } from '@/lib/models/TimetableEntry';
import { extractSessionUser } from '@/lib/auth';

const dayRank: Record<string, number> = DAY_OPTIONS.reduce((acc, day, index) => {
  acc[day] = index;
  return acc;
}, {} as Record<string, number>);

function toAcademicYear(value: string | null): string {
  return value || String(new Date().getFullYear());
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const academicYear = toAcademicYear(searchParams.get('academicYear'));
    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    const userRole = String(sessionUser?.role || request.cookies.get('userRole')?.value || '')
      .trim()
      .toLowerCase();

    if (!sessionUser?.id) {
      return NextResponse.json(
        { error: 'Unauthorized: sign in required to access teacher timetable' },
        { status: 401 }
      );
    }

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return NextResponse.json(
        {
          error: `Forbidden: role "${userRole || 'unknown'}" cannot access teacher timetable`,
        },
        { status: 403 }
      );
    }

    const requestedTeacherId = searchParams.get('teacherId');
    let teacherId = sessionUser.id;

    if (userRole === 'admin') {
      teacherId = requestedTeacherId || '';
    } else if (requestedTeacherId && requestedTeacherId !== sessionUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: teachers can only view their own timetable' },
        { status: 403 }
      );
    }

    if (!teacherId) {
      return NextResponse.json({ error: 'Teacher id is required for admin requests' }, { status: 400 });
    }

    const entries = await TimetableEntry.find({
      teacherId,
      academicYear,
      isActive: true,
    })
      .populate('classId', 'name classId grade')
      .populate('subjectId', 'name code')
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    const sorted = [...entries].sort((a: any, b: any) => {
      const aRank = dayRank[a.dayOfWeek] ?? 99;
      const bRank = dayRank[b.dayOfWeek] ?? 99;
      if (aRank !== bRank) return aRank - bRank;
      return String(a.startTime).localeCompare(String(b.startTime));
    });

    return NextResponse.json({
      academicYear,
      dayOptions: DAY_OPTIONS,
      entries: sorted,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load timetable' }, { status: 500 });
  }
}
