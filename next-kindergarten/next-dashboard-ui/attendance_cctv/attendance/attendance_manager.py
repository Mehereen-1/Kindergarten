# ═══════════════════════════════════════════════════════
# attendance_manager.py — Attendance Saving & Management
# ═══════════════════════════════════════════════════════

from datetime import datetime

from config.settings import ATTENDANCE_COOLDOWN


# =========================
# ATTENDANCE TIMESTAMPS
# =========================

_attendance_ts: dict = {}


# =========================
# SAVE ATTENDANCE
# =========================

def save_attendance(db, name: str, student_id):
    if db is None:
        return
    now = datetime.now()
    last = _attendance_ts.get(student_id)
    if last and (now - last).total_seconds() < ATTENDANCE_COOLDOWN:
        return
    db["attendance"].insert_one({
        "name": name, "student_id": student_id,
        "timestamp": now, "datetime_str": now.strftime("%Y-%m-%d %H:%M:%S"),
    })
    _attendance_ts[student_id] = now
    print(f"💾 Attendance: {name}")


# =========================
# CLEAR TIMESTAMPS
# =========================

def clear_attendance_timestamps():
    _attendance_ts.clear()
