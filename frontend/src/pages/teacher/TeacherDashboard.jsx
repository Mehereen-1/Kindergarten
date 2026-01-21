import React from "react";

const TeacherDashboard = () => {
  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <img
            src="https://i.pravatar.cc/100?img=12"
            alt="Teacher"
            style={styles.avatar}
          />
          <div>
            <h2 style={styles.title}>Hello, Miss Ayesha 🌸</h2>
            <p style={styles.subtitle}>Have a lovely teaching day</p>
          </div>
        </div>

        <div style={styles.headerRight}>
          <span style={styles.icon}>🔔</span>
          <span style={styles.icon}>⚙️</span>
        </div>
      </div>

      {/* DASHBOARD CONTENT */}
      <div style={styles.cards}>
        <div style={styles.card}>📚 My Classes</div>
        <div style={styles.card}>🧒 Attendance</div>
        <div style={styles.card}>📷 Face Recognition</div>
        <div style={styles.card}>💬 Messages</div>
      </div>
    </div>
  );
};

export default TeacherDashboard;

/* ---------- STYLES ---------- */

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f9f9f9",
    fontFamily: "Segoe UI, sans-serif",
  },

  header: {
    background: "linear-gradient(135deg, #ffd6e8, #e6f0ff)",
    padding: "20px",
    borderBottomLeftRadius: "25px",
    borderBottomRightRadius: "25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },

  avatar: {
    width: "55px",
    height: "55px",
    borderRadius: "50%",
    border: "3px solid white",
  },

  title: {
    margin: 0,
    fontSize: "18px",
    color: "#333",
  },

  subtitle: {
    margin: 0,
    fontSize: "13px",
    color: "#666",
  },

  headerRight: {
    display: "flex",
    gap: "15px",
  },

  icon: {
    fontSize: "20px",
    cursor: "pointer",
  },

  cards: {
    padding: "20px",
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "15px",
  },

  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "22px",
    textAlign: "center",
    fontSize: "16px",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
    transition: "transform 0.2s",
  },
};
