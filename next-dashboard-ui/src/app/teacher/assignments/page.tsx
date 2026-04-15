'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import AssignmentHandwritingChecker from '@/app/components/AssignmentHandwritingChecker';
import Pagination from '@/app/components/Pagination';
import Table from '@/app/components/Table';
import TableSearch from '@/app/components/TableSearch';
import TeacherTopBar from '@/app/components/TeacherTopBar';

type Assignment = {
  _id: string;
  title: string;
  subject: string;
  className: string;
  dueDate?: string;
};

const columns = [
  {
    header: 'Assignment',
    accessor: 'title',
  },
  {
    header: 'Subject',
    accessor: 'subject',
  },
  {
    header: 'Class',
    accessor: 'className',
  },
  {
    header: 'Due Date',
    accessor: 'dueDate',
    className: 'hidden md:table-cell',
  },
  {
    header: 'Actions',
    accessor: 'action',
  },
];

export default function TeacherAssignmentListPage() {
  const [viewerRole, setViewerRole] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isTeacherOrAdmin = viewerRole === 'teacher' || viewerRole === 'admin';

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const roleCookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith('userRole='))
      ?.split('=')[1];

    if (roleCookie) {
      setViewerRole(decodeURIComponent(roleCookie));
      return;
    }

    const userCookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith('user='))
      ?.split('=')[1];

    if (userCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(userCookie));
        if (parsed?.role) setViewerRole(String(parsed.role));
      } catch {
        setViewerRole('');
      }
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/assignments', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to fetch assignments');
      }
      setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load assignments');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Delete this assignment?')) return;
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to delete assignment');
      }
      fetchAssignments();
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Failed to delete assignment');
    }
  };

  const renderRow = (item: Assignment) => (
    <tr
      key={item._id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-4 font-medium text-gray-900">{item.title}</td>
      <td className="flex items-center gap-4 p-4">{item.subject}</td>
      <td>{item.className}</td>
      <td className="hidden md:table-cell">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}</td>
      <td>
        <div className="flex items-center gap-2">
          {isTeacherOrAdmin ? (
            <button
              type="button"
              onClick={() => handleDelete(item._id)}
              className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-md hover:bg-rose-200"
            >
              Delete
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherTopBar />

      <div className="space-y-6 p-4 md:p-6">
        <AssignmentHandwritingChecker />

        <div className="bg-white p-4 rounded-md flex-1 m-0">
          <div className="flex items-center justify-between">
            <h1 className="hidden md:block text-lg font-semibold">All Assignments</h1>
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <TableSearch />
              <div className="flex items-center gap-4 self-end">
                <button
                  type="button"
                  onClick={fetchAssignments}
                  className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                >
                  Refresh
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                  <Image src="/filter.png" alt="" width={14} height={14} />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                  <Image src="/sort.png" alt="" width={14} height={14} />
                </button>
              </div>
            </div>
          </div>
          {error ? (
            <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          ) : null}
          <Table columns={columns} renderRow={renderRow} data={loading ? [] : assignments} />
          {loading ? <p className="text-sm text-gray-500 mt-3">Loading assignments...</p> : null}
          <Pagination />
        </div>
      </div>
    </div>
  );
}
