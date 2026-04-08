# ═══════════════════════════════════════════════════════
# drawer.py — Visualization & Drawing Functions
# ═══════════════════════════════════════════════════════

import cv2
import numpy as np
import base64
import uuid
from datetime import datetime

from config.settings import DISPLAY_WIDTH, DISPLAY_HEIGHT


# =========================
# DRAW BOXES
# =========================

def draw_boxes(frame: np.ndarray, results: list,
               orig_w: int, orig_h: int, current_frame: int,
               bbox_smoother) -> np.ndarray:
    """
    Draw smoothed boxes on an already-display-sized frame.
    Calls bbox_smoother.smooth() ONCE per box — avoids double-EMA bug.
    
    Colors:
        - Red (0,0,255): Unknown face
        - Green (0,200,0): Confirmed/recognized with checkmark
        - Yellow (0,255,255): Recognized but pending confirmation
    """
    if not results:
        return frame
    
    sx = DISPLAY_WIDTH  / orig_w
    sy = DISPLAY_HEIGHT / orig_h

    for r in results:
        raw_x1, raw_y1, raw_x2, raw_y2 = r["bbox"]
        name = r.get("name", "Unknown")
        base_name = name.replace("✓ ", "").split(" (")[0]

        # Single smooth call — convert original coords to smoothed original coords
        smoothed = bbox_smoother.smooth(
            base_name, (raw_x1, raw_y1, raw_x2, raw_y2), current_frame
        )

        # Scale to display size after smoothing
        x1 = int(smoothed[0] * sx)
        y1 = int(smoothed[1] * sy)
        x2 = int(smoothed[2] * sx)
        y2 = int(smoothed[3] * sy)

        # Determine color based on recognition status
        if "Unknown" in name or "Spoof" in name:
            color = (0, 0, 255)      # Red for unknown
        elif "✓" in name:
            color = (0, 200, 0)      # Green for confirmed
        else:
            color = (0, 255, 255)    # Yellow for pending

        # Draw bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2, cv2.LINE_AA)

        # Draw label background and text
        (lw, lh), _ = cv2.getTextSize(name, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        label_y1 = max(0, y1 - lh - 8)
        cv2.rectangle(frame, (x1, label_y1), (x1 + lw + 6, y1), color, -1, cv2.LINE_AA)
        cv2.putText(frame, name, (x1 + 3, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
    
    return frame


# =========================
# EXTRACT AND STORE FACE
# =========================

def extract_and_store_face(frame, bbox, name, student_id, score, frame_num, is_confirmed,
                           extracted_faces, faces_lock):
    h, w = frame.shape[:2]
    x1, y1, x2, y2 = bbox
    pad_x = int((x2 - x1) * 0.2); pad_y = int((y2 - y1) * 0.2)
    x1 = max(0, x1 - pad_x); y1 = max(0, y1 - pad_y)
    x2 = min(w, x2 + pad_x); y2 = min(h, y2 + pad_y)
    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return
    crop = cv2.resize(crop, (100, 100))
    ret, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ret:
        return
    with faces_lock:
        extracted_faces["faces"].append({
            "id": str(uuid.uuid4())[:8],
            "image_b64": base64.b64encode(buf.tobytes()).decode(),
            "name": name,
            "student_id": str(student_id) if student_id else None,
            "score": round(score, 3),
            "is_match": name != "Unknown",
            "frame_num": frame_num,
            "confirmed": is_confirmed,
            "timestamp": datetime.now().isoformat(),
        })
        if len(extracted_faces["faces"]) > extracted_faces["max_faces"]:
            extracted_faces["faces"] = extracted_faces["faces"][-extracted_faces["max_faces"]:]
