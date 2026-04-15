'use client';

import { useState, useEffect } from 'react';
import { UploadCloud, AlertCircle, CheckCircle, Loader, GraduationCap, Paperclip, X, FileText } from 'lucide-react';

export default function ContentUploadForm({ classId, teacherId, onSuccess }: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    topic_name: '',
    content_text: '',
    content_type: 'text',
    difficulty_weight: 3,
    category: '',
    selectedClassId: classId || '',
    selectedGrade: '',
  });

  // Fetch classes for teacher
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const response = await fetch(`/api/teacher/classes?teacherId=${teacherId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched classes:', data);
          setClasses(data);
          
          // Set initial class if provided
          if (classId && data.length > 0) {
            const selectedClass = data.find((c: any) => c._id === classId || c.classId === classId);
            if (selectedClass) {
              setFormData((prev) => ({
                ...prev,
                selectedClassId: selectedClass._id,
                selectedGrade: selectedClass.grade,
              }));
            }
          } else if (data.length > 0 && !formData.selectedClassId) {
            // Auto-select first class if none selected
            setFormData((prev) => ({
              ...prev,
              selectedClassId: data[0]._id,
              selectedGrade: data[0].grade,
            }));
          }
        } else {
          const errorData = await response.json();
          console.error('Error fetching classes:', errorData);
          setError(`Failed to load classes: ${errorData.error || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError('Failed to load classes. Please refresh the page.');
      } finally {
        setLoadingClasses(false);
      }
    };

    if (teacherId) {
      fetchClasses();
    } else {
      setLoadingClasses(false);
      setError('Teacher ID not found. Please log in again.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId, classId]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    
    // If class selection changes, update grade automatically
    if (name === 'selectedClassId') {
      const selectedClass = classes.find((c) => c._id === value);
      setFormData((prev) => ({
        ...prev,
        selectedClassId: value,
        selectedGrade: selectedClass?.grade || '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'difficulty_weight' ? parseInt(value) : value,
      }));
    }
  };

  const readFileAsText = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });

  const isTextFile = (file: File) => {
    const name = file.name.toLowerCase();
    return file.type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setContentFile(file);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      let finalContent = formData.content_text?.trim() || '';

      if (contentFile) {
        if (isTextFile(contentFile)) {
          const fileText = await readFileAsText(contentFile);
          finalContent = [
            finalContent,
            `\n\n---\nUploaded File: ${contentFile.name}\n---\n`,
            fileText,
          ].filter(Boolean).join('\n');
        }
      }

      if (!finalContent && !contentFile) {
        throw new Error('Please add content notes or upload a file.');
      }

      const payload = new FormData();
      payload.append('topic_name', formData.topic_name);
      payload.append('content_text', finalContent);
      payload.append('content_type', formData.content_type);
      payload.append('difficulty_weight', String(formData.difficulty_weight));
      payload.append('category', formData.category);
      payload.append('teacherId', teacherId || '');
      payload.append('classId', formData.selectedClassId || classId || '');
      payload.append('grade', formData.selectedGrade || '');

      if (contentFile) {
        payload.append('content_file', contentFile);
      }

      const response = await fetch('/api/ildce/topics', {
        method: 'POST',
        body: payload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create topic');
      }

      const data = await response.json();
      const selectedClassName = classes.find((c) => c._id === formData.selectedClassId)?.name || 'selected class';
      const studentCount = classes.find((c) => c._id === formData.selectedClassId)?.studentCount || 0;
      setSuccess(
        `✅ Topic "${data.topic.topic_name}" created successfully! ` +
        `${studentCount} student${studentCount !== 1 ? 's' : ''} in ${selectedClassName} can access it after you publish the quiz draft.`
      );
      
      // Reset form
      setFormData({
        topic_name: '',
        content_text: '',
        content_type: 'text',
        difficulty_weight: 3,
        category: '',
        selectedClassId: classId || '',
        selectedGrade: '',
      });
      setContentFile(null);

      if (onSuccess) onSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <UploadCloud className="text-blue-600" />
        Upload Class Content
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Class/Grade Selection */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="text-purple-600" size={20} />
            <label className="block text-sm font-bold text-purple-900">
              Select Class/Grade * <span className="text-xs font-normal text-purple-700">(Only students in this class will see the content)</span>
            </label>
          </div>
          {loadingClasses ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader className="animate-spin" size={16} />
              <span className="text-sm">Loading classes...</span>
            </div>
          ) : classes.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <select
                    name="selectedClassId"
                    value={formData.selectedClassId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white font-semibold text-gray-900"
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>
                        {cls.name} - Grade {cls.grade} ({cls.studentCount || 0} students)
                      </option>
                    ))}
                  </select>
                </div>
                {formData.selectedGrade && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-purple-100 rounded-lg border border-purple-300">
                    <GraduationCap className="text-purple-700" size={18} />
                    <div>
                      <span className="text-xs text-purple-700 block">Selected Grade</span>
                      <span className="text-sm font-bold text-purple-900">
                        {formData.selectedGrade}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {formData.selectedClassId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    ℹ️ <strong>Students who will get access:</strong> All students enrolled in <strong>{classes.find(c => c._id === formData.selectedClassId)?.name}</strong>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-semibold">⚠️ No classes found</p>
              <p className="text-xs text-red-700 mt-1">You need to be assigned to a class first. Contact admin if you should have classes.</p>
            </div>
          )}
        </div>

        {/* Topic Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Topic Name *
          </label>
          <input
            type="text"
            name="topic_name"
            value={formData.topic_name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Linear Equations, Photosynthesis"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Mathematics, Science"
          />
        </div>

        {/* Content Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content Type
          </label>
          <select
            name="content_type"
            value={formData.content_type}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="text">Text Notes</option>
            <option value="slides">Slides</option>
            <option value="pdf">PDF</option>
            <option value="notes">Study Notes</option>
          </select>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attach File (optional)
          </label>
          <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <Paperclip className="text-gray-500" size={18} />
              <input
                type="file"
                accept=".txt,.md,.csv,.pdf,.doc,.docx,.ppt,.pptx"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-700"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Tip: PDFs are summarized automatically. For slides or Word files, add short notes below.
            </p>
            {contentFile && (
              <div className="mt-3 flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <FileText size={16} />
                  <span>{contentFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setContentFile(null)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Difficulty Weight */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty Level (1-5)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              name="difficulty_weight"
              min="1"
              max="5"
              value={formData.difficulty_weight}
              onChange={handleChange}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-lg font-bold text-blue-600 w-12 text-center">
              {formData.difficulty_weight}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            1 = Very Easy, 5 = Very Difficult
          </p>
        </div>

        {/* Content Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content *
          </label>
          <textarea
            name="content_text"
            value={formData.content_text}
            onChange={handleChange}
            required={!contentFile}
            rows={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Paste your content here. The AI will automatically:
- Summarize the content
- Extract key points
- Generate quiz questions
- Identify concepts"
          />
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-gap-2">
            <AlertCircle className="text-red-600 flex-shrink-0" />
            <p className="text-red-700 ml-2">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-gap-2">
            <CheckCircle className="text-green-600 flex-shrink-0" />
            <p className="text-green-700 ml-2">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition"
        >
          {isLoading ? (
            <>
              <Loader className="animate-spin" size={20} />
              Processing with AI...
            </>
          ) : (
            <>
              <UploadCloud size={20} />
              Upload Content & Create Quiz Draft
            </>
          )}
        </button>
      </form>

      <p className="text-sm text-gray-600 mt-4 p-3 bg-blue-50 rounded">
        💡 <strong>AI will automatically:</strong> Summarize content, extract concepts,
        generate 5 MCQ + 3 short answer + 2 true/false questions
      </p>
    </div>
  );
}
