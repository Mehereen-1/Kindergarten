import { connectDB } from '@/lib/mongodb';
import Message from '@/lib/models/Message';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parentId');

  try {
    await connectDB();
    
    if (!parentId) {
      return NextResponse.json(
        { error: 'parentId required' },
        { status: 400 }
      );
    }

    const messages = await Message.find({ to: parentId })
      .populate('from', 'name email role')
      .populate('to', 'name email role')
      .sort({ timestamp: -1 });
    
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
