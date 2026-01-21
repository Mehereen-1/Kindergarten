// src/pages/teacher/TeacherClassDetails.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
// import api from "../../services/api";

export default function TeacherClassDetails() {
//   const { id } = useParams();
//   const [students, setStudents] = useState([]);

//   useEffect(() => {
//     api.get(`/teacher/class/${id}/students`)
//       .then(res => setStudents(res.data));
//   }, [id]);
    const students = [
        { _id: "s1", name: "Alice Johnson", faceRegistered: true },
        { _id: "s2", name: "Bob Smith", faceRegistered: false },
        { _id: "s3", name: "Charlie Brown", faceRegistered: true },
      ];

  return (
    <div className="page">
      <h1>🌸 Class Students</h1>

      {students.map(student => (
        <div key={student._id} className="soft-card">
          <h3>{student.name}</h3>
          <p>
            Face Registered:{" "}
            {student.faceRegistered ? "✅ Yes" : "❌ No"}
          </p>
        </div>
      ))}
    </div>
  );
}
