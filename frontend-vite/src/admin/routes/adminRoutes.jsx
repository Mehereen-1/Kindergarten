import AdminLayout from "../layout/AdminLayout";
import Dashboard from "../pages/Dashboard/Dashboard";
import StudentsPage from "../pages/Students/StudentsPage";
import TeachersPage from "../pages/Teachers/TeachersPage";
import AttendancePage from "../pages/Attendance/AttendancePage";
import FeesPage from "../pages/Fees/FeesPage";

export const adminRoutes = {
  path: "/admin",
  element: <AdminLayout />,
  children: [
    { path: "dashboard", element: <Dashboard /> },
    { path: "students", element: <StudentsPage /> },
    { path: "teachers", element: <TeachersPage /> },
    { path: "attendance", element: <AttendancePage /> },
    { path: "fees", element: <FeesPage /> },
  ],
};
