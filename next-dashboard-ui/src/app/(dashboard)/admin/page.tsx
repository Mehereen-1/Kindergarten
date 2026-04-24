'use client';

import { useEffect, useState } from 'react';
import { BarChart3, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import Announcements from '@/app/components/Announcements';
import AttendanceChart from '@/app/components/AttendanceChart';
import AdmissionIntakeImport from '@/app/components/AdmissionIntakeImport';
import BulkImportXML from '@/app/components/BulkImportXML';
import CountChart from '@/app/components/CountChart';
import EventCalendar from '@/app/components/EventCalendar';
import FinanceChart from '@/app/components/FinanceChart';
import ParentVerificationQueue from '@/app/components/ParentVerificationQueue';
import SubjectTeacherAssignment from '@/app/components/SubjectTeacherAssignment';
import UserCard from '@/app/components/UserCard';

type AdminTab =
  | 'dashboard'
  | 'assign-subjects'
  | 'import-teachers'
  | 'import-parents'
  | 'parent-verification'
  | 'admission-intake'
  | 'import-students';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [studentCount, setStudentCount] = useState<number | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadStudentCount = async () => {
      try {
        const response = await fetch('/api/admin/students');
        if (!response.ok) {
          throw new Error('Failed to load students');
        }
        const data = await response.json();
        const count = Array.isArray(data?.students) ? data.students.length : 0;
        if (isActive) {
          setStudentCount(count);
        }
      } catch {
        if (isActive) {
          setStudentCount(null);
        }
      }
    };

    loadStudentCount();

    return () => {
      isActive = false;
    };
  }, []);

  const tabClassName = (tab: AdminTab) =>
    `flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 whitespace-nowrap ${
      activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'
    }`;

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-6 border-b border-gray-300 overflow-x-auto">
        <button onClick={() => setActiveTab('dashboard')} className={tabClassName('dashboard')}>
          <BarChart3 size={20} />
          Dashboard
        </button>
        <button onClick={() => setActiveTab('assign-subjects')} className={tabClassName('assign-subjects')}>
          <FileSpreadsheet size={20} />
          Class-Subject-Teacher
        </button>
        <button onClick={() => setActiveTab('import-teachers')} className={tabClassName('import-teachers')}>
          <FileSpreadsheet size={20} />
          Import Teachers
        </button>
        <button onClick={() => setActiveTab('import-parents')} className={tabClassName('import-parents')}>
          <FileSpreadsheet size={20} />
          Import Parents
        </button>
        <button onClick={() => setActiveTab('parent-verification')} className={tabClassName('parent-verification')}>
          <ShieldCheck size={20} />
          Parent Verification
        </button>
        <button onClick={() => setActiveTab('admission-intake')} className={tabClassName('admission-intake')}>
          <FileSpreadsheet size={20} />
          Admission Intake
        </button>
        <button onClick={() => setActiveTab('import-students')} className={tabClassName('import-students')}>
          <FileSpreadsheet size={20} />
          Import Students
        </button>
      </div>

      {activeTab === 'assign-subjects' && <SubjectTeacherAssignment />}

      {activeTab === 'dashboard' && (
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="w-full lg:w-2/3 flex flex-col gap-8">
            <div className="flex gap-4 justify-between flex-wrap">
              <UserCard type="student" count={studentCount} />
              <UserCard type="teacher" />
              <UserCard type="parent" />
              <UserCard type="staff" />
            </div>

            <div className="flex gap-4 flex-col lg:flex-row">
              <div className="w-full lg:w-1/3 h-[450px]">
                <CountChart />
              </div>
              <div className="w-full lg:w-2/3 h-[450px]">
                <AttendanceChart />
              </div>
            </div>

            <div className="w-full h-[500px]">
              <FinanceChart />
            </div>
          </div>

          <div className="w-full lg:w-1/3 flex flex-col gap-8">
            <EventCalendar />
            <Announcements />
          </div>
        </div>
      )}

      {activeTab === 'import-teachers' && <BulkImportXML type="teachers" />}
      {activeTab === 'import-parents' && <BulkImportXML type="parents" />}
      {activeTab === 'parent-verification' && <ParentVerificationQueue />}
      {activeTab === 'admission-intake' && <AdmissionIntakeImport />}
      {activeTab === 'import-students' && <BulkImportXML type="students" />}
    </div>
  );
};

export default AdminPage;
