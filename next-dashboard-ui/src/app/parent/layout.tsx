"use client";

import { useState } from "react";
import ParentSidebar from "@/app/components/ParentSidebar";
import MobileParentSidebar from "@/app/components/MobileParentSidebar";
import NotificationStatusIndicator from "@/app/components/NotificationStatusIndicator";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="parent-theme flex h-screen">
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
