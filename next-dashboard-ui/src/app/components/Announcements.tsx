"use client";

import { useEffect, useState } from "react";

type NoticeItem = {
  _id: string;
  title: string;
  description?: string;
  date?: string;
  createdAt?: string;
};

const Announcements = () => {
  const [items, setItems] = useState<NoticeItem[]>([]);

  useEffect(() => {
    let isActive = true;

    const loadNotices = async () => {
      try {
        const response = await fetch('/api/admin/notices');
        if (!response.ok) {
          throw new Error('Failed to fetch notices');
        }

        const data = await response.json();
        if (isActive) {
          setItems(Array.isArray(data) ? data.slice(0, 3) : []);
        }
      } catch {
        if (isActive) {
          setItems([]);
        }
      }
    };

    loadNotices();

    return () => {
      isActive = false;
    };
  }, []);

  const cardClasses = ['bg-lamaSkyLight', 'bg-lamaPurpleLight', 'bg-lamaYellowLight'];

  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
        <span className="text-xs text-gray-400">View All</span>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">No announcements found.</p>
        ) : items.map((item, index) => (
          <div
            key={item._id}
            className={`${cardClasses[index % cardClasses.length]} rounded-md p-4`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium line-clamp-1">{item.title}</h2>
              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1 whitespace-nowrap">
                {new Date(item.date || item.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {item.description || 'School notice'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Announcements;