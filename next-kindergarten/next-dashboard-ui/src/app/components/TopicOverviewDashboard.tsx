'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, Upload } from 'lucide-react';

export default function TopicOverviewDashboard({ classId, teacherId }: any) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingTopicId, setUploadingTopicId] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    fetchTopics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const fetchTopics = async () => {
    try {
      if (!classId) {
        setHasAttempted(true);
        // Don't show error immediately, just keep loading state
        // Error will show only if classId is still empty after attempting
        if (hasAttempted) {
          setError('Select a class to view topics.');
          setTopics([]);
        }
        setLoading(false);
        return;
      }

      setError('');
      setHasAttempted(true);
      setLoading(true);
      const response = await fetch(`/api/ildce/metrics/class-topics?classId=${classId}&teacherId=${teacherId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch topics');
      }

      const data = await response.json();
      setTopics(data.topics || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic? This will also delete all associated quizzes and student attempts.')) {
      return;
    }

    try {
      const response = await fetch(`/api/ildce/topics?topicId=${topicId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete topic');
      }

      // Refresh the topics list
      fetchTopics();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleFileUpload = async (topicId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingTopicId(topicId);
      
      const formData = new FormData();
      formData.append('content_file', file);

      const response = await fetch(`/api/ildce/topics?topicId=${topicId}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload file');
      }

      // Refresh the topics list
      fetchTopics();
      alert('File uploaded successfully!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUploadingTopicId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
          <p className="text-gray-600">Loading topics...</p>
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

  return (
    <div className="space-y-6">

      {/* Topics Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">📚 Topics & Performance</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Topic</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">File</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Difficulty</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic: any, idx) => {
                const mastery = topic.metrics?.class_avg_mastery || 0;
                const difficulty = topic.metrics?.dynamic_difficulty || 0;
                const status = mastery > 0.7 ? '✅ Strong' : mastery > 0.4 ? '⚠️ Moderate' : '❌ Weak';

                return (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-800">{topic.topic.topic_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{topic.topic.difficulty_weight}/5</td>
                    <td className="px-6 py-4 text-sm">
                      {topic.topic.file_url ? (
                        <a
                          href={topic.topic.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Open File
                        </a>
                      ) : (
                        <span className="text-gray-400">No file</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${difficulty * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-700">{(difficulty * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">{status}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* Upload/Replace File Button */}
                        <label className="cursor-pointer text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition" title={topic.topic.file_url ? "Replace file" : "Upload file"}>
                          <Upload size={18} />
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.txt,.md,.csv"
                            onChange={(e) => handleFileUpload(topic.topic._id, e)}
                            disabled={uploadingTopicId === topic.topic._id}
                          />
                        </label>
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(topic.topic._id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition"
                          title="Delete topic"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {topics.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>No topics yet. Start by uploading class content above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
