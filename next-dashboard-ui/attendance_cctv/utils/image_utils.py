# ═══════════════════════════════════════════════════════
# image_utils.py — Image Processing Utilities
# ═══════════════════════════════════════════════════════

import cv2
import numpy as np


# =========================
# DECODE IMAGE
# =========================

def decode_image(file_bytes: bytes):
    """Decode image bytes to OpenCV format."""
    return cv2.imdecode(np.frombuffer(file_bytes, np.uint8), cv2.IMREAD_COLOR)
