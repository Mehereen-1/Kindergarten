'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';

export default function ClassEntropyVisualization({ classId }: any) {
  const [entropy, setEntropy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEntropy();
  }, [classId]);

  const fetchEntropy = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ildce/analytics/class-entropy?classId=${classId}`
      );

      if (!response.ok) throw new Error('Failed to fetch entropy data');

      const data = await response.json();
      setEntropy(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
        <div className="animate-pulse">Loading entropy analysis...</div>
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

  const entropyValue = entropy?.classEntropy?.value || 0;
  const normalized = entropy?.classEntropy?.normalized || 0;
  const interpretation = entropy?.classEntropy?.interpretation || '';

  // Calculate SVG dimensions for pie chart
  const size = 200;
  const center = size / 2;
  const radius = 80;

  const districts = [
    { name: 'Strong', value: entropy?.distribution?.strong?.percentage || 0, color: 'rgb(34, 197, 94)' },
    { name: 'Moderate', value: entropy?.distribution?.moderate?.percentage || 0, color: 'rgb(251, 191, 36)' },
    { name: 'Weak', value: entropy?.distribution?.weak?.percentage || 0, color: 'rgb(239, 68, 68)' },
  ];

  // Create pie chart paths
  const getPiePath = () => {
    let angle = -90;
    return districts.map((district, idx) => {
      const sliceAngle = (district.value / 100) * 360;
      const startAngle = (angle * Math.PI) / 180;
      const endAngle = ((angle + sliceAngle) * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      const largeArc = sliceAngle > 180 ? 1 : 0;

      const pathData = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ');

      angle += sliceAngle;
      return { pathData, color: district.color, idx };
    });
  };

  const piePaths = getPiePath();

  return (
    <div className="space-y-6">
      {/* Main Entropy Metric */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg opacity-90">Class Entropy Score</p>
            <p className="text-5xl font-bold mt-2">{entropyValue.toFixed(2)}</p>
            <p className="text-sm opacity-75 mt-2">Normalized: {(normalized * 100).toFixed(0)}%</p>
          </div>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
            {piePaths.map(path => (
              <path
                key={path.idx}
                d={path.pathData}
                fill={path.color}
                stroke="white"
                strokeWidth="2"
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Interpretation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-blue-700 font-semibold text-lg">{interpretation}</p>
      </div>

      {/* Distribution Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <h4 className="font-bold text-green-700">Strong Learners</h4>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {entropy?.distribution?.strong?.count}
          </p>
          <p className="text-sm text-green-600 mt-1">
            {entropy?.distribution?.strong?.percentage?.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Avg Mastery: {(entropy?.distribution?.strong?.avgMastery * 100).toFixed(0)}%
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <h4 className="font-bold text-yellow-700">Moderate Progress</h4>
          </div>
          <p className="text-3xl font-bold text-yellow-600">
            {entropy?.distribution?.moderate?.count}
          </p>
          <p className="text-sm text-yellow-600 mt-1">
            {entropy?.distribution?.moderate?.percentage?.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Avg Mastery: {(entropy?.distribution?.moderate?.avgMastery * 100).toFixed(0)}%
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <h4 className="font-bold text-red-700">Struggling</h4>
          </div>
          <p className="text-3xl font-bold text-red-600">
            {entropy?.distribution?.weak?.count}
          </p>
          <p className="text-sm text-red-600 mt-1">
            {entropy?.distribution?.weak?.percentage?.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Avg Mastery: {(entropy?.distribution?.weak?.avgMastery * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Class Metrics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Class Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Avg Class Velocity</p>
            <p className="text-2xl font-bold text-indigo-600">
              {(entropy?.avgClassVelocity * 100).toFixed(1)}%/day
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Entropy Value</p>
            <p className="text-2xl font-bold text-purple-600">
              {entropyValue.toFixed(2)} bits
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Polarization</p>
            <p className={`text-2xl font-bold ${
              normalized > 0.8 ? 'text-red-600' :
              normalized > 0.5 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {normalized > 0.8 ? '🔴 High' :
               normalized > 0.5 ? '🟡 Medium' :
               '🟢 Low'}
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Topic Coverage</p>
            <p className="text-2xl font-bold text-blue-600">
              {entropy?.topicCoverageEntropy?.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Insights */}
      {entropy?.insights?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-bold text-blue-700 mb-3">💡 Key Insights</h4>
          <ul className="space-y-2">
            {entropy.insights.map((insight: string, idx: number) => (
              <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                <span className="text-lg mt-0">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {entropy?.recommendations?.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h4 className="font-bold text-green-700 mb-3">✅ Recommendations</h4>
          <ul className="space-y-2">
            {entropy.recommendations.slice(0, 5).map((rec: string, idx: number) => (
              <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                <span className="text-lg mt-0">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-bold text-gray-800 mb-4">📈 What is Class Entropy?</h4>
        <p className="text-sm text-gray-700 mb-4">
          Class entropy measures the diversity of student performance levels. Lower entropy means students have similar mastery levels (uniform class). Higher entropy means students have very different performance levels (polarized class).
        </p>
        <ul className="space-y-3 text-sm text-gray-700">
          <li>
            <strong>🟢 Low Entropy (&lt;0.5):</strong> Consistent class performance - uniform teaching strategy works well
          </li>
          <li>
            <strong>🟡 Medium Entropy (0.5-0.8):</strong> Mixed performance - differentiated instruction recommended
          </li>
          <li>
            <strong>🔴 High Entropy (&gt;0.8):</strong> Highly polarized class - targeted intervention for multiple groups
          </li>
        </ul>
      </div>
    </div>
  );
}
