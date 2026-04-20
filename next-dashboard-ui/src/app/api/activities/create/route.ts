import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDB } from '../../../../lib/mongodb';
import ActivityRecord from '../../../../lib/models/ActivityRecord';

const createActivitySchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(1).max(1000),
  subject: z.string().trim().min(2).max(80),
  date: z.string().datetime(),
  classId: z.string().trim().min(1),
  createdBy: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = createActivitySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { title, description, subject, date, classId, createdBy } = parsed.data;

    if (!mongoose.Types.ObjectId.isValid(createdBy)) {
      return NextResponse.json(
        { error: 'Invalid createdBy (admin id)' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return NextResponse.json(
        { error: 'Invalid classId' },
        { status: 400 }
      );
    }

    await connectDB();

    const activity = await ActivityRecord.create({
      title,
      description,
      subject,
      date: new Date(date),
      classId,
      createdBy,
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}