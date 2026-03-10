'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Trash2, CheckCircle, AlertCircle, Users, GraduationCap, X } from 'lucide-react';

interface Teacher {
  _id: string;
  name: string;
  email: string;
}

interface Class {
  _id: string;
  name: string;
  grade: string;
  classId: string;
}

interface Assignment {
  _id: string;
  teacherId: { _id: string; name: string; email: string };
  classId: { _id: string; name: string; grade: string; classId: string };
  role?: string;
  status: string;
  academicYear: string;
}

export default function TeacherClassAssignment() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form state
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [role, setRole] = useState('Class Teacher');
  const [academicYear] = useState(String(new Date().getFullYear()));

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch teachers
      const teachersRes = await fetch('/api/admin/teachers');
      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        // API returns array directly, not wrapped in object
        const teachersList = Array.isArray(teachersData) ? teachersData : (teachersData.teachers || []);
        console.log('Fetched teachers:', teachersList);
        setTeachers(teachersList);
      } else {
        console.error('Failed to fetch teachers:', await teachersRes.text());
      }

      // Fetch classes
      const classesRes = await fetch('/api/admin/classes');
      if (!classesRes.ok) {
        // Try alternative endpoint
        const allClassesRes = await fetch('/api/classes');
        if (allClassesRes.ok) {
          const classesData = await allClassesRes.json();
          const classesList = Array.isArray(classesData) ? classesData : (classesData.classes || classesData || []);
          console.log('Fetched classes:', classesList);
          setClasses(classesList);
        }
      } else {
        const classesData = await classesRes.json();
        const classesList = Array.isArray(classesData) ? classesData : (classesData.classes || classesData || []);
        console.log('Fetched classes:', classesList);
        setClasses(classesList);
      }

      // Fetch existing assignments
      const assignmentsRes = await fetch(`/api/admin/assign-teachers?academicYear=${academicYear}`);
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        console.log('Fetched assignments:', assignmentsData.assignments);
        setAssignments(assignmentsData.assignments || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeacher || !selectedClass) {
      showMessage('error', 'Please select both teacher and class');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/admin/assign-teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacher,
          classId: selectedClass,
          academicYear,
          role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', data.message || 'Teacher assigned successfully');
        setSelectedTeacher('');
        setSelectedClass('');
        setRole('Class Teacher');
        fetchData(); // Refresh assignments
      } else {
        showMessage('error', data.error || 'Failed to assign teacher');
      }
    } catch (error) {
      showMessage('error', 'An error occurred while assigning teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/assign-teachers?assignmentId=${assignmentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', 'Assignment removed successfully');
        fetchData(); // Refresh assignments
      } else {
        showMessage('error', data.error || 'Failed to remove assignment');
      }
    } catch (error) {
      showMessage('error', 'An error occurred while removing assignment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <UserPlus className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Assign Teachers to Classes</h2>
            <p className="text-blue-100 text-sm">
              Manage teacher-class assignments for academic year {academicYear}
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="text-green-600" size={20} />
          ) : (
            <AlertCircle className="text-red-600" size={20} />
          )}
          <p
            className={`flex-1 ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {message.text}
          </p>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Assignment Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">New Assignment</h3>
        
        {/* Debug Info */}
        {(teachers.length === 0 || classes.length === 0) && !loading && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Data Status:</p>
            <ul className="text-xs text-yellow-800 space-y-1">
              <li>✓ Teachers loaded: {teachers.length} found</li>
              <li>✓ Classes loaded: {classes.length} found</li>
              {teachers.length === 0 && (
                <li className="font-semibold text-red-700">
                  ❌ No teachers in database. Import teachers first from Import Teachers tab.
                </li>
              )}
              {classes.length === 0 && (
                <li className="font-semibold text-red-700">
                  ❌ No classes in database. Create classes first.
                </li>
              )}
            </ul>
          </div>
        )}
        
        <form onSubmit={handleAssign} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Select Teacher */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Users className="inline w-4 h-4 mr-1" />
                Select Teacher * {teachers.length > 0 && <span className="text-xs text-gray-500">({teachers.length} available)</span>}
              </label>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Choose Teacher --</option>
                {teachers.length === 0 ? (
                  <option disabled>No teachers found</option>
                ) : (
                  teachers.map((teacher) => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.name || 'Unnamed Teacher'} {teacher.email ? `(${teacher.email})` : ''}
                    </option>
                  ))
                )}
              </select>
              {teachers.length === 0 && !loading && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ No teachers found. Please add teachers first.
                </p>
              )}
            </div>

            {/* Select Class */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <GraduationCap className="inline w-4 h-4 mr-1" />
                Select Class * {classes.length > 0 && <span className="text-xs text-gray-500">({classes.length} available)</span>}
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Choose Class --</option>
                {classes.length === 0 ? (
                  <option disabled>No classes found</option>
                ) : (
                  classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name || cls.classId} - Grade {cls.grade}
                    </option>
                  ))
                )}
              </select>
              {classes.length === 0 && !loading && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ No classes found. Please add classes first.
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Class Teacher">Class Teacher</option>
                <option value="Subject Teacher">Subject Teacher</option>
                <option value="Assistant Teacher">Assistant Teacher</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Assigning...
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Assign Teacher to Class
              </>
            )}
          </button>
        </form>
      </div>

      {/* Current Assignments */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Current Assignments ({assignments.length})
        </h3>

        {assignments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No assignments yet. Assign teachers to classes above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Teacher
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Grade
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assignments.map((assignment) => (
                  <tr key={assignment._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {assignment.teacherId.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {assignment.teacherId.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {assignment.classId.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {assignment.classId.grade}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        {assignment.role || 'Class Teacher'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          assignment.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemove(assignment._id)}
                        className="text-red-600 hover:text-red-800 transition"
                        title="Remove assignment"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
