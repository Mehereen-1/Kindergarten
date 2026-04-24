"use client";

import ParentTopBar from "@/app/components/ParentTopBar";
import ParentVerificationForm from "@/app/components/ParentVerificationForm";

export default function ParentVerificationPage() {
  return (
    <>
      <ParentTopBar />
      <main className="flex-1 overflow-y-auto bg-[#fef9e8]">
        <div className="max-w-6xl mx-auto px-4 py-8 lg:px-8">
          <ParentVerificationForm />
        </div>
      </main>
    </>
  );
}

