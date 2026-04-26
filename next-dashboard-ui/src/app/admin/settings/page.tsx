'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type AdminMe = {
  id: string;
  email: string;
};

const controlPanelLinks = [
  {
    title: 'Sound Alerts',
    description: 'Monitor classroom sound anomaly alerts and review incident timelines.',
    href: '/admin/security-alerts',
  },
  {
    title: 'Exam Configuration',
    description: 'Set up exam cycles, subject setups, and grade publishing rules.',
    href: '/admin/exam-config',
  },
  {
    title: 'Results',
    description: 'Open result batches and printable report cards.',
    href: '/admin/results',
  },
  {
    title: 'Attendance Audit',
    description: 'Review manual and CCTV attendance changes.',
    href: '/admin/attendance-audit',
  },
  {
    title: 'Attendance Reports',
    description: 'Open the reporting view for attendance data.',
    href: '/admin/attendance-reports',
  },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/admin/me');
        if (!response.ok) {
          router.replace('/admin-login');
          return;
        }

        const data = await response.json();
        setAdmin(data?.admin || null);
      } catch {
        setProfileError('Unable to load admin profile.');
      } finally {
        setLoadingProfile(false);
      }
    };

    void loadProfile();
  }, [router]);

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data?.error || 'Failed to update password');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setPasswordMessage(data?.message || 'Password updated successfully.');
    } catch {
      setPasswordError('Unable to update password.');
    }
  };

  const handleChangeEmail = async (event: FormEvent) => {
    event.preventDefault();
    setEmailMessage('');
    setEmailError('');

    try {
      const response = await fetch('/api/admin/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
        setEmailError(data?.error || 'Failed to send email verification');
        return;
      }

      setEmailMessage(data?.message || 'Verification email sent.');
      setNewEmail('');
    } catch {
      setEmailError('Unable to request email change.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin-login');
  };

  const emailUpdated = searchParams.get('emailUpdated') === '1';

  if (loadingProfile) {
    return <main className="min-h-screen bg-[#f8fafc] p-6">Loading admin settings...</main>;
  }

  if (profileError) {
    return <main className="min-h-screen bg-[#f8fafc] p-6 text-red-700">{profileError}</main>;
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-8 text-[#0f172a]">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-[#cbd5e1] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#475569]">Admin Settings</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.02em]">Security and account controls</h1>
          <p className="mt-2 text-sm text-[#475569]">
            Signed in as: <strong>{admin?.email}</strong>
          </p>
          {emailUpdated ? (
            <p className="mt-4 rounded-xl bg-[#dcfce7] px-4 py-3 text-sm text-[#166534]">
              Email verified and updated successfully.
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[#dbe4ee] bg-white p-6 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
          <h2 className="text-xl font-bold">Control Panel</h2>
          <p className="mt-2 text-sm text-[#475569]">
            Keep the admin dashboard focused on statistics. Use these shortcuts when you want the management tools.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {controlPanelLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-[#dbe4ee] bg-[#f8fafc] p-4 transition hover:border-[#94a3b8] hover:bg-white"
              >
                <h3 className="text-base font-bold text-[#0f172a]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#475569]">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleChangePassword}
            className="rounded-3xl border border-[#dbe4ee] bg-white p-6 shadow-[0_18px_34px_rgba(15,23,42,0.05)]"
          >
            <h2 className="text-xl font-bold">Change Password</h2>
            <p className="mt-2 text-sm text-[#475569]">Update the current admin password.</p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#334155]">Current password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full rounded-2xl border border-[#cbd5e1] px-4 py-3 outline-none focus:border-[#475569]"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#334155]">New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-2xl border border-[#cbd5e1] px-4 py-3 outline-none focus:border-[#475569]"
                  required
                />
              </label>

              {passwordError ? <p className="text-sm text-[#b91c1c]">{passwordError}</p> : null}
              {passwordMessage ? <p className="text-sm text-[#166534]">{passwordMessage}</p> : null}

              <button
                type="submit"
                className="rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white"
              >
                Save Password
              </button>
            </div>
          </form>

          <form
            onSubmit={handleChangeEmail}
            className="rounded-3xl border border-[#dbe4ee] bg-white p-6 shadow-[0_18px_34px_rgba(15,23,42,0.05)]"
          >
            <h2 className="text-xl font-bold">Change Email</h2>
            <p className="mt-2 text-sm text-[#475569]">Send a verification link to the new admin email address.</p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#334155]">New email</span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  className="w-full rounded-2xl border border-[#cbd5e1] px-4 py-3 outline-none focus:border-[#475569]"
                  required
                />
              </label>

              {emailError ? <p className="text-sm text-[#b91c1c]">{emailError}</p> : null}
              {emailMessage ? <p className="text-sm text-[#166534]">{emailMessage}</p> : null}

              <button
                type="submit"
                className="rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white"
              >
                Send Verification
              </button>
            </div>
          </form>

          <section className="rounded-3xl border border-[#dbe4ee] bg-white p-6 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
            <h2 className="text-xl font-bold">Recovery Flow</h2>
            <p className="mt-2 text-sm text-[#475569]">
              Admin password recovery now works through the account email. If access is lost, start from the public admin recovery page and follow the reset link sent to that inbox.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/admin-request-reset"
                className="rounded-full border border-[#cbd5e1] px-4 py-2 text-sm font-semibold text-[#0f172a]"
              >
                Open Recovery Page
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-[#dbe4ee] bg-white p-6 shadow-[0_18px_34px_rgba(15,23,42,0.05)]">
            <h2 className="text-xl font-bold">Session</h2>
            <p className="mt-2 text-sm text-[#475569]">
              Use this when you are done managing the admin workspace.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push('/admin/dashboard')}
                className="rounded-full border border-[#cbd5e1] px-4 py-2 text-sm font-semibold text-[#0f172a]"
              >
                Back to Dashboard
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-[#e11d48] px-4 py-2 text-sm font-semibold text-white"
              >
                Logout
              </button>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
