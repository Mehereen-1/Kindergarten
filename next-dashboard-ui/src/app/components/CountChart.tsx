"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from "recharts";

type StudentRow = {
  sex?: string;
};

const CountChart = () => {
  const [students, setStudents] = useState<StudentRow[]>([]);

  useEffect(() => {
    let isActive = true;

    const loadStudents = async () => {
      try {
        const response = await fetch('/api/admin/students');
        if (!response.ok) {
          throw new Error('Failed to fetch students');
        }

        const data = await response.json();
        const rows = Array.isArray(data?.students) ? data.students : [];

        if (isActive) {
          setStudents(rows);
        }
      } catch {
        if (isActive) {
          setStudents([]);
        }
      }
    };

    loadStudents();

    return () => {
      isActive = false;
    };
  }, []);

  const { boys, girls, total } = useMemo(() => {
    const counts = students.reduce(
      (acc, student) => {
        const sex = String(student.sex || '').trim().toLowerCase();
        if (sex === 'male' || sex === 'boy') acc.boys += 1;
        else if (sex === 'female' || sex === 'girl') acc.girls += 1;
        return acc;
      },
      { boys: 0, girls: 0 }
    );

    return {
      ...counts,
      total: students.length,
    };
  }, [students]);

  const chartData = [
    { name: 'Total', count: total, fill: '#e5e7eb' },
    { name: 'Girls', count: girls, fill: '#f59e0b' },
    { name: 'Boys', count: boys, fill: '#2563eb' },
  ];

  const boysPct = total > 0 ? Math.round((boys / total) * 100) : 0;
  const girlsPct = total > 0 ? Math.round((girls / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      {/* TITLE */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Students</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      {/* CHART */}
      <div className="relative w-full h-[75%]">
        <ResponsiveContainer>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="100%"
            barSize={32}
            data={chartData}
          >
            <RadialBar background dataKey="count" />
          </RadialBarChart>
        </ResponsiveContainer>
        <Image
          src="/maleFemale.png"
          alt=""
          width={50}
          height={50}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        />
      </div>
      {/* BOTTOM */}
      <div className="flex justify-center gap-16">
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-[#2563eb] rounded-full" />
          <h1 className="font-bold">{boys.toLocaleString('en-US')}</h1>
          <h2 className="text-xs text-gray-600">Boys ({boysPct}%)</h2>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-[#f59e0b] rounded-full" />
          <h1 className="font-bold">{girls.toLocaleString('en-US')}</h1>
          <h2 className="text-xs text-gray-600">Girls ({girlsPct}%)</h2>
        </div>
      </div>
    </div>
  );
};

export default CountChart;
