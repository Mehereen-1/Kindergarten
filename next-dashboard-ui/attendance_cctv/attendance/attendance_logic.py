# ═══════════════════════════════════════════════════════
# attendance_logic.py — Attendance API Logic
# ═══════════════════════════════════════════════════════

from .attendance_manager import clear_attendance_timestamps


# =========================
# GET ATTENDANCE
# =========================

def get_attendance(db, limit: int = 100):
    if db is None:
        return []
    records = list(db["attendance"].find().sort("timestamp", -1).limit(limit))
    for r in records:
        r["_id"] = str(r["_id"])
        if "timestamp" in r:
            r["timestamp"] = r["timestamp"].isoformat()
    return records


# =========================
# CLEAR ATTENDANCE
# =========================

def clear_attendance(db):
    if db:
        db["attendance"].delete_many({})
    clear_attendance_timestamps()
    return {"success": True}
