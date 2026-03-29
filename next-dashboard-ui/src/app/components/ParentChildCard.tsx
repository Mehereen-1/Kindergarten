"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ChildRecord {
  _id: string;
  name: string;
  currentClass?: {
    _id?: string;
    name?: string;
    classId?: string;
    grade?: string;
  } | null;
  academicYear?: string;
  rollNo?: string | null;
}

interface SubjectRecord {
  _id: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  teacherName?: string;
  teacherEmail?: string;
  academicYear?: string;
}

const ParentChildCard = () => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 7 }, (_, index) => String(currentYear - 3 + index)),
    [currentYear]
  );

  const [academicYear, setAcademicYear] = useState(String(currentYear));
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  useEffect(() => {
    const parentId = user?.id;
    if (!parentId) {
      setLoading(false);
      return;
    }

    const loadChildren = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/parent/children?parentId=${parentId}&academicYear=${academicYear}`);
        const data = await response.json();
        const nextChildren = Array.isArray(data?.children) ? data.children : [];
        setChildren(nextChildren);

        if (!nextChildren.length) {
          setSelectedChildId('');
          return;
        }

        const stillExists = nextChildren.some((child: ChildRecord) => child._id === selectedChildId);
        if (!selectedChildId || !stillExists) {
          setSelectedChildId(nextChildren[0]._id);
        }
      } catch {
        setChildren([]);
        setSelectedChildId('');
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, [user?.id, academicYear, selectedChildId]);

  const selectedChild = children.find((child) => child._id === selectedChildId) || children[0] || null;

  useEffect(() => {
    const classId = selectedChild?.currentClass?._id;
    if (!classId) {
      setSubjects([]);
      return;
    }

    const loadSubjects = async () => {
      try {
        setSubjectsLoading(true);
        const response = await fetch(`/api/parent/class-subjects?classId=${classId}&academicYear=${academicYear}`);
        const data = await response.json();
        setSubjects(Array.isArray(data?.data) ? data.data : []);
      } catch {
        setSubjects([]);
      } finally {
        setSubjectsLoading(false);
      }
    };

    loadSubjects();
  }, [selectedChild?._id, selectedChild?.currentClass?._id, academicYear]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md hover:shadow-lg transition-all duration-500 group animate-in fade-in slide-in-from-left-5 duration-700">
      {/* Header */}
      <div className="h-24 bg-blue-600 px-6 py-4 flex items-start justify-end gap-3">
        <select
          value={academicYear}
          onChange={(event) => setAcademicYear(event.target.value)}
          className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          {yearOptions.map((yearOption) => (
            <option key={yearOption} value={yearOption}>
              Year {yearOption}
            </option>
          ))}
        </select>
        <select
          value={selectedChild?._id || ''}
          onChange={(event) => setSelectedChildId(event.target.value)}
          className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          disabled={children.length === 0}
        >
          {children.length === 0 ? (
            <option value="">No child</option>
          ) : (
            children.map((child) => (
              <option key={child._id} value={child._id}>
                {child.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Content */}
      <div className="px-8 py-6 relative -mt-12">
        <div className="flex items-start gap-6">
          {/* Child Avatar */}
          <div className="w-24 h-24 rounded-2xl bg-blue-100 flex items-center justify-center text-6xl shadow-md group-hover:scale-110 transition-transform">
            👦
          </div>

          {/* Child Info */}
          <div className="flex-1 pt-2">
            <h3 className="text-3xl font-black text-slate-900 drop-shadow-sm">
              {selectedChild?.name || 'No child selected'}
            </h3>
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Class Name</p>
                  <p className="text-lg font-bold text-blue-600">
                    {selectedChild?.currentClass?.name || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Roll No</p>
                  <p className="text-lg font-bold text-blue-600">{selectedChild?.rollNo || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Academic Year</p>
                  <p className="text-lg font-bold text-blue-600">{academicYear}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Class Section</p>
                  <p className="text-lg font-bold text-blue-600">
                    {selectedChild?.currentClass?.classId || selectedChild?.currentClass?.grade || '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                Subjects ({academicYear}) - {selectedChild?.currentClass?.name || 'No Class'}
              </p>
              {subjectsLoading ? (
                <p className="text-sm text-slate-500">Loading subjects...</p>
              ) : subjects.length === 0 ? (
                <p className="text-sm text-slate-500">No subjects assigned for this class and year.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject) => (
                    <span
                      key={subject._id}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold"
                      title={subject.teacherEmail || subject.teacherName || ''}
                    >
                      {subject.subjectName}
                      {subject.teacherName ? ` - ${subject.teacherName}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="text-right">
            <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-110 transition-transform">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-sm font-bold text-green-600 mt-2">
              {loading ? 'Loading...' : selectedChild?.currentClass ? 'Class Assigned' : 'No Class Found'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentChildCard;
