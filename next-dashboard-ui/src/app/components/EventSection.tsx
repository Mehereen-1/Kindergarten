"use client";

import { useEffect, useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

type ValuePiece = Date | null;
type CalendarValue = ValuePiece | [ValuePiece, ValuePiece];

type AppEvent = {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  location?: string;
  targetRole?: 'all' | 'teacher' | 'parent' | 'student';
};

type Props = {
  role: 'admin' | 'teacher' | 'parent';
  canManage: boolean;
  title: string;
};

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function EventSection({ role, canManage, title }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    startDate: formatDate(new Date()),
    endDate: formatDate(new Date()),
    targetRole: 'all',
    allDay: true,
  });

  const currentUser = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const userCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('user='));

    if (!userCookie) return null;

    try {
      return JSON.parse(decodeURIComponent(userCookie.substring(5)));
    } catch {
      return null;
    }
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events?role=${role}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load events');
      }

      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (error: any) {
      setMessage(error.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [role]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      startDate: formatDate(selectedDate),
      endDate: formatDate(selectedDate),
    }));
  }, [selectedDate]);

  const eventsForSelectedDate = events.filter((event) => {
    const d = new Date(event.startDate);
    return sameDay(d, selectedDate);
  });

  const eventDates = new Set(events.map((event) => new Date(event.startDate).toDateString()));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          createdBy: currentUser?.id,
          createdByRole: role,
          startDate: new Date(`${form.startDate}T09:00:00`).toISOString(),
          endDate: new Date(`${form.endDate}T17:00:00`).toISOString(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create event');
      }

      setForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        location: '',
      }));
      setMessage('Event created successfully.');
      fetchEvents();
    } catch (error: any) {
      setMessage(error.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setMessage('Please choose a PDF, CSV, XLS, or XLSX file.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const payload = new FormData();
      payload.append('file', importFile);
      payload.append('createdBy', currentUser?.id || '');
      payload.append('createdByRole', role);
      payload.append('targetRole', 'all');

      const response = await fetch('/api/events/import', {
        method: 'POST',
        body: payload,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import events');
      }

      setMessage(data.message || 'Import completed.');
      setImportFile(null);
      fetchEvents();
    } catch (error: any) {
      setMessage(error.message || 'Failed to import events');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunReminders = async () => {
    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/events/reminders/run', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run reminders');
      }

      setMessage(`Reminders processed. Created ${data.remindersCreated || 0} notices.`);
    } catch (error: any) {
      setMessage(error.message || 'Failed to run reminders');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;

    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete event');
      }

      setMessage('Event deleted.');
      fetchEvents();
    } catch (error: any) {
      setMessage(error.message || 'Failed to delete event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600 mt-1">
          Click a date to view events. {canManage ? 'You can create events and import annual calendars.' : 'You can view school-wide events.'}
        </p>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 text-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <Calendar
            value={selectedDate as CalendarValue}
            onChange={(value) => {
              const selected = Array.isArray(value) ? value[0] : value;
              if (selected) setSelectedDate(selected);
            }}
            tileContent={({ date }) => (
              eventDates.has(date.toDateString()) ? (
                <div className="flex justify-center mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                </div>
              ) : null
            )}
          />
        </div>

        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Events on {selectedDate.toDateString()}
          </h2>

          {loading ? (
            <p className="text-slate-500">Loading events...</p>
          ) : eventsForSelectedDate.length === 0 ? (
            <p className="text-slate-500">No events for this date.</p>
          ) : (
            <div className="space-y-3">
              {eventsForSelectedDate.map((event) => (
                <div key={event._id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-semibold text-slate-900">{event.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 uppercase">
                        {event.targetRole || 'all'}
                      </span>
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(event._id)}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {event.description ? <p className="text-sm text-slate-600 mt-2">{event.description}</p> : null}
                  {event.location ? <p className="text-xs text-slate-500 mt-2">Location: {event.location}</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {canManage ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Create Event</h3>

            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Event title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />

            <textarea
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2"
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                required
              />
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2"
                value={form.endDate}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </div>

            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Location (optional)"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            />

            <select
              className="w-full border rounded-lg px-3 py-2"
              value={form.targetRole}
              onChange={(e) => setForm((prev) => ({ ...prev, targetRole: e.target.value }))}
            >
              <option value="all">All users</option>
              <option value="teacher">Teachers only</option>
              <option value="parent">Parents only</option>
              <option value="student">Students only</option>
            </select>

            <button
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              type="submit"
            >
              {submitting ? 'Saving...' : 'Create Event'}
            </button>
          </form>

          <form onSubmit={handleImport} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Import Annual Calendar</h3>
            <p className="text-sm text-slate-600">Upload CSV, XLS/XLSX, or PDF to auto-create events.</p>

            <input
              type="file"
              accept=".csv,.xls,.xlsx,.pdf"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full border rounded-lg px-3 py-2"
            />

            <div className="flex flex-wrap gap-3">
              <button
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-black disabled:opacity-60"
                type="submit"
              >
                {submitting ? 'Importing...' : 'Import File'}
              </button>

              {role === 'admin' ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleRunReminders}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Run Reminder Job
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
