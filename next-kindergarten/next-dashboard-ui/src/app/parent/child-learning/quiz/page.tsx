'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QuizInterface from '@/app/components/QuizInterface';
import { ArrowLeft, BookOpen, Users } from 'lucide-react';

function ParentSupervisedQuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topicInfo, setTopicInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const quizId = searchParams.get('quizId') || '';
  const topicId = searchParams.get('topicId') || '';
  const childId = searchParams.get('childId') || 'demo-student';
  const classId = searchParams.get('classId') || 'demo-class';
  const childName = searchParams.get('childName') || 'Your Child';

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
    // Redirect back to parent dashboard
    router.push(`/parent/child-learning?childId=${childId}&classId=${classId}&childName=${childName}`);
  };

  if (!quizId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">No quiz ID provided</p>
          <button
            onClick={() => router.push(`/parent/child-learning?childId=${childId}&classId=${classId}&childName=${childName}`)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push(`/parent/child-learning?childId=${childId}&classId=${classId}&childName=${childName}`)}
            className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition"
          >
            <ArrowLeft className="text-purple-600" size={24} />
          </button>
          
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-4 flex-1 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : topicInfo ? (
            <div className="bg-white rounded-lg shadow-md p-4 flex-1">
              <div className="flex items-center gap-3">
                <BookOpen className="text-purple-600" size={24} />
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-gray-900">{topicInfo.topic_name}</h1>
                  <p className="text-sm text-gray-600">Your Child - Quiz Challenge</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-4 flex-1">
              <h1 className="text-xl font-bold text-gray-900">Quiz Challenge</h1>
            </div>
          )}
        </div>

        {/* Parent Supervision Notice */}
        <div className="bg-purple-100 border-2 border-purple-300 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <Users className="text-purple-700" size={32} />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-purple-900 mb-2">👨‍👩‍👧 Parent Supervision Mode</h2>
              <p className="text-purple-800 text-sm mb-3">
                You are helping your child take this quiz. Please:
              </p>
              <ul className="text-purple-800 text-sm space-y-1">
                <li>• Read questions aloud if needed (kindergarten level)</li>
                <li>• Let your child point to or say their answer</li>
                <li>• Guide them to click the option they choose</li>
                <li>• Encourage them to try their best</li>
                <li>• Click &quot;Submit Quiz&quot; when all questions are answered</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quiz Interface */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <QuizInterface
            quizId={quizId}
            studentId={childId}
            classId={classId}
            onComplete={handleQuizComplete}
          />
        </div>

        {/* Quiz Tips for Kindergarten */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-bold text-blue-900 mb-2">📝 Kindergarten Quiz Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Questions are designed for kindergarten level (ages 4-6)</li>
            <li>• Take your time - there is no time limit</li>
            <li>• You can go back to previous questions before submitting</li>
            <li>• Celebrate effort and learning, not just the score</li>
            <li>• Results will be saved to track progress over time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ParentSupervisedQuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-pulse">Loading quiz...</div>
      </div>
    }>
      <ParentSupervisedQuizContent />
    </Suspense>
  );
}
