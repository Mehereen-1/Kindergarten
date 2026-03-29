'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Clock, Award, TrendingUp, Target } from 'lucide-react';

export default function StudentLearningDashboard() {
  const router = useRouter();
  const [topics, setTopics] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');

  useEffect(() => {
    // Get student info from session/URL
    const params = new URLSearchParams(window.location.search);
    const urlStudentId = params.get('studentId') || 'demo-student';
    const urlClassId = params.get('classId') || 'demo-class';
    
    setStudentId(urlStudentId);
    setClassId(urlClassId);
  }, []);

  const fetchTopicsAndMetrics = useCallback(async () => {
    if (!studentId || !classId) return;
    
    try {
      setLoading(true);
      
      // Fetch available topics
      const topicsRes = await fetch(`/api/ildce/topics?classId=${classId}`);
      if (topicsRes.ok) {
        const topicsData = await topicsRes.json();
        setTopics(topicsData.topics || []);
      }

      // Fetch student metrics
      const metricsRes = await fetch(`/api/ildce/metrics/student?studentId=${studentId}&classId=${classId}`);
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId, classId]);

  useEffect(() => {
    fetchTopicsAndMetrics();
  }, [fetchTopicsAndMetrics]);

  const handleStartQuiz = (topicId: string, quizId: string) => {
    router.push(`/student/learning/quiz?quizId=${quizId}&topicId=${topicId}&studentId=${studentId}&classId=${classId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-pulse">Loading your learning dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full p-4">
              <BookOpen className="text-white" size={40} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Learning Journey</h1>
              <p className="text-gray-600 mt-1">Track your progress and take quizzes</p>
            </div>
          </div>
        </div>

        {/* My Progress Summary */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm">Mastery Level</p>
                <Target className="text-blue-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {(metrics.avgMastery * 100 || 0).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Overall understanding</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm">Learning Speed</p>
                <TrendingUp className="text-green-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-green-600">
                {((metrics.learningVelocity || 0) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Improvement per week</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm">Quizzes Taken</p>
                <Award className="text-purple-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {metrics.totalAttempts || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total attempts</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm">Study Time</p>
                <Clock className="text-orange-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-orange-600">
                {Math.round(metrics.totalTimeSpent / 60 || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Minutes learned</p>
            </div>
          </div>
        )}

        {/* Available Topics & Quizzes */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📚 Available Topics</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {topics.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={64} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No topics available yet</p>
              <p className="text-gray-500 text-sm mt-2">Ask your teacher to upload content</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((topic: any) => (
                <div
                  key={topic._id}
                  className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-400 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-bold text-lg text-gray-900">{topic.topic_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      topic.difficulty_weight >= 4 ? 'bg-red-100 text-red-700' :
                      topic.difficulty_weight >= 3 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {topic.difficulty_weight >= 4 ? '⭐⭐⭐ Hard' :
                       topic.difficulty_weight >= 3 ? '⭐⭐ Medium' :
                       '⭐ Easy'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {topic.ai_summary || topic.content_text?.substring(0, 150)}...
                  </p>

                  <div className="space-y-2 mb-4">
                    {topic.concepts && topic.concepts.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {topic.concepts.slice(0, 3).map((concept: string, idx: number) => (
                          <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                            {concept}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {topic.quizId ? (
                    <button
                      onClick={() => handleStartQuiz(topic._id, topic.quizId)}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-md"
                    >
                      🎯 Take Quiz
                    </button>
                  ) : (
                    <div className="w-full bg-gray-100 text-gray-500 py-3 rounded-lg text-center">
                      Quiz not available yet
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Knowledge Decay Alerts */}
        {metrics?.knowledgeDecayTopics && metrics.knowledgeDecayTopics.length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl shadow-lg p-8 mt-6">
            <h2 className="text-xl font-bold text-orange-900 mb-4">⏰ Review Reminders</h2>
            <p className="text-orange-700 mb-4">
              These topics need review soon to maintain your mastery:
            </p>
            <div className="space-y-3">
              {metrics.knowledgeDecayTopics.map((item: any, idx: number) => (
                <div key={idx} className="bg-white rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{item.topicName}</p>
                    <p className="text-sm text-gray-600">
                      Review within {item.daysUntilDecay} days
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartQuiz(item.topicId, item.quizId)}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 transition"
                  >
                    Review Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
