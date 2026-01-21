// src/pages/teacher/TeacherClasses.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
// import api from "../../services/api";

export default function TeacherClasses() {
//   const [classes, setClasses] = useState([]);

//   useEffect(() => {
//     api.get("/teacher/classes")
//       .then(res => setClasses(res.data));
//   }, []);
    const classes = [
        { _id: "1", name: "KG-A", studentCount: 20 },
        { _id: "2", name: "KG-B", studentCount: 18 },
        { _id: "3", name: "Grade 1", studentCount: 22 },
      ];

  return (
    <div className="page">
      <h1>🌼 My Classes</h1>

      {classes.map(cls => (
        <div key={cls._id} className="soft-card">
          <h3>{cls.name}</h3>
          <p>{cls.studentCount || "Students enrolled"}</p>
          <Link to={`/teacher/class/${cls._id}`}>View Class →</Link>
        </div>
      ))}
    </div>
  );
}
