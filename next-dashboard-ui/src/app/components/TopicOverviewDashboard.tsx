'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Eye, Loader2, Trash2, Upload, X } from 'lucide-react';

export default function TopicOverviewDashboard({ classId, teacherId }: any) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingTopicId, setUploadingTopicId] = useState<string | null>(null);
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);
  const [publishingTopicId, setPublishingTopicId] = useState<string | null>(null);
  const [deletingQuizTopicId, setDeletingQuizTopicId] = useState<string | null>(null);
  const [previewLoadingTopicId, setPreviewLoadingTopicId] = useState<string | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<any>(null);
  const [previewTopicName, setPreviewTopicName] = useState('');
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
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      setUploadingTopicId(topicId);
      
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('content_files', file);
      });

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
      alert(`${files.length} file${files.length !== 1 ? 's' : ''} uploaded successfully!`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUploadingTopicId(null);
      event.target.value = '';
    }
  };

  const handlePublishQuiz = async (topicId: string) => {
    try {
      setPublishingTopicId(topicId);

      const response = await fetch(`/api/ildce/topics/${topicId}/quiz`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to publish quiz');
      }

      fetchTopics();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setPublishingTopicId(null);
    }
  };

  const handleGenerateQuizDraft = async (topicId: string) => {
    try {
      setGeneratingTopicId(topicId);

      const response = await fetch(`/api/ildce/topics/${topicId}/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
          'Failed to generate quiz draft. Please make sure the uploaded content has enough readable text.'
        );
      }

      fetchTopics();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setGeneratingTopicId(null);
    }
  };

  const handlePreviewQuiz = async (topicId: string, topicName: string) => {
    try {
      setPreviewLoadingTopicId(topicId);
      const response = await fetch(`/api/ildce/topics/${topicId}/quiz?teacherId=${encodeURIComponent(teacherId)}&details=1`);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load quiz preview');
      }

      if (!data.quiz) {
        throw new Error('No quiz draft exists for this topic yet. Generate a draft first.');
      }

      setPreviewTopicName(topicName);
      setPreviewQuiz(data.quiz);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setPreviewLoadingTopicId(null);
    }
  };

  const handleDeleteQuiz = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? Parents and students will no longer have access to it.')) {
      return;
    }

    try {
      setDeletingQuizTopicId(topicId);
      const response = await fetch(`/api/ildce/topics/${topicId}/quiz`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherId }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete quiz');
      }

      if (previewQuiz) {
        setPreviewQuiz(null);
      }

      fetchTopics();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeletingQuizTopicId(null);
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Quiz</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic: any, idx) => {
                const mastery = topic.metrics?.class_avg_mastery || 0;
                const difficulty = topic.metrics?.dynamic_difficulty || 0;
                const status = mastery > 0.7 ? '✅ Strong' : mastery > 0.4 ? '⚠️ Moderate' : '❌ Weak';
                const quiz = topic.quiz;
                const quizStatus = quiz?.isPublished ? 'Published' : quiz ? 'Draft' : 'Missing';

                return (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-800">{topic.topic.topic_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{topic.topic.difficulty_weight}/5</td>
                    <td className="px-6 py-4 text-sm">
                      {(topic.topic.files?.length || topic.topic.file_url) ? (
                        <div className="flex flex-col gap-2">
                          {(topic.topic.files?.length
                            ? topic.topic.files
                            : [{ url: topic.topic.file_url, name: topic.topic.file_name || 'Attachment' }]
                          ).map((file: any, fileIndex: number) => (
                            <div key={`${file.url}-${fileIndex}`} className="flex items-center gap-3">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-semibold max-w-[140px] truncate"
                                title={file.name || 'Open file'}
                              >
                                {file.name || `File ${fileIndex + 1}`}
                              </a>
                              <a
                                href={`${file.url}${String(file.url).includes('?') ? '&' : '?'}download=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 font-semibold"
                                title="Download file"
                              >
                                Download
                                <Download size={14} />
                              </a>
                            </div>
                          ))}
                        </div>
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
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full w-fit ${quiz?.isPublished ? 'bg-green-100 text-green-700' : quiz ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {quiz?.isPublished ? <CheckCircle2 size={12} /> : null}
                          {quizStatus}
                        </span>
                        <span className="text-xs text-gray-500">
                          {quiz ? `${quiz.totalQuestions || 0} questions` : 'No quiz yet'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {quiz ? (
                          <button
                            onClick={() => handlePreviewQuiz(topic.topic._id, topic.topic.topic_name)}
                            disabled={previewLoadingTopicId === topic.topic._id}
                            className="inline-flex items-center gap-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 px-3 py-2 rounded-lg text-sm font-semibold transition"
                          >
                            {previewLoadingTopicId === topic.topic._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Eye size={16} />
                            )}
                            Preview Quiz
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGenerateQuizDraft(topic.topic._id)}
                            disabled={generatingTopicId === topic.topic._id}
                            className="inline-flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-3 py-2 rounded-lg text-sm font-semibold transition"
                          >
                            {generatingTopicId === topic.topic._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : null}
                            Generate Quiz Draft
                          </button>
                        )}

                        {quiz?.isPublished ? (
                          <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                            Published for parents
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePublishQuiz(topic.topic._id)}
                            disabled={!quiz || publishingTopicId === topic.topic._id}
                            className="inline-flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-3 py-2 rounded-lg text-sm font-semibold transition"
                          >
                            {publishingTopicId === topic.topic._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : null}
                            Publish Quiz
                          </button>
                        )}

                        {quiz ? (
                          <button
                            onClick={() => handleDeleteQuiz(topic.topic._id)}
                            disabled={deletingQuizTopicId === topic.topic._id}
                            className="inline-flex items-center gap-2 text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 px-3 py-2 rounded-lg text-sm font-semibold transition"
                            title="Delete quiz"
                          >
                            {deletingQuizTopicId === topic.topic._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                            Delete Quiz
                          </button>
                        ) : null}

                        {/* Upload/Replace File Button */}
                        <label className="cursor-pointer text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition" title="Add files">
                          <Upload size={18} />
                          <input
                            type="file"
                            multiple
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

      {previewQuiz && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[85vh] overflow-hidden bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h4 className="text-lg font-bold text-gray-900">Quiz Preview: {previewTopicName}</h4>
                <p className="text-sm text-gray-600">
                  {previewQuiz.totalQuestions || 0} questions • {previewQuiz.isPublished ? 'Published' : 'Draft'}
                </p>
              </div>
              <button
                onClick={() => setPreviewQuiz(null)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
              {(previewQuiz.questions || []).map((q: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-xl p-4">
                  <p className="font-semibold text-gray-900 mb-2">
                    Q{index + 1}. {q.question_text}
                  </p>

                  {Array.isArray(q.options) && q.options.length > 0 ? (
                    <ul className="space-y-1 mb-3">
                      {q.options.map((option: string, optionIndex: number) => (
                        <li
                          key={optionIndex}
                          className={`text-sm px-3 py-2 rounded-md ${option === q.correct_answer ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-700'}`}
                        >
                          {option}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Answer:</span> {q.correct_answer || 'N/A'}
                  </p>
                  {q.explanation ? (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-semibold">Explanation:</span> {q.explanation}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
