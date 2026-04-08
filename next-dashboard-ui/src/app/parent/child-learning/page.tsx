'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  BookOpen, TrendingUp, TrendingDown, AlertTriangle, 
  Award, Clock, Target, Activity, Brain, Calendar, FileText, Lightbulb, Calculator
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

function ParentChildLearningDashboardContent() {
  const searchParams = useSearchParams();
  const [childId, setChildId] = useState('');
  const [classId, setClassId] = useState('');
  const [childName, setChildName] = useState('');
  const [metrics, setMetrics] = useState<any>(null);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [decayPredictions, setDecayPredictions] = useState<any[]>([]);
  const [conceptMastery, setConceptMastery] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const urlChildId = searchParams.get('childId') || 'demo-student';
    const urlClassId = searchParams.get('classId') || 'demo-class';
    const urlChildName = searchParams.get('childName') || 'Your Child';
    
    setChildId(urlChildId);
    setClassId(urlClassId);
    setChildName(urlChildName);
  }, [searchParams]);

  const fetchChildData = useCallback(async () => {
    if (!childId || !classId) return;
    
    try {
      setLoading(true);
      setError('');

      // Fetch student metrics
      const metricsRes = await fetch(`/api/ildce/metrics/student?studentId=${childId}&classId=${classId}`);
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      // Fetch quiz attempts history
      const historyRes = await fetch(`/api/ildce/quiz-attempt?studentId=${childId}&classId=${classId}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setQuizHistory(historyData.attempts || []);
      }

      // Fetch concept mastery heatmap
      const heatmapRes = await fetch(`/api/ildce/analytics/concept-heatmap?studentId=${childId}&classId=${classId}`);
      if (heatmapRes.ok) {
        const heatmapData = await heatmapRes.json();
        setConceptMastery(heatmapData.heatmap || []);
      }

      // Fetch revision schedule (decay predictions)
      const revisionRes = await fetch(`/api/ildce/predictions/revision-schedule?studentId=${childId}&classId=${classId}`);
      if (revisionRes.ok) {
        const revisionData = await revisionRes.json();
        setDecayPredictions(revisionData.schedule || []);
      }

      // Fetch available topics for quizzes
      const topicsRes = await fetch(`/api/ildce/topics?classId=${classId}`);
      if (topicsRes.ok) {
        const topicsData = await topicsRes.json();
        setTopics(topicsData.topics || []);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to fetch child data');
    } finally {
      setLoading(false);
    }
  }, [childId, classId]);

  useEffect(() => {
    fetchChildData();
  }, [fetchChildData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your child&apos;s learning data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-full p-4">
              <Brain className="text-white" size={40} />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{childName}&apos;s Learning Journey</h1>
              <p className="text-gray-600 mt-1">Monitor progress, mastery, and areas for improvement</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b overflow-x-auto">
            {[
              { id: 'overview', label: '📊 Overview', icon: Activity },
              { id: 'materials', label: '📖 Learning Materials', icon: FileText },
              { id: 'topics', label: '📚 Topics & Quizzes', icon: BookOpen },
              { id: 'progress', label: '📈 Progress', icon: TrendingUp },
              { id: 'concepts', label: '🧠 Concepts', icon: Brain },
              { id: 'alerts', label: '⚠️ Alerts', icon: AlertTriangle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-semibold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-b-4 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-600 text-sm">Overall Mastery</p>
                    <Target className="text-blue-600" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-blue-600">
                    {(metrics.avgMastery * 100 || 0).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Knowledge retention</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-600 text-sm">Learning Speed</p>
                    <TrendingUp className="text-green-600" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-green-600">
                    {((metrics.learningVelocity || 0) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Weekly improvement</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-600 text-sm">Quizzes Completed</p>
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

            {/* Recent Quiz Performance */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📚 Recent Quiz Performance</h2>
              {quizHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No quiz attempts yet</p>
              ) : (
                <div className="space-y-4">
                  {quizHistory.slice(0, 5).map((attempt: any, idx: number) => (
                    <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-400 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{attempt.topicName || 'Quiz'}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(attempt.submittedAt).toLocaleDateString()} at {new Date(attempt.submittedAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-3xl font-bold ${
                            attempt.score >= 0.8 ? 'text-green-600' :
                            attempt.score >= 0.6 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {(attempt.score * 100).toFixed(0)}%
                          </p>
                          <p className="text-xs text-gray-600">
                            {attempt.correctAnswers}/{attempt.totalQuestions} correct
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-6">
            {/* Learning Materials with AI Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📖 Learning Materials & AI Analysis</h2>
              <p className="text-gray-600 mb-6">
                View what your child is learning, including AI-generated summaries, key concepts, and mathematical formulas.
              </p>

              {topics.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={64} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No learning materials available yet</p>
                  <p className="text-gray-500 text-sm mt-2">Content will appear here once teachers upload materials</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {topics.map((topic: any, idx: number) => (
                    <div
                      key={topic._id}
                      className="border-2 border-gray-200 rounded-xl p-6 hover:border-purple-300 transition"
                    >
                      {/* Topic Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl font-bold text-purple-600">#{idx + 1}</span>
                            <h3 className="text-2xl font-bold text-gray-900">{topic.topic_name}</h3>
                          </div>
                          <p className="text-sm text-gray-500">
                            Uploaded: {new Date(topic.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${
                          topic.difficulty_weight >= 4 ? 'bg-red-100 text-red-700' :
                          topic.difficulty_weight >= 3 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {topic.difficulty_weight >= 4 ? '⭐⭐⭐ Advanced' :
                           topic.difficulty_weight >= 3 ? '⭐⭐ Intermediate' :
                           '⭐ Beginner'}
                        </span>
                      </div>

                      {/* AI Summary */}
                      {topic.ai_summary && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="text-blue-600" size={20} />
                            <h4 className="font-bold text-blue-900">🤖 AI Summary</h4>
                          </div>
                          <p className="text-blue-800 leading-relaxed">{topic.ai_summary}</p>
                        </div>
                      )}

                      {/* Key Concepts */}
                      {topic.concepts && topic.concepts.length > 0 && (
                        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Brain className="text-purple-600" size={20} />
                            <h4 className="font-bold text-purple-900">🧠 Key Concepts ({topic.concepts.length})</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {topic.concepts.map((concept: string, cidx: number) => (
                              <span
                                key={cidx}
                                className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full text-sm font-semibold border border-purple-300"
                              >
                                {concept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mathematical Formulas */}
                      {topic.math_formulas && topic.math_formulas.length > 0 && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Calculator className="text-green-600" size={20} />
                            <h4 className="font-bold text-green-900">🔢 Mathematical Formulas ({topic.math_formulas.length})</h4>
                          </div>
                          <div className="space-y-2">
                            {topic.math_formulas.map((formula: string, fidx: number) => (
                              <div
                                key={fidx}
                                className="bg-white border border-green-300 rounded px-4 py-2 font-mono text-sm text-gray-800"
                              >
                                {formula}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Full Content */}
                      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="text-gray-600" size={20} />
                          <h4 className="font-bold text-gray-900">📄 Full Content</h4>
                        </div>
                        {topic.file_url && (
                          <div className="mb-3">
                            <a
                              href={topic.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
                            >
                              📎 Open Uploaded File
                              {topic.file_name ? ` (${topic.file_name})` : ''}
                            </a>
                          </div>
                        )}
                        <div className="max-h-48 overflow-y-auto">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {topic.content_text}
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      {topic.quizId && (
                        <div className="mt-4 pt-4 border-t-2 border-gray-200">
                          <a
                            href={`/parent/child-learning/quiz?quizId=${topic.quizId}&topicId=${topic._id}&childId=${childId}&classId=${classId}&childName=${childName}`}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition shadow-md"
                          >
                            🎯 Practice This Topic with Your Child
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Parent Learning Tips */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-indigo-900 text-lg mb-3">💡 Tips for Supporting Your Child&apos;s Learning:</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-indigo-200">
                  <h4 className="font-semibold text-indigo-800 mb-2">📚 Review Together</h4>
                  <p className="text-sm text-gray-700">
                    Read through the AI summaries and key concepts with your child. Ask them to explain what they learned in their own words.
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-indigo-200">
                  <h4 className="font-semibold text-indigo-800 mb-2">🔢 Practice Formulas</h4>
                  <p className="text-sm text-gray-700">
                    If mathematical formulas are present, create simple examples together. Let your child solve problems using the formulas.
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-indigo-200">
                  <h4 className="font-semibold text-indigo-800 mb-2">💬 Ask Questions</h4>
                  <p className="text-sm text-gray-700">
                    Use the key concepts to create discussion questions. This helps deepen understanding beyond memorization.
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-indigo-200">
                  <h4 className="font-semibold text-indigo-800 mb-2">🎯 Regular Practice</h4>
                  <p className="text-sm text-gray-700">
                    Schedule regular quiz sessions. Consistent practice helps retain knowledge and builds confidence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'topics' && (
          <div className="space-y-6">
            {/* Available Topics & Quizzes */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📚 Available Topics & Quizzes</h2>
              <p className="text-gray-600 mb-6">
                Select a topic for your child to practice. You can supervise while they take the quiz.
              </p>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {topics.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen size={64} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No topics available yet</p>
                  <p className="text-gray-500 text-sm mt-2">Topics will appear here once teachers upload content</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {topics.map((topic: any) => (
                    <div
                      key={topic._id}
                      className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-400 hover:shadow-md transition"
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
                              <span key={idx} className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                                {concept}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {topic.quizId ? (
                        <a
                          href={`/parent/child-learning/quiz?quizId=${topic.quizId}&topicId=${topic._id}&childId=${childId}&classId=${classId}&childName=${childName}`}
                          className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition shadow-md text-center"
                        >
                          🎯 Start Quiz
                        </a>
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

            {/* Instructions for Parents */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-purple-900 text-lg mb-3">👨‍👩‍👧 Parent Tips:</h3>
              <ul className="text-sm text-purple-800 space-y-2">
                <li>• <strong>View Materials First:</strong> Check the &quot;Learning Materials&quot; tab to see AI summaries, concepts, and formulas</li>
                <li>• <strong>Supervise:</strong> Sit with your child while they take the quiz</li>
                <li>• <strong>Encourage:</strong> Help them read questions if needed (for kindergarten)</li>
                <li>• <strong>Be Patient:</strong> Let them think through answers at their own pace</li>
                <li>• <strong>Celebrate:</strong> Praise effort and progress, not just correct answers</li>
                <li>• <strong>Review:</strong> After completion, check the Progress tab to see improvements</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* Progress Chart */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📈 Learning Progress Over Time</h2>
              {quizHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={quizHistory.map((attempt: any, idx: number) => ({
                    name: `Quiz ${idx + 1}`,
                    score: (attempt.score * 100).toFixed(1),
                    mastery: (attempt.masteryLevel * 100 || 0).toFixed(1),
                    date: new Date(attempt.submittedAt).toLocaleDateString()
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} name="Quiz Score %" />
                    <Line type="monotone" dataKey="mastery" stroke="#10b981" strokeWidth={2} name="Mastery Level %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-12">No progress data available yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'concepts' && (
          <div className="space-y-6">
            {/* Concept Mastery Grid */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">🧠 Concept Mastery Breakdown</h2>
              {conceptMastery.length === 0 ? (
                <p className="text-gray-500 text-center py-12">No concept data available yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {conceptMastery.map((concept: any, idx: number) => (
                    <div key={idx} className="border-2 border-gray-200 rounded-lg p-4">
                      <h3 className="font-bold text-gray-900 mb-2">{concept.concept}</h3>
                      <div className="relative w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            concept.mastery >= 0.8 ? 'bg-green-500' :
                            concept.mastery >= 0.6 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${concept.mastery * 100}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">
                          {(concept.mastery * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        {concept.attempts} attempts • {concept.correctCount} correct
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* Knowledge Decay Predictions */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">⚠️ Review Recommendations</h2>
              {decayPredictions.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle size={64} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">All concepts are well-retained! 🎉</p>
                  <p className="text-gray-500 text-sm mt-2">No immediate review needed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {decayPredictions.map((prediction: any, idx: number) => (
                    <div
                      key={idx}
                      className={`border-2 rounded-lg p-6 ${
                        prediction.daysUntilDecay <= 3 ? 'border-red-300 bg-red-50' :
                        prediction.daysUntilDecay <= 7 ? 'border-yellow-300 bg-yellow-50' :
                        'border-blue-300 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {prediction.daysUntilDecay <= 3 ? (
                              <AlertTriangle className="text-red-600" size={24} />
                            ) : prediction.daysUntilDecay <= 7 ? (
                              <AlertTriangle className="text-yellow-600" size={24} />
                            ) : (
                              <Calendar className="text-blue-600" size={24} />
                            )}
                            <h3 className="font-bold text-lg text-gray-900">{prediction.topicName}</h3>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Current Mastery:</strong> {(prediction.currentMastery * 100).toFixed(0)}%
                          </p>
                          <p className="text-sm text-gray-700">
                            <strong>Recommendation:</strong> Review within <strong>{prediction.daysUntilDecay} days</strong> to maintain mastery
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                            prediction.priority === 'urgent' ? 'bg-red-600 text-white' :
                            prediction.priority === 'high' ? 'bg-yellow-600 text-white' :
                            'bg-blue-600 text-white'
                          }`}>
                            {prediction.priority?.toUpperCase() || 'MEDIUM'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Engagement Insights */}
            {metrics && metrics.avgEngagement !== undefined && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">💡 Engagement Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border-2 border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Activity className="text-purple-600" size={32} />
                      <h3 className="font-bold text-lg">Engagement Level</h3>
                    </div>
                    <div className="relative w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          metrics.avgEngagement >= 0.7 ? 'bg-green-500' :
                          metrics.avgEngagement >= 0.4 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${metrics.avgEngagement * 100}%` }}
                      ></div>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
                        {(metrics.avgEngagement * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      {metrics.avgEngagement >= 0.7 ? '✅ Excellent engagement with learning materials' :
                       metrics.avgEngagement >= 0.4 ? '⚠️ Moderate engagement - consider encouragement' :
                       '🚨 Low engagement - may need additional support'}
                    </p>
                  </div>

                  <div className="border-2 border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <TrendingUp className="text-green-600" size={32} />
                      <h3 className="font-bold text-lg">Learning Velocity</h3>
                    </div>
                    <p className="text-4xl font-bold text-green-600 mb-2">
                      {((metrics.learningVelocity || 0) * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      {metrics.learningVelocity > 0 ? '📈 Positive learning trajectory - keep it up!' :
                       metrics.learningVelocity === 0 ? '➡️ Stable performance' :
                       '📉 May benefit from additional practice'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ParentChildLearningDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading child learning dashboard...</p>
          </div>
        </div>
      }
    >
      <ParentChildLearningDashboardContent />
    </Suspense>
  );
}
