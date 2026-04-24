'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

export default function AdminRequestResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Recovery request failed');
        return;
      }

      setMessage(data?.message || 'Recovery instructions sent.');
    } catch {
      setError('Unable to submit recovery request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f5ee] px-4 py-10 text-[#36392b]">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-[#d8d3b3] bg-[#fefdf1] p-8 shadow-[0_18px_50px_rgba(54,57,43,0.08)]">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6d7750]">Admin Recovery</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.03em]">Recover admin access</h1>
        <p className="mt-3 text-sm leading-6 text-[#636656]">
          Enter the admin email address. If the account exists, a secure setup or reset link will be sent there.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#36392b]">Admin email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-[#d8d3b3] bg-white px-4 py-3 outline-none focus:border-[#5a685a]"
              required
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-[#d9b2a8] bg-[#fff6f3] px-4 py-3 text-sm text-[#8a3d2d]">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-2xl border border-[#b7d7bf] bg-[#edf8ef] px-4 py-3 text-sm text-[#25613a]">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#5a685a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4e5c4e] disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send Recovery Email'}
          </button>
        </form>

        <div className="mt-5 text-sm">
          <Link href="/admin-login" className="font-semibold text-[#5a685a] hover:text-[#4e5c4e]">
            Back to admin login
          </Link>
        </div>
      </div>
    </main>
  );
}
