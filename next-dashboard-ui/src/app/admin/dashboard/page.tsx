'use client';

import { useEffect, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import Announcements from '@/app/components/Announcements';
import AttendanceChart from '@/app/components/AttendanceChart';
import BulkImportXML from '@/app/components/BulkImportXML';
import CountChart from '@/app/components/CountChart';
import EventCalendar from '@/app/components/EventCalendar';
import FinanceChart from '@/app/components/FinanceChart';
import SubjectTeacherAssignment from '@/app/components/SubjectTeacherAssignment';
import UserCard from '@/app/components/UserCard';

type AdminTab =
  | 'overview'
  | 'import-teachers'
  | 'import-parents'
  | 'import-students'
  | 'assign-subjects';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [teacherCount, setTeacherCount] = useState<number | null>(null);
  const [parentCount, setParentCount] = useState<number | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadDashboardCounts = async () => {
      try {
        const [studentsResponse, teachersResponse, parentsResponse] = await Promise.all([
          fetch('/api/admin/students'),
          fetch('/api/admin/teachers'),
          fetch('/api/admin/parents'),
        ]);

        if (!studentsResponse.ok || !teachersResponse.ok || !parentsResponse.ok) {
          throw new Error('Failed to load dashboard counts');
        }

        const [studentsData, teachersData, parentsData] = await Promise.all([
          studentsResponse.json(),
          teachersResponse.json(),
          parentsResponse.json(),
        ]);

        const students = Array.isArray(studentsData?.students) ? studentsData.students : [];
        const teachers = Array.isArray(teachersData?.teachers) ? teachersData.teachers : [];
        const parents = Array.isArray(parentsData?.parents) ? parentsData.parents : [];

        if (isActive) {
          setStudentCount(students.length);
          setTeacherCount(teachers.length);
          setParentCount(parents.length);
        }
      } catch {
        if (isActive) {
          setStudentCount(null);
          setTeacherCount(null);
          setParentCount(null);
        }
      }
    };

    void loadDashboardCounts();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="p-4">
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-gray-300">
        <button
          onClick={() => setActiveTab('assign-subjects')}
          className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 font-medium transition ${
            activeTab === 'assign-subjects'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <FileSpreadsheet size={20} />
          Class-Subject-Teacher
        </button>
        <button
          onClick={() => setActiveTab('import-teachers')}
          className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 font-medium transition ${
            activeTab === 'import-teachers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <FileSpreadsheet size={20} />
          Import Teachers
        </button>
        <button
          onClick={() => setActiveTab('import-parents')}
          className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 font-medium transition ${
            activeTab === 'import-parents'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <FileSpreadsheet size={20} />
          Import Parents
        </button>
        <button
          onClick={() => setActiveTab('import-students')}
          className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 font-medium transition ${
            activeTab === 'import-students'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <FileSpreadsheet size={20} />
          Import Students
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex w-full flex-col gap-8 lg:w-2/3">
            <div className="flex flex-wrap justify-between gap-4">
              <UserCard type="student" count={studentCount} />
              <UserCard type="teacher" count={teacherCount} />
              <UserCard type="parent" count={parentCount} />
            </div>

            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="h-[450px] w-full lg:w-1/3">
                <CountChart />
              </div>
              <div className="h-[450px] w-full lg:w-2/3">
                <AttendanceChart />
              </div>
            </div>

            <div className="h-[500px] w-full">
              <FinanceChart />
            </div>
          </div>

          <div className="flex w-full flex-col gap-8 lg:w-1/3">
            <EventCalendar />
            <Announcements />
          </div>
        </div>
      )}

      {activeTab === 'assign-subjects' && <SubjectTeacherAssignment />}
      {activeTab === 'import-teachers' && <BulkImportXML type="teachers" />}
      {activeTab === 'import-parents' && <BulkImportXML type="parents" />}
      {activeTab === 'import-students' && <BulkImportXML type="students" />}
    </div>
  );
}
