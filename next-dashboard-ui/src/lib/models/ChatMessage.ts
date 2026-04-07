import mongoose, { Schema } from 'mongoose';

interface IChatMessage {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  senderRole: 'teacher' | 'parent';
  receiverRole: 'teacher' | 'parent';
  message: string;
  attachments?: Array<{
    name: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
  deliveryStatus: 'sent' | 'delivered' | 'seen';
  deliveredAt?: Date;
  seenAt?: Date;
  timestamp: Date;
  read: boolean;
}

const ChatMessageSchema: Schema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['teacher', 'parent'], required: true },
  receiverRole: { type: String, enum: ['teacher', 'parent'], required: true },
  message: { type: String, default: '' },
  attachments: {
    type: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
      }
    ],
    default: [],
  },
  deliveryStatus: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent',
  },
  deliveredAt: { type: Date },
  seenAt: { type: Date },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

export default mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);