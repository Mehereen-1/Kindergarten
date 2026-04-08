"use client";

import { useEffect, useState } from "react";

interface ExportFileItem {
  filename: string;
  size: number;
  modified_at: string;
}

interface AttendanceReportsPanelProps {
  title: string;
  subtitle: string;
}

const BACKEND_BASE = "http://localhost:8000";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function AttendanceReportsPanel({ title, subtitle }: AttendanceReportsPanelProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [dailyFiles, setDailyFiles] = useState<ExportFileItem[]>([]);
  const [monthlyFiles, setMonthlyFiles] = useState<ExportFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadFiles = async () => {
    try {
      const [dailyRes, monthlyRes] = await Promise.all([
        fetch(`${BACKEND_BASE}/export/files?kind=daily`, { cache: "no-store" }),
        fetch(`${BACKEND_BASE}/export/files?kind=monthly`, { cache: "no-store" }),
      ]);

      const dailyData = await dailyRes.json();
      const monthlyData = await monthlyRes.json();

      setDailyFiles(Array.isArray(dailyData?.files) ? dailyData.files : []);
      setMonthlyFiles(Array.isArray(monthlyData?.files) ? monthlyData.files : []);
    } catch (error) {
      setMessage(`Could not load exported files: ${String(error)}`);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const exportDaily = async () => {
    setLoading(true);
    setMessage("");
    try {
      const url = `${BACKEND_BASE}/export/daily?date=${encodeURIComponent(date)}`;
      window.open(url, "_blank");
      setMessage(`Daily report requested for ${date}.`);
      setTimeout(loadFiles, 1200);
    } catch (error) {
      setMessage(`Daily export failed: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const exportMonthly = async () => {
    setLoading(true);
    setMessage("");
    try {
      const url = `${BACKEND_BASE}/export/monthly?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`;
      window.open(url, "_blank");
      setMessage(`Monthly report requested for ${year}-${month}.`);
      setTimeout(loadFiles, 1200);
    } catch (error) {
      setMessage(`Monthly export failed: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-white">
      <div className="p-6 lg:p-10 space-y-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900">{title}</h1>
          <p className="text-slate-600 mt-2">{subtitle}</p>
        </div>

        {message && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Daily Export</h2>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2"
              />
              <button
                onClick={exportDaily}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                Export Daily Excel
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">File</th>
                    <th className="text-left px-3 py-2">Size</th>
                    <th className="text-left px-3 py-2">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyFiles.map((f) => (
                    <tr key={f.filename} className="border-t border-slate-100">
                      <td className="px-3 py-2">{f.filename}</td>
                      <td className="px-3 py-2">{formatBytes(f.size)}</td>
                      <td className="px-3 py-2">
                        <a
                          href={`${BACKEND_BASE}/export/download?filename=${encodeURIComponent(f.filename)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-700 font-semibold hover:underline"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                  {dailyFiles.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-slate-500" colSpan={3}>No daily export files yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Monthly Export</h2>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2"
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 w-24"
              />
              <button
                onClick={exportMonthly}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                Export Monthly Excel
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">File</th>
                    <th className="text-left px-3 py-2">Size</th>
                    <th className="text-left px-3 py-2">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyFiles.map((f) => (
                    <tr key={f.filename} className="border-t border-slate-100">
                      <td className="px-3 py-2">{f.filename}</td>
                      <td className="px-3 py-2">{formatBytes(f.size)}</td>
                      <td className="px-3 py-2">
                        <a
                          href={`${BACKEND_BASE}/export/download?filename=${encodeURIComponent(f.filename)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-700 font-semibold hover:underline"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                  {monthlyFiles.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-slate-500" colSpan={3}>No monthly export files yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
