'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface SubjectResult {
  subjectId: string;
  subjectName: string;
  obtained: number;
  fullMarks: number;
  percentage: number;
  grade?: string;
  isPassed: boolean;
}

interface ResultSummary {
  _id: string;
  studentId: string;
  examCycleId: {
    examName: string;
    academicYear: string;
    termName: string;
    publishDate: string;
  };
  totalObtained: number;
  totalFullMarks: number;
  percentage: number;
  gpa?: number;
  overallGrade?: string;
  classRank?: number;
  classTotal?: number;
  subjectResults: SubjectResult[];
  publishedAt: string;
}

export default function ParentResultsPage() {
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState('');
  const [selectedResult, setSelectedResult] = useState<ResultSummary | null>(null);

  useEffect(() => {
    // TODO: Get studentId from context or props
    // For now, we'll skip loading to avoid 400 error
    setLoading(false);
  }, []);

  const loadResults = async (sid: string) => {
    if (!sid) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/parent/results?studentId=${sid}`);
      if (res.data.success) {
        setResults(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sid = e.target.value;
    setStudentId(sid);
    loadResults(sid);
  };

  if (loading && studentId) return <div className="p-8">Loading results...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Student Results</h1>

      {/* Student Selection */}
      <div className="mb-8">
        <label className="block text-sm font-semibold mb-2">Select Student ID</label>
        <input
          type="text"
          placeholder="Paste student ID here"
          value={studentId}
          onChange={handleStudentChange}
          className="w-full border rounded px-4 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          (In a real app, this would auto-load from your child&apos;s profile)
        </p>
      </div>

      {/* Results List */}
      {selectedResult ? (
        <div>
          <button
            onClick={() => setSelectedResult(null)}
            className="mb-6 px-4 py-2 border rounded hover:bg-gray-100"
          >
            ← Back to list
          </button>

          {/* Detailed View */}
          <div className="bg-white p-8 rounded-lg border">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">
                {selectedResult.examCycleId.examName}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Academic Year</p>
                  <p className="font-semibold">{selectedResult.examCycleId.academicYear}</p>
                </div>
                <div>
                  <p className="text-gray-600">Term</p>
                  <p className="font-semibold">{selectedResult.examCycleId.termName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Marks</p>
                  <p className="font-semibold">
                    {selectedResult.totalObtained} / {selectedResult.totalFullMarks}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Percentage</p>
                  <p className="font-bold text-lg">
                    {selectedResult.percentage.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Grade</p>
                  <p className="font-bold text-xl text-green-600">
                    {selectedResult.overallGrade}
                  </p>
                </div>
              </div>

              {selectedResult.classRank && (
                <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <span className="font-bold">Class Position:</span> Rank{' '}
                    {selectedResult.classRank} out of {selectedResult.classTotal}
                  </p>
                </div>
              )}
            </div>

            {/* Subject-wise Breakdown */}
            <div>
              <h3 className="text-xl font-bold mb-4">Subject-wise Performance</h3>
              <div className="overflow-x-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Subject</th>
                      <th className="px-4 py-3 text-center font-semibold">Obtained</th>
                      <th className="px-4 py-3 text-center font-semibold">Full Marks</th>
                      <th className="px-4 py-3 text-center font-semibold">Percentage</th>
                      <th className="px-4 py-3 text-center font-semibold">Grade</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedResult.subjectResults.map((subject, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{subject.subjectName}</td>
                        <td className="px-4 py-3 text-center font-semibold">
                          {subject.obtained}
                        </td>
                        <td className="px-4 py-3 text-center">{subject.fullMarks}</td>
                        <td className="px-4 py-3 text-center font-semibold">
                          {subject.percentage.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            subject.grade === 'A+' || subject.grade === 'A' 
                              ? 'bg-green-100 text-green-800'
                              : subject.grade === 'B'
                              ? 'bg-yellow-100 text-yellow-800'
                              : subject.grade === 'C'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {subject.grade}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-semibold ${
                            subject.isPassed ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {subject.isPassed ? '✓ Passed' : '✗ Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedResult.gpa && (
              <div className="mt-6 p-4 bg-purple-50 rounded border border-purple-200">
                <p className="text-sm text-purple-800">
                  <span className="font-bold">GPA:</span> {selectedResult.gpa.toFixed(2)} / 4.0
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {results.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {studentId
                ? 'No results published yet'
                : 'Enter a student ID to view results'}
            </div>
          ) : (
            results.map((result) => (
              <div
                key={result._id}
                onClick={() => setSelectedResult(result)}
                className="p-4 border rounded-lg hover:shadow-lg cursor-pointer transition bg-white"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {result.examCycleId.examName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {result.examCycleId.academicYear} • {result.examCycleId.termName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-600">
                      {result.percentage.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {result.totalObtained} / {result.totalFullMarks}
                    </p>
                    {result.classRank && (
                      <p className="text-sm font-semibold text-blue-600 mt-1">
                        Rank {result.classRank}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
