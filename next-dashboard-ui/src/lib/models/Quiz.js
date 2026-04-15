const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  question_text: {
    type: String,
    required: true,
  },
  question_type: {
    type: String,
    enum: ['mcq', 'short_answer', 'true_false'],
    required: true,
  },
  options: [String], // For MCQ
  correct_answer: String,
  difficulty: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
  concept_tag: String,
  explanation: String,
});

const QuizSchema = new mongoose.Schema({
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  questions: [QuestionSchema],
  is_ai_generated: {
    type: Boolean,
    default: false,
  },
  is_published: {
    type: Boolean,
    default: false,
  },
  total_questions: {
    type: Number,
    default: 10,
  },
  time_limit: {
    type: Number, // in minutes
    default: null,
  },
  published_at: {
    type: Date,
    default: null,
  },
  published_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);
