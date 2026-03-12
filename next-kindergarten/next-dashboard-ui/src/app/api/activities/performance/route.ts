import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import ActivityPerformance from '@/lib/models/ActivityPerformance';
import ActivityRecord from '@/lib/models/ActivityRecord';
import Student from '@/lib/models/Student';

const performanceSchema = z.object({
  studentId: z.string().trim().min(1),
  activityId: z.string().trim().min(1),
  performanceLevel: z.enum(['Excellent', 'Good', 'Needs Practice']),
  remarks: z.string().trim().max(500).optional().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = performanceSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { studentId, activityId, performanceLevel, remarks } = parsed.data;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: 'Invalid studentId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return NextResponse.json({ error: 'Invalid activityId' }, { status: 400 });
    }

    await connectDB();

    const [studentExists, activityExists] = await Promise.all([
      Student.exists({ _id: studentId }),
      ActivityRecord.exists({ _id: activityId }),
    ]);

    if (!studentExists) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (!activityExists) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const performance = await ActivityPerformance.findOneAndUpdate(
      { studentId, activityId },
      {
        $set: {
          performanceLevel,
          remarks: remarks || undefined,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate('studentId', 'name')
      .populate('activityId', 'title subject date');

    return NextResponse.json(performance, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: 'Performance already recorded for this student and activity' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
