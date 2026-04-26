"use client";

import { role } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/home.png",
        label: "Dashboard",
        href: "/admin/dashboard",
        visible: ["admin"],
      },
      {
        icon: "/home.png",
        label: "Home",
        href: "/",
        visible: ["teacher", "student", "parent"],
      },
      {
        icon: "/teacher.png",
        label: "Teachers",
        href: "/admin/teachers",
        visible: ["admin"],
      },
      {
        icon: "/student.png",
        label: "Students",
        href: "/admin/students",
        visible: ["admin"],
      },
      {
        icon: "/parent.png",
        label: "Parents",
        href: "/admin/parents",
        visible: ["admin"],
      },
      {
        icon: "/subject.png",
        label: "Subjects",
        href: "/admin/subjects",
        visible: ["admin"],
      },
      {
        icon: "/class.png",
        label: "Classes",
        href: "/admin/classes",
        visible: ["admin"],
      },
      {
        icon: "/class.png",
        label: "Classes",
        href: "/teacher/classes",
        visible: ["teacher"],
      },
      {
        icon: "/lesson.png",
        label: "Lessons",
        href: "/admin/lessons",
        visible: ["admin"],
      },
      {
        icon: "/exam.png",
        label: "Exams",
        href: "/list/exams",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/assignment.png",
        label: "Assignments",
        href: "/teacher/assignments",
        visible: ["teacher"],
      },
      {
        icon: "/assignment.png",
        label: "Assignments",
        href: "/list/assignments",
        visible: ["student", "parent"],
      },
      {
        icon: "/result.png",
        label: "Results",
        href: "/admin/exam-config",
        visible: ["admin"],
      },
      {
        icon: "/result.png",
        label: "Student Results",
        href: "/admin/results",
        visible: ["admin"],
      },
      {
        icon: "/result.png",
        label: "Results",
        href: "/teacher/marksheets",
        visible: ["teacher"],
      },
      {
        icon: "/result.png",
        label: "Results",
        href: "/parent/results",
        visible: ["parent"],
      },
      {
        icon: "/result.png",
        label: "Results",
        href: "/list/results",
        visible: ["student"],
      },
      {
        icon: "/attendance.png",
        label: "Attendance",
        href: "/list/attendance",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/calendar.png",
        label: "Events",
        href: "/list/events",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/calendar.png",
        label: "Timetable",
        href: "/admin/timetable",
        visible: ["admin"],
      },
      {
        icon: "/message.png",
        label: "Messages",
        href: "/list/messages",
        visible: ["teacher", "student", "parent"],
      },
      {
        icon: "/announcement.png",
        label: "Announcements",
        href: "/admin/announcements",
        visible: ["admin"],
      },
      {
        icon: "/announcement.png",
        label: "Announcements",
        href: "/list/announcements",
        visible: ["teacher", "student", "parent"],
      },
      {
        icon: "/announcement.png",
        label: "Sound Alerts",
        href: "/admin/security-alerts",
        visible: ["admin"],
      },
      {
        icon: "/attendance.png",
        label: "Attendance Audit",
        href: "/admin/attendance-audit",
        visible: ["admin"],
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: "/profile.png",
        label: "Profile",
        href: "/admin/dashboard",
        visible: ["admin"],
      },
      {
        icon: "/profile.png",
        label: "Profile",
        href: "/teacher/profile",
        visible: ["teacher"],
      },
      {
        icon: "/profile.png",
        label: "Profile",
        href: "/parent/profile",
        visible: ["parent"],
      },
      {
        icon: "/setting.png",
        label: "Settings",
        href: "/admin/settings",
        visible: ["admin"],
      },
      {
        icon: "/setting.png",
        label: "Settings",
        href: "/teacher/settings",
        visible: ["teacher"],
      },
      {
        icon: "/setting.png",
        label: "Settings",
        href: "/parent/settings",
        visible: ["parent"],
      },
      {
        icon: "/setting.png",
        label: "Settings",
        href: "/settings",
        visible: ["student"],
      },
      {
        icon: "/logout.png",
        label: "Logout",
        href: "/logout",
        visible: ["admin", "teacher", "student", "parent"],
      },
    ],
  },
];

const Menu = ({
  compactOnMobile = true,
  onNavigate,
}: {
  compactOnMobile?: boolean;
  onNavigate?: () => void;
}) => {
  return (
    <div className="mt-2 text-sm min-w-0">
      {menuItems.map((i) => (
        <div className="flex flex-col gap-2 min-w-0" key={i.title}>
          <span className="hidden lg:block text-[#7d8460] text-[11px] font-bold tracking-[0.14em] my-4 uppercase">
            {i.title}
          </span>
          {i.items.map((item) => {
            if (item.visible.includes(role)) {
              return (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  key={`${item.label}-${item.href}`}
                  className={`w-full min-w-0 flex items-center gap-3 text-[#525b3e] py-2.5 px-3 rounded-xl hover:bg-[#e8efd4] hover:text-[#3a3927] transition-colors ${
                    compactOnMobile ? "justify-center lg:justify-start" : "justify-start"
                  }`}
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f2eedc] border border-[#d8d3b3]">
                    <Image src={item.icon} alt="" width={16} height={16} />
                  </span>
                  <span className={`${compactOnMobile ? "hidden lg:block" : "block"} font-semibold truncate`}>
                    {item.label}
                  </span>
                </Link>
              );
            }
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;
