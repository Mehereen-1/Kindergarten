# ═══════════════════════════════════════════════════════════════════════════════
#                          FACE ENGINE MODULE
# ═══════════════════════════════════════════════════════════════════════════════
#
# InsightFace Recognition Engine with Embedding Loader
#
# Usage:
#   from face_engine import FaceEngine
#   engine = FaceEngine(db=db, model_name="buffalo_l")
#   results = engine.recognize(frame, threshold=0.4)
#
# ═══════════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════
# IMPORTS
# ═══════════════════════════════════════════════════════

import cv2
import numpy as np
from insightface.app import FaceAnalysis


# ═══════════════════════════════════════════════════════
# EMBEDDING LOADER
# ═══════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════
# FACE ENGINE CLASS
# ═══════════════════════════════════════════════════════

class FaceEngine:

    # ─── INITIALIZATION ───────────────────────

    def __init__(self, db=None, model_name="buffalo_l", det_size=(640, 640)):
        """
        FaceEngine: Accurate + Fast CPU face recognition.

        Uses buffalo_l for accuracy, vectorized numpy for speed.
        Pre-normalizes stored embeddings so recognition is a single matrix multiply.

        Args:
            db: MongoDB database instance (optional)
            model_name: InsightFace model. Use "buffalo_l" for accuracy, "buffalo_s" for speed.
            det_size: Detection resolution. Lower = faster but misses small faces.
        """
        self.app = FaceAnalysis(name=model_name)
        self.app.prepare(ctx_id=-1, det_size=det_size)  # ctx_id=-1 = CPU

        # Matrix of pre-normalized embeddings, shape (N, 512)
        self.known_embeddings = None
        self.known_names = []
        self.student_ids = []
        self.db = db

        if db is not None:
            self.load_embeddings_from_db(db)

    # ─── LOADING ──────────────────────────────

    def load_embeddings_from_db(self, db):
        """Load and pre-normalize all embeddings from MongoDB."""
        result = load_embeddings_from_db(db)
        self.known_embeddings = result["known_embeddings"]
        self.known_names = result["known_names"]
        self.student_ids = result["student_ids"]

    def add_embedding(self, student_id, embedding, student_name=None):
        """
        Add a single embedding to in-memory store (e.g. after enrolling a new student).
        Also updates the matrix so recognition stays fast.
        """
        emb_array = np.array(embedding, dtype=np.float32)
        norm = np.linalg.norm(emb_array)
        if norm > 1e-6:
            emb_array /= norm

        name = student_name if student_name else str(student_id)

        self.known_names.append(name)
        self.student_ids.append(student_id)

        if self.known_embeddings is None:
            self.known_embeddings = emb_array.reshape(1, -1)
        else:
            self.known_embeddings = np.vstack([self.known_embeddings, emb_array])

    # ─── ENROLLMENT ───────────────────────────

    def enroll_face(self, frame, student_id, student_name=None):
        """
        Extract embedding from a frame and return it.
        Call this during enrollment, then save to DB and call add_embedding().

        Returns:
            embedding (np.ndarray) if a face is found, else None
        """
        faces = self.app.get(frame)
        if not faces:
            print("⚠️ No face detected in enrollment frame")
            return None

        # Use the largest/most confident face
        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        embedding = face.embedding.astype(np.float32)
        print(f"✅ Extracted embedding for student_id={student_id}")
        return embedding

    # ─── RECOGNITION ──────────────────────────

    def recognize(self, frame, threshold=0.45):
        """
        Recognize all faces in a frame.

        How threshold works (cosine similarity, 0–1 after normalization):
            > 0.6  → very confident match
            0.45–0.6 → likely match
            < 0.45 → Unknown

        Args:
            frame: BGR image (OpenCV format)
            threshold: Minimum similarity to accept a match (default 0.45)

        Returns:
            List of (bbox: np.ndarray[4], name: str, student_id: any)
        """
        faces = self.app.get(frame)
        results = []

        if not faces:
            return results

        print(f"🔍 Detected {len(faces)} face(s)")

        if self.known_embeddings is None or len(self.known_embeddings) == 0:
            print("⚠️ No embeddings loaded — all faces will be Unknown")
            for face in faces:
                results.append((face.bbox.astype(int), "Unknown", None, 0.0))
            return results

        for i, face in enumerate(faces):
            embedding = face.embedding.astype(np.float32)

            # Normalize query embedding
            norm = np.linalg.norm(embedding)
            if norm > 1e-6:
                embedding /= norm

            # Fast vectorized cosine similarity (stored embeddings are pre-normalized)
            # dot(normalized_a, normalized_b) == cosine_similarity(a, b)
            similarities = self.known_embeddings @ embedding  # Shape: (N,)

            best_idx = int(np.argmax(similarities))
            best_score = float(similarities[best_idx])

            if best_score >= threshold:
                name = self.known_names[best_idx]
                student_id = self.student_ids[best_idx]
                print(f"   Face {i+1}: ✅ {name} (score={best_score:.3f})")
            else:
                name = "Unknown"
                student_id = None
                print(f"   Face {i+1}: ❌ Unknown (best={self.known_names[best_idx]}, score={best_score:.3f}, threshold={threshold})")

            results.append((face.bbox.astype(int), name, student_id, best_score))

        return results

    # ─── UTILITIES ────────────────────────────

    def draw_results(self, frame, results):
        """
        Draw bounding boxes and names on frame for debugging/display.

        Args:
            frame: BGR image
            results: output from recognize()

        Returns:
            Annotated BGR image
        """
        for bbox, name, student_id in results:
            x1, y1, x2, y2 = bbox
            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            label = name if name != "Unknown" else "Unknown"
            cv2.putText(frame, label, (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        return frame

    def reload_embeddings(self):
        """Reload embeddings from DB (useful after enrolling new students)."""
        if self.db is not None:
            self.load_embeddings_from_db(self.db)
        else:
            print("⚠️ No DB connected — cannot reload")

    @property
    def student_count(self):
        return len(set(self.student_ids))

    @property
    def embedding_count(self):
        return len(self.known_names)
