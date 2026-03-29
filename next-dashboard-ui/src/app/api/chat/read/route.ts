import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ChatMessage from '@/lib/models/ChatMessage';

/**
 * Mark messages as read
 * POST /api/chat/read
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { senderId, receiverId } = await request.json();

    if (!senderId || !receiverId) {
      return NextResponse.json(
        { error: 'senderId and receiverId are required' },
        { status: 400 }
      );
    }

    // Mark all messages from senderId to receiverId as read
    await ChatMessage.updateMany(
      {
        senderId,
        receiverId,
        read: false
      },
      { read: true }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}