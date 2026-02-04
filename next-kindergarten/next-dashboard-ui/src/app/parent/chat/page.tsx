"use client";

import { useState, useEffect } from 'react';
import ParentTopBar from "@/app/components/ParentTopBar";
import Chat from "@/components/Chat";

export default function ParentChatPage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);

  useEffect(() => {
    // Get user from cookies
    const userCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user='));

    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
        setCurrentUser({ id: user.id, role: user.role });
      } catch (error) {
        console.error('Error parsing user cookie:', error);
      }
    }
  }, []);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <ParentTopBar />
      <main className="flex-1 overflow-hidden bg-white">
        <div className="h-full">
          <Chat currentUser={currentUser} />
        </div>
      </main>
    </>
  );
}