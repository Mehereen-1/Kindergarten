import { NextRequest, NextResponse } from 'next/server';

import { connectDB } from '@/lib/mongodb';
import ChatMessage from '@/lib/models/ChatMessage';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const {
      senderId,
      receiverId,
      message,
      senderRole,
      receiverRole,
      attachments = [],
    } = await request.json();

    const normalizedAttachments = Array.isArray(attachments) ? attachments : [];
    const normalizedMessage = typeof message === 'string' ? message.trim() : '';
    const messageForStorage = normalizedMessage || (normalizedAttachments.length ? '[Attachment]' : '');

    if (!senderId || !receiverId || !senderRole || !receiverRole || !messageForStorage) {
      return NextResponse.json(
        { error: 'senderId, receiverId, roles, and message or attachment are required' },
        { status: 400 }
      );
    }

    const newMessage = await ChatMessage.create({
      senderId,
      receiverId,
      senderRole,
      receiverRole,
      message: messageForStorage,
      attachments: normalizedAttachments,
      deliveryStatus: 'sent',
    });

    return NextResponse.json(
      {
        message: {
          _id: newMessage._id,
          senderId: newMessage.senderId,
          receiverId: newMessage.receiverId,
          senderRole: newMessage.senderRole,
          receiverRole: newMessage.receiverRole,
          message: newMessage.message,
          attachments: newMessage.attachments || [],
          timestamp: newMessage.timestamp,
          read: newMessage.read,
          deliveryStatus: newMessage.deliveryStatus,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
