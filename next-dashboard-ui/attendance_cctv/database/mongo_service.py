# ═══════════════════════════════════════════════════════
# mongo_service.py — MongoDB Connection
# ═══════════════════════════════════════════════════════

import os
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv


# =========================
# DATABASE CONNECTION
# =========================

# Load env in this order:
# 1) attendance_cctv/.env (if present)
# 2) project root .env.local used by the Next.js app
load_dotenv()
root_env_local = Path(__file__).resolve().parents[2] / ".env.local"
if root_env_local.exists():
    load_dotenv(dotenv_path=root_env_local)

db = None
client = None

try:
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        raise RuntimeError("MONGODB_URI is not set. Add it to attendance_cctv/.env or project root .env.local")

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    db = client[os.getenv("DB_NAME", "test")]
    print("✅ MongoDB connected")
except Exception as e:
    db = None
    print(f"⚠️ MongoDB not connected: {e}")
