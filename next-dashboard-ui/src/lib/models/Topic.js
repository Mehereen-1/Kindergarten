const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  grade: {
    type: String,
    required: false,
  },
  topic_name: {
    type: String,
    required: true,
  },
  content_text: {
    type: String,
    required: true,
  },
  content_type: {
    type: String,
    enum: ['pdf', 'slides', 'text', 'notes'],
    default: 'text',
  },
  file_url: {
    type: String,
  },
  file_name: {
    type: String,
  },
  file_type: {
    type: String,
  },
  file_size: {
    type: Number,
  },
  difficulty_weight: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
  category: {
    type: String,
    required: true,
  },
  
  // AI-Generated Content
  ai_summary: {
    type: String,
  },
  ai_key_points: [{
    type: String,
  }],
  ai_definitions: [{
    term: String,
    definition: String,
  }],
  ai_formulas: [{
    formula: String,
    explanation: String,
  }],
  
  // Concept Extraction
  concepts: [{
    type: String,
  }],
  
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Topic || mongoose.model('Topic', TopicSchema);
