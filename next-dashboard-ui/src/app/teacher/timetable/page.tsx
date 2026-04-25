'use client';

import { useEffect, useMemo, useState } from 'react';
import TeacherTopBar from '@/app/components/TeacherTopBar';
import { useAuth } from '@/hooks/useAuth';

type TimetableEntry = {
  _id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string;
  notes?: string;
  classId?: {
    _id: string;
    name?: string;
    classId?: string;
    grade?: string;
  };
  subjectId?: {
    _id: string;
    name?: string;
    code?: string;
  };
};

type TimetableResponse = {
  academicYear: string;
  dayOptions: string[];
  entries: TimetableEntry[];
};

export default function TeacherTimetablePage() {
  const { user, loading: authLoading } = useAuth();
  const currentYear = String(new Date().getFullYear());
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [dayOptions, setDayOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    return [base - 1, base, base + 1].map(String);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      setError('Could not identify teacher account');
      return;
    }

    const loadTimetable = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(
          `/api/teacher/timetable?teacherId=${encodeURIComponent(user.id)}&academicYear=${encodeURIComponent(academicYear)}`,
          { cache: 'no-store' }
        );
        const data: TimetableResponse & { error?: string } = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load timetable');
        }

        setEntries(Array.isArray(data.entries) ? data.entries : []);
        setDayOptions(Array.isArray(data.dayOptions) ? data.dayOptions : []);
      } catch (err: any) {
        setEntries([]);
        setDayOptions([]);
        setError(err?.message || 'Failed to load timetable');
      } finally {
        setLoading(false);
      }
    };

    void loadTimetable();
  }, [user?.id, academicYear, authLoading]);

  const groupedEntries = useMemo(() => {
    const map = new Map<string, TimetableEntry[]>();
    for (const day of dayOptions) {
      map.set(day, []);
    }
    for (const entry of entries) {
      if (!map.has(entry.dayOfWeek)) {
        map.set(entry.dayOfWeek, []);
      }
      map.get(entry.dayOfWeek)?.push(entry);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [entries, dayOptions]);

  return (
    <>
      <TeacherTopBar />

      <main className="flex-1 bg-[#fff7d6]">
        <div className="p-5 lg:p-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#5f6843] uppercase tracking-wider">Schedule</p>
              <h1 className="text-3xl lg:text-4xl font-black text-[#3a3927]">My Timetable</h1>
              <p className="text-[#3a3927]/60 text-sm mt-1">Weekly class routine set by admin.</p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="teacher-timetable-year" className="text-xs font-semibold text-[#352f00]/70">
                Academic Year
              </label>
              <select
                id="teacher-timetable-year"
                value={academicYear}
                onChange={(event) => setAcademicYear(event.target.value)}
                className="border-2 border-[#5f6843]/70 rounded-full px-3 py-1.5 text-sm bg-[#fefade] text-[#3a3927] font-medium focus:outline-none focus:ring-2 focus:ring-[#5f6843]"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <div className="p-3 rounded-lg border-2 border-[#a14a2f]/30 bg-[#f5e7e2] text-[#8b3c25] text-sm">{error}</div>
          ) : null}

          {loading ? (
            <div className="text-center py-8 text-[#352f00]/50">Loading timetable...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-[#5f6843]/30 rounded-[32px_12px_24px_40px] text-[#3a3927]/60 bg-[#eaf0dd]">
              <p className="font-semibold">No timetable available</p>
              <p className="text-xs mt-1">No class schedule assigned for {academicYear}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {[...groupedEntries.entries()].map(([day, dayEntries]) => (
                <section
                  key={day}
                  className="rounded-3xl border border-[#5f6843]/25 bg-[#f8faef] shadow-[0_8px_22px_rgba(58,57,39,0.08)] overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-[#5f6843]/20 bg-gradient-to-r from-[#f2f7e3] via-[#edf4dc] to-[#f7faef]">
                    <h2 className="text-xl font-extrabold text-[#384128]">{day}</h2>
                    <p className="text-xs mt-1 text-[#4e5837]/80 font-medium">{dayEntries.length} class period(s)</p>
                  </div>

                  <div className="p-4 space-y-3">
                    {dayEntries.length ? (
                      dayEntries.map((entry) => (
                        <div key={entry._id} className="rounded-2xl border border-[#5f6843]/20 bg-white p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-[#384128]">
                              {entry.startTime} - {entry.endTime}
                            </p>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#edf3dd] text-[#51613e]">
                              {entry.classId?.name || 'Class'} {entry.classId?.classId ? `(${entry.classId.classId})` : ''}
                            </span>
                          </div>
                          <p className="text-sm mt-2 text-[#3d452c] font-semibold">
                            {entry.subjectId?.name || 'Subject'} {entry.subjectId?.code ? `(${entry.subjectId.code})` : ''}
                          </p>
                          <p className="text-xs mt-1 text-[#5a6442]">Room: {entry.room || 'Not set'}</p>
                          {entry.notes ? <p className="text-xs mt-1 text-[#4f5838]/80">Notes: {entry.notes}</p> : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#4f5838]/60 rounded-2xl border border-dashed border-[#5f6843]/25 bg-[#f3f7e6] px-3 py-4 text-center">
                        No classes scheduled.
                      </p>
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
