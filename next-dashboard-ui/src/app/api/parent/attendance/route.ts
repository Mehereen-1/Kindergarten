import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import { NextRequest, NextResponse } from 'next/server';

function normalizeStatus(status: unknown): 'present' | 'absent' | 'late' {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'present') return 'present';
  if (value === 'late') return 'late';
  return 'absent';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    await connectDB();
    
    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId required' },
        { status: 400 }
      );
    }

    const query: any = { studentId };

    if (from || to) {
      query.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (Number.isNaN(fromDate.getTime())) {
          return NextResponse.json({ error: 'Invalid from date' }, { status: 400 });
        }
        query.date.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        if (Number.isNaN(toDate.getTime())) {
          return NextResponse.json({ error: 'Invalid to date' }, { status: 400 });
        }
        query.date.$lt = toDate;
      }
    }

    const attendance = await Attendance.find(query).sort({ date: -1 });

    const normalized = attendance.map((record: any) => ({
      ...record.toObject(),
      status: normalizeStatus(record.status),
    }));

    const presentLikeCount = normalized.filter((a: any) => a.status === 'present' || a.status === 'late').length;
    const absentCount = normalized.filter((a: any) => a.status === 'absent').length;
    
    // Calculate stats
    const stats = {
      total: normalized.length,
      present: presentLikeCount,
      absent: absentCount,
      percentage: normalized.length > 0
        ? Math.round((presentLikeCount / normalized.length) * 100)
        : 0
    };

    return NextResponse.json({ data: normalized, stats });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
