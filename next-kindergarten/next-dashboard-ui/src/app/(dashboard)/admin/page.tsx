'use client';

import { useState } from 'react';
import Announcements from "@/app/components/Announcements";
import AttendanceChart from "@/app/components/AttendanceChart";
import CountChart from "@/app/components/CountChart";
import EventCalendar from "@/app/components/EventCalendar";
import FinanceChart from "@/app/components/FinanceChart";
import UserCard from "@/app/components/UserCard";
import BulkImport from "@/app/components/BulkImport";
import { FileSpreadsheet, BarChart3 } from 'lucide-react';

type AdminTab = 'dashboard' | 'import-teachers' | 'import-students';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  return (
    <div className="p-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-300">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 ${
            activeTab === 'dashboard'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <BarChart3 size={20} />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('import-teachers')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 ${
            activeTab === 'import-teachers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <FileSpreadsheet size={20} />
          Import Teachers
        </button>
        <button
          onClick={() => setActiveTab('import-students')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 ${
            activeTab === 'import-students'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <FileSpreadsheet size={20} />
          Import Students
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="flex gap-4 flex-col md:flex-row">
          {/* LEFT */}
          <div className="w-full lg:w-2/3 flex flex-col gap-8">
            {/* USER CARDS */}
            <div className="flex gap-4 justify-between flex-wrap">
              <UserCard type="student" />
              <UserCard type="teacher" />
              <UserCard type="parent" />
              <UserCard type="staff" />
            </div>
            {/* MIDDLE CHARTS */}
            <div className="flex gap-4 flex-col lg:flex-row">
              {/* COUNT CHART */}
              <div className="w-full lg:w-1/3 h-[450px]">
                <CountChart />
              </div>
              {/* ATTENDANCE CHART */}
              <div className="w-full lg:w-2/3 h-[450px]">
                <AttendanceChart />
              </div>
            </div>
            {/* BOTTOM CHART */}
            <div className="w-full h-[500px]">
              <FinanceChart />
            </div>
          </div>
          {/* RIGHT */}
          <div className="w-full lg:w-1/3 flex flex-col gap-8">
            <EventCalendar />
            <Announcements/>
          </div>
        </div>
      )}

      {/* Import Teachers Tab */}
      {activeTab === 'import-teachers' && (
        <BulkImport type="teachers" />
      )}

      {/* Import Students Tab */}
      {activeTab === 'import-students' && (
        <BulkImport type="students" />
      )}
    </div>
  );
};

export default AdminPage;