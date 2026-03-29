'use client';

import { useState, useEffect } from 'react';
import { Search, MessageCircle, Star, User as UserIcon } from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
  phone: string;
  isChildTeacher: boolean;
}

interface TeacherDirectoryProps {
  onSelectTeacher: (teacherId: string, teacherName: string) => void;
}

export default function TeacherDirectory({ onSelectTeacher }: TeacherDirectoryProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = teachers.filter(
        (teacher) =>
          teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          teacher.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTeachers(filtered);
    } else {
      setFilteredTeachers(teachers);
    }
  }, [searchQuery, teachers]);

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/parent/teachers');
      const data = await response.json();
      setTeachers(data.teachers);
      setFilteredTeachers(data.teachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading teachers...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Find Teachers</h2>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, subject, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Teachers List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {filteredTeachers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No teachers found matching your search.
          </div>
        ) : (
          filteredTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{teacher.name}</h3>
                      {teacher.isChildTeacher && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          <Star size={12} fill="currentColor" />
                          Your Childs Teacher
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Subject:</span> {teacher.subject}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Email:</span> {teacher.email}
                    </p>
                    {teacher.phone !== 'N/A' && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Phone:</span> {teacher.phone}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onSelectTeacher(teacher.id, teacher.name)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <MessageCircle size={16} />
                  Message
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
        Showing {filteredTeachers.length} of {teachers.length} teachers
      </div>
    </div>
  );
}
