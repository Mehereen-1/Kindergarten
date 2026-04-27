"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  User,
  LogOut,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";
import NormalNotifications from "@/app/components/NormalNotifications";
import { useRouter } from "next/navigation";

const ParentTopBar = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profileMenu, setProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <header className="bg-[color:color-mix(in_srgb,var(--color-surface)_90%,transparent)] backdrop-blur-md border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] sticky top-0 z-40 shadow-[0_4px_20px_rgba(58,57,39,0.04)]">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-low)] border border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] flex items-center justify-center overflow-hidden p-1.5">
            <Image
              src="/logo_system.png"
              alt="School logo"
              width={56}
              height={56}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <h2 className="text-xl font-black text-[var(--color-on-surface)] leading-tight">KinderVision</h2>
            <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--color-on-surface-variant)]">Parent Portal</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <NormalNotifications
            role="parent"
            buttonClassName="bg-[var(--color-surface-low)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
            dropdownClassName="bg-[var(--color-surface-low)] border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] text-[var(--color-on-surface)]"
            headerClassName="bg-[var(--color-surface-container)] border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] text-[var(--color-on-surface)]"
          />

          {/* Messages */}
          <button
            type="button"
            onClick={() => router.push("/parent/chat")}
            className="relative p-2.5 rounded-lg bg-[var(--color-surface-low)] hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] transition-all hover:scale-110 shadow-sm"
            title="Messages"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileMenu(!profileMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--color-surface-container)] transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center text-[var(--color-on-surface)] font-bold shadow-md group-hover:scale-110 transition-transform">
                👤
              </div>
            </button>
            {profileMenu && (
              <div className="absolute top-full mt-2 right-0 bg-[var(--color-surface-low)] rounded-xl shadow-2xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] py-2 z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary-container)_60%,transparent)]">
                  <p className="text-sm font-bold text-[var(--color-on-surface)]">{user?.name || 'Parent Name'}</p>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{user?.email || 'parent@kindergarten.edu'}</p>
                </div>
                <Link
                  href="/parent/profile"
                  className="w-full text-left px-4 py-3 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] flex items-center gap-3 border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] transition-colors"
                  onClick={() => setProfileMenu(false)}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>
                <Link
                  href="/parent/child-profile"
                  className="w-full text-left px-4 py-3 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] flex items-center gap-3 border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] transition-colors"
                  onClick={() => setProfileMenu(false)}
                >
                  <User className="w-4 h-4" />
                  Child&apos;s Profile
                </Link>
                <Link
                  href="/parent/settings"
                  className="w-full text-left px-4 py-3 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] flex items-center gap-3 border-b border-[color:color-mix(in_srgb,var(--color-outline-variant)_26%,transparent)] transition-colors"
                  onClick={() => setProfileMenu(false)}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={signOut}
                  className="w-full text-left px-4 py-3 text-sm text-[#3a3927] hover:bg-[#be2d06] hover:text-white flex items-center gap-3 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ParentTopBar;
