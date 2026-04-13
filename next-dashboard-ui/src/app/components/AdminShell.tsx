"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu as MenuIcon, X } from "lucide-react";
import Menu from "@/app/components/Menu";
import Navbar from "@/app/components/Navbar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="teacher-theme flex h-screen bg-[#f8f5ee]">
      <aside className="hidden lg:flex lg:flex-col w-80 bg-[#fafaeb] rounded-r-[2.25rem] sticky top-0 h-screen shadow-[14px_0_30px_-16px_rgba(54,57,43,0.18)] shrink-0">
        <Link href="/dashboard/admin" className="w-full px-4 pt-4 pb-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[#f4f5e4] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10 w-full flex items-center justify-center overflow-hidden">
            <Image
              src="/logo_system.png"
              alt="School logo"
              width={560}
              height={180}
              className="w-full h-auto object-contain"
              priority
            />
          </div>
        </Link>

        <div className="flex-1 overflow-y-auto px-3 pb-5">
          <Menu compactOnMobile={false} />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col teacher-main-surface bg-[#f8f5ee] overflow-hidden">
        <div className="lg:hidden sticky top-0 z-50 bg-[#fefdf1]/95 backdrop-blur-md border-b border-[#d8d3b3] px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard/admin" className="flex items-center gap-2">
            <Image src="/logo_system.png" alt="School logo" width={150} height={48} className="h-9 w-auto object-contain" priority />
          </Link>
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="p-2 rounded-lg border border-[#d8d3b3] bg-[#fafaeb] text-[#4f5838]"
            aria-label="Toggle admin menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <button
              className="absolute inset-0 bg-black/35"
              aria-label="Close admin menu overlay"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 max-w-[84vw] bg-[#fafaeb] shadow-xl border-r border-[#d8d3b3] p-4 overflow-y-auto">
              <div className="mb-3">
                <Link href="/dashboard/admin" onClick={() => setMobileOpen(false)}>
                  <Image src="/logo_system.png" alt="School logo" width={220} height={70} className="w-full h-auto object-contain" priority />
                </Link>
              </div>
              <Menu compactOnMobile={true} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <Navbar />
        <main className="flex-1 overflow-y-auto bg-[#f8f5ee]">{children}</main>
      </div>
    </div>
  );
}
