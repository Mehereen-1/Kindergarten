# ═══════════════════════════════════════════════════════
# embedding_loader.py — Embedding Loading Utilities
# ═══════════════════════════════════════════════════════

import numpy as np


# =========================
# EMBEDDING LOADER
# =========================

def load_embeddings_from_db(db):
    """Load and pre-normalize all embeddings from MongoDB."""
    known_embeddings = None
    known_names = []
    student_ids = []

    try:
        facial_db_collection = db["facial_database"]
        records = list(facial_db_collection.find())
        print(f"🔍 Found {len(records)} records in facial_database")

        embeddings = []
        names = []
        sids = []

        students_collection = db.get_collection("students")

        for i, record in enumerate(records):
            student_id = record.get("student_id")
            embeddings_list = record.get("embeddings", [])
            print(f"   Record {i+1}: student_id={student_id}, embeddings={len(embeddings_list)}")

            # Resolve name from students collection
            student_name = str(student_id)
            if students_collection is not None:
                try:
                    student = students_collection.find_one({"_id": student_id})
                    if student and student.get("name"):
                        student_name = student["name"]
                except Exception:
                    pass

            for emb_data in embeddings_list:
                emb = emb_data.get("embedding")
                if emb:
                    emb_array = np.array(emb, dtype=np.float32)
                    norm = np.linalg.norm(emb_array)
                    if norm > 1e-6:
                        emb_array /= norm  # Pre-normalize once at load time
                    embeddings.append(emb_array)
                    names.append(student_name)
                    sids.append(student_id)
                else:
                    print(f"   ⚠️ Empty embedding found in record {i+1}, skipping")

        if embeddings:
            known_embeddings = np.stack(embeddings)  # Shape: (N, 512)
        else:
            known_embeddings = None

        known_names = names
        student_ids = sids

        print(f"✅ Loaded {len(names)} embeddings for {len(set(sids))} students")

    except Exception as e:
        print(f"❌ Error loading embeddings: {e}")
        import traceback
        traceback.print_exc()

    return {
        "known_embeddings": known_embeddings,
        "known_names": known_names,
        "student_ids": student_ids,
    }
