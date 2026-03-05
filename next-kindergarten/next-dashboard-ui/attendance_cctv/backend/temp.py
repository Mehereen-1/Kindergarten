import cv2
import numpy as np
from insightface.app import FaceAnalysis


class FaceEngine:
    def __init__(self, db=None, model_name="buffalo_s"):
        """
        Optimized CPU FaceEngine.
        - Uses smaller model by default (buffalo_s instead of buffalo_l)
        - Vectorized cosine similarity
        - Pre-normalized embeddings
        """

        # Use smaller model for CPU performance
        self.app = FaceAnalysis(name=model_name)
        self.app.prepare(ctx_id=-1, det_size=(640, 640))  # CPU mode

        self.known_embeddings = None  # Will be numpy matrix
        self.known_names = []
        self.student_ids = []
        self.db = db

        if db is not None:
            self.load_embeddings_from_db(db)

    # ==============================
    # LOAD EMBEDDINGS (OPTIMIZED)
    # ==============================

    def load_embeddings_from_db(self, db):
        try:
            facial_db_collection = db["facial_database"]
            records = list(facial_db_collection.find())

            embeddings = []
            names = []
            student_ids = []

            students_collection = db.get_collection("students")

            for record in records:
                student_id = record.get("student_id")
                embeddings_list = record.get("embeddings", [])

                student_name = str(student_id)
                if students_collection is not None:
                    student = students_collection.find_one({"_id": student_id})
                    if student and student.get("name"):
                        student_name = student["name"]

                for emb_data in embeddings_list:
                    emb = emb_data.get("embedding")
                    if emb:
                        emb_array = np.array(emb, dtype=np.float32)

                        # Normalize ONCE here
                        emb_array /= (np.linalg.norm(emb_array) + 1e-6)

                        embeddings.append(emb_array)
                        names.append(student_name)
                        student_ids.append(student_id)

            if len(embeddings) > 0:
                self.known_embeddings = np.stack(embeddings)  # Shape: (N, 512)
            else:
                self.known_embeddings = None

            self.known_names = names
            self.student_ids = student_ids

            print(f"✅ Loaded {len(names)} embeddings for {len(set(student_ids))} students")

        except Exception as e:
            print(f"❌ Error loading embeddings: {e}")

    # ==============================
    # RECOGNITION (VECTOR FAST)
    # ==============================

    def recognize(self, frame, threshold=0.4):
        """
        Optimized recognition:
        - No Python loops for similarity
        - Matrix multiplication instead
        - No per-face printing
        """

        faces = self.app.get(frame)
        results = []

        if not faces:
            return results

        print(f"🔍 Detected {len(faces)} face(s)")

        if self.known_embeddings is None or len(self.known_embeddings) == 0:
            print("⚠️ No known embeddings loaded - all faces will be Unknown")
            for face in faces:
                results.append((face.bbox.astype(int), "Unknown", None))
            return results

        print(f"📊 Comparing against {len(self.known_embeddings)} known embeddings")

        for i, face in enumerate(faces):
            embedding = face.embedding.astype(np.float32)

            # Normalize once
            embedding /= (np.linalg.norm(embedding) + 1e-6)

            # Vectorized cosine similarity
            similarities = np.dot(self.known_embeddings, embedding)

            best_index = np.argmax(similarities)
            best_score = similarities[best_index]

            print(f"   Face {i+1}: Best match = {self.known_names[best_index]} (score: {best_score:.3f}, threshold: {threshold})")

            if best_score > threshold:
                name = self.known_names[best_index]
                student_id = self.student_ids[best_index]
                print(f"   ✅ MATCHED: {name}")
            else:
                name = "Unknown"
                student_id = None
                print(f"   ❌ Below threshold - marked as Unknown")

            results.append((face.bbox.astype(int), name, student_id))

        return results