'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function LearningVelocityChart({ topicId, classId }: any) {
  const [velocityData, setVelocityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVelocityData();
  }, [topicId, classId]);

  const fetchVelocityData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ildce/analytics/learning-velocity?topicId=${topicId}&classId=${classId}`
      );

      if (!response.ok) throw new Error('Failed to fetch velocity data');

      const data = await response.json();
      setVelocityData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
        <div className="animate-pulse">Loading velocity data...</div>
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 font-semibold">Improving</p>
              <p className="text-3xl font-bold text-green-600">{velocityData?.improvingCount || 0}</p>
            </div>
            <TrendingUp className="text-green-600" size={48} opacity={0.3} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 font-semibold">Stable</p>
              <p className="text-3xl font-bold text-gray-600">{velocityData?.stableCount || 0}</p>
            </div>
            <div className="text-gray-600 text-4xl">→</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-700 font-semibold">Declining</p>
              <p className="text-3xl font-bold text-red-600">{velocityData?.decliningCount || 0}</p>
            </div>
            <TrendingDown className="text-red-600" size={48} opacity={0.3} />
          </div>
        </div>
      </div>

      {/* Detailed Student List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">📈 Student Learning Velocity Trends</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Trend</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Avg Velocity</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Progress</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Attempts</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {velocityData?.velocityTrends?.map((velocity: any, idx: number) => {
                const velocityPercent = (velocity.avgVelocity * 100).toFixed(1);
                const isTrending = velocity.trend === 'improving' ? 'up' : velocity.trend === 'declining' ? 'down' : 'stable';

                return (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-800">{velocity.studentName}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isTrending === 'up' && <TrendingUp className="text-green-600" size={20} />}
                        {isTrending === 'down' && <TrendingDown className="text-red-600" size={20} />}
                        {isTrending === 'stable' && <div className="text-gray-600 text-lg">→</div>}
                        <span className={`text-sm font-semibold ${
                          isTrending === 'up' ? 'text-green-600' : isTrending === 'down' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {velocity.trend.charAt(0).toUpperCase() + velocity.trend.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${
                          velocity.avgVelocity > 0 ? 'text-green-600' : velocity.avgVelocity < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {velocityPercent}%/day
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {velocity.firstScore.toFixed(0)}% → {velocity.lastScore.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                      {velocity.totalAttempts}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {velocity.trend === 'improving' && <span className="text-green-600 font-semibold">✅ Good</span>}
                      {velocity.trend === 'declining' && <span className="text-red-600 font-semibold">⚠️ Action</span>}
                      {velocity.trend === 'stable' && <span className="text-gray-600 font-semibold">→ Monitor</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!velocityData?.velocityTrends || velocityData.velocityTrends.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            No velocity data available. Students need to take multiple attempts.
          </div>
        )}
      </div>
    </div>
  );
}
