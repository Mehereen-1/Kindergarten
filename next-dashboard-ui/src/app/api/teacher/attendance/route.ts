import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import Student from '@/lib/models/Student';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const date = searchParams.get('date');
  const classId = searchParams.get('classId');
  const classIdsParam = searchParams.get('classIds');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    await connectDB();
    
    let query: any = {};
    if (studentId) query.studentId = studentId;
    if (classId) query.classId = classId;
    if (classIdsParam) {
      const classIds = classIdsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      if (classIds.length) {
        query.classId = { $in: classIds };
      }
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    } else if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lt = new Date(to);

      if (!query.date.$gte && !query.date.$lt) {
        delete query.date;
      }
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'name rollNumber');
    
    return NextResponse.json(attendance);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    if (!data.studentId || !data.date || !data.status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const attendance = await Attendance.create({
      studentId: data.studentId,
      date: new Date(data.date),
      status: data.status
    });

    const populatedAttendance = await attendance.populate('studentId', 'name rollNumber');
    return NextResponse.json(populatedAttendance, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
