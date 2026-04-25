'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type SelectOption = {
  _id: string;
  name?: string;
  classId?: string;
  grade?: string;
  code?: string;
  email?: string;
};

type TimetableEntry = {
  _id: string;
  classId: SelectOption;
  subjectId: SelectOption;
  teacherId: SelectOption;
  academicYear: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string;
  notes?: string;
};

type TimetablePayload = {
  academicYear: string;
  entries: TimetableEntry[];
  classes: SelectOption[];
  subjects: SelectOption[];
  teachers: SelectOption[];
  dayOptions: string[];
};

const EMPTY_FORM = {
  classId: '',
  subjectId: '',
  teacherId: '',
  dayOfWeek: 'Monday',
  startTime: '08:00',
  endTime: '09:00',
  room: '',
  notes: '',
};

export default function AdminTimetablePage() {
  const currentYear = String(new Date().getFullYear());
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<SelectOption[]>([]);
  const [subjects, setSubjects] = useState<SelectOption[]>([]);
  const [teachers, setTeachers] = useState<SelectOption[]>([]);
  const [dayOptions, setDayOptions] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    return [base - 1, base, base + 1].map(String);
  }, []);

  const loadTimetable = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/admin/timetable?academicYear=${encodeURIComponent(academicYear)}`, {
        cache: 'no-store',
      });
      const data: TimetablePayload & { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load timetable');
      }

      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setClasses(Array.isArray(data.classes) ? data.classes : []);
      setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
      setDayOptions(Array.isArray(data.dayOptions) ? data.dayOptions : []);
      setForm((prev) => ({
        ...prev,
        dayOfWeek: data?.dayOptions?.[0] || prev.dayOfWeek,
      }));
    } catch (err: any) {
      setError(err?.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void loadTimetable();
  }, [loadTimetable]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, dayOfWeek: dayOptions[0] || 'Monday' });
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        ...form,
        academicYear,
      };
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...payload, id: editingId } : payload;

      const response = await fetch('/api/admin/timetable', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save timetable entry');
      }

      setMessage(editingId ? 'Timetable entry updated.' : 'Timetable entry created.');
      resetForm();
      await loadTimetable();
    } catch (err: any) {
      setError(err?.message || 'Failed to save timetable entry');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry: TimetableEntry) => {
    setEditingId(entry._id);
    setForm({
      classId: entry.classId?._id || '',
      subjectId: entry.subjectId?._id || '',
      teacherId: entry.teacherId?._id || '',
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room || '',
      notes: entry.notes || '',
    });
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this timetable entry?');
    if (!confirmed) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`/api/admin/timetable?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete timetable entry');
      }

      setMessage('Timetable entry deleted.');
      if (editingId === id) {
        resetForm();
      }
      await loadTimetable();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete timetable entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#fffdf6] border border-[#d6d2b5]/70 p-4 md:p-5 rounded-2xl flex-1 m-4 mt-0 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-[#6d7750]">Admin Panel</p>
          <h1 className="text-2xl font-black text-[#3a3927]">Timetable Management</h1>
          <p className="text-sm text-[#5a6142] mt-1">Create and maintain class schedule for teachers.</p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="academicYear" className="text-[#5a6142] font-medium">
            Academic Year
          </label>
          <select
            id="academicYear"
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            className="border border-[#c8c39d] bg-[#fefade] rounded px-2 py-1 text-[#3a3927]"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message ? (
        <div className="rounded-lg border border-[#39693e]/25 bg-[#e8f3e7] px-3 py-2 text-sm text-[#2a5c2f]">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-[#a14a2f]/30 bg-[#f5e7e2] px-3 py-2 text-sm text-[#8b3c25]">{error}</div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 border border-[#d6d2b5]/70 bg-[#fefade] rounded-xl p-3"
      >
        <select
          value={form.classId}
          onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))}
          className="border border-[#c8c39d] rounded px-2 py-2 text-sm bg-white"
          required
        >
          <option value="">Select Class</option>
          {classes.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name} {item.classId ? `(${item.classId})` : ''}
            </option>
          ))}
        </select>

        <select
          value={form.subjectId}
          onChange={(event) => setForm((prev) => ({ ...prev, subjectId: event.target.value }))}
          className="border border-[#c8c39d] rounded px-2 py-2 text-sm bg-white"
          required
        >
          <option value="">Select Subject</option>
          {subjects.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name} {item.code ? `(${item.code})` : ''}
            </option>
          ))}
        </select>

        <select
          value={form.teacherId}
          onChange={(event) => setForm((prev) => ({ ...prev, teacherId: event.target.value }))}
          className="border border-[#c8c39d] rounded px-2 py-2 text-sm bg-white"
          required
        >
          <option value="">Select Teacher</option>
          {teachers.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name || item.email || item._id}
            </option>
          ))}
        </select>

        <select
          value={form.dayOfWeek}
          onChange={(event) => setForm((prev) => ({ ...prev, dayOfWeek: event.target.value }))}
          className="border border-[#c8c39d] rounded px-2 py-2 text-sm bg-white"
          required
        >
          {dayOptions.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>

        <input
          type="time"
          value={form.startTime}
          onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
          className="border border-[#c8c39d] rounded px-2 py-2 text-sm bg-white"
          required
        />

        <input
          type="time"
          value={form.endTime}
          onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
          className="border border-[#c8c39d] rounded px-2 py-2 text-sm bg-white"
          required
        />

        <input
          type="text"
          value={form.room}
          placeholder="Room (optional)"
          onChange={(event) => setForm((prev) => ({ ...prev, room: event.target.value }))}
          className="border border-[#c8c39d] rounded px-2 py-2 text-sm bg-white"
        />

        <input
          type="text"
          value={form.notes}
          placeholder="Notes (optional)"
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          className="border border-[#c8c39d] rounded px-2 py-2 text-sm bg-white"
        />

        <div className="xl:col-span-4 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-[#5f6843] text-white text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving...' : editingId ? 'Update Entry' : 'Add Entry'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded border border-[#c8c39d] bg-white text-sm font-semibold text-[#4f5838]"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      {loading ? (
        <div className="py-8 text-center text-[#5a6142]">Loading timetable...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#d6d2b5]/70">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-[#f5efd8] text-[#3a3927]">
              <tr>
                <th className="text-left px-3 py-2">Day</th>
                <th className="text-left px-3 py-2">Time</th>
                <th className="text-left px-3 py-2">Class</th>
                <th className="text-left px-3 py-2">Subject</th>
                <th className="text-left px-3 py-2">Teacher</th>
                <th className="text-left px-3 py-2">Room</th>
                <th className="text-left px-3 py-2">Notes</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length ? (
                entries.map((entry) => (
                  <tr key={entry._id} className="border-t border-[#ece9d4]">
                    <td className="px-3 py-2">{entry.dayOfWeek}</td>
                    <td className="px-3 py-2">
                      {entry.startTime} - {entry.endTime}
                    </td>
                    <td className="px-3 py-2">
                      {entry.classId?.name} {entry.classId?.classId ? `(${entry.classId.classId})` : ''}
                    </td>
                    <td className="px-3 py-2">
                      {entry.subjectId?.name} {entry.subjectId?.code ? `(${entry.subjectId.code})` : ''}
                    </td>
                    <td className="px-3 py-2">{entry.teacherId?.name || entry.teacherId?.email || '-'}</td>
                    <td className="px-3 py-2">{entry.room || '-'}</td>
                    <td className="px-3 py-2">{entry.notes || '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(entry)}
                          className="px-2 py-1 rounded border border-[#bfc58f] text-[#4f5838] text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry._id)}
                          className="px-2 py-1 rounded border border-[#c78374] text-[#8b3c25] text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center px-3 py-8 text-[#5a6142]">
                    No timetable entries for {academicYear}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
