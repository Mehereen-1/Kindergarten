'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Mail, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';

interface ImportedTeacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  employeeId: string;
  qualification: string;
  subjects: string[];
  importedAt: string;
  passwordExpiry: string;
  firstLogin: string;
  profileUpdated: string;
  status: 'pending' | 'responded' | 'expired';
}

export default function ImportedTeachersManager() {
  const [teachers, setTeachers] = useState<ImportedTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/admin/teachers/imported');
      const data = await response.json();
      setTeachers(data.teachers);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleResendPassword = async (userId: string) => {
    setResending(userId);
    try {
      const response = await fetch('/api/admin/teachers/resend-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Password resent successfully');
        fetchTeachers(); // Refresh the list
      } else {
        alert(data.error || 'Failed to resend password');
      }
    } catch (error) {
      alert('Failed to resend password');
    } finally {
      setResending(null);
    }
  };

  const handleDeleteExpired = async () => {
    if (!confirm('Are you sure you want to delete all expired teachers who haven\'t responded?')) return;

    try {
      const response = await fetch('/api/admin/teachers/delete-expired', {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchTeachers(); // Refresh the list
      } else {
        alert(data.error || 'Failed to delete expired teachers');
      }
    } catch (error) {
      alert('Failed to delete expired teachers');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'responded':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'expired':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'responded':
        return 'Responded';
      case 'expired':
        return 'Expired';
      default:
        return 'Pending';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">📋 Manage Imported Teachers</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track status of recently imported teachers
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchTeachers}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={handleDeleteExpired}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg"
          >
            <Trash2 size={16} />
            Delete Expired
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {teachers.filter(t => t.status === 'pending').length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm">Responded</p>
          <p className="text-2xl font-bold text-green-600">
            {teachers.filter(t => t.status === 'responded').length}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm">Expired</p>
          <p className="text-2xl font-bold text-red-600">
            {teachers.filter(t => t.status === 'expired').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Name</th>
              <th className="border border-gray-300 p-2 text-left">Email</th>
              <th className="border border-gray-300 p-2 text-left">Employee ID</th>
              <th className="border border-gray-300 p-2 text-left">Status</th>
              <th className="border border-gray-300 p-2 text-left">Imported At</th>
              <th className="border border-gray-300 p-2 text-left">Expiry</th>
              <th className="border border-gray-300 p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr key={teacher.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2">{teacher.name}</td>
                <td className="border border-gray-300 p-2">{teacher.email}</td>
                <td className="border border-gray-300 p-2">{teacher.employeeId}</td>
                <td className="border border-gray-300 p-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(teacher.status)}
                    {getStatusText(teacher.status)}
                  </div>
                </td>
                <td className="border border-gray-300 p-2">
                  {new Date(teacher.importedAt).toLocaleDateString()}
                </td>
                <td className="border border-gray-300 p-2">
                  {teacher.passwordExpiry ? new Date(teacher.passwordExpiry).toLocaleDateString() : 'N/A'}
                </td>
                <td className="border border-gray-300 p-2">
                  {/* {teacher.status === 'expired' && ( */}
                    <button
                      onClick={() => handleResendPassword(teacher.id)}
                      disabled={resending === teacher.id}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:bg-gray-300"
                    >
                      <Mail size={14} />
                      {resending === teacher.id ? 'Sending...' : 'Resend'}
                    </button>
                  {/* )} */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {teachers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No imported teachers found in the last 30 days.
        </div>
      )}
    </div>
  );
}