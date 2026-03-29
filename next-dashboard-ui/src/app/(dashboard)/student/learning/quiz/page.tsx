'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QuizInterface from '@/app/components/QuizInterface';
import { ArrowLeft, BookOpen } from 'lucide-react';

function QuizPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topicInfo, setTopicInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const quizId = searchParams.get('quizId') || '';
  const topicId = searchParams.get('topicId') || '';
  const studentId = searchParams.get('studentId') || 'demo-student';
  const classId = searchParams.get('classId') || 'demo-class';

  useEffect(() => {
    const fetchTopicInfo = async () => {
      if (!topicId) return;
      
      try {
        const res = await fetch(`/api/ildce/topics/${topicId}`);
        if (res.ok) {
          const data = await res.json();
          setTopicInfo(data.topic);
        }
      } catch (err) {
        console.error('Error fetching topic:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopicInfo();
  }, [topicId]);

  const handleQuizComplete = () => {
    // Redirect back to learning dashboard
    router.push(`/student/learning?studentId=${studentId}&classId=${classId}`);
  };

  if (!quizId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">No quiz ID provided</p>
          <button
            onClick={() => router.push(`/student/learning?studentId=${studentId}&classId=${classId}`)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Back to Learning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push(`/student/learning?studentId=${studentId}&classId=${classId}`)}
            className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition"
          >
            <ArrowLeft className="text-blue-600" size={24} />
          </button>
          
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-4 flex-1 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : topicInfo ? (
            <div className="bg-white rounded-lg shadow-md p-4 flex-1">
              <div className="flex items-center gap-3">
                <BookOpen className="text-blue-600" size={24} />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{topicInfo.topic_name}</h1>
                  <p className="text-sm text-gray-600">Quiz Challenge</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-4 flex-1">
              <h1 className="text-xl font-bold text-gray-900">Quiz Challenge</h1>
            </div>
          )}
        </div>

        {/* Quiz Interface */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <QuizInterface
            quizId={quizId}
            studentId={studentId}
            classId={classId}
            onComplete={handleQuizComplete}
          />
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-bold text-blue-900 mb-2">📝 Quiz Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Read each question carefully before answering</li>
            <li>• You can navigate between questions before submitting</li>
            <li>• Your answers are saved automatically</li>
            <li>• Review your answers before final submission</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function StudentQuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-pulse">Loading quiz...</div>
      </div>
    }>
      <QuizPageContent />
    </Suspense>
  );
}
