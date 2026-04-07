const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
      },
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

module.exports = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
