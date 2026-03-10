"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

type ValuePiece = Date | null;

type Value = ValuePiece | [ValuePiece, ValuePiece];

type DashboardEvent = {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
};

const EventCalendar = () => {
  const [value, onChange] = useState<Value>(new Date());
  const [events, setEvents] = useState<DashboardEvent[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await fetch('/api/events?role=all');
        const data = await response.json();
        if (response.ok) {
          setEvents(Array.isArray(data.events) ? data.events.slice(0, 20) : []);
        }
      } catch {
        setEvents([]);
      }
    };

    loadEvents();
  }, []);

  const selected = Array.isArray(value) ? value[0] : value;
  const visibleEvents = events.filter((event) => {
    if (!selected) return false;
    const d = new Date(event.startDate);
    return (
      d.getFullYear() === selected.getFullYear() &&
      d.getMonth() === selected.getMonth() &&
      d.getDate() === selected.getDate()
    );
  });

  return (
    <div className="bg-white p-4 rounded-md">
      <Calendar onChange={onChange} value={value} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold my-4">Events</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <div className="flex flex-col gap-4">
        {visibleEvents.length === 0 ? (
          <p className="text-sm text-gray-400">No events for selected date.</p>
        ) : visibleEvents.map((event) => (
          <div
            className="p-5 rounded-md border-2 border-gray-100 border-t-4 odd:border-t-lamaSky even:border-t-lamaPurple"
            key={event._id}
          >
            <div className="flex items-center justify-between">
              <h1 className="font-semibold text-gray-600">{event.title}</h1>
              <span className="text-gray-300 text-xs">{new Date(event.startDate).toLocaleDateString()}</span>
            </div>
            <p className="mt-2 text-gray-400 text-sm">{event.description || 'School event'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventCalendar;