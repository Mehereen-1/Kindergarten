'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TeacherTopBar from '@/app/components/TeacherTopBar';

interface ExamCycle {
  _id: string;
  examName: string;
  academicYear: string;
  termName: string;
  status: string;
  classIds: Array<{ _id: string; name: string }>;
  subjectIds: Array<{ _id: string; name: string }>;
}

interface Class {
  _id: string;
  name: string;
}

interface Subject {
  _id: string;
  name: string;
}

export default function NewMarksheetPage() {
  const router = useRouter();
  const [examCycles, setExamCycles] = useState<ExamCycle[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedExamCycleId, setSelectedExamCycleId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Load exam cycles
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/admin/exam-config/cycles?status=open');
        if (res.data.success) {
          setExamCycles(res.data.data);
        }
      } catch (err) {
        setError('Failed to load exam cycles');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Update classes and subjects when exam cycle changes
  useEffect(() => {
    if (selectedExamCycleId) {
      const cycle = examCycles.find((c) => c._id === selectedExamCycleId);
      if (cycle) {
        setClasses(cycle.classIds);
        setSubjects(cycle.subjectIds);
        setSelectedClassId('');
        setSelectedSubjectId('');
      }
    }
  }, [selectedExamCycleId, examCycles]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedExamCycleId || !selectedClassId || !selectedSubjectId) {
      setError('Please select exam cycle, class, and subject');
      return;
    }

    try {
      setCreating(true);
      const res = await axios.post('/api/teacher/marksheets/create', {
        examCycleId: selectedExamCycleId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
      });

      if (res.data.success || res.data.data) {
        router.push(`/teacher/marksheets/${res.data.data._id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create batch');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TeacherTopBar />
        <div className="p-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherTopBar />
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create New Marksheet</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-6">
          {/* Exam Cycle Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">Exam Cycle *</label>
            <select
              value={selectedExamCycleId}
              onChange={(e) => setSelectedExamCycleId(e.target.value)}
              required
              className="w-full border rounded px-4 py-2"
            >
              <option value="">Select an exam cycle</option>
              {examCycles.map((cycle) => (
                <option key={cycle._id} value={cycle._id}>
                  {cycle.examName} ({cycle.academicYear}) - {cycle.termName}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Only open exam cycles are shown</p>
          </div>

        {/* Class Selection */}
        <div>
          <label className="block text-sm font-semibold mb-2">Class/Section *</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            required
            disabled={!selectedExamCycleId}
            className="w-full border rounded px-4 py-2 disabled:bg-gray-100"
          >
            <option value="">
              {selectedExamCycleId ? 'Select a class' : 'Select exam cycle first'}
            </option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Selection */}
        <div>
          <label className="block text-sm font-semibold mb-2">Subject *</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            required
            disabled={!selectedExamCycleId}
            className="w-full border rounded px-4 py-2 disabled:bg-gray-100"
          >
            <option value="">
              {selectedExamCycleId ? 'Select a subject' : 'Select exam cycle first'}
            </option>
            {subjects.map((subj) => (
              <option key={subj._id} value={subj._id}>
                {subj.name}
              </option>
            ))}
          </select>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <p className="font-semibold mb-2">What happens next?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>System will load all enrolled students automatically</li>
            <li>You can enter marks for each student</li>
            <li>Save drafts and continue anytime</li>
            <li>Submit when all marks are entered</li>
          </ul>
        </div>

        {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !selectedExamCycleId || !selectedClassId || !selectedSubjectId}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create & Start'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
