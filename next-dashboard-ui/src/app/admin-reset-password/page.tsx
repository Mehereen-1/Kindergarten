'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type ValidationState = 'loading' | 'valid' | 'invalid';

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [validationState, setValidationState] = useState<ValidationState>('loading');
  const [emailHint, setEmailHint] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidationState('invalid');
        return;
      }

      try {
        const response = await fetch(`/api/admin/reset?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data?.error || 'Invalid reset token');
          setValidationState('invalid');
          return;
        }

        setEmailHint(data?.email || '');
        setValidationState('valid');
      } catch {
        setError('Unable to validate reset token');
        setValidationState('invalid');
      }
    };

    void validateToken();
  }, [token]);

  const handleReset = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Reset failed');
        return;
      }

      router.replace('/admin-login?reset=1');
    } catch {
      setError('Unable to complete reset.');
    } finally {
      setLoading(false);
    }
  };

  if (validationState === 'loading') {
    return <main className="min-h-screen flex items-center justify-center bg-[#f8f5ee] text-[#36392b]">Validating reset link...</main>;
  }

  if (validationState === 'invalid') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f8f5ee] px-4 text-[#36392b]">
        <div className="max-w-lg rounded-[2rem] border border-[#d8d3b3] bg-[#fefdf1] p-8 text-center shadow-[0_18px_50px_rgba(54,57,43,0.08)]">
          <h1 className="text-2xl font-black">Reset link unavailable</h1>
          <p className="mt-3 text-sm text-[#636656]">{error || 'Invalid or expired reset token.'}</p>
          <Link href="/admin-request-reset" className="mt-5 inline-flex rounded-full bg-[#5a685a] px-4 py-2 text-sm font-semibold text-white">
            Request a New Link
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5ee] px-4 py-10 text-[#36392b]">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-[#d8d3b3] bg-[#fefdf1] p-8 shadow-[0_18px_50px_rgba(54,57,43,0.08)]">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6d7750]">Admin Reset</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.03em]">Set a new admin password</h1>
        <p className="mt-3 text-sm leading-6 text-[#636656]">
          Resetting password for <strong>{emailHint}</strong>.
        </p>

        <form onSubmit={handleReset} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#36392b]">New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-[#d8d3b3] bg-white px-4 py-3 outline-none focus:border-[#5a685a]"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#36392b]">Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-[#d8d3b3] bg-white px-4 py-3 outline-none focus:border-[#5a685a]"
              required
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-[#d9b2a8] bg-[#fff6f3] px-4 py-3 text-sm text-[#8a3d2d]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#5a685a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4e5c4e] disabled:opacity-60"
          >
            {loading ? 'Resetting Password...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </main>
  );
}
