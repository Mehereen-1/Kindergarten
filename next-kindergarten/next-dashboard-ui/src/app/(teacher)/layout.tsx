import TeacherSidebar from "@/app/components/TeacherSidebar";
import MobileTeacherSidebar from "@/app/components/MobileTeacherSidebar";

export default function TeacherLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Desktop Sidebar */}
      <TeacherSidebar />

      {/* Mobile Sidebar Toggle */}
      <MobileTeacherSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
