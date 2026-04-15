'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, ClipboardList, LogIn, ShieldCheck, Users } from 'lucide-react';

export default function Homepage() {
  const featureCards = [
    {
      icon: ClipboardList,
      title: 'Attendance',
      description: 'Quick entry to daily check-in tools and reports.',
    },
    {
      icon: Users,
      title: 'Classes',
      description: 'View classrooms, rosters, and teacher activity in one place.',
    },
    {
      icon: ShieldCheck,
      title: 'Secure Access',
      description: 'Role-based sign-in for teachers, parents, and admins.',
    },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#f8f5ee] text-[#36392b]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#d7e7d5]/45 blur-3xl" />
        <div className="absolute top-20 right-0 h-80 w-80 rounded-full bg-[#eeefdd]/70 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 rounded-2xl bg-[#fafaeb]/90 px-3 py-2 shadow-[0_10px_30px_rgba(54,57,43,0.06)] backdrop-blur">
          <Image src="/logo_system.png" alt="KinderVision" width={180} height={58} className="h-10 w-auto object-contain sm:h-12" priority />
        </Link>

        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 rounded-full bg-[#5a685a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(90,104,90,0.22)] transition hover:bg-[#4e5c4e]"
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-10">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
          <div className="rounded-[2rem] border border-[#b9bba8]/20 bg-[#fafaeb]/90 p-6 shadow-[0_18px_50px_rgba(54,57,43,0.08)] backdrop-blur sm:p-8 lg:p-10">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#636656]">
              KinderVision Learning Center
            </p>
            <h1 className="max-w-xl text-4xl font-black tracking-[-0.03em] text-[#36392b] sm:text-5xl lg:text-6xl">
              A calm, simple entrance to the school portal.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#636656] sm:text-lg">
              The homepage now follows the same muted palette and rounded surfaces as the teacher panel, with only the actions people actually need.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5a685a] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(90,104,90,0.2)] transition hover:bg-[#4e5c4e]"
              >
                Open Sign In
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/teacher"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#b9bba8]/40 bg-white/70 px-6 py-3.5 text-sm font-semibold text-[#36392b] transition hover:bg-[#f4f5e4]"
              >
                Teacher Panel
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f4f5e4] p-4 shadow-[0_8px_20px_rgba(54,57,43,0.05)]">
                <BookOpen className="h-5 w-5 text-[#5a685a]" />
                <p className="mt-3 text-sm font-semibold text-[#36392b]">Focused access</p>
                <p className="mt-1 text-sm text-[#636656]">No extra marketing clutter.</p>
              </div>
              <div className="rounded-2xl bg-[#eeefdd] p-4 shadow-[0_8px_20px_rgba(54,57,43,0.05)]">
                <ClipboardList className="h-5 w-5 text-[#6b644b]" />
                <p className="mt-3 text-sm font-semibold text-[#36392b]">Teacher style</p>
                <p className="mt-1 text-sm text-[#636656]">Same palette and card feel.</p>
              </div>
              <div className="rounded-2xl bg-[#d7e7d5] p-4 shadow-[0_8px_20px_rgba(54,57,43,0.05)]">
                <ShieldCheck className="h-5 w-5 text-[#4e5c4e]" />
                <p className="mt-3 text-sm font-semibold text-[#36392b]">Secure login</p>
                <p className="mt-1 text-sm text-[#636656]">Direct entry by role.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[2rem] border border-[#b9bba8]/20 bg-[#fafaeb]/90 p-6 shadow-[0_18px_50px_rgba(54,57,43,0.08)] backdrop-blur sm:p-8 lg:p-10">
            <div>
              <div className="flex items-center justify-center rounded-[1.75rem] bg-[#f4f5e4] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <Image src="/logo_system.png" alt="KinderVision logo" width={520} height={280} className="h-auto w-full max-w-md object-contain" priority />
              </div>
              <div className="mt-6 rounded-2xl bg-white/70 p-5 shadow-[0_10px_24px_rgba(54,57,43,0.05)]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#636656]">Start here</p>
                <p className="mt-2 text-base leading-7 text-[#36392b]">
                  Use the sign-in flow to reach the correct panel. Teachers go to classroom tools, parents go to family updates, and administrators go to the dashboard.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {featureCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div key={card.title} className="rounded-2xl border border-[#b9bba8]/15 bg-[#f4f5e4] p-4 shadow-[0_8px_20px_rgba(54,57,43,0.05)]">
                    <Icon className="h-5 w-5 text-[#5a685a]" />
                    <p className="mt-3 text-sm font-semibold text-[#36392b]">{card.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[#636656]">{card.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}