'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function PerformanceForecast({ classId }: any) {
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [daysAhead, setDaysAhead] = useState(14);

  useEffect(() => {
    fetchForecast();
  }, [classId, daysAhead]);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ildce/predictions/performance-forecast?classId=${classId}&daysAhead=${daysAhead}`
      );

      if (!response.ok) throw new Error('Failed to fetch performance forecast');

      const data = await response.json();
      setForecast(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High':
        return 'bg-red-100 border-red-300 text-red-700';
      case 'Medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-700';
      default:
        return 'bg-green-100 border-green-300 text-green-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent':
        return 'bg-green-500 text-white';
      case 'Good':
        return 'bg-blue-500 text-white';
      case 'Fair':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-red-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
        <div className="animate-pulse">Loading performance forecast...</div>
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
      {/* Forecast Period Selector */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4">
          <label className="font-semibold text-gray-700">Forecast Period:</label>
          <div className="flex gap-2">
            {[7, 14, 30].map(days => (
              <button
                key={days}
                onClick={() => setDaysAhead(days)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  daysAhead === days
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Class-Level Overview */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-8 text-white shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm opacity-90">Current Avg Mastery</p>
            <p className="text-3xl font-bold mt-2">
              {(forecast?.classForecasts?.avgCurrentMastery * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90">Forecast Avg Mastery</p>
            <p className="text-3xl font-bold mt-2">
              {(forecast?.classForecasts?.avgForecastedMastery * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90">Improving</p>
            <p className="text-3xl font-bold mt-2">
              {forecast?.classForecasts?.improvingStudents}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90">At Risk</p>
            <p className="text-3xl font-bold mt-2">
              {forecast?.classForecasts?.atRisk}
            </p>
          </div>
        </div>
      </div>

      {/* Class Insights */}
      {forecast?.insights?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-bold text-blue-700 mb-3">🔮 Forecast Insights</h4>
          <ul className="space-y-2">
            {forecast.insights.map((insight: string, idx: number) => (
              <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                <span className="text-lg mt-0">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Class Recommendations */}
      {forecast?.recommendations?.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h4 className="font-bold text-green-700 mb-3">✅ Recommendations</h4>
          <ul className="space-y-2">
            {forecast.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                <span className="text-lg mt-0">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trend Chart */}
      {forecast?.trendPoints && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Class Performance Trend</h3>
          
          {/* Simple bar chart showing distribution over time */}
          <div className="space-y-4">
            {forecast.trendPoints.map((point: any, idx: number) => {
              const total = point.strong + point.moderate + point.weak || 1;
              return (
                <div key={idx}>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Day {point.day}
                  </p>
                  <div className="flex gap-1 h-8 rounded-lg overflow-hidden bg-gray-100">
                    {point.strong > 0 && (
                      <div
                        className="bg-green-500 flex items-center justify-center text-white text-xs font-bold"
                        style={{ width: `${(point.strong / total) * 100}%` }}
                        title={`Strong: ${point.strong}`}
                      >
                        {point.strong > 0 ? point.strong : ''}
                      </div>
                    )}
                    {point.moderate > 0 && (
                      <div
                        className="bg-yellow-400 flex items-center justify-center text-gray-800 text-xs font-bold"
                        style={{ width: `${(point.moderate / total) * 100}%` }}
                        title={`Moderate: ${point.moderate}`}
                      >
                        {point.moderate > 0 ? point.moderate : ''}
                      </div>
                    )}
                    {point.weak > 0 && (
                      <div
                        className="bg-red-500 flex items-center justify-center text-white text-xs font-bold"
                        style={{ width: `${(point.weak / total) * 100}%` }}
                        title={`Weak: ${point.weak}`}
                      >
                        {point.weak > 0 ? point.weak : ''}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Strong (&gt;70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded"></div>
              <span>Moderate (40-70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Weak (&lt;40%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Student Forecasts */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">
            👥 Individual Student Forecasts
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Current</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Forecasted
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Trajectory</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Risk</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {forecast?.forecasts?.slice(0, 15).map((f: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-semibold text-gray-800">{f.studentName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${getStatusColor(f.performanceStatus)}`}>
                      {(f.currentMastery * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${getStatusColor(f.forecastedStatus)}`}>
                      {(f.forecastedMastery * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {f.trajectory === 'Improving' && (
                        <TrendingUp className="text-green-600" size={20} />
                      )}
                      {f.trajectory === 'Declining' && (
                        <TrendingDown className="text-red-600" size={20} />
                      )}
                      {f.trajectory === 'Stable' && (
                        <div className="w-5 h-5 text-gray-600">→</div>
                      )}
                      <span className="font-semibold">{f.trajectory}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRiskColor(f.riskLevel)}`}>
                      {f.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                    {f.confidence}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {forecast?.forecasts?.length > 15 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center text-sm text-gray-600">
            Showing 15 of {forecast.forecasts.length} students
          </div>
        )}
      </div>

      {/* High-Risk Students Alert */}
      {forecast?.forecasts?.filter((f: any) => f.riskLevel === 'High').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={20} />
            <div>
              <h4 className="font-bold text-red-700 mb-3">⚠️ High-Risk Students</h4>
              <div className="space-y-2">
                {forecast.forecasts
                  .filter((f: any) => f.riskLevel === 'High')
                  .slice(0, 5)
                  .map((f: any, idx: number) => (
                    <div key={idx} className="text-sm text-red-700">
                      <strong>{f.studentName}</strong> - Currently {(f.currentMastery * 100).toFixed(0)}%
                      , forecast {(f.forecastedMastery * 100).toFixed(0)}%
                      {f.recommendations?.length > 0 && (
                        <ul className="ml-4 mt-1 list-disc">
                          {f.recommendations.map((r: string, i: number) => (
                            <li key={i} className="text-xs">{r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
