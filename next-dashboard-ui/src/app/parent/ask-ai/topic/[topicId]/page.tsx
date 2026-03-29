'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Brain, FileText, Loader2, Send, Sparkles, Wand2 } from 'lucide-react';

type TopicDetail = {
  topicId: string;
  classId: string;
  topicName: string;
  category: string;
  contentText: string;
  uploadedAt?: string;
  file?: { url: string; name: string; type?: string; size?: number } | null;
  ai?: { summary?: string; keyPoints?: string[]; concepts?: string[] };
  rag?: { ready: boolean; chunkCount: number };
  quiz?: { quizId: string; totalQuestions: number } | null;
};

export default function ParentTopicWorkspacePage() {
  const params = useParams<{ topicId: string }>();
  const searchParams = useSearchParams();

  const topicId = params?.topicId;
  const childId = searchParams.get('childId') || 'demo-student';
  const childName = searchParams.get('childName') || 'Home Test';
  const classIdFromQuery = searchParams.get('classId') || '';

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<any[]>([]);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  const classId = topic?.classId || classIdFromQuery;

  const isPdf = useMemo(() => {
    const lowerName = topic?.file?.name?.toLowerCase() || '';
    const lowerType = topic?.file?.type?.toLowerCase() || '';
    return lowerName.endsWith('.pdf') || lowerType.includes('pdf');
  }, [topic]);

  const fetchTopic = async () => {
    if (!topicId) return;

    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/parent/class-content/${topicId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch topic details');
      }
      setTopic(data.topic);
    } catch (err: any) {
      setError(err.message || 'Failed to load topic workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopic();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const handleGenerateSummary = async () => {
    if (!topicId) return;

    try {
      setSummaryLoading(true);
      const response = await fetch(`/api/parent/class-content/${topicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_summary' }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }
      await fetchTopic();
    } catch (err: any) {
      alert(err.message || 'Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!topicId) return;

    try {
      setQuizLoading(true);
      const response = await fetch(`/api/parent/class-content/${topicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_quiz' }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }
      setTopic((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          quiz: data?.quiz
            ? {
                quizId: data.quiz.quizId,
                totalQuestions: data.quiz.totalQuestions || 0,
              }
            : prev.quiz,
        };
      });
      await fetchTopic();
    } catch (err: any) {
      alert(err.message || 'Failed to generate quiz');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !classId || !topicId) return;

    try {
      setAsking(true);
      setAnswer('');
      setSources([]);

      const response = await fetch('/api/parent/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          classId,
          topicId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to ask AI');
      }

      setAnswer(data.answer || 'No answer generated.');
      setSources(data.sources || []);
    } catch (err: any) {
      alert(err.message || 'Failed to ask AI');
    } finally {
      setAsking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="animate-spin" size={20} />
          Loading topic workspace...
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <a href="/parent/ask-ai" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 mb-4">
          <ArrowLeft size={16} /> Back to Class Content
        </a>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error || 'Topic not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <a href="/parent/ask-ai" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 mb-4">
            <ArrowLeft size={16} /> Back to Class Content
          </a>
          <h1 className="text-2xl font-bold text-gray-900">{topic.topicName}</h1>
          <p className="text-sm text-gray-600 mt-1">Category: {topic.category}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={`text-xs px-2 py-1 rounded-full ${topic.rag?.ready ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {topic.rag?.ready ? `RAG Ready (${topic.rag.chunkCount} chunks)` : 'RAG Pending'}
            </span>
            {topic.quiz?.quizId && (
              <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                Quiz Available ({topic.quiz.totalQuestions} questions)
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Content Preview</h2>
          {topic.file?.url ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-slate-100">
              {isPdf ? (
                <iframe
                  src={topic.file.url}
                  title={topic.file.name || 'Uploaded PDF'}
                  className="w-full h-[520px]"
                />
              ) : (
                <div className="p-8 text-center">
                  <FileText className="mx-auto text-gray-500 mb-2" size={28} />
                  <p className="text-gray-700 font-semibold">{topic.file.name || 'Uploaded file'}</p>
                  <a
                    href={topic.file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex mt-3 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                  >
                    Open file in new tab
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <p className="text-gray-700 whitespace-pre-wrap max-h-[520px] overflow-auto">{topic.contentText}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-900">AI Summary</h2>
            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={summaryLoading}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              {summaryLoading ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
              {topic.ai?.summary ? 'Regenerate Summary' : 'Generate Summary'}
            </button>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-gray-800 whitespace-pre-wrap">{topic.ai?.summary || 'No summary yet. Click Generate Summary.'}</p>
          </div>
        </div>

        <form onSubmit={handleAskAI} className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="text-indigo-600" size={20} />
            <h2 className="text-xl font-bold text-gray-900">Ask AI About This Topic</h2>
          </div>
          <textarea
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about this PDF/topic..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={asking || !classId}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg"
          >
            {asking ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            Ask AI
          </button>

          {answer && (
            <div className="mt-2 border border-gray-200 rounded-lg p-4 bg-slate-50">
              <p className="text-gray-800 whitespace-pre-wrap">{answer}</p>
              {sources.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Sources</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {sources.map((source, idx) => (
                      <li key={idx}>File: {source.fileName || 'Notes'} | Score: {source.score}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </form>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-indigo-600" size={20} />
              <h2 className="text-xl font-bold text-gray-900">Generate Home Quiz (10 MCQ)</h2>
            </div>
            <button
              type="button"
              onClick={handleGenerateQuiz}
              disabled={quizLoading}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              {quizLoading ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
              Generate Quiz
            </button>
          </div>

          {topic.quiz?.quizId ? (
            <a
              href={`/parent/child-learning/quiz?quizId=${topic.quiz.quizId}&topicId=${topic.topicId}&childId=${childId}&classId=${classId}&childName=${encodeURIComponent(childName)}`}
              className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg"
            >
              Start Home Quiz
            </a>
          ) : (
            <p className="text-gray-600">No quiz generated yet. Click Generate Quiz.</p>
          )}
        </div>
      </div>
    </div>
  );
}
