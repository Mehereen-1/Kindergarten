'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TeacherTopBar from '@/app/components/TeacherTopBar';

interface Batch {
  _id: string;
  examCycleId: { examName: string; academicYear: string };
  classId: { name: string };
  subjectId: { name: string };
  status: string;
  totalStudents: number;
  entriesCompleted: number;
  createdAt: string;
}

export default function MarksheetListPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'submitted' | 'approved' | 'published'>('all');

  useEffect(() => {
    const loadBatches = async () => {
      try {
        setLoading(true);
        const params = filter !== 'all' ? `?status=${filter}` : '';
        const res = await axios.get(`/api/teacher/marksheets${params}`);
        if (res.data.success) {
          setBatches(res.data.data);
        }
      } catch (error) {
        console.error('Failed to load marksheets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBatches();
  }, [filter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-purple-100 text-purple-800';
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'locked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TeacherTopBar />
        <div className="p-8">Loading marksheets...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherTopBar />
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Marksheets</h1>
          <button
            onClick={() => router.push('/teacher/marksheets/new')}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Create New Batch
          </button>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          {(['all', 'draft', 'submitted', 'approved', 'published'] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded text-sm font-medium capitalize transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>

        {/* Batches List */}
        <div className="space-y-3">
          {batches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No marksheets found
            </div>
          ) : (
            batches.map((batch) => (
              <Link
                key={batch._id}
                href={`/teacher/marksheets/${batch._id}`}
                className="block p-4 border rounded-lg hover:shadow-md transition bg-white"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">
                      {batch.examCycleId.examName}
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>Class: {batch.classId.name}</div>
                      <div>Subject: {batch.subjectId.name}</div>
                      <div>Year: {batch.examCycleId.academicYear}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <span
                      className={`px-3 py-1 rounded text-sm font-semibold capitalize ${getStatusColor(
                        batch.status
                      )}`}
                    >
                      {batch.status}
                    </span>
                    <div className="text-right text-sm">
                      <p className="text-gray-600">Progress</p>
                      <p className="font-semibold">
                        {batch.entriesCompleted} / {batch.totalStudents}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${
                        batch.totalStudents > 0
                          ? (batch.entriesCompleted / batch.totalStudents) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
