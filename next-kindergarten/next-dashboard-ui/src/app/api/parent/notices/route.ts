import { connectDB } from '@/lib/mongodb';
import Notice from '@/lib/models/Notice';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get all notices (can be filtered by target in frontend)
    const notices = await Notice.find({ $or: [{ target: 'all' }, { target: 'parents' }] })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    return NextResponse.json(notices);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
