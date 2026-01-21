import { BrowserRouter, Routes, Route } from "react-router-dom";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import TeacherClassDetails from "./pages/teacher/TeacherClassDetails";
// import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import FaceRegistration from "./pages/teacher/FaceRegistration";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Teacher Section */}
        <Route path="/teacher" element={<TeacherDashboard />} />   {/* ⭐ START */}
        <Route path="/teacher/classes" element={<TeacherClasses />} />
        <Route path="/teacher/class/:id" element={<TeacherClassDetails />} />
        {/* <Route path="/teacher/attendance" element={<TeacherAttendance />} /> */}
        <Route path="/teacher/face-registration" element={<FaceRegistration />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
