import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./admin/layout/AdminLayout";
import Dashboard from "./admin/pages/Dashboard/Dashboard";
import StudentsPage from "./admin/pages/Students/StudentsPage";
import TeachersPage from "./admin/pages/Teachers/TeachersPage";
import AttendancePage from "./admin/pages/Attendance/AttendancePage";
import FeesPage from "./admin/pages/Fees/FeesPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="fees" element={<FeesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
