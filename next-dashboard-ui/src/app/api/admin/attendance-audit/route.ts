import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import AttendanceAuditLog from '@/lib/models/AttendanceAuditLog';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const teacherId = searchParams.get('teacherId');
    const date = searchParams.get('date');
    const source = searchParams.get('source');
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)));

    const query: any = {};

    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return NextResponse.json({ error: 'Invalid classId' }, { status: 400 });
      }
      query.classId = classId;
    }

    if (teacherId) {
      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return NextResponse.json({ error: 'Invalid teacherId' }, { status: 400 });
      }
      query.teacherId = teacherId;
    }

    if (source) {
      if (!['manual', 'cctv'].includes(source)) {
        return NextResponse.json({ error: 'Invalid source filter' }, { status: 400 });
      }
      query.source = source;
    }

    if (date) {
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      if (Number.isNaN(dayStart.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      query.date = { $gte: dayStart, $lt: dayEnd };
    }

    const [total, logs] = await Promise.all([
      AttendanceAuditLog.countDocuments(query),
      AttendanceAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('teacherId', 'name email')
        .populate('classId', 'name classId grade')
        .populate('studentId', 'name')
        .lean(),
    ]);

    const rows = logs.map((log: any) => ({
      _id: String(log._id),
      when: log.createdAt,
      date: log.date,
      source: log.source,
      action: log.action,
      previousStatus: log.previousStatus ?? null,
      newStatus: log.newStatus,
      teacher: {
        id: String(log.teacherId?._id || log.teacherId || ''),
        name: log.teacherId?.name || 'Unknown Teacher',
        email: log.teacherId?.email || '',
      },
      class: {
        id: String(log.classId?._id || log.classId || ''),
        name: log.classId?.name || '-',
        classId: log.classId?.classId || '-',
        grade: log.classId?.grade || '-',
      },
      student: {
        id: String(log.studentId?._id || log.studentId || ''),
        name: log.studentId?.name || '-',
      },
    }));

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      logs: rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
