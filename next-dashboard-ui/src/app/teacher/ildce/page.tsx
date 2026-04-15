'use client';

import { useState, useEffect } from 'react';
import { BookOpen, BarChart3, AlertCircle } from 'lucide-react';
import ContentUploadForm from '@/app/components/ILDCEContentUpload';
import TopicOverviewDashboard from '@/app/components/TopicOverviewDashboard';
import TeacherTopBar from '@/app/components/TeacherTopBar';

export default function ILDCEDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get from URL or cookies
    const params = new URLSearchParams(window.location.search);
    const urlClassId = params.get('classId');
    const urlTeacherId = params.get('teacherId');

    if (urlClassId) setClassId(urlClassId);
    
    // Get teacher ID from URL or cookies
    if (urlTeacherId) {
      console.log('Teacher ID from URL:', urlTeacherId);
      setTeacherId(urlTeacherId);
    } else {
      // Try to get from cookie
      const cookies = document.cookie.split(';');
      const userCookie = cookies.find(cookie => cookie.trim().startsWith('user='));
      console.log('User cookie found:', !!userCookie);
      if (userCookie) {
        try {
          const userObj = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
          console.log('Parsed user object:', userObj);
          const resolvedTeacherId = userObj.userId || userObj.id || userObj._id || userObj.teacherId || '';
          console.log('Resolved teacher ID:', resolvedTeacherId);
          if (resolvedTeacherId) {
            setTeacherId(resolvedTeacherId);
          }
        } catch (e) {
          console.error('Error parsing user cookie:', e);
        }
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const loadDefaultClass = async () => {
      if (!teacherId || classId) {
        return;
      }

      try {
        const response = await fetch(`/api/teacher/classes?teacherId=${teacherId}`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const firstClassId = data[0]?._id || data[0]?.id || '';
          if (firstClassId) {
            setClassId(String(firstClassId));
          }
        }
      } catch (error) {
        console.error('Error loading teacher classes:', error);
      }
    };

    loadDefaultClass();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId, classId]);

  const handleContentUploaded = (data: any) => {
    const uploadedClassId = data?.topic?.classId;
    if (uploadedClassId) {
      setClassId(String(uploadedClassId));
    }
    setActiveTab('overview');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <TeacherTopBar />

      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-3">
              <BookOpen className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Class Content Dashboard
              </h1>
              <p className="text-gray-600">AI-Powered Learning Dashboard</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-4 mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-blue-600" />
            Smart content management • AI-generated quizzes
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 font-semibold border-b-2 transition whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 size={20} />
                Class Overview
              </div>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`py-4 px-2 font-semibold border-b-2 transition whitespace-nowrap ${
                activeTab === 'upload'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen size={20} />
                Upload Content
              </div>
            </button>

          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Class Content Overview</h2>
              <p className="text-sm text-gray-600 mb-3">
                Use the <span className="font-semibold">Generate &amp; Publish</span> button in each topic row to create and release quizzes to parents.
              </p>
              <TopicOverviewDashboard classId={classId} teacherId={teacherId} />
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-blue-900 mb-2">
                🚀 Create New Topic with AI
              </h2>
              <p className="text-blue-700">
                Upload your content and let AI automatically create summaries, extract concepts,
                and generate a quiz draft that you can publish to parents when ready.
              </p>
            </div>
            <ContentUploadForm
              classId={classId}
              teacherId={teacherId}
              onSuccess={handleContentUploaded}
            />
          </div>
        )}

      </div>
    </div>
  );
}
