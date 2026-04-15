'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Mail, Lock } from 'lucide-react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store user info in cookies
        const userCookie = JSON.stringify({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
        });

        document.cookie = `user=${encodeURIComponent(userCookie)}; path=/; max-age=${60 * 60 * 24 * 7}`;
        document.cookie = `userRole=${data.user.role}; path=/; max-age=${60 * 60 * 24 * 7}`;

        // Check if user needs to change password (first login)
        if (data.redirectToChangePassword) {
          router.push(`/change-password?userId=${data.user.id}&firstLogin=true`);
          return;
        }

        // Redirect based on role
        switch (data.user.role) {
          case 'admin':
            router.push('/dashboard/admin');
            break;
          case 'teacher':
            router.push('/teacher');
            break;
          case 'parent':
            router.push('/parent');
            break;
          default:
            router.push('/dashboard');
        }
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#36392b]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#d7e7d5]/45 blur-3xl" />
        <div className="absolute top-20 right-0 h-80 w-80 rounded-full bg-[#eeefdd]/70 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <section className="flex flex-col justify-between rounded-[2rem] border border-[#b9bba8]/20 bg-[#fafaeb]/90 p-6 shadow-[0_18px_50px_rgba(54,57,43,0.08)] backdrop-blur sm:p-8 lg:p-10">
            <div>
              <div className="inline-flex rounded-2xl bg-white/70 p-3 shadow-[0_10px_24px_rgba(54,57,43,0.05)]">
                <Image src="/logo_system.png" alt="KinderVision" width={220} height={72} className="h-12 w-auto object-contain sm:h-14" priority />
              </div>

              <div className="mt-8 max-w-xl">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#636656]">
                  Secure Portal
                </p>
                <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-[#36392b] sm:text-5xl lg:text-6xl">
                  Sign in with a clean, simple flow.
                </h1>
                <p className="mt-5 text-base leading-7 text-[#636656] sm:text-lg">
                  Use your school account to reach the correct panel. Teachers, parents, and administrators all enter from the same focused screen.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f4f5e4] p-4 shadow-[0_8px_20px_rgba(54,57,43,0.05)]">
                <p className="text-sm font-semibold text-[#36392b]">Teacher panel</p>
                <p className="mt-1 text-sm text-[#636656]">Attendance, classes, and reports.</p>
              </div>
              <div className="rounded-2xl bg-[#eeefdd] p-4 shadow-[0_8px_20px_rgba(54,57,43,0.05)]">
                <p className="text-sm font-semibold text-[#36392b]">Parent access</p>
                <p className="mt-1 text-sm text-[#636656]">Updates and communication.
                </p>
              </div>
              <div className="rounded-2xl bg-[#d7e7d5] p-4 shadow-[0_8px_20px_rgba(54,57,43,0.05)]">
                <p className="text-sm font-semibold text-[#36392b]">Admin access</p>
                <p className="mt-1 text-sm text-[#636656]">Overview and management tools.</p>
              </div>
            </div>
          </section>

          <section className="flex items-center rounded-[2rem] border border-[#b9bba8]/20 bg-[#fafaeb]/90 p-6 shadow-[0_18px_50px_rgba(54,57,43,0.08)] backdrop-blur sm:p-8 lg:p-10">
            <div className="w-full">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5a685a] text-white shadow-[0_10px_24px_rgba(90,104,90,0.2)]">
                  <LogIn className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#636656]">Welcome back</p>
                  <h2 className="text-2xl font-black tracking-[-0.02em] text-[#36392b]">Sign in to continue</h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#36392b]">Email Address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#636656]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-[#b9bba8]/30 bg-white/80 py-3.5 pl-11 pr-4 text-[#36392b] outline-none transition placeholder:text-[#8d907f] focus:border-[#5a685a] focus:bg-white"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#36392b]">Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#636656]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-[#b9bba8]/30 bg-white/80 py-3.5 pl-11 pr-12 text-[#36392b] outline-none transition placeholder:text-[#8d907f] focus:border-[#5a685a] focus:bg-white"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#636656] transition hover:bg-[#f4f5e4] hover:text-[#36392b]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-[#d9b2a8] bg-[#fff6f3] px-4 py-3 text-sm text-[#8a3d2d]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5a685a] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(90,104,90,0.2)] transition hover:bg-[#4e5c4e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              <p className="mt-6 rounded-2xl bg-[#f4f5e4] px-4 py-3 text-sm leading-6 text-[#636656]">
                New teachers: use the auto-generated password from your welcome email.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}