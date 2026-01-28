import { connectDB } from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const events = await Event.find()
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
    
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
