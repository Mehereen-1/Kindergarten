"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type AttendanceRecord = {
  date?: string;
  status?: string;
};

type AttendanceSeriesPoint = {
  name: string;
  present: number;
  absent: number;
};

const AttendanceChart = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    let isActive = true;

    const loadAttendance = async () => {
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6);

        const response = await fetch(
          `/api/teacher/attendance?from=${start.toISOString()}&to=${end.toISOString()}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch attendance');
        }

        const data = await response.json();
        if (isActive) {
          setRecords(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isActive) {
          setRecords([]);
        }
      }
    };

    loadAttendance();

    return () => {
      isActive = false;
    };
  }, []);

  const data = useMemo<AttendanceSeriesPoint[]>(() => {
    const labelFor = (day: Date) => day.toLocaleDateString('en-US', { weekday: 'short' });

    const days: Date[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(today);
      day.setHours(0, 0, 0, 0);
      day.setDate(today.getDate() - i);
      days.push(day);
    }

    const keyFor = (date: Date) => date.toISOString().slice(0, 10);
    const map = new Map<string, AttendanceSeriesPoint>(
      days.map((day) => [
        keyFor(day),
        {
          name: labelFor(day),
          present: 0,
          absent: 0,
        },
      ])
    );

    records.forEach((record) => {
      if (!record.date) return;
      const d = new Date(record.date);
      if (Number.isNaN(d.getTime())) return;
      const key = keyFor(d);
      const bucket = map.get(key);
      if (!bucket) return;

      const status = String(record.status || '').toLowerCase();
      if (status === 'present' || status === 'late') bucket.present += 1;
      else bucket.absent += 1;
    });

    return days.map((day) => map.get(keyFor(day)) as AttendanceSeriesPoint);
  }, [records]);

  return (
    <div className="bg-white rounded-lg p-4 h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Attendance</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart width={500} height={300} data={data} barSize={20}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddd" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
          />
          <YAxis axisLine={false} tick={{ fill: "#d1d5db" }} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
          />
          <Legend
            align="left"
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "20px", paddingBottom: "40px" }}
          />
          <Bar
            dataKey="present"
            fill="#FAE27C"
            legendType="circle"
            radius={[10, 10, 0, 0]}
          />
          <Bar
            dataKey="absent"
            fill="#C3EBFA"
            legendType="circle"
            radius={[10, 10, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AttendanceChart;