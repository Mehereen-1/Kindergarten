'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProfileView from '@/app/components/ProfileView';
import { useRouter } from 'next/navigation';
import { Search, Eye, Edit2, Trash2 } from 'lucide-react';

interface UserProfile {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'parent';
  phone?: string;
  address?: string;
  bloodGroup?: string;
}

export default function AdminProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'myProfile' | 'manageUsers' | 'manageStudents'>('myProfile');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'manageUsers') {
      fetchAllUsers();
    } else if (activeTab === 'manageStudents') {
      fetchAllStudents();
    }
  }, [activeTab]);

  const fetchAllUsers = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching users...');
      const response = await fetch('/api/admin/users');
      
      console.log('Users API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users data received:', data);
        setAllUsers(data.users || []);
        setFilteredUsers(data.users || []);
      } else {
        const error = await response.text();
        console.error('Failed to fetch users. Status:', response.status, 'Error:', error);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllStudents = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching students...');
      const response = await fetch('/api/admin/students');
      
      console.log('Students API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Students data received:', data);
        setAllStudents(data.students || []);
        setFilteredStudents(data.students || []);
      } else {
        const error = await response.text();
        console.error('Failed to fetch students. Status:', response.status, 'Error:', error);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      if (activeTab === 'manageUsers') {
        setFilteredUsers(allUsers);
      } else {
        setFilteredStudents(allStudents);
      }
      return;
    }

    const lowerQuery = query.toLowerCase();
    
    if (activeTab === 'manageUsers') {
      const filtered = allUsers.filter(
        user =>
          user.name.toLowerCase().includes(lowerQuery) ||
          user.email.toLowerCase().includes(lowerQuery) ||
          user._id.includes(query)
      );
      setFilteredUsers(filtered);
    } else {
      const filtered = allStudents.filter(
        student =>
          student.name.toLowerCase().includes(lowerQuery) ||
          student.email?.toLowerCase().includes(lowerQuery) ||
          student.grade?.toLowerCase().includes(lowerQuery) ||
          student.roll?.includes(query) ||
          student._id.includes(query)
      );
      setFilteredStudents(filtered);
    }
  };

  const handleViewProfile = (profileId: string) => {
    setSelectedUser(profileId);
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage your profile and view all users</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-gray-300">
          <button
            onClick={() => {
              setActiveTab('myProfile');
              setSelectedUser('');
              setSelectedStudent('');
            }}
            className={`px-4 py-3 font-medium transition border-b-2 ${
              activeTab === 'myProfile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            My Profile
          </button>
          <button
            onClick={() => {
              setActiveTab('manageUsers');
              setSelectedUser('');
              setSelectedStudent('');
            }}
            className={`px-4 py-3 font-medium transition border-b-2 ${
              activeTab === 'manageUsers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Manage Users
          </button>
          <button
            onClick={() => {
              setActiveTab('manageStudents');
              setSelectedUser('');
              setSelectedStudent('');
            }}
            className={`px-4 py-3 font-medium transition border-b-2 ${
              activeTab === 'manageStudents'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Manage Students
          </button>
        </div>

        {/* My Profile Tab */}
        {activeTab === 'myProfile' && (
          <div>
            <ProfileView userId={userId} />
          </div>
        )}

        {/* Manage Users Tab */}
        {activeTab === 'manageUsers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Users List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                {/* Search */}
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search by name, email..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Users List */}
                <div className="max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center">
                      <div className="inline-block animate-spin">
                        <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full"></div>
                      </div>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No users found
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <button
                          key={user._id}
                          onClick={() => handleViewProfile(user._id)}
                          className={`w-full p-4 text-left transition border-l-4 ${
                            selectedUser === user._id
                              ? 'bg-blue-50 border-l-blue-600'
                              : 'border-l-transparent hover:bg-gray-50'
                          }`}
                        >
                          <p className="font-semibold text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-xs text-gray-500 capitalize mt-1">
                            {user.role}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile View */}
            <div className="lg:col-span-2">
              {selectedUser ? (
                <ProfileView targetId={selectedUser} userId={userId} />
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-600 text-lg">
                    Select a user from the list to view their profile
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manage Students Tab */}
        {activeTab === 'manageStudents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Students List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                {/* Search */}
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search by name, grade..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Students List */}
                <div className="max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center">
                      <div className="inline-block animate-spin">
                        <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full"></div>
                      </div>
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No students found
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredStudents.map((student) => (
                        <button
                          key={student._id}
                          onClick={() => setSelectedStudent(student._id)}
                          className={`w-full p-4 text-left transition border-l-4 ${
                            selectedStudent === student._id
                              ? 'bg-blue-50 border-l-blue-600'
                              : 'border-l-transparent hover:bg-gray-50'
                          }`}
                        >
                          <p className="font-semibold text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.email}</p>
                          <div className="text-xs text-gray-500 mt-1 flex gap-2">
                            {student.grade && <span>Grade: {student.grade}</span>}
                            {student.roll && <span>Roll: {student.roll}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Student Profile View */}
            <div className="lg:col-span-2">
              {selectedStudent ? (
                <ProfileView childId={selectedStudent} userId={userId} profileType="student" />
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-600 text-lg">
                    Select a student from the list to view their profile
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
