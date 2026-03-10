const mongoose = require('mongoose');

const StudentMetricsSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
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
  
  // Mastery Score
  mastery_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  
  // Learning Velocity (rate of improvement)
  learning_velocity: {
    type: Number,
    default: 0,
  },
  
  // Engagement Index
  engagement_index: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  
  // Time and Effort
  total_time_spent: {
    type: Number,
    default: 0, // in seconds
  },
  quiz_attempts: {
    type: Number,
    default: 0,
  },
  content_views: {
    type: Number,
    default: 0,
  },
  
  // Knowledge Decay Prediction
  predicted_decay: {
    type: Number,
    default: 1,
    min: 0,
    max: 1,
  },
  last_review_date: Date,
  next_predicted_review_date: Date,
  
  // Concept-wise Mastery
  concept_mastery: [{
    concept: String,
    mastery: {
      type: Number,
      min: 0,
      max: 1,
    },
    last_attempted: Date,
  }],
  
  // Timestamp
  last_updated: {
    type: Date,
    default: Date.now,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.StudentMetrics || mongoose.model('StudentMetrics', StudentMetricsSchema);
