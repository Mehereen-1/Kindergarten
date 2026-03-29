import { connectDB } from '@/lib/mongodb';
import Message from '@/lib/models/Message';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get('to');
  const from = searchParams.get('from');

  try {
    await connectDB();
    
    let query: any = {};
    if (to) query.to = to;
    if (from) query.from = from;

    const messages = await Message.find(query)
      .populate('from', 'name email role')
      .populate('to', 'name email role')
      .sort({ timestamp: -1 });
    
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    if (!data.from || !data.to || !data.text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const message = await Message.create({
      from: data.from,
      to: data.to,
      text: data.text,
      timestamp: new Date()
    });

    const populatedMessage = await message.populate([
      { path: 'from', select: 'name email role' },
      { path: 'to', select: 'name email role' }
    ]);

    return NextResponse.json(populatedMessage, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
