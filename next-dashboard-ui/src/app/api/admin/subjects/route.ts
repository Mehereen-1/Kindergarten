import { connectDB } from '@/lib/mongodb';
import Subject from '@/lib/models/Subject';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    const subjects = await Subject.find().sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, subjects, count: subjects.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const code = body?.code ? String(body.code).trim() : undefined;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Subject name is required' }, { status: 400 });
    }

    const existing = await Subject.findOne({ name });
    if (existing) {
      return NextResponse.json({ success: true, data: existing, message: 'Subject already exists' });
    }

    const subject = await Subject.create({ name, code });
    return NextResponse.json({ success: true, data: subject }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
