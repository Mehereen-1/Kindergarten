import { connectDB } from '@/lib/mongodb';
import Notice from '@/lib/models/Notice';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const notices = await Notice.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    return NextResponse.json(notices);
  } catch (error) {
    // @ts-ignore
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    const targetRole = data.targetRole || data.target || 'all';
    const createdBy = data.createdBy;
    const description = data.description || data.message || '';
    const date = data.date ? new Date(data.date) : new Date();

    // Validate required fields
    if (!data.title || !description || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const notice = await Notice.create({
      title: data.title,
      description,
      targetRole,
      createdBy,
      date,
    });
    const populatedNotice = await notice.populate('createdBy', 'name email');

    return NextResponse.json(populatedNotice, { status: 201 });
  } catch (error) {
    // @ts-ignore
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
