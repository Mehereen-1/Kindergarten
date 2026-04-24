'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const infoMessage = useMemo(() => {
    if (searchParams.get('setup') === '1') {
      return 'Setup complete. Sign in with the password you just created.';
    }
    if (searchParams.get('reset') === '1') {
      return 'Password reset complete. Sign in with your new password.';
    }
    return '';
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Failed to login');
        return;
      }

      router.push('/admin/dashboard');
    } catch {
      setError('Unable to complete login. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f5ee] px-4 py-10 text-[#36392b]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-[2rem] border border-[#d8d3b3] bg-[#fefdf1] p-8 shadow-[0_18px_50px_rgba(54,57,43,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6d7750]">Admin Access</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-[#36392b]">Dedicated admin sign in</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#636656]">
              Admin authentication stays outside the panel itself. Complete setup from email, then use this page for normal sign-in and recovery.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f4f5e4] p-4">
                <p className="text-sm font-semibold text-[#36392b]">First-time setup</p>
                <p className="mt-1 text-sm text-[#636656]">Use the secure email link to create your password.</p>
              </div>
              <div className="rounded-2xl bg-[#eeefdd] p-4">
                <p className="text-sm font-semibold text-[#36392b]">Password recovery</p>
                <p className="mt-1 text-sm text-[#636656]">Recovery now works through email instead of security questions.</p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#d8d3b3] bg-[#fefdf1] p-8 shadow-[0_18px_50px_rgba(54,57,43,0.08)]">
            <h2 className="text-2xl font-black tracking-[-0.02em] text-[#36392b]">Admin Login</h2>
            <p className="mt-2 text-sm text-[#636656]">Use your admin email and password.</p>

            {infoMessage ? (
              <div className="mt-5 rounded-2xl border border-[#b7d7bf] bg-[#edf8ef] px-4 py-3 text-sm text-[#25613a]">
                {infoMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#36392b]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-[#d8d3b3] bg-white px-4 py-3 outline-none focus:border-[#5a685a]"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#36392b]">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Link href="/admin-request-reset" className="font-semibold text-[#5a685a] hover:text-[#4e5c4e]">
                Forgot admin password?
              </Link>
              <Link href="/sign-in" className="font-semibold text-[#5a685a] hover:text-[#4e5c4e]">
                Teacher / Parent sign in
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
