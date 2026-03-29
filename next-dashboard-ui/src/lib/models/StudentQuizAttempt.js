const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  questionId: mongoose.Schema.Types.ObjectId,
  student_answer: String,
  is_correct: Boolean,
  time_spent: Number, // in seconds
});

const StudentQuizAttemptSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
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
  
  // Quiz Performance
  total_questions: Number,
  correct_answers: Number,
  score: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  time_spent: Number, // in seconds
  attempt_number: {
    type: Number,
    default: 1,
  },
  
  // Detailed Answers
  answers: [AnswerSchema],
  
  // Concept-wise Performance
  concept_performance: [{
    concept: String,
    score: Number,
    attempts: Number,
  }],
  
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.StudentQuizAttempt || mongoose.model('StudentQuizAttempt', StudentQuizAttemptSchema);
