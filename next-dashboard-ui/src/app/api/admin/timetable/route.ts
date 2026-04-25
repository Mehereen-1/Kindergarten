import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import TimetableEntry, { DAY_OPTIONS } from '@/lib/models/TimetableEntry';
import Class from '@/lib/models/Class';
import Subject from '@/lib/models/Subject';
import User from '@/lib/models/User';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function toAcademicYear(value: string | null): string {
  return value || String(new Date().getFullYear());
}

function isValidTimeRange(startTime: string, endTime: string): boolean {
  return TIME_PATTERN.test(startTime) && TIME_PATTERN.test(endTime) && startTime < endTime;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const academicYear = toAcademicYear(searchParams.get('academicYear'));
    const classId = searchParams.get('classId');
    const teacherId = searchParams.get('teacherId');

    const query: Record<string, any> = { academicYear, isActive: true };

    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      query.classId = classId;
    }

    if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
      query.teacherId = teacherId;
    }

    const [entries, classes, subjects, teachers] = await Promise.all([
      TimetableEntry.find(query)
        .populate('classId', 'name classId grade')
        .populate('subjectId', 'name code')
        .populate('teacherId', 'name email')
        .sort({ dayOfWeek: 1, startTime: 1 })
        .lean(),
      Class.find().sort({ name: 1 }).select('_id name classId grade').lean(),
      Subject.find().sort({ name: 1 }).select('_id name code').lean(),
      User.find({ role: 'teacher' }).sort({ name: 1 }).select('_id name email').lean(),
    ]);

    return NextResponse.json({
      academicYear,
      entries,
      classes,
      subjects,
      teachers,
      dayOptions: DAY_OPTIONS,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load timetable' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const academicYear = toAcademicYear(body?.academicYear || null);
    const classId = body?.classId;
    const subjectId = body?.subjectId;
    const teacherId = body?.teacherId;
    const dayOfWeek = body?.dayOfWeek;
    const startTime = body?.startTime;
    const endTime = body?.endTime;
    const room = body?.room || '';
    const notes = body?.notes || '';

    if (!classId || !subjectId || !teacherId || !dayOfWeek || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (
      !mongoose.Types.ObjectId.isValid(classId) ||
      !mongoose.Types.ObjectId.isValid(subjectId) ||
      !mongoose.Types.ObjectId.isValid(teacherId)
    ) {
      return NextResponse.json({ error: 'Invalid class, subject, or teacher id' }, { status: 400 });
    }

    if (!DAY_OPTIONS.includes(dayOfWeek)) {
      return NextResponse.json({ error: 'Invalid day selection' }, { status: 400 });
    }

    if (!isValidTimeRange(startTime, endTime)) {
      return NextResponse.json({ error: 'Invalid start/end time range' }, { status: 400 });
    }

    const created = await TimetableEntry.create({
      classId,
      subjectId,
      teacherId,
      academicYear,
      dayOfWeek,
      startTime,
      endTime,
      room,
      notes,
      isActive: true,
    });

    const populated = await created.populate([
      { path: 'classId', select: 'name classId grade' },
      { path: 'subjectId', select: 'name code' },
      { path: 'teacherId', select: 'name email' },
    ]);

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: 'A timetable entry already exists for this class, day, and time range' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error?.message || 'Failed to create timetable entry' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const id = body?.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid entry id is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    const allowed = ['classId', 'subjectId', 'teacherId', 'academicYear', 'dayOfWeek', 'startTime', 'endTime', 'room', 'notes', 'isActive'];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updates[key] = body[key];
      }
    }

    if (updates.dayOfWeek && !DAY_OPTIONS.includes(updates.dayOfWeek)) {
      return NextResponse.json({ error: 'Invalid day selection' }, { status: 400 });
    }

    const nextStart = updates.startTime ?? body.startTime;
    const nextEnd = updates.endTime ?? body.endTime;
    if ((nextStart || nextEnd) && !(nextStart && nextEnd && isValidTimeRange(nextStart, nextEnd))) {
      return NextResponse.json({ error: 'Invalid start/end time range' }, { status: 400 });
    }

    const updated = await TimetableEntry.findByIdAndUpdate(id, updates, { new: true })
      .populate('classId', 'name classId grade')
      .populate('subjectId', 'name code')
      .populate('teacherId', 'name email');

    if (!updated) {
      return NextResponse.json({ error: 'Timetable entry not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: 'A timetable entry already exists for this class, day, and time range' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error?.message || 'Failed to update timetable entry' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid entry id is required' }, { status: 400 });
    }

    const removed = await TimetableEntry.findByIdAndDelete(id);
    if (!removed) {
      return NextResponse.json({ error: 'Timetable entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete timetable entry' }, { status: 500 });
  }
}
