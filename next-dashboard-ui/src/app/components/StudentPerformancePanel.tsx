'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, BookOpen, Clock, Zap } from 'lucide-react';

export default function StudentPerformancePanel({ topicId, classId }: any) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudentMetrics();
  }, [topicId, classId]);

  const fetchStudentMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ildce/metrics/knowledge-decay?topicId=${topicId}&classId=${classId}`
      );

      if (!response.ok) throw new Error('Failed to fetch metrics');

      const data = await response.json();
      setStudents(data.students);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
          <p className="text-gray-600">Loading student data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
        <AlertTriangle className="text-red-600" />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  const urgentStudents = students.filter((s: any) => s.needs_revision);
  const onTrackStudents = students.filter((s: any) => !s.needs_revision);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Total Students</p>
          <p className="text-2xl font-bold text-blue-600">{students.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">On Track</p>
          <p className="text-2xl font-bold text-green-600">{onTrackStudents.length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Need Revision</p>
          <p className="text-2xl font-bold text-red-600">{urgentStudents.length}</p>
        </div>
      </div>

      {/* Urgent Revisions Alert */}
      {urgentStudents.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-red-600" size={24} />
            <h3 className="text-lg font-bold text-red-700">⚠️ Students Need Revision</h3>
          </div>
          <div className="space-y-3">
            {urgentStudents.map((student: any, idx) => (
              <div key={idx} className="bg-white p-3 rounded border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{student.student?.name || 'Student ' + (idx + 1)}</p>
                    <p className="text-sm text-gray-600">Knowledge level: {(student.predicted_decay * 100).toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Action needed</p>
                    <p className="text-sm font-semibold text-red-600">Schedule revision</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Students Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <BookOpen size={20} className="text-blue-600" />
          <h3 className="text-lg font-bold text-gray-800">Student Progress Report</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Mastery</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Knowledge Decay</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student: any, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {student.student?.name || `Student ${idx + 1}`}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${student.mastery_score * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">
                        {(student.mastery_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            student.predicted_decay > 0.6 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${student.predicted_decay * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">
                        {(student.predicted_decay * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">
                    {student.needs_revision ? (
                      <span className="text-red-600">⚠️ Urgent</span>
                    ) : (
                      <span className="text-green-600">✅ Good</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-blue-600 hover:text-blue-800 font-semibold">
                      Review
                    </button>
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
