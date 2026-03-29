'use client';

import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Clock, Star, TrendingUp } from 'lucide-react';

interface StudentContentViewProps {
  studentId: string;
  classId: string;
  grade?: string;
}

export default function StudentContentView({ studentId, classId, grade }: StudentContentViewProps) {
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<any[]>([]);
  const [categorized, setCategorized] = useState<any>({});
  const [stats, setStats] = useState({
    totalTopics: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ studentId, classId });
        if (grade) params.append('grade', grade);

        const response = await fetch(`/api/student/content?${params}`);
        if (response.ok) {
          const data = await response.json();
          setTopics(data.topics || []);
          setCategorized(data.categorized || {});
          setStats({
            totalTopics: data.totalTopics || 0,
            completed: data.completed || 0,
            inProgress: data.inProgress || 0,
            notStarted: data.notStarted || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching student content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [studentId, classId, grade]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'not-started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in-progress': return <Clock className="w-4 h-4" />;
      case 'not-started': return <BookOpen className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const categories = ['all', ...Object.keys(categorized)];
  const displayTopics = selectedCategory === 'all' 
    ? topics 
    : categorized[selectedCategory] || [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="text-blue-600" size={20} />
            <span className="text-sm text-gray-600">Total Topics</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalTopics}</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-600" size={20} />
            <span className="text-sm text-gray-600">Completed</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-blue-600" size={20} />
            <span className="text-sm text-gray-600">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Star className="text-gray-600" size={20} />
            <span className="text-sm text-gray-600">Not Started</span>
          </div>
          <p className="text-2xl font-bold text-gray-600">{stats.notStarted}</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {cat === 'all' ? 'All Topics' : cat}
          </button>
        ))}
      </div>

      {/* Topics List */}
      {displayTopics.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
          <BookOpen size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No content available yet</p>
          <p className="text-gray-500 text-sm mt-2">
            Your teacher will add learning materials here soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayTopics.map((topic: any) => (
            <div
              key={topic._id}
              className="bg-white rounded-lg p-5 shadow-md border border-gray-200 hover:shadow-lg transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {topic.topic_name}
                  </h3>
                  <p className="text-sm text-gray-600">{topic.category}</p>
                  {topic.grade && (
                    <span className="inline-block mt-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                      Grade {topic.grade}
                    </span>
                  )}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(topic.studentProgress.status)}`}>
                  {getStatusIcon(topic.studentProgress.status)}
                  {topic.studentProgress.status.replace('-', ' ')}
                </div>
              </div>

              {/* Progress */}
              {topic.studentProgress.totalAttempts > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Best Score</span>
                    <span className="font-bold text-gray-900">
                      {topic.studentProgress.bestScore.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        topic.studentProgress.bestScore >= 70 ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(topic.studentProgress.bestScore, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {topic.studentProgress.totalAttempts} attempt{topic.studentProgress.totalAttempts !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Summary */}
              {topic.ai_summary && (
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                  {topic.ai_summary}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
                  onClick={() => {
                    window.location.href = `/student/learn/${topic._id}`;
                  }}
                >
                  View Content
                </button>
                {topic.quiz && (
                  <button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition"
                    onClick={() => {
                      window.location.href = `/student/quiz/${topic.quiz._id}`;
                    }}
                  >
                    Take Quiz
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
