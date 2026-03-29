const mongoose = require('mongoose');

const TopicMetricsSchema = new mongoose.Schema({
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
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Class-level Metrics
  class_avg_mastery: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  
  // Dynamic Difficulty
  dynamic_difficulty: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  
  // Entropy (Class Balance)
  entropy: {
    type: Number,
    default: 0,
  },
  
  // Performance Distribution
  mastery_distribution: {
    weak: Number,        // < 0.4
    moderate: Number,    // 0.4 - 0.7
    strong: Number,      // > 0.7
  },
  
  // Learning Velocity Stats
  avg_learning_velocity: Number,
  students_improving: Number,
  students_declining: Number,
  
  // Engagement Stats
  avg_engagement: {
    type: Number,
    min: 0,
    max: 1,
  },
  
  // Alerts Triggered
  alerts: [{
    alert_type: String, // 'declining', 'low_engagement', 'difficulty_rise'
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    affected_students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    description: String,
    triggered_at: Date,
  }],
  
  last_updated: {
    type: Date,
    default: Date.now,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.TopicMetrics || mongoose.model('TopicMetrics', TopicMetricsSchema);
