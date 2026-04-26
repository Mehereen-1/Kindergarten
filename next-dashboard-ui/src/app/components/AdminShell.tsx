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
    <div className="teacher-theme flex h-screen bg-[var(--color-background)]">
      <aside className="hidden lg:flex lg:flex-col w-80 bg-[var(--color-surface-low)] rounded-r-[2.25rem] sticky top-0 h-screen shadow-[14px_0_30px_-16px_rgba(0,0,0,0.35)] shrink-0 border-r border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)]">
        <Link href="/admin/dashboard" className="w-full px-4 pt-4 pb-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[var(--color-surface-container)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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

      <div className="flex-1 min-w-0 flex flex-col teacher-main-surface bg-[var(--color-background)] overflow-hidden">
        <div className="lg:hidden sticky top-0 z-50 bg-[color:color-mix(in_srgb,var(--color-surface)_90%,transparent)] backdrop-blur-md border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] px-4 py-3 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <Image src="/logo_system.png" alt="School logo" width={150} height={48} className="h-9 w-auto object-contain" priority />
          </Link>
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="p-2 rounded-lg border border-[color:color-mix(in_srgb,var(--color-outline-variant)_30%,transparent)] bg-[var(--color-surface-low)] text-[var(--color-on-surface)]"
            aria-label="Toggle admin menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <button
              className="absolute inset-0 bg-black/50"
              aria-label="Close admin menu overlay"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 max-w-[84vw] bg-[var(--color-surface-low)] shadow-xl border-r border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] p-4 overflow-y-auto">
              <div className="mb-3">
                <Link href="/admin/dashboard" onClick={() => setMobileOpen(false)}>
                  <Image src="/logo_system.png" alt="School logo" width={220} height={70} className="w-full h-auto object-contain" priority />
                </Link>
              </div>
              <Menu compactOnMobile={true} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <Navbar />
        <main className="flex-1 overflow-y-auto bg-[var(--color-background)]">{children}</main>
      </div>
    </div>
  );
}
