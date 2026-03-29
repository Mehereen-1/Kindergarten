"use client";

import { useState } from "react";
import ParentSidebar from "@/app/components/ParentSidebar";
import MobileParentSidebar from "@/app/components/MobileParentSidebar";
import NotificationStatusIndicator from "@/app/components/NotificationStatusIndicator";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-peach-50">
      {/* Desktop Sidebar */}
      <ParentSidebar />

      {/* Mobile Sidebar */}
      <MobileParentSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* <NotificationStatusIndicator /> */}
        {children}
      </div>
    </div>
  );
}
