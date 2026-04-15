'use client';

import { useEffect, useState } from 'react';
import { Brain, Loader2, Send, FolderOpen, FileText, Sparkles, ExternalLink, Download } from 'lucide-react';

type ClassContent = {
  topicId: string;
  topicName: string;
  category: string;
  uploadedAt?: string;
  teacher?: { name: string; email?: string } | null;
  file?: { url: string; name: string; type?: string; size?: number } | null;
  ai?: { summary?: string; concepts?: string[] };
  rag?: { ready: boolean; chunkCount: number };
  quiz?: { quizId: string; totalQuestions: number } | null;
};

type ClassFolder = {
  classId: string;
  classCode: string;
  className: string;
  grade: string;
  children: Array<{ childId: string; childName: string; rollNo?: string | null }>;
  teachers: Array<{ teacherId: string; name: string; email?: string }>;
  contents: ClassContent[];
  contentCount: number;
};

export default function ParentAskAIPage() {
  const [question, setQuestion] = useState('');
  const [parentId, setParentId] = useState('');
  const [classId, setClassId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [libraryError, setLibraryError] = useState('');
  const [classFolders, setClassFolders] = useState<ClassFolder[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlClassId = params.get('classId');
    const urlTopicId = params.get('topicId');

    const userCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('user='));

    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
        const resolvedParentId = user.id || user.userId || '';
        if (resolvedParentId) {
          setParentId(resolvedParentId);
        }
      } catch (cookieError) {
        console.error('Failed to parse parent cookie:', cookieError);
      }
    }

    if (urlClassId) setClassId(urlClassId);
    if (urlTopicId) setTopicId(urlTopicId);
  }, []);

  useEffect(() => {
    const fetchClassLibrary = async () => {
      try {
        setLoadingLibrary(true);
        setLibraryError('');

        const response = await fetch('/api/parent/class-content');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load class content');
        }

        const folders: ClassFolder[] = Array.isArray(data.classes) ? data.classes : [];
        setClassFolders(folders);

        // Ensure a valid selected class exists on first load.
        if (folders.length > 0) {
          setClassId((prevClassId) => {
            const hasSelected = folders.some((f) => f.classId === prevClassId);
            if (hasSelected) return prevClassId;

            setTopicId('');
            return folders[0].classId;
          });
        }
      } catch (fetchError: any) {
        setLibraryError(fetchError.message || 'Failed to load content library');
      } finally {
        setLoadingLibrary(false);
      }
    };

    fetchClassLibrary();
  }, [parentId]);

  const activeClass = classFolders.find((folder) => folder.classId === classId) || null;
  const activeTopics = activeClass?.contents || [];

  const buildTopicHref = (item: ClassContent) => {
    const firstChild = activeClass?.children?.[0];
    const childId = firstChild?.childId || 'demo-student';
    const childName = firstChild?.childName || 'Home Test';
    const query = new URLSearchParams({
      classId: activeClass?.classId || '',
      childId,
      childName,
    });

    return `/parent/ask-ai/topic/${encodeURIComponent(item.topicId)}?${query.toString()}`;
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAnswer('');
    setSources([]);

    if (!question.trim() || !classId.trim()) {
      setError('Please enter a question and class ID.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/parent/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, classId, topicId: topicId || undefined }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      setAnswer(data.answer || 'No answer returned.');
      setSources(data.sources || []);
    } catch (err: any) {
      setError(err.message || 'Failed to ask AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Brain className="text-indigo-600" size={28} />
            <h1 className="text-2xl font-bold text-gray-900">Class Content AI Workspace</h1>
          </div>
          <p className="text-gray-600">
            Browse teacher-uploaded class folders, open files, run topic quizzes, and ask AI questions grounded in your child&apos;s class content.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="text-blue-600" size={22} />
            <h2 className="text-xl font-bold text-gray-900">Class Content Library</h2>
          </div>

          {loadingLibrary ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="animate-spin" size={18} />
              Loading class folders...
            </div>
          ) : libraryError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{libraryError}</div>
          ) : classFolders.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              No class folders found for this parent. Please confirm your child is enrolled and the teacher has uploaded content.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classFolders.map((folder) => (
                  <button
                    key={folder.classId}
                    onClick={() => {
                      setClassId(folder.classId);
                      setTopicId('');
                    }}
                    className={`text-left border rounded-lg p-4 transition ${
                      classId === folder.classId
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-gray-900">{folder.className}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {folder.contentCount} items
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Grade {folder.grade} {folder.classCode ? `• ${folder.classCode}` : ''}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Teacher: {folder.teachers.map((t) => t.name).join(', ') || 'Not assigned'}
                    </p>
                  </button>
                ))}
              </div>

              {activeClass && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <p className="font-semibold text-gray-900">
                      {activeClass.className} - Shared Materials
                    </p>
                  </div>

                  {activeTopics.length === 0 ? (
                    <div className="p-4 text-gray-600">No uploaded content yet for this class.</div>
                  ) : (
                    <div className="divide-y">
                      {activeTopics.map((item) => (
                        <div
                          key={item.topicId}
                          className="p-4 hover:bg-indigo-50/40 transition"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText size={16} className="text-gray-600" />
                                <p className="font-semibold text-gray-900">{item.topicName}</p>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{item.category}</span>
                              </div>

                              <p className="text-xs text-gray-500 mb-2">
                                Uploaded by {item.teacher?.name || 'Teacher'}
                                {item.uploadedAt ? ` on ${new Date(item.uploadedAt).toLocaleDateString()}` : ''}
                              </p>

                              {item.ai?.summary && (
                                <p className="text-sm text-gray-700 line-clamp-2">{item.ai.summary}</p>
                              )}

                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  item.rag?.ready ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {item.rag?.ready ? `RAG Ready (${item.rag.chunkCount} chunks)` : 'RAG Pending'}
                                </span>
                                {item.quiz?.quizId && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                                    Quiz: {item.quiz.totalQuestions} questions
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.assign(buildTopicHref(item));
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                              >
                                Open Topic
                                <ExternalLink size={12} />
                              </button>

                              {item.file?.url && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(item.file?.url, '_blank', 'noopener,noreferrer');
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                                  >
                                    Open File
                                    <ExternalLink size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const fileUrl = item.file?.url || '';
                                      const separator = fileUrl.includes('?') ? '&' : '?';
                                      window.open(`${fileUrl}${separator}download=1`, '_blank', 'noopener,noreferrer');
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900"
                                  >
                                    Download
                                    <Download size={12} />
                                  </button>
                                </div>
                              )}

                              {item.quiz?.quizId && activeClass.children.length > 0 && (
                                <a
                                  onClick={(e) => e.stopPropagation()}
                                  href={`/parent/child-learning/quiz?quizId=${item.quiz.quizId}&topicId=${item.topicId}&childId=${activeClass.children[0].childId}&classId=${activeClass.classId}&childName=${encodeURIComponent(activeClass.children[0].childName)}`}
                                  className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded"
                                >
                                  Start Quiz
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleAsk} className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-indigo-600" size={18} />
            <h2 className="text-lg font-bold text-gray-900">Ask AI from Class Content</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Class *</label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setTopicId('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select class</option>
                {classFolders.map((folder) => (
                  <option key={folder.classId} value={folder.classId}>
                    {folder.className} (Grade {folder.grade})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Topic (optional)</label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All topics in selected class</option>
                {activeTopics.map((topic) => (
                  <option key={topic.topicId} value={topic.topicId}>
                    {topic.topicName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Question *</label>
            <textarea
              rows={4}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about the class content..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !classId}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Thinking...
              </>
            ) : (
              <>
                <Send size={18} />
                Ask AI
              </>
            )}
          </button>
        </form>

        {answer && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Answer</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{answer}</p>

            {sources.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Sources</h3>
                <ul className="text-xs text-gray-600 space-y-1">
                  {sources.map((source, idx) => (
                    <li key={idx}>
                      Topic: {source.topicId || 'N/A'} | File: {source.fileName || 'Notes'} | Score: {source.score}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
