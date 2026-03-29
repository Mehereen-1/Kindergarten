'use client';

import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle, AlertCircle, Link2, Pencil, Save, Trash2, X } from 'lucide-react';

interface Teacher {
  _id: string;
  name?: string;
  email?: string;
}

interface ClassOption {
  _id: string;
  name: string;
  grade?: string;
  classId?: string;
}

interface SubjectOption {
  _id: string;
  name: string;
  code?: string;
}

interface Assignment {
  _id: string;
  teacherId: { _id: string; name?: string; email?: string };
  classId: { _id: string; name?: string; grade?: string; classId?: string };
  subjectId: { _id: string; name?: string; code?: string };
  teacherRole?: 'class_teacher' | 'assistant_teacher' | 'course_teacher';
  academicYear: string;
  status: string;
}

const TEACHER_ROLE_OPTIONS = [
  { value: 'class_teacher', label: 'Class Teacher' },
  { value: 'assistant_teacher', label: 'Assistant Teacher' },
  { value: 'course_teacher', label: 'Course Teacher' },
] as const;

function formatTeacherRole(role?: string) {
  return TEACHER_ROLE_OPTIONS.find((option) => option.value === role)?.label || 'Course Teacher';
}

export default function SubjectTeacherAssignment() {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index).flatMap((year) => [
    String(year),
    `${year}-${year + 1}`,
  ]);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingAssignmentId, setEditingAssignmentId] = useState('');
  const [editingValues, setEditingValues] = useState({
    teacherId: '',
    classId: '',
    subjectId: '',
    teacherRole: 'course_teacher',
  });

  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedTeacherRole, setSelectedTeacherRole] = useState('course_teacher');
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const [teachersRes, classesRes, subjectsRes, assignmentsRes] = await Promise.all([
        fetch('/api/admin/teachers', { cache: 'no-store' }),
        fetch('/api/admin/classes', { cache: 'no-store' }),
        fetch('/api/admin/subjects', { cache: 'no-store' }),
        fetch(`/api/admin/class-subject-assignments?academicYear=${academicYear}`, { cache: 'no-store' }),
      ]);

      if (teachersRes.ok) {
        const data = await teachersRes.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.teachers) ? data.teachers : [];
        setTeachers(list);
      }

      if (classesRes.ok) {
        const data = await classesRes.json();
        const list = Array.isArray(data) ? data : Array.isArray(data) ? data : Array.isArray(data?.classes) ? data.classes : data;
        setClasses(Array.isArray(list) ? list : []);
      }

      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjects(Array.isArray(data?.subjects) ? data.subjects : []);
      }

      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(Array.isArray(data?.assignments) ? data.assignments : []);
      }
    } catch (error) {
      showMessage('error', 'Failed to load subject assignment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear]);

  const handleAssign = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedTeacher || !selectedClass || (!selectedSubject && !newSubjectName.trim())) {
      showMessage('error', 'Please select teacher, class, and choose or type a subject');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/class-subject-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacher,
          classId: selectedClass,
          subjectId: selectedSubject || undefined,
          subjectName: selectedSubject ? undefined : newSubjectName.trim(),
          teacherRole: selectedTeacherRole,
          academicYear,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        showMessage('error', data?.error || 'Failed to assign subject');
        return;
      }

      setSelectedTeacher('');
      setSelectedClass('');
      setSelectedSubject('');
      setNewSubjectName('');
      setSelectedTeacherRole('course_teacher');
      showMessage('success', 'Subject assigned successfully');
      fetchData();
    } catch {
      showMessage('error', 'Failed to assign subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (!confirm('Remove this subject assignment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/class-subject-assignments?assignmentId=${assignmentId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        showMessage('error', data?.error || 'Failed to remove assignment');
        return;
      }
      showMessage('success', 'Subject assignment removed');
      fetchData();
    } catch {
      showMessage('error', 'Failed to remove assignment');
    }
  };

  const startEditing = (assignment: Assignment) => {
    setEditingAssignmentId(assignment._id);
    setEditingValues({
      teacherId: assignment.teacherId?._id ? String(assignment.teacherId._id) : '',
      classId: assignment.classId?._id ? String(assignment.classId._id) : '',
      subjectId: assignment.subjectId?._id ? String(assignment.subjectId._id) : '',
      teacherRole: assignment.teacherRole || 'course_teacher',
    });
  };

  const cancelEditing = () => {
    setEditingAssignmentId('');
    setEditingValues({
      teacherId: '',
      classId: '',
      subjectId: '',
      teacherRole: 'course_teacher',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAssignmentId || !editingValues.teacherId || !editingValues.classId || !editingValues.subjectId) {
      showMessage('error', 'Please choose class, subject, teacher, and role');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/class-subject-assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: editingAssignmentId,
          teacherId: editingValues.teacherId,
          classId: editingValues.classId,
          subjectId: editingValues.subjectId,
          teacherRole: editingValues.teacherRole,
          academicYear,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        showMessage('error', data?.error || 'Failed to update assignment');
        return;
      }

      if (data?.data?._id) {
        setAssignments((current) =>
          current.map((assignment) =>
            assignment._id === data.data._id ? data.data : assignment
          )
        );
      }

      showMessage('success', 'Assignment updated successfully');
      cancelEditing();
      await fetchData();
    } catch {
      showMessage('error', 'Failed to update assignment');
    } finally {
      setSubmitting(false);
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
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-6 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Assign Subjects to Teachers</h2>
              <p className="text-emerald-100 text-sm">
                Manage class-subject-teacher assignments for academic year {academicYear}
              </p>
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="block text-xs font-semibold text-emerald-100 mb-2">Academic Year</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-lg border border-emerald-300 bg-white/95 px-3 py-2 text-sm text-gray-900 outline-none focus:border-white"
            >
              {yearOptions.map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  {yearOption}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle className="text-green-600" size={20} /> : <AlertCircle className="text-red-600" size={20} />}
          <p className={`flex-1 ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{message.text}</p>
          <button onClick={() => setMessage({ type: '', text: '' })} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">New Subject Assignment</h3>
        <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Teacher</label>
            <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>{teacher.name || teacher.email || 'Teacher'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">Select class</option>
              {classes.map((classDoc) => (
                <option key={classDoc._id} value={classDoc._id}>{classDoc.name} {classDoc.grade ? `(${classDoc.grade})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                if (e.target.value) {
                  setNewSubjectName('');
                }
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>{subject.name}{subject.code ? ` (${subject.code})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Or Create Subject</label>
            <input
              value={newSubjectName}
              onChange={(e) => {
                setNewSubjectName(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedSubject('');
                }
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Type new subject name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Teacher Role</label>
            <select
              value={selectedTeacherRole}
              onChange={(e) => setSelectedTeacherRole(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {TEACHER_ROLE_OPTIONS.map((roleOption) => (
                <option key={roleOption.value} value={roleOption.value}>
                  {roleOption.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-5 flex justify-end">
            <button type="submit" disabled={submitting} className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium text-white ${submitting ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              <Link2 size={18} />
              {submitting ? 'Saving...' : 'Assign Subject'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Current Subject Assignments</h3>
          <span className="text-sm text-gray-500">{assignments.length} total</span>
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No subject assignments created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.map((assignment) => (
                  <tr key={assignment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {editingAssignmentId === assignment._id ? (
                        <select
                          value={editingValues.classId}
                          onChange={(e) => setEditingValues((current) => ({ ...current, classId: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="">Select class</option>
                          {classes.map((classDoc) => (
                            <option key={classDoc._id} value={classDoc._id}>
                              {classDoc.name} {classDoc.grade ? `(${classDoc.grade})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          {assignment.classId?.name || 'Class'} {assignment.classId?.grade ? `(${assignment.classId.grade})` : ''}
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {editingAssignmentId === assignment._id ? (
                        <select
                          value={editingValues.subjectId}
                          onChange={(e) => setEditingValues((current) => ({ ...current, subjectId: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="">Select subject</option>
                          {subjects.map((subject) => (
                            <option key={subject._id} value={subject._id}>
                              {subject.name}{subject.code ? ` (${subject.code})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        assignment.subjectId?.name || 'Subject'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingAssignmentId === assignment._id ? (
                        <select
                          value={editingValues.teacherId}
                          onChange={(e) => setEditingValues((current) => ({ ...current, teacherId: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="">Select teacher</option>
                          {teachers.map((teacher) => (
                            <option key={teacher._id} value={teacher._id}>
                              {teacher.name || teacher.email || 'Teacher'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        assignment.teacherId?.name || assignment.teacherId?.email || 'Teacher'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingAssignmentId === assignment._id ? (
                        <select
                          value={editingValues.teacherRole}
                          onChange={(e) => setEditingValues((current) => ({ ...current, teacherRole: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          {TEACHER_ROLE_OPTIONS.map((roleOption) => (
                            <option key={roleOption.value} value={roleOption.value}>
                              {roleOption.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        formatTeacherRole(assignment.teacherRole)
                      )}
                    </td>
                    <td className="px-6 py-4">{assignment.academicYear}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingAssignmentId === assignment._id ? (
                          <>
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={submitting}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-1.5 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                            >
                              <Save size={16} />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              disabled={submitting}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                            >
                              <X size={16} />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditing(assignment)}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-blue-600 hover:bg-blue-100"
                          >
                            <Pencil size={16} />
                            Edit
                          </button>
                        )}
                        <button type="button" onClick={() => handleRemove(assignment._id)} className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-red-600 hover:bg-red-100">
                          <Trash2 size={16} />
                          Remove
                        </button>
                      </div>
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
