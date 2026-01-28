"use client";

import { useState, useEffect } from "react";
import TeacherTopBar from "@/app/components/TeacherTopBar";

export default function AttendancePage() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Load students on mount
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const response = await fetch('/api/admin/students');
      const data = await response.json();
      setStudents(data);
      
      // Initialize attendance state
      const initialAttendance = {};
      data.forEach(student => {
        initialAttendance[student._id] = 'Present';
      });
      setAttendance(initialAttendance);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const submitAttendance = async () => {
    setLoading(true);
    setMessage("");

    try {
      // Convert attendance object to array format
      const attendanceArray = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status
      }));

      const response = await fetch('/api/teacher/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          attendance: attendanceArray
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(`✅ ${result.message}`);
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TeacherTopBar />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6 lg:p-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-black text-slate-900 mb-2">
              Mark Attendance 📋
            </h1>
            <p className="text-slate-600 text-lg">
              Mark attendance for all students at once
            </p>
          </div>

          {/* Date Selector */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-2 border-indigo-200 rounded-lg px-4 py-3 text-lg focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${message.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}

          {/* Students Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-bold">Student Name</th>
                  <th className="px-6 py-4 text-left font-bold">Roll No</th>
                  <th className="px-6 py-4 text-left font-bold">Class</th>
                  <th className="px-6 py-4 text-center font-bold">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {student.roll || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {student.grade || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleStatusChange(student._id, 'Present')}
                          className={`px-4 py-2 rounded-lg font-bold transition-all ${
                            attendance[student._id] === 'Present'
                              ? 'bg-green-500 text-white shadow-lg scale-105'
                              : 'bg-gray-200 text-gray-600 hover:bg-green-200'
                          }`}
                        >
                          ✓ Present
                        </button>
                        <button
                          onClick={() => handleStatusChange(student._id, 'Absent')}
                          className={`px-4 py-2 rounded-lg font-bold transition-all ${
                            attendance[student._id] === 'Absent'
                              ? 'bg-red-500 text-white shadow-lg scale-105'
                              : 'bg-gray-200 text-gray-600 hover:bg-red-200'
                          }`}
                        >
                          ✗ Absent
                        </button>
                        <button
                          onClick={() => handleStatusChange(student._id, 'Late')}
                          className={`px-4 py-2 rounded-lg font-bold transition-all ${
                            attendance[student._id] === 'Late'
                              ? 'bg-yellow-500 text-white shadow-lg scale-105'
                              : 'bg-gray-200 text-gray-600 hover:bg-yellow-200'
                          }`}
                        >
                          ⏰ Late
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={submitAttendance}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : '💾 Save Attendance'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
