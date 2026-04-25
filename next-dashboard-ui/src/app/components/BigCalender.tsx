"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import { calendarEvents } from "@/lib/data";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";

const localizer = momentLocalizer(moment);

interface BigCalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
}

interface BigCalendarProps {
  events?: BigCalendarEvent[];
}

const BigCalendar = ({ events }: BigCalendarProps) => {
  const [view, setView] = useState<View>(Views.WORK_WEEK);
  const eventSource = events && events.length ? events : [];

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
  };

  return (
    <div className="big-calendar-wrapper">
      <Calendar
        localizer={localizer}
        events={eventSource}
        startAccessor="start"
        endAccessor="end"
        views={["work_week", "day"]}
        view={view}
        style={{ height: "500px" }}
        onView={handleOnChangeView}
        min={new Date(2025, 1, 0, 8, 0, 0)}
        max={new Date(2025, 1, 0, 17, 0, 0)}
      />
      
      <style jsx global>{`
        /* React Big Calendar - KinderVision Theme Overrides */
        
        .big-calendar-wrapper {
          background: #fff7d6;
          border-radius: 32px 12px 24px 40px;
          padding: 1rem;
        }
        
        /* Toolbar styling */
        .rbc-toolbar {
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        
        .rbc-toolbar button {
          background: #f8e999;
          border: 2px solid #5a4a3a;
          border-radius: 9999px;
          color: #352f00;
          font-weight: 600;
          font-size: 0.875rem;
          padding: 0.5rem 1.25rem;
          transition: all 0.2s ease;
        }
        
        .rbc-toolbar button:hover {
          background: #edde84;
          transform: scale(1.02);
        }
        
        .rbc-toolbar button.rbc-active {
          background: #705900;
          border-color: #5a4a3a;
          color: white;
          box-shadow: 0 2px 8px rgba(112, 89, 0, 0.3);
        }
        
        .rbc-toolbar button.rbc-active:hover {
          background: #5a4a00;
        }
        
        .rbc-toolbar-label {
          font-family: 'Caveat', cursive;
          font-size: 1.75rem;
          font-weight: 700;
          color: #352f00;
        }
        
        /* Calendar header cells */
        .rbc-header {
          padding: 0.75rem 0;
          font-weight: 700;
          font-size: 0.875rem;
          color: #352f00;
          border-bottom: 2px solid #5a4a3a/20;
        }
        
        .rbc-header + .rbc-header {
          border-left: none;
        }
        
        /* Day/Week cells */
        .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid #5a4a3a/10;
        }
        
        .rbc-month-view,
        .rbc-time-view,
        .rbc-agenda-view {
          border: 2px solid #5a4a3a;
          border-radius: 24px 12px 24px 40px;
          overflow: hidden;
          background: #fff7d6;
        }
        
        .rbc-off-range-bg {
          background: #f5efe0;
        }
        
        /* Time column */
        .rbc-time-gutter .rbc-timeslot-group {
          border-bottom: 1px solid #5a4a3a/10;
        }
        
        .rbc-label {
          color: #352f00;
          font-weight: 500;
          font-size: 0.75rem;
        }
        
        /* Time slots */
        .rbc-timeslot-group {
          border-bottom: 1px solid #5a4a3a/10;
          min-height: 60px;
        }
        
        .rbc-time-slot {
          color: #352f00/60;
        }
        
        /* Event styling */
        .rbc-event {
          background: #705900;
          border: 1px solid #5a4a3a;
          border-radius: 16px 8px 20px 12px;
          transition: all 0.2s ease;
        }
        
        .rbc-event:hover {
          background: #904800;
          transform: scale(1.01);
          box-shadow: 4px 4px 0px 0px rgba(90, 74, 58, 0.2);
        }
        
        .rbc-event-content {
          font-weight: 500;
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
        }
        
        /* Different event colors based on type */
        .rbc-event.event-meeting {
          background: #705900;
        }
        
        .rbc-event.event-class {
          background: #466337;
        }
        
        .rbc-event.event-activity {
          background: #904800;
        }
        
        /* Today highlight */
        .rbc-today {
          background: #fffcc2 !important;
          position: relative;
        }
        
        .rbc-today::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: #904800;
        }
        
        /* Current time indicator */
        .rbc-current-time-indicator {
          background-color: #904800;
          height: 2px;
        }
        
        /* Agenda view */
        .rbc-agenda-table {
          border: 2px solid #5a4a3a;
          border-radius: 16px;
          overflow: hidden;
        }
        
        .rbc-agenda-table thead th {
          background: #f8e999;
          color: #352f00;
          font-weight: 700;
          padding: 0.75rem;
          border-bottom: 2px solid #5a4a3a;
        }
        
        .rbc-agenda-table tbody tr {
          border-bottom: 1px solid #5a4a3a/10;
        }
        
        .rbc-agenda-table tbody tr:hover {
          background: #fffcc2;
        }
        
        .rbc-agenda-table td {
          padding: 0.75rem;
          color: #352f00;
        }
        
        /* Time header labels */
        .rbc-time-header-content {
          border-left: 2px solid #5a4a3a;
        }
        
        .rbc-time-header-gutter {
          border-right: 2px solid #5a4a3a;
        }
        
        /* Adjust for work week view */
        .rbc-time-view .rbc-header {
          border-bottom: 2px solid #5a4a3a/30;
        }
        
        .rbc-allday-cell {
          background: #fff7d6;
        }
        
        /* Date cell hover */
        .rbc-date-cell {
          color: #352f00;
          font-weight: 500;
        }
        
        .rbc-date-cell button {
          color: #352f00;
          transition: all 0.2s ease;
        }
        
        .rbc-date-cell button:hover {
          color: #904800;
        }
        
        /* Row borders */
        .rbc-time-view .rbc-row {
          border-top: 1px solid #5a4a3a/10;
        }
        
        /* Show more indicator */
        .rbc-show-more {
          background: #f8e999;
          color: #705900;
          font-weight: 600;
          border-radius: 9999px;
          padding: 0.125rem 0.5rem;
          font-size: 0.7rem;
        }
        
        .rbc-show-more:hover {
          background: #edde84;
          color: #5a4a00;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .rbc-toolbar {
            flex-direction: column;
            align-items: center;
          }
          
          .rbc-toolbar-label {
            font-size: 1.25rem;
          }
          
          .big-calendar-wrapper {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default BigCalendar;