"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

const MobileParentSidebar = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 lg:hidden z-40" onClick={onClose}></div>
      )}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-blue-600 to-peach-500 transform transition-transform duration-300 lg:hidden z-50 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-white/30 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">KinderVision</h2>
          <button onClick={onClose} className="text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
    </>
  );
};

export default MobileParentSidebar;
