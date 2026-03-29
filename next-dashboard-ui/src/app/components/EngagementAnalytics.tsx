'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertCircle } from 'lucide-react';

export default function EngagementAnalytics({ topicId, classId }: any) {
  const [engagementData, setEngagementData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEngagementData();
  }, [topicId, classId]);

  const fetchEngagementData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ildce/analytics/engagement?topicId=${topicId}&classId=${classId}`
      );

      if (!response.ok) throw new Error('Failed to fetch engagement data');

      const data = await response.json();
      setEngagementData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
        <div className="animate-pulse">Loading engagement data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <AlertCircle className="text-red-600 inline mr-2" />
        {error}
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Engagement Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Avg Engagement</p>
          <p className="text-3xl font-bold text-blue-600">{(engagementData?.avgEngagement * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Avg Time Spent</p>
          <p className="text-2xl font-bold text-green-600">{formatTime(engagementData?.avgTimeSpent || 0)}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Avg Attempts</p>
          <p className="text-3xl font-bold text-purple-600">{engagementData?.avgAttempts?.toFixed(1) || 0}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Avg Views</p>
          <p className="text-3xl font-bold text-orange-600">{engagementData?.avgViews?.toFixed(0) || 0}</p>
        </div>
      </div>

      {/* Engagement Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* High Engagement */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-green-700">✅ High Engagement</h4>
            <div className="bg-green-600 text-white rounded-full px-3 py-1 text-sm font-bold">
              {engagementData?.engagement?.high?.count}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">{engagementData?.engagement?.high?.percentage}% of class</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {engagementData?.engagement?.high?.students?.slice(0, 5).map((s: any, idx: number) => (
              <div key={idx} className="text-sm text-gray-700">
                {s.name} ({(s.index * 100).toFixed(0)}%)
              </div>
            ))}
          </div>
        </div>

        {/* Medium Engagement */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-yellow-700">⚠️ Medium Engagement</h4>
            <div className="bg-yellow-600 text-white rounded-full px-3 py-1 text-sm font-bold">
              {engagementData?.engagement?.medium?.count}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">{engagementData?.engagement?.medium?.percentage}% of class</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {engagementData?.engagement?.medium?.students?.slice(0, 5).map((s: any, idx: number) => (
              <div key={idx} className="text-sm text-gray-700">
                {s.name} ({(s.index * 100).toFixed(0)}%)
              </div>
            ))}
          </div>
        </div>

        {/* Low Engagement */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-red-700">❌ Low Engagement</h4>
            <div className="bg-red-600 text-white rounded-full px-3 py-1 text-sm font-bold">
              {engagementData?.engagement?.low?.count}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">{engagementData?.engagement?.low?.percentage}% of class</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {engagementData?.engagement?.low?.students?.slice(0, 5).map((s: any, idx: number) => (
              <div key={idx} className="text-sm text-gray-700">
                {s.name} ({(s.index * 100).toFixed(0)}%)
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Engagement Trends */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <Activity size={20} className="text-blue-600" />
          <h3 className="text-lg font-bold text-gray-800">Student Engagement Breakdown</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Engagement</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Time Spent</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Quiz Attempts</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Content Views</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {engagementData?.engagementTrend?.slice(0, 10).map((student: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-800">{student.studentName}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${student.engagementIndex * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">
                        {(student.engagementIndex * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatTime(student.timeSpent)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 text-center">
                    {student.quizAttempts}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 text-center">
                    {student.contentViews}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">
                    {student.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
