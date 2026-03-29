'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, BookOpen, Clock } from 'lucide-react';

export default function RevisionScheduler({ classId }: any) {
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [daysAhead] = useState(14);

  useEffect(() => {
    fetchSchedule();
  }, [classId, daysAhead]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ildce/predictions/revision-schedule?classId=${classId}&daysAhead=${daysAhead}`
      );

      if (!response.ok) throw new Error('Failed to fetch revision schedule');

      const data = await response.json();
      setSchedule(data);
      if (data.revisionSchedule?.length > 0) {
        setSelectedStudent(data.revisionSchedule[0].studentId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Critical':
        return 'bg-red-100 border-red-300 text-red-700';
      case 'High':
        return 'bg-orange-100 border-orange-300 text-orange-700';
      case 'Medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-700';
      default:
        return 'bg-green-100 border-green-300 text-green-700';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Critical':
        return '🚨';
      case 'High':
        return '⚠️';
      case 'Medium':
        return '📌';
      default:
        return '✅';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
        <div className="animate-pulse">Loading revision schedule...</div>
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

  const selectedSchedule = schedule?.revisionSchedule?.find(
    (s: any) => s.studentId === selectedStudent
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Urgent Reviews</p>
          <p className="text-3xl font-bold text-red-600">
            {schedule?.criticalRevisionsNeeded || 0}
          </p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Students Needing Review</p>
          <p className="text-3xl font-bold text-orange-600">
            {schedule?.totalStudentsNeedingRevision || 0}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Students</p>
          <p className="text-3xl font-bold text-blue-600">
            {schedule?.revisionSchedule?.length || 0}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">14-Day Window</p>
          <p className="text-lg font-bold text-green-600">
            {new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]}
          </p>
        </div>
      </div>

      {/* Class-Level Topics Summary */}
      {schedule?.classRevisionSummary?.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📚 Topics Needing Class Review</h3>
          <div className="space-y-3">
            {schedule.classRevisionSummary.slice(0, 5).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-blue-600" size={20} />
                  <div>
                    <p className="font-semibold text-gray-800">{item.topic}</p>
                    <p className="text-sm text-gray-600">
                      {item.studentsNeedingRevision} of {schedule.revisionSchedule.length} students
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{item.percentage.toFixed(0)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {schedule?.insights?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-bold text-blue-700 mb-3">💡 Key Insights</h4>
          <ul className="space-y-2">
            {schedule.insights.map((insight: string, idx: number) => (
              <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                <span className="text-lg mt-0">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Student Selector */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">👥 Select Student</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {schedule?.revisionSchedule?.map((student: any) => (
            <button
              key={student.studentId}
              onClick={() => setSelectedStudent(student.studentId)}
              className={`p-3 rounded-lg font-semibold transition text-sm ${
                selectedStudent === student.studentId
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {student.studentName.substring(0, 12)}
              {student.topicsNeedingRevision?.length > 0 && (
                <span className="ml-1 text-xs bg-red-500 text-white px-1 rounded">
                  {student.topicsNeedingRevision.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Student Detail */}
      {selectedSchedule && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                {selectedSchedule.studentName}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Recommended Freq: {selectedSchedule.recommendedRevisionFrequency}
              </p>
            </div>
            {selectedSchedule.nextUrgentRevision && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-sm text-red-600 font-semibold">Next Urgent</p>
                <p className="text-lg font-bold text-red-700">
                  {selectedSchedule.nextUrgentRevision.topicName}
                </p>
              </div>
            )}
          </div>

          {/* Topics Needing Review */}
          {selectedSchedule.topicsNeedingRevision?.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-bold text-gray-800">Topics Needing Review (2-Week Window)</h4>
              {selectedSchedule.topicsNeedingRevision.map((topic: any, idx: number) => (
                <div
                  key={idx}
                  className={`border-l-4 p-4 rounded-lg ${getUrgencyColor(topic.urgency)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-lg">
                        {getUrgencyBadge(topic.urgency)} {topic.topicName}
                      </p>
                      <p className="text-sm mt-2">
                        Current Mastery: <strong>{topic.currentMastery}%</strong>
                      </p>
                      <p className="text-sm">
                        Projected (7 days): <strong>{topic.projectedMasteryAt7Days}%</strong>
                      </p>
                      <p className="text-sm mt-2 font-semibold">{topic.revisionType}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-3xl font-bold opacity-60">
                        {topic.daysUntilRevision}
                      </p>
                      <p className="text-xs text-gray-600">days</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Due: {topic.revisionDueDate}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-green-700 font-semibold">✅ All topics are current</p>
              <p className="text-sm text-green-600 mt-2">
                No urgent reviews needed in the next 2 weeks
              </p>
            </div>
          )}

          {/* All Topics (Calendar View) */}
          <div className="mt-8">
            <h4 className="font-bold text-gray-800 mb-4">📅 Complete Topic Schedule</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left font-bold text-gray-700">Topic</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-700">Mastery</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-700">Days Until Review</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-700">Due Date</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-700">Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSchedule.allTopicSchedules?.map((topic: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">{topic.topicName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {topic.currentMastery}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-800">
                        {topic.daysUntilRevision} days
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {topic.revisionDueDate}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full font-semibold text-xs ${getUrgencyColor(topic.urgency)}`}>
                          {topic.urgency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
