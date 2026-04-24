"use client";

import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import ParentTopBar from "@/app/components/ParentTopBar";
import ParentDashboardCards from "@/app/components/ParentDashboardCards";
import ParentChildCard from "@/app/components/ParentChildCard";
import ParentAttendanceCard from "@/app/components/ParentAttendanceCard";
import ParentNoticesCard from "@/app/components/ParentNoticesCard";
import ParentMessagesCard from "@/app/components/ParentMessagesCard";

export default function ParentDashboard() {
  return (
    <>
      <ParentTopBar />

      <main className="flex-1 overflow-y-auto bg-white">
        <div className="p-6 lg:p-10">
          <div className="mb-8 animate-in fade-in slide-in-from-top-5 duration-700">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Welcome Back,</p>
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 leading-tight">Parent Portal</h1>
            <p className="text-slate-600 text-lg font-medium max-w-2xl mt-3">
              Stay connected with your child&apos;s school journey and document verification status.
            </p>
          </div>

          <div className="mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="rounded-[28px] border border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-amber-50 shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                      Document Verification
                    </p>
                    <h2 className="text-2xl font-black text-slate-900 mt-1">
                      Upload parent NID and child birth certificate
                    </h2>
                    <p className="text-sm text-slate-600 mt-2 max-w-3xl">
                      The OCR scanner checks the files automatically, compares them with your account details, and sends unclear matches to admin review.
                    </p>
                  </div>
                </div>

                <Link
                  href="/parent/verification"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  Start verification
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <ParentChildCard />
          </div>

          <div className="mb-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <ParentDashboardCards />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <ParentAttendanceCard />
              <ParentNoticesCard />
            </div>

            <div className="lg:col-span-1 space-y-8">
              <ParentMessagesCard />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
