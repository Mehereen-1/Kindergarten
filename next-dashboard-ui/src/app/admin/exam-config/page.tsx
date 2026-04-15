'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import ResultBatchManager from '@/app/components/results/ResultBatchManager';
import ResultCardAssessmentEditor from '@/app/components/results/ResultCardAssessmentEditor';
import ResultCardTemplateEditor from '@/app/components/results/ResultCardTemplateEditor';

interface ExamCycle {
  _id: string;
  examName: string;
  academicYear: string;
  termName: string;
  examType: string;
  status: string;
  marksEntryStartDate: string;
  marksEntryEndDate: string;
  publishDate: string;
  classIds: any[];
}

interface ClassOption {
  _id: string;
  name: string;
}

interface TeacherOption {
  _id: string;
  name: string;
  email?: string;
}

interface SubjectOption {
  _id: string;
  name: string;
  code?: string;
}

interface SubjectSetupItem {
  _id: string;
  classId?: { _id?: string; name?: string };
  subjectId?: { _id?: string; name?: string };
  teacherId?: { _id?: string; name?: string; email?: string };
  fullMarks: number;
  passMarks: number;
  components?: {
    theory?: number;
    mcq?: number;
    practical?: number;
    viva?: number;
    classTest?: number;
    attendance?: number;
  };
  createdAt?: string;
}

export default function ExamConfigPage() {
  const [cycles, setCycles] = useState<ExamCycle[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectSetups, setSubjectSetups] = useState<SubjectSetupItem[]>([]);
  const [subjectSetupLoadError, setSubjectSetupLoadError] = useState('');
  const [editingSetupId, setEditingSetupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<ExamCycle | null>(null);
  const [savingSubjectSetup, setSavingSubjectSetup] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [subjectSetupForm, setSubjectSetupForm] = useState({
    classId: '',
    teacherId: '',
    subjectId: '',
    subjectName: '',
    fullMarks: 100,
    passMarks: 35,
    theory: 50,
    mcq: 20,
    practical: 30,
    viva: 0,
    classTest: 0,
    attendance: 0,
  });

  const [formData, setFormData] = useState({
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    termName: '',
    examName: '',
    examType: 'midterm',
    marksEntryStartDate: '',
    marksEntryEndDate: '',
    publishDate: '',
    classIds: [] as string[],
    subjectIds: [] as string[],
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCycles();
    loadClasses();
    loadTeachers();
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedCycle?._id) {
      loadSubjectSetups(selectedCycle._id);
    } else {
      setSubjectSetups([]);
    }
  }, [selectedCycle?._id]);

  const loadCycles = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/exam-config/cycles');
      if (res.data.success) {
        setCycles(res.data.data);
      }
    } catch (err) {
      setError('Failed to load exam cycles');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const res = await axios.get('/api/admin/classes');
      if (Array.isArray(res.data)) {
        setClasses(res.data.map((c: any) => ({ _id: c._id, name: c.name })));
      }
    } catch {
      setError('Failed to load classes');
    }
  };

  const loadTeachers = async () => {
    try {
      const res = await axios.get('/api/admin/teachers');
      const list = Array.isArray(res.data?.teachers)
        ? res.data.teachers
        : Array.isArray(res.data)
          ? res.data
          : [];

      setTeachers(
        list.map((t: any) => ({
          _id: t._id,
          name: t.name,
          email: t.email,
        }))
      );
    } catch {
      setError('Failed to load teachers');
    }
  };

  const loadSubjects = async () => {
    try {
      const res = await axios.get('/api/admin/subjects');
      const list = Array.isArray(res.data?.subjects) ? res.data.subjects : [];
      setSubjects(
        list.map((subject: any) => ({
          _id: subject._id,
          name: subject.name,
          code: subject.code,
        }))
      );
    } catch {
      setError('Failed to load subjects');
    }
  };

  const loadSubjectSetups = async (examCycleId: string) => {
    try {
      setSubjectSetupLoadError('');
      const res = await axios.get(
        `/api/admin/exam-config/subject-setups?examCycleId=${examCycleId}`
      );
      if (res.data?.success) {
        setSubjectSetups(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setSubjectSetups([]);
        setSubjectSetupLoadError('Could not load saved setups right now');
      }
    } catch {
      setSubjectSetups([]);
      setSubjectSetupLoadError('Failed to load saved subject setups');
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.termName || !formData.examName) {
      setError('Please fill in term name and exam name');
      return;
    }

    try {
      const res = await axios.post('/api/admin/exam-config/cycles', formData);
      if (res.data.success) {
        setSuccess('Exam cycle created successfully');
        setFormData({
          academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
          termName: '',
          examName: '',
          examType: 'midterm',
          marksEntryStartDate: '',
          marksEntryEndDate: '',
          publishDate: '',
          classIds: [],
          subjectIds: [],
        });
        setShowCreateForm(false);
        loadCycles();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create exam cycle');
    }
  };

  const handleUpdateCycleStatus = async (nextStatus: 'open' | 'closed' | 'draft') => {
    if (!selectedCycle) return;
    try {
      setUpdatingStatus(true);
      setError('');
      await axios.patch(`/api/admin/exam-config/cycles/${selectedCycle._id}`, {
        status: nextStatus,
      });

      setSelectedCycle({ ...selectedCycle, status: nextStatus });
      await loadCycles();
      setSuccess(`Exam cycle status updated to ${nextStatus}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update cycle status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCreateSubjectSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCycle) return;

    const componentsTotal =
      Number(subjectSetupForm.theory || 0) +
      Number(subjectSetupForm.mcq || 0) +
      Number(subjectSetupForm.practical || 0) +
      Number(subjectSetupForm.viva || 0) +
      Number(subjectSetupForm.classTest || 0) +
      Number(subjectSetupForm.attendance || 0);

    if (!subjectSetupForm.classId || (!subjectSetupForm.subjectId && !subjectSetupForm.subjectName.trim())) {
      setError('Please select class and choose or create a subject');
      return;
    }

    if (componentsTotal > Number(subjectSetupForm.fullMarks || 0)) {
      setError('Component total cannot exceed full marks');
      return;
    }

    try {
      setSavingSubjectSetup(true);
      setError('');
      const payload = {
        examCycleId: selectedCycle._id,
        classId: subjectSetupForm.classId,
        teacherId: subjectSetupForm.teacherId || undefined,
        subjectId: subjectSetupForm.subjectId || undefined,
        subjectName: subjectSetupForm.subjectId ? undefined : subjectSetupForm.subjectName.trim(),
        fullMarks: Number(subjectSetupForm.fullMarks),
        passMarks: Number(subjectSetupForm.passMarks),
        components: {
          theory: Number(subjectSetupForm.theory || 0),
          mcq: Number(subjectSetupForm.mcq || 0),
          practical: Number(subjectSetupForm.practical || 0),
          viva: Number(subjectSetupForm.viva || 0),
          classTest: Number(subjectSetupForm.classTest || 0),
          attendance: Number(subjectSetupForm.attendance || 0),
        },
      };

      if (editingSetupId) {
        await axios.patch(`/api/admin/exam-config/subject-setups/${editingSetupId}`, payload);
      } else {
        await axios.post('/api/admin/exam-config/subject-setups', payload);
      }

      setSuccess(editingSetupId ? 'Subject setup updated' : 'Subject marks setup saved');
      await loadSubjectSetups(selectedCycle._id);
      await loadSubjects();
      setEditingSetupId(null);
      setSubjectSetupForm({
        classId: '',
        teacherId: '',
        subjectId: '',
        subjectName: '',
        fullMarks: 100,
        passMarks: 35,
        theory: 50,
        mcq: 20,
        practical: 30,
        viva: 0,
        classTest: 0,
        attendance: 0,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save subject setup');
    } finally {
      setSavingSubjectSetup(false);
    }
  };

  const handleEditSetup = (item: SubjectSetupItem) => {
    setEditingSetupId(item._id);
    setSubjectSetupForm({
      classId: item.classId?._id || '',
      teacherId: item.teacherId?._id || '',
      subjectId: item.subjectId?._id || '',
      subjectName: item.subjectId?.name || '',
      fullMarks: Number(item.fullMarks || 100),
      passMarks: Number(item.passMarks || 35),
      theory: Number(item.components?.theory || 0),
      mcq: Number(item.components?.mcq || 0),
      practical: Number(item.components?.practical || 0),
      viva: Number(item.components?.viva || 0),
      classTest: Number(item.components?.classTest || 0),
      attendance: Number(item.components?.attendance || 0),
    });
  };

  const handleCancelEdit = () => {
    setEditingSetupId(null);
    setSubjectSetupForm({
      classId: '',
      teacherId: '',
      subjectId: '',
      subjectName: '',
      fullMarks: 100,
      passMarks: 35,
      theory: 50,
      mcq: 20,
      practical: 30,
      viva: 0,
      classTest: 0,
      attendance: 0,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-orange-100 text-orange-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="p-8">Loading exam configuration...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Exam Configuration</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showCreateForm ? '✕ Cancel' : '+ New Exam Cycle'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-800">
          {success}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="mb-8 p-6 bg-gray-50 border rounded-lg">
          <h2 className="text-xl font-bold mb-6">Create New Exam Cycle</h2>
          <form onSubmit={handleCreateCycle} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Academic Year</label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) =>
                    setFormData({ ...formData, academicYear: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Term Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Term 1"
                  value={formData.termName}
                  onChange={(e) =>
                    setFormData({ ...formData, termName: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Exam Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Midterm Exam"
                  value={formData.examName}
                  onChange={(e) =>
                    setFormData({ ...formData, examName: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Exam Type</label>
                <select
                  value={formData.examType}
                  onChange={(e) =>
                    setFormData({ ...formData, examType: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="class-test">Class Test</option>
                  <option value="midterm">Midterm</option>
                  <option value="final">Final</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Entry Start Date</label>
                <input
                  type="date"
                  value={formData.marksEntryStartDate}
                  onChange={(e) =>
                    setFormData({ ...formData, marksEntryStartDate: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Entry End Date</label>
                <input
                  type="date"
                  value={formData.marksEntryEndDate}
                  onChange={(e) =>
                    setFormData({ ...formData, marksEntryEndDate: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Publish Date</label>
                <input
                  type="date"
                  value={formData.publishDate}
                  onChange={(e) =>
                    setFormData({ ...formData, publishDate: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Exam Cycle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cycles List */}
      <div className="space-y-3">
        {cycles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No exam cycles found. Create one to get started.
          </div>
        ) : (
          cycles.map((cycle) => (
            <div
              key={cycle._id}
              onClick={() => setSelectedCycle(cycle)}
              className="p-6 border rounded-lg hover:shadow-lg cursor-pointer transition bg-white"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{cycle.examName}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
                    <div>Year: {cycle.academicYear}</div>
                    <div>Term: {cycle.termName}</div>
                    <div>Type: {cycle.examType}</div>
                    <div>Classes: {cycle.classIds?.length || 0}</div>
                    <div>
                      Entry Window:{' '}
                      {new Date(cycle.marksEntryStartDate).toLocaleDateString()} -{' '}
                      {new Date(cycle.marksEntryEndDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`px-3 py-1 rounded text-sm font-semibold capitalize ${getStatusColor(
                      cycle.status
                    )}`}
                  >
                    {cycle.status}
                  </span>
                  <p className="text-xs text-gray-500">
                    Publish: {new Date(cycle.publishDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail View */}
      {selectedCycle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-[96vw] xl:max-w-7xl 2xl:max-w-[1500px] max-h-[94vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">{selectedCycle.examName}</h2>
              <button
                onClick={() => setSelectedCycle(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleUpdateCycleStatus('open')}
                  disabled={updatingStatus || selectedCycle.status === 'open'}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded disabled:opacity-50"
                >
                  Set Entry Open
                </button>
                <button
                  onClick={() => handleUpdateCycleStatus('closed')}
                  disabled={updatingStatus || selectedCycle.status === 'closed'}
                  className="px-3 py-1 text-sm bg-orange-600 text-white rounded disabled:opacity-50"
                >
                  Set Entry Closed
                </button>
                <button
                  onClick={() => handleUpdateCycleStatus('draft')}
                  disabled={updatingStatus || selectedCycle.status === 'draft'}
                  className="px-3 py-1 text-sm bg-gray-700 text-white rounded disabled:opacity-50"
                >
                  Set Draft
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Academic Year</p>
                  <p className="font-semibold">{selectedCycle.academicYear}</p>
                </div>
                <div>
                  <p className="text-gray-600">Term</p>
                  <p className="font-semibold">{selectedCycle.termName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Exam Type</p>
                  <p className="font-semibold capitalize">{selectedCycle.examType}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className={`font-semibold capitalize ${getStatusColor(selectedCycle.status)}`}>
                    {selectedCycle.status}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">Marks Entry Window</p>
                  <p className="font-semibold">
                    {new Date(selectedCycle.marksEntryStartDate).toLocaleString()} to{' '}
                    {new Date(selectedCycle.marksEntryEndDate).toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">Publish Date</p>
                  <p className="font-semibold">
                    {new Date(selectedCycle.publishDate).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <p className="font-semibold mb-2">Next Steps:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Configure subjects for each class</li>
                  <li>Set marks entry window to &quot;open&quot;</li>
                  <li>Teachers can start entering marks</li>
                  <li>Approve and publish batches as they complete</li>
                </ul>
              </div>

              <div className="mt-6 pt-6 border-t">
                <p className="font-semibold mb-3">Configure Subject Marks Setup</p>
                {editingSetupId && (
                  <div className="mb-3 p-2 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded flex items-center justify-between">
                    <span>You are editing an existing setup.</span>
                    <button type="button" onClick={handleCancelEdit} className="underline">
                      Cancel edit
                    </button>
                  </div>
                )}
                <form onSubmit={handleCreateSubjectSetup} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Class *</label>
                      <select
                        value={subjectSetupForm.classId}
                        onChange={(e) => setSubjectSetupForm({ ...subjectSetupForm, classId: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        required
                      >
                        <option value="">Select class</option>
                        {classes.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Teacher</label>
                      <select
                        value={subjectSetupForm.teacherId}
                        onChange={(e) => setSubjectSetupForm({ ...subjectSetupForm, teacherId: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Select teacher (optional)</option>
                        {teachers.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.name}{t.email ? ` (${t.email})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Subject *</label>
                      <select
                        value={subjectSetupForm.subjectId}
                        onChange={(e) => {
                          const nextSubjectId = e.target.value;
                          const selectedSubject = subjects.find((subject) => subject._id === nextSubjectId);
                          setSubjectSetupForm({
                            ...subjectSetupForm,
                            subjectId: nextSubjectId,
                            subjectName: nextSubjectId ? '' : subjectSetupForm.subjectName,
                          });
                          if (selectedSubject) {
                            setSuccess(`Selected subject: ${selectedSubject.name}`);
                          }
                        }}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Select subject from DB</option>
                        {subjects.map((subject) => (
                          <option key={subject._id} value={subject._id}>
                            {subject.name}{subject.code ? ` (${subject.code})` : ''}
                          </option>
                        ))}
                      </select>
                      <input
                        value={subjectSetupForm.subjectName}
                        onChange={(e) =>
                          setSubjectSetupForm({
                            ...subjectSetupForm,
                            subjectId: '',
                            subjectName: e.target.value,
                          })
                        }
                        className="w-full border rounded px-3 py-2 mt-2"
                        placeholder="Or type a new subject name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Full Marks</label>
                      <input
                        type="number"
                        min={1}
                        value={subjectSetupForm.fullMarks}
                        onChange={(e) => setSubjectSetupForm({ ...subjectSetupForm, fullMarks: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Pass Marks</label>
                      <input
                        type="number"
                        min={0}
                        value={subjectSetupForm.passMarks}
                        onChange={(e) => setSubjectSetupForm({ ...subjectSetupForm, passMarks: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Theory</label>
                      <input
                        type="number"
                        min={0}
                        value={subjectSetupForm.theory}
                        onChange={(e) => setSubjectSetupForm({ ...subjectSetupForm, theory: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">MCQ</label>
                      <input
                        type="number"
                        min={0}
                        value={subjectSetupForm.mcq}
                        onChange={(e) => setSubjectSetupForm({ ...subjectSetupForm, mcq: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Practical</label>
                      <input
                        type="number"
                        min={0}
                        value={subjectSetupForm.practical}
                        onChange={(e) => setSubjectSetupForm({ ...subjectSetupForm, practical: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Viva</label>
                      <input
                        type="number"
                        min={0}
                        value={subjectSetupForm.viva}
                        onChange={(e) => setSubjectSetupForm({ ...subjectSetupForm, viva: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Class Test</label>
                      <input
                        type="number"
                        min={0}
                        value={subjectSetupForm.classTest}
                        onChange={(e) => setSubjectSetupForm({ ...subjectSetupForm, classTest: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Attendance</label>
                      <input
                        type="number"
                        min={0}
                        value={subjectSetupForm.attendance}
                        onChange={(e) => setSubjectSetupForm({ ...subjectSetupForm, attendance: Number(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingSubjectSetup}
                      className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                    >
                      {savingSubjectSetup
                        ? (editingSetupId ? 'Updating...' : 'Saving...')
                        : (editingSetupId ? 'Update Subject Setup' : 'Save Subject Setup')}
                    </button>
                  </div>
                </form>
              </div>

              <div className="mt-6 pt-6 border-t">
                <p className="font-semibold mb-3">Saved Subject Setups</p>
                {subjectSetupLoadError && (
                  <p className="text-xs text-red-600 mb-2">{subjectSetupLoadError}</p>
                )}
                {subjectSetups.length === 0 ? (
                  <p className="text-xs text-gray-500">No subject setups created yet for this exam cycle.</p>
                ) : (
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-2 py-2 text-left">Class</th>
                          <th className="px-2 py-2 text-left">Subject</th>
                          <th className="px-2 py-2 text-left">Teacher</th>
                          <th className="px-2 py-2 text-left">Marks</th>
                          <th className="px-2 py-2 text-left">Components</th>
                          <th className="px-2 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectSetups.map((item) => (
                          <tr key={item._id} className="border-b">
                            <td className="px-2 py-2">{item.classId?.name || '-'}</td>
                            <td className="px-2 py-2">{item.subjectId?.name || '-'}</td>
                            <td className="px-2 py-2">
                              {item.teacherId?.name
                                ? `${item.teacherId.name}${item.teacherId.email ? ` (${item.teacherId.email})` : ''}`
                                : '-'}
                            </td>
                            <td className="px-2 py-2">{item.passMarks}/{item.fullMarks}</td>
                            <td className="px-2 py-2 text-gray-600">
                              T:{item.components?.theory || 0}, M:{item.components?.mcq || 0}, P:{item.components?.practical || 0}, V:{item.components?.viva || 0}, CT:{item.components?.classTest || 0}, A:{item.components?.attendance || 0}
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => handleEditSetup(item)}
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <ResultCardTemplateEditor
                examCycleId={selectedCycle._id}
                academicYear={selectedCycle.academicYear}
                subjects={subjects}
                subjectSetups={subjectSetups}
              />

              <ResultCardAssessmentEditor
                examCycleId={selectedCycle._id}
                subjectSetups={subjectSetups}
              />

              <ResultBatchManager examCycleId={selectedCycle._id} />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedCycle(null)}
                className="px-6 py-2 border rounded hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
