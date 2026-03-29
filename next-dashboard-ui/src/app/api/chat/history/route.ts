import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ChatMessage from '@/lib/models/ChatMessage';
import mongoose from 'mongoose';

/**
 * Get chat history between two users
 * GET /api/chat/history?senderId=...&receiverId=...
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const senderId = searchParams.get('senderId');
    const receiverId = searchParams.get('receiverId');

    if (!senderId || !receiverId) {
      return NextResponse.json(
        { error: 'senderId and receiverId are required' },
        { status: 400 }
      );
    }

    // Convert to ObjectIds for proper comparison
    let senderObjectId, receiverObjectId;
    try {
      senderObjectId = new mongoose.Types.ObjectId(senderId);
      receiverObjectId = new mongoose.Types.ObjectId(receiverId);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid user IDs' }, { status: 400 });
    }

    // Get messages between the two users (both directions)
    const messages = await ChatMessage.find({
      $or: [
        { senderId: senderObjectId, receiverId: receiverObjectId },
        { senderId: receiverObjectId, receiverId: senderObjectId }
      ]
    })
    .sort({ timestamp: 1 })
    .lean();

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}