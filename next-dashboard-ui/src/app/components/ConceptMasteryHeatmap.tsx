'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function ConceptMasteryHeatmap({ classId }: any) {
  const [heatmap, setHeatmap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  useEffect(() => {
    fetchHeatmap();
  }, [classId]);

  const fetchHeatmap = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ildce/analytics/concept-heatmap?classId=${classId}`
      );

      if (!response.ok) throw new Error('Failed to fetch heatmap data');

      const data = await response.json();
      setHeatmap(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 0.8) return { bg: 'bg-green-500', text: 'text-green-700' };
    if (mastery >= 0.6) return { bg: 'bg-green-300', text: 'text-green-700' };
    if (mastery >= 0.4) return { bg: 'bg-yellow-300', text: 'text-yellow-700' };
    if (mastery >= 0.2) return { bg: 'bg-orange-400', text: 'text-orange-700' };
    return { bg: 'bg-red-500', text: 'text-red-700' };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
        <div className="animate-pulse">Loading heatmap...</div>
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
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Students</p>
          <p className="text-2xl font-bold text-blue-600">{heatmap?.stats?.totalStudents}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Concepts Taught</p>
          <p className="text-2xl font-bold text-purple-600">{heatmap?.stats?.totalConcepts}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Attempts</p>
          <p className="text-2xl font-bold text-green-600">{heatmap?.stats?.totalAttempts}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Class Avg Mastery</p>
          <p className="text-2xl font-bold text-indigo-600">
            {(heatmap?.stats?.avgMastery * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Strong Concepts */}
      {heatmap?.stats?.strongConcepts?.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="font-semibold text-green-700 mb-2">✅ Strong Concepts (&gt;70%)</p>
          <div className="flex flex-wrap gap-2">
            {heatmap.stats.strongConcepts.map((concept: string, idx: number) => (
              <span
                key={idx}
                className="bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-semibold"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weak Concepts */}
      {heatmap?.stats?.weakConcepts?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-semibold text-red-700 mb-2">⚠️ Weak Concepts (&lt;50%)</p>
          <div className="flex flex-wrap gap-2">
            {heatmap.stats.weakConcepts.map((concept: string, idx: number) => (
              <span
                key={idx}
                className="bg-red-200 text-red-800 px-3 py-1 rounded-full text-sm font-semibold"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden overflow-x-auto">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">🔥 Concept × Student Mastery Matrix</h3>
          <p className="text-sm text-gray-500 mt-1">Darker = Higher Mastery</p>
        </div>

        <div className="inline-block min-w-full">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 bg-gray-50 sticky left-0">
                  Concept
                </th>
                {heatmap?.heatmap?.[0]?.students?.map((student: any) => (
                  <th
                    key={student.studentId}
                    className="px-3 py-3 text-center text-sm font-semibold text-gray-700 border border-gray-200 bg-gray-50 min-w-16"
                    title={student.studentName}
                  >
                    <div className="text-xs whitespace-nowrap rotate-45 origin-center h-20 flex items-end justify-center">
                      {student.studentName?.substring(0, 8)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap?.heatmap?.map((row: any, idx: number) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800 border border-gray-200 bg-gray-50 sticky left-0">
                    {row.concept}
                    <div className="text-xs text-gray-500 font-normal mt-1">
                      Avg: {(row.avgMastery * 100).toFixed(0)}%
                    </div>
                  </td>
                  {row.students.map((student: any) => {
                    const color = getMasteryColor(student.mastery);
                    const cellId = `${row.concept}-${student.studentId}`;
                    return (
                      <td
                        key={student.studentId}
                        className={`px-3 py-3 text-center border border-gray-200 cursor-pointer transition min-w-16 ${color.bg} hover:opacity-80`}
                        onMouseEnter={() => setHoveredCell(cellId)}
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${student.studentName}: ${(student.mastery * 100).toFixed(0)}% (${student.attempts} attempts)`}
                      >
                        <div className={`font-bold text-sm ${color.text}`}>
                          {(student.mastery * 100).toFixed(0)}
                        </div>
                        {hoveredCell === cellId && (
                          <div className="text-xs text-gray-700 mt-1">{student.attempts}x</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Color Legend */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-bold text-gray-800 mb-4">📊 Mastery Scale</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { range: '≥80%', color: 'bg-green-500', label: 'Excellent' },
            { range: '60-80%', color: 'bg-green-300', label: 'Good' },
            { range: '40-60%', color: 'bg-yellow-300', label: 'Fair' },
            { range: '20-40%', color: 'bg-orange-400', label: 'Poor' },
            { range: '<20%', color: 'bg-red-500', label: 'Very Poor' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={`w-6 h-6 ${item.color} rounded`}></div>
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-gray-500">{item.range}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Needs Attention */}
      {heatmap?.needsAttention?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
            <div>
              <h4 className="font-bold text-yellow-700 mb-3">⚠️ Needs Attention</h4>
              <ul className="space-y-2">
                {heatmap.needsAttention.map((item: any, idx: number) => (
                  <li key={idx} className="text-sm text-yellow-700">
                    <strong>{item.concept}</strong>: {item.recommendations}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
