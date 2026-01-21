// src/pages/teacher/FaceRegistration.jsx
export default function FaceRegistration() {
  return (
    <div className="page">
      <h1>📸 Face Registration</h1>
      <p>
        Upload clear photos of each student to enable
        automatic attendance.
      </p>

      <div className="soft-card">
        <p>Select a student and upload 3–5 photos.</p>
        <input type="file" multiple />
        <button>Upload</button>
      </div>
    </div>
  );
}
