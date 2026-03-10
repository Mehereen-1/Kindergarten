'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

export default function QuizInterface({ quizId, classId, studentId }: any) {
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    try {
      // Calculate score
      let correctCount = 0;
      const questionAnswers = (quiz as any).questions.map((q: any, idx: any) => ({
        questionId: idx,
        student_answer: answers[idx],
        correct_answer: q.correct_answer,
        concept_tag: q.concept_tag,
        time_spent: 30, // placeholder
      }));

      questionAnswers.forEach((qa: any) => {
        if (qa.student_answer === qa.correct_answer) correctCount++;
      });

      const percentage = (correctCount / (quiz as any).questions.length) * 100;
      setScore(percentage);

      // Submit to backend
      const response = await fetch('/api/ildce/quiz-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          quizId: (quiz as any)._id,
          topicId: (quiz as any).topicId,
          classId,
          answers: questionAnswers,
          time_spent: 0,
          teacherId: 'placeholder',
        }),
      });

      if (!response.ok) throw new Error('Failed to submit quiz');

      const data = await response.json();
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    }
  }, [quiz, answers, studentId, classId]);

  // Fetch quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!quizId) {
        setError('Quiz ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await fetch(`/api/ildce/quizzes/${quizId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch quiz');
        }

        const fetchedQuiz = data.quiz;
        if (!fetchedQuiz || !Array.isArray(fetchedQuiz.questions) || fetchedQuiz.questions.length === 0) {
          throw new Error('This quiz has no questions yet. Please generate the quiz again.');
        }

        setQuiz(fetchedQuiz);
        const perQuestionSeconds = 60;
        setTimeRemaining(fetchedQuiz.questions.length * perQuestionSeconds);
      } catch (err: any) {
        setError(err.message || 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  // Timer
  useEffect(() => {
    if (quiz && !isSubmitted && timeRemaining > 0) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && quiz && !isSubmitted) {
      handleSubmit();
    }
  }, [timeRemaining, quiz, isSubmitted, handleSubmit]);

  const handleAnswer = (answer: any) => {
    setAnswers({
      ...answers,
      [currentQuestion]: answer,
    });
  };

  if (loading) return <div className="text-center py-8">Loading quiz...</div>;
  if (error) return <div className="bg-red-50 p-4 rounded text-red-700">{error}</div>;

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
        <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Completed!</h2>
        <p className="text-4xl font-bold text-blue-600 mb-6">{score.toFixed(1)}%</p>
        <p className="text-gray-600 mb-6">Your performance has been recorded and your metrics updated.</p>
        <button
          onClick={() => window.history.back()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Class
        </button>
      </div>
    );
  }

  if (!quiz) return <div>Quiz not found</div>;

  const q = (quiz as any).questions[currentQuestion];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{(quiz as any).title}</h2>
          <div className="flex items-center gap-2 text-lg font-semibold text-red-600">
            <Clock size={20} />
            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentQuestion + 1) / (quiz as any).questions.length) * 100}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Question {currentQuestion + 1} of {(quiz as any).questions.length}
        </p>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">{q.question_text}</h3>

        {q.question_type === 'mcq' && (
          <div className="space-y-3">
            {q.options.map((option: string, idx: number) => (
              <button
                key={idx}
                onClick={() => handleAnswer(option)}
                className={`w-full p-4 rounded-lg border-2 transition text-left ${
                  answers[currentQuestion] === option
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {q.question_type === 'true_false' && (
          <div className="space-y-3">
            {['True', 'False'].map((option) => (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                className={`w-full p-4 rounded-lg border-2 transition ${
                  answers[currentQuestion] === option
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {q.question_type === 'short_answer' && (
          <textarea
            value={answers[currentQuestion] || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-4 justify-between">
        <button
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
          className="px-6 py-2 border border-gray-300 rounded-lg font-semibold disabled:opacity-50"
        >
          ← Previous
        </button>

        {currentQuestion === (quiz as any).questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
          >
            Submit Quiz
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestion(currentQuestion + 1)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
