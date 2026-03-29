# ═══════════════════════════════════════════════════════
# mongo_service.py — MongoDB Connection
# ═══════════════════════════════════════════════════════

import os
from pymongo import MongoClient
from dotenv import load_dotenv


# =========================
# DATABASE CONNECTION
# =========================

load_dotenv()

db = None
client = None

try:
    client = MongoClient(os.getenv("MONGODB_URI"), serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    db = client[os.getenv("DB_NAME", "test")]
    print("✅ MongoDB connected")
except Exception as e:
    db = None
    print(f"⚠️ MongoDB not connected: {e}")
