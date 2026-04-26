"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type DatedRow = {
  createdAt?: string;
};

type EventRow = {
  startDate?: string;
  createdAt?: string;
};

type MonthlyPoint = {
  name: string;
  users: number;
  events: number;
};

const FinanceChart = () => {
  const [students, setStudents] = useState<DatedRow[]>([]);
  const [teachers, setTeachers] = useState<DatedRow[]>([]);
  const [parents, setParents] = useState<DatedRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    let isActive = true;

    const loadSeries = async () => {
      try {
        const [studentsRes, teachersRes, parentsRes, eventsRes] = await Promise.all([
          fetch('/api/admin/students'),
          fetch('/api/admin/teachers'),
          fetch('/api/admin/parents'),
          fetch('/api/admin/events?role=all'),
        ]);

        if (!studentsRes.ok || !teachersRes.ok || !parentsRes.ok || !eventsRes.ok) {
          throw new Error('Failed to load activity data');
        }

        const [studentsData, teachersData, parentsData, eventsData] = await Promise.all([
          studentsRes.json(),
          teachersRes.json(),
          parentsRes.json(),
          eventsRes.json(),
        ]);

        if (isActive) {
          setStudents(Array.isArray(studentsData?.students) ? studentsData.students : []);
          setTeachers(Array.isArray(teachersData?.teachers) ? teachersData.teachers : []);
          setParents(Array.isArray(parentsData?.parents) ? parentsData.parents : []);
          setEvents(Array.isArray(eventsData) ? eventsData : []);
        }
      } catch {
        if (isActive) {
          setStudents([]);
          setTeachers([]);
          setParents([]);
          setEvents([]);
        }
      }
    };

    loadSeries();

    return () => {
      isActive = false;
    };
  }, []);

  const data = useMemo<MonthlyPoint[]>(() => {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const points = labels.map((label) => ({ name: label, users: 0, events: 0 }));

    const increment = (isoDate: string | undefined, key: 'users' | 'events') => {
      if (!isoDate) return;
      const date = new Date(isoDate);
      if (Number.isNaN(date.getTime())) return;
      const month = date.getMonth();
      if (month < 0 || month > 11) return;
      points[month][key] += 1;
    };

    [...students, ...teachers, ...parents].forEach((row) => increment(row.createdAt, 'users'));
    events.forEach((row) => increment(row.startDate || row.createdAt, 'events'));

    return points;
  }, [students, teachers, parents, events]);

  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">System Growth</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tick={{ fill: "#4b5563" }}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis axisLine={false} tick={{ fill: "#4b5563" }} tickLine={false}  tickMargin={20}/>
          <Tooltip contentStyle={{ borderRadius: '10px', borderColor: '#d1d5db' }} />
          <Legend
            align="center"
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "10px", paddingBottom: "30px" }}
          />
          <Line
            type="monotone"
            dataKey="users"
            stroke="#2563eb"
            strokeWidth={3}
          />
          <Line type="monotone" dataKey="events" stroke="#7c3aed" strokeWidth={3}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinanceChart;
