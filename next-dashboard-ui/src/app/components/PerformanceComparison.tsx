'use client';

import { useEffect, useState } from 'react';
import { Award, TrendingUp, TrendingDown } from 'lucide-react';

export default function PerformanceComparison({ classId, compareBy = 'students' }: any) {
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewType, setViewType] = useState(compareBy);

  useEffect(() => {
    fetchComparison();
  }, [classId, viewType]);

  const fetchComparison = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ildce/analytics/performance-comparison?classId=${classId}&compareBy=${viewType}`
      );

      if (!response.ok) throw new Error('Failed to fetch comparison data');

      const data = await response.json();
      setComparison(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
        <div className="animate-pulse">Loading comparison data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewType('students')}
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            viewType === 'students'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          👥 Compare Students
        </button>
        <button
          onClick={() => setViewType('topics')}
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            viewType === 'topics'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📚 Compare Topics
        </button>
      </div>

      {/* Top Performer / Ranked Item */}
      {viewType === 'students' && comparison?.topPerformer && (
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <Award size={48} />
            <div>
              <p className="text-sm opacity-90">🏆 Top Performer</p>
              <h3 className="text-2xl font-bold">{comparison.topPerformer.studentName}</h3>
              <p className="text-sm opacity-90 mt-1">
                {(comparison.topPerformer.avgMastery * 100).toFixed(1)}% Mastery
              </p>
            </div>
          </div>
        </div>
      )}

      {viewType === 'topics' && comparison?.topRanked && (
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <TrendingUp size={48} />
            <div>
              <p className="text-sm opacity-90">📈 Best Performing Topic</p>
              <h3 className="text-2xl font-bold">{comparison.topRanked.topicName}</h3>
              <p className="text-sm opacity-90 mt-1">
                {(comparison.topRanked.avgMastery * 100).toFixed(1)}% Class Mastery
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Class Average */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-600">Class Average</p>
        <p className="text-3xl font-bold text-blue-600">
          {(parseFloat(comparison?.classAvgMastery || 0) * 100).toFixed(1)}%
        </p>
      </div>

      {/* Ranking Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">
            {viewType === 'students' ? '🏅 Student Rankings' : '📊 Topic Rankings'}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rank</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  {viewType === 'students' ? 'Student' : 'Topic'}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Mastery</th>
                {viewType === 'students' ? (
                  <>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Engagement</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Velocity</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Difficulty</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Attempts</th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {comparison?.comparison?.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-bold text-lg text-gray-700">#{idx + 1}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {item.studentName || item.topicName}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${item.avgMastery * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">
                        {(item.avgMastery * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  {viewType === 'students' ? (
                    <>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {(item.engagementLevel * 100).toFixed(0)}%
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-1">
                          {item.learningVelocity > 0 && (
                            <TrendingUp className="text-green-600" size={16} />
                          )}
                          {item.learningVelocity < 0 && (
                            <TrendingDown className="text-red-600" size={16} />
                          )}
                          <span className={
                            item.learningVelocity > 0
                              ? 'text-green-600 font-semibold'
                              : item.learningVelocity < 0
                              ? 'text-red-600 font-semibold'
                              : 'text-gray-700'
                          }>
                            {(item.learningVelocity * 100).toFixed(1)}%/day
                          </span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {(item.difficulty * 100).toFixed(0)}%
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-center">
                        {item.attempts}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 text-sm font-semibold">
                    {item.performanceStatus || (
                      item.avgMastery > 0.7 ? '✅ Strong' : item.avgMastery > 0.4 ? '⚠️ Fair' : '❌ Need Help'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Struggling Item Alert */}
      {(viewType === 'students' && comparison?.needsSupport) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h4 className="font-bold text-red-700 mb-2">⚠️ Student Needing Support</h4>
          <p className="text-red-700 mb-3">
            <strong>{comparison.needsSupport.studentName}</strong> - {(comparison.needsSupport.avgMastery * 100).toFixed(0)}% mastery
          </p>
          <p className="text-sm text-red-600">Consider scheduling 1-on-1 review or additional practice.</p>
        </div>
      )}

      {(viewType === 'topics' && comparison?.strugglingTopic) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h4 className="font-bold text-red-700 mb-2">📉 Struggling Topic</h4>
          <p className="text-red-700 mb-3">
            <strong>{comparison.strugglingTopic.topicName}</strong> - {(comparison.strugglingTopic.avgMastery * 100).toFixed(0)}% class mastery
          </p>
          <p className="text-sm text-red-600">Consider reteaching core concepts or providing additional practice problems.</p>
        </div>
      )}
    </div>
  );
}
