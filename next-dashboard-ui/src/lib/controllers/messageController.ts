import { connectDB } from '../mongodb';
import Message from '../models/Message';

interface CreateMessageInput {
  content: string;
  senderId: string;
  receiverId: string;
}

/**
 * Create message
 */
export async function createMessage(input: CreateMessageInput) {
  try {
    await connectDB();

    const message = new Message({
      content: input.content,
      senderId: input.senderId,
      receiverId: input.receiverId,
    });

    await message.save();

    return {
      success: true,
      message: 'Message sent successfully',
      data: await message.populate(['senderId', 'receiverId']),
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error creating message:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send message',
      statusCode: 500,
    };
  }
}

/**
 * Get message by ID
 */
export async function getMessageById(messageId: string) {
  try {
    await connectDB();

    const message = await Message.findById(messageId).populate(['senderId', 'receiverId']);
    if (!message) {
      return { success: false, message: 'Message not found', statusCode: 404 };
    }

    return { success: true, data: message, statusCode: 200 };
  } catch (error) {
    console.error('Error getting message:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get message',
      statusCode: 500,
    };
  }
}

/**
 * Get conversation between two users
 */
export async function getConversation(userId1: string, userId2: string, limit: number = 50) {
  try {
    await connectDB();

    const messages = await Message.find({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    })
      .populate(['senderId', 'receiverId'])
      .sort({ createdAt: 1 })
      .limit(limit);

    return {
      success: true,
      data: messages,
      count: messages.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting conversation:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get conversation',
      statusCode: 500,
    };
  }
}

/**
 * Get messages for a user (inbox)
 */
export async function getUserMessages(userId: string, limit: number = 50) {
  try {
    await connectDB();

    const messages = await Message.find({ receiverId: userId })
      .populate(['senderId', 'receiverId'])
      .sort({ createdAt: -1 })
      .limit(limit);

    return {
      success: true,
      data: messages,
      count: messages.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting messages:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get messages',
      statusCode: 500,
    };
  }
}

/**
 * Get sent messages from a user
 */
export async function getUserSentMessages(userId: string, limit: number = 50) {
  try {
    await connectDB();

    const messages = await Message.find({ senderId: userId })
      .populate(['senderId', 'receiverId'])
      .sort({ createdAt: -1 })
      .limit(limit);

    return {
      success: true,
      data: messages,
      count: messages.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting sent messages:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get messages',
      statusCode: 500,
    };
  }
}

/**
 * Delete message
 */
export async function deleteMessage(messageId: string) {
  try {
    await connectDB();

    const message = await Message.findByIdAndDelete(messageId);
    if (!message) {
      return { success: false, message: 'Message not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Message deleted successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error deleting message:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete message',
      statusCode: 500,
    };
  }
}

/**
 * Get message count for user (unread messages)
 */
export async function getUserMessageCount(userId: string) {
  try {
    await connectDB();

    const count = await Message.countDocuments({ receiverId: userId });

    return {
      success: true,
      data: { userId, messageCount: count },
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting message count:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get message count',
      statusCode: 500,
    };
  }
}

/**
 * Get recent conversations
 */
export async function getRecentConversations(userId: string, limit: number = 10) {
  try {
    await connectDB();

    // Get unique conversations
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', userId] },
              '$receiverId',
              '$senderId',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
        },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'otherUser',
        },
      },
    ]);

    return {
      success: true,
      data: conversations,
      count: conversations.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting recent conversations:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get conversations',
      statusCode: 500,
    };
  }
}

/**
 * Clear conversation (delete all messages between two users)
 */
export async function clearConversation(userId1: string, userId2: string) {
  try {
    await connectDB();

    const result = await Message.deleteMany({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    });

    return {
      success: true,
      message: `${result.deletedCount} messages deleted`,
      data: { deletedCount: result.deletedCount },
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error clearing conversation:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to clear conversation',
      statusCode: 500,
    };
  }
}
