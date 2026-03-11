const mongoose = require('mongoose');

const ContentChunkSchema = new mongoose.Schema({
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  chunk_text: {
    type: String,
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
  },
  source_type: {
    type: String,
    enum: ['notes', 'file'],
    default: 'notes',
  },
  file_name: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

ContentChunkSchema.index({ classId: 1, topicId: 1 });

module.exports = mongoose.models.ContentChunk || mongoose.model('ContentChunk', ContentChunkSchema);
