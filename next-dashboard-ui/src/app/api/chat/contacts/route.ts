import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ChatMessage from '@/lib/models/ChatMessage';
import User from '@/lib/models/User';
import mongoose from 'mongoose';

/**
 * Get chat contacts for current user
 * GET /api/chat/contacts
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get user from cookies first, then from query params
    let currentUserId: string;
    let currentUserRole: string;
    
    const userCookie = request.cookies.get('user')?.value;
    const userIdParam = request.nextUrl.searchParams.get('userId');
    
    if (userCookie) {
      const user = JSON.parse(decodeURIComponent(userCookie));
      currentUserId = user.id;
      currentUserRole = user.role;
    } else if (userIdParam) {
      // Fallback to query param if no cookie
      currentUserId = userIdParam;
      currentUserRole = 'user'; // Default role
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Convert currentUserId to ObjectId for proper comparison
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(currentUserId);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    // Find all unique users the current user has chatted with
    const contacts = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { senderId: userObjectId },
            { receiverId: userObjectId }
          ]
        }
      },
      {
        $group: {
          _id: null,
          senderIds: { $addToSet: '$senderId' },
          receiverIds: { $addToSet: '$receiverId' }
        }
      }
    ]);

    if (!contacts.length) {
      return NextResponse.json({ contacts: [] }, { status: 200 });
    }

    const allContactIds = [
      ...contacts[0].senderIds.filter(id => id.toString() !== currentUserId),
      ...contacts[0].receiverIds.filter(id => id.toString() !== currentUserId)
    ];

    const uniqueContactIds = [...new Set(allContactIds.map(id => id.toString()))];

    // Get user details
    const contactUsers = await User.find({ _id: { $in: uniqueContactIds } })
      .select('name email role')
      .lean();

    // Get last message for each contact
    const contactsWithLastMessage = await Promise.all(
      contactUsers.map(async (contact) => {
        const lastMessage = await ChatMessage.findOne({
          $or: [
            { senderId: currentUserId, receiverId: contact._id },
            { senderId: contact._id, receiverId: currentUserId }
          ]
        })
        .sort({ timestamp: -1 })
        .select('message timestamp read senderId');

        const unreadCount = await ChatMessage.countDocuments({
          senderId: contact._id,
          receiverId: currentUserId,
          read: false
        });

        return {
          id: contact._id,
          name: contact.name,
          email: contact.email,
          role: contact.role,
          lastMessage: lastMessage ? {
            message: lastMessage.message,
            timestamp: lastMessage.timestamp,
            isFromMe: lastMessage.senderId.toString() === currentUserId
          } : null,
          unreadCount
        };
      })
    );

    return NextResponse.json({ contacts: contactsWithLastMessage }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}