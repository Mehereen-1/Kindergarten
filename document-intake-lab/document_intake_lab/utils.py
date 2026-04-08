from __future__ import annotations

import base64
import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np


def get_logger(name: str) -> logging.Logger:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    )
    return logging.getLogger(name)


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def decode_image(data: bytes) -> Optional[np.ndarray]:
    array = np.frombuffer(data, dtype=np.uint8)
    if array.size == 0:
        return None
    return cv2.imdecode(array, cv2.IMREAD_COLOR)


def resize_long_side(image: np.ndarray, max_side: int) -> np.ndarray:
    height, width = image.shape[:2]
    scale = min(1.0, float(max_side) / float(max(height, width)))
    if scale >= 1.0:
        return image
    return cv2.resize(
        image,
        (int(width * scale), int(height * scale)),
        interpolation=cv2.INTER_AREA,
    )


def encode_preview_base64(image: np.ndarray, max_width: int = 720) -> str:
    preview = resize_long_side(image, max_width)
    ok, encoded = cv2.imencode(".jpg", preview, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
    if not ok:
        return ""
    return base64.b64encode(encoded.tobytes()).decode("ascii")
