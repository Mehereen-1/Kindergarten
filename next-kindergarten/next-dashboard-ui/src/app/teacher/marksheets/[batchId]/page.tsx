'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';

interface Student {
  _id: string;
  name: string;
  rollNumber: string;
  email: string;
}

interface MarkEntry {
  _id?: string;
  studentId: Student;
  theoryMarks?: number;
  mcqMarks?: number;
  practicalMarks?: number;
  vivaMarks?: number;
  classTestMarks?: number;
  attendanceMarks?: number;
  totalMarks?: number;
  percentage?: number;
  grade?: string;
  isAbsent: boolean;
  teacherRemark?: string;
}

interface Batch {
  _id: string;
  examCycleId: any;
  classId: any;
  subjectId: any;
  status: string;
  totalStudents: number;
  entriesCompleted: number;
}

export default function MarksheetPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.batchId as string;

  const [batch, setBatch] = useState<Batch | null>(null);
  const [entries, setEntries] = useState<MarkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<MarkEntry>>({});

  // Load batch and entries
  useEffect(() => {
    const loadBatch = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/teacher/marksheets/${batchId}`);
        if (res.data.success) {
          setBatch(res.data.data.batch);
          setEntries(res.data.data.entries);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load marksheet');
      } finally {
        setLoading(false);
      }
    };

    if (batchId) loadBatch();
  }, [batchId]);

  // Start editing a student
  const startEdit = useCallback((student: MarkEntry) => {
    setEditingStudentId(student.studentId._id || '');
    setEditingData({ ...student });
  }, []);

  // Save mark entry
  const saveEntry = useCallback(async () => {
    if (!editingStudentId || !editingData) return;

    try {
      setSaving(true);
      const res = await axios.post(
        `/api/teacher/marksheets/${batchId}/entries`,
        {
          studentId: editingStudentId,
          theoryMarks: editingData.theoryMarks,
          mcqMarks: editingData.mcqMarks,
          practicalMarks: editingData.practicalMarks,
          vivaMarks: editingData.vivaMarks,
          classTestMarks: editingData.classTestMarks,
          attendanceMarks: editingData.attendanceMarks,
          isAbsent: editingData.isAbsent || false,
          teacherRemark: editingData.teacherRemark,
        }
      );

      if (res.data.success) {
        // Update entry in list
        setEntries((prev) =>
          prev.map((e) =>
            e.studentId._id === editingStudentId ? res.data.data : e
          )
        );
        // Update batch completion counter
        setBatch((prev) =>
          prev ? { ...prev, entriesCompleted: res.data.data.entriesCompleted } : null
        );
        setEditingStudentId(null);
        setEditingData({});
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  }, [batchId, editingStudentId, editingData]);

  // Submit batch
  const submitBatch = useCallback(async () => {
    try {
      setSaving(true);
      const res = await axios.post(`/api/teacher/marksheets/${batchId}/submit`, {
        notes: 'Submitted by teacher',
      });
      if (res.data.success) {
        setBatch((prev) => (prev ? { ...prev, status: 'submitted' } : null));
        alert('Marksheet submitted for approval');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSaving(false);
    }
  }, [batchId]);

  if (loading) return <div className="p-8">Loading marksheet...</div>;
  if (!batch) return <div className="p-8">Batch not found</div>;

  const completionPercent = batch.totalStudents > 0 
    ? Math.round((batch.entriesCompleted / batch.totalStudents) * 100) 
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold mb-2">Marksheet Entry</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Exam</p>
            <p className="font-semibold">{batch.examCycleId?.examName}</p>
          </div>
          <div>
            <p className="text-gray-600">Class</p>
            <p className="font-semibold">{batch.classId?.name}</p>
          </div>
          <div>
            <p className="text-gray-600">Subject</p>
            <p className="font-semibold">{batch.subjectId?.name}</p>
          </div>
          <div>
            <p className="text-gray-600">Status</p>
            <p className="font-semibold text-blue-600 capitalize">{batch.status}</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold">Progress</p>
          <p className="text-sm text-gray-600">
            {batch.entriesCompleted} of {batch.totalStudents} entries
          </p>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${completionPercent}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{completionPercent}% complete</p>
      </div>

      {/* Marksheet Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Roll No</th>
              <th className="px-4 py-3 text-left font-semibold">Student Name</th>
              <th className="px-4 py-3 text-center font-semibold">Theory</th>
              <th className="px-4 py-3 text-center font-semibold">MCQ</th>
              <th className="px-4 py-3 text-center font-semibold">Practical</th>
              <th className="px-4 py-3 text-center font-semibold">Total</th>
              <th className="px-4 py-3 text-center font-semibold">%</th>
              <th className="px-4 py-3 text-center font-semibold">Grade</th>
              <th className="px-4 py-3 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{entry.studentId?.rollNumber}</td>
                <td className="px-4 py-3">{entry.studentId?.name}</td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {entry.theoryMarks || '—'}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {entry.mcqMarks || '—'}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {entry.practicalMarks || '—'}
                </td>
                <td className="px-4 py-3 text-center font-semibold">
                  {entry.totalMarks || '—'}
                </td>
                <td className="px-4 py-3 text-center font-semibold">
                  {entry.percentage ? `${entry.percentage.toFixed(1)}%` : '—'}
                </td>
                <td className="px-4 py-3 text-center font-bold">
                  <span className={`px-2 py-1 rounded text-xs ${
                    entry.grade === 'A+' ? 'bg-green-100 text-green-800' :
                    entry.grade === 'A' ? 'bg-green-100 text-green-700' :
                    entry.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                    entry.grade === 'C' ? 'bg-orange-100 text-orange-800' :
                    entry.grade === 'F' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {entry.grade || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => startEdit(entry)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingStudentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              Enter Marks for{' '}
              {
                entries.find((e) => e.studentId._id === editingStudentId)
                  ?.studentId?.name
              }
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Theory Marks
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingData.theoryMarks || ''}
                  onChange={(e) =>
                    setEditingData({
                      ...editingData,
                      theoryMarks: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">MCQ Marks</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingData.mcqMarks || ''}
                  onChange={(e) =>
                    setEditingData({
                      ...editingData,
                      mcqMarks: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Practical Marks
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingData.practicalMarks || ''}
                  onChange={(e) =>
                    setEditingData({
                      ...editingData,
                      practicalMarks: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Absent?
                </label>
                <input
                  type="checkbox"
                  checked={editingData.isAbsent || false}
                  onChange={(e) =>
                    setEditingData({
                      ...editingData,
                      isAbsent: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">
                Teacher Remark
              </label>
              <textarea
                value={editingData.teacherRemark || ''}
                onChange={(e) =>
                  setEditingData({ ...editingData, teacherRemark: e.target.value })
                }
                className="w-full border rounded px-3 py-2 text-sm"
                rows={3}
                placeholder="Optional teacher comment"
              />
            </div>

            {/* Auto-generated info */}
            {editingData.totalMarks !== undefined && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded mb-6 text-sm">
                <div>
                  <p className="text-gray-600">Total</p>
                  <p className="font-bold">{editingData.totalMarks}</p>
                </div>
                <div>
                  <p className="text-gray-600">Percentage</p>
                  <p className="font-bold">
                    {editingData.percentage?.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Grade</p>
                  <p className="font-bold">{editingData.grade}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingStudentId(null)}
                className="px-6 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveEntry}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Marks'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end gap-4">
        <button
          onClick={() => router.back()}
          className="px-6 py-2 border rounded hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={submitBatch}
          disabled={saving || batch.status !== 'draft' || batch.entriesCompleted === 0}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Submitting...' : 'Submit Batch'}
        </button>
      </div>
    </div>
  );
}
