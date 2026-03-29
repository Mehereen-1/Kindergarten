import mongoose, { Schema } from 'mongoose';

interface IChatMessage {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  senderRole: 'teacher' | 'parent';
  receiverRole: 'teacher' | 'parent';
  message: string;
  timestamp: Date;
  read: boolean;
}

const ChatMessageSchema: Schema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['teacher', 'parent'], required: true },
  receiverRole: { type: String, enum: ['teacher', 'parent'], required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

export default mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);