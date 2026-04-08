from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import cv2
import numpy as np


@dataclass
class PageDetectionResult:
    page_found: bool
    page_area_ratio: float
    contour: Optional[np.ndarray]
    warped: np.ndarray


def _order_points(points: np.ndarray) -> np.ndarray:
    pts = points.astype("float32")
    result = np.zeros((4, 2), dtype="float32")
    sums = pts.sum(axis=1)
    diffs = np.diff(pts, axis=1)
    result[0] = pts[np.argmin(sums)]
    result[2] = pts[np.argmax(sums)]
    result[1] = pts[np.argmin(diffs)]
    result[3] = pts[np.argmax(diffs)]
    return result


def _four_point_transform(image: np.ndarray, contour: np.ndarray) -> np.ndarray:
    rect = _order_points(contour.reshape(4, 2))
    (top_left, top_right, bottom_right, bottom_left) = rect
    width_top = np.linalg.norm(top_right - top_left)
    width_bottom = np.linalg.norm(bottom_right - bottom_left)
    max_width = max(int(width_top), int(width_bottom))
    height_right = np.linalg.norm(top_right - bottom_right)
    height_left = np.linalg.norm(top_left - bottom_left)
    max_height = max(int(height_right), int(height_left))
    destination = np.array(
        [[0, 0], [max_width - 1, 0], [max_width - 1, max_height - 1], [0, max_height - 1]],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(rect, destination)
    return cv2.warpPerspective(image, matrix, (max_width, max_height))


def detect_document_page(image: np.ndarray) -> PageDetectionResult:
    height, width = image.shape[:2]
    image_area = float(height * width)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 60, 180)

    contours, _ = cv2.findContours(edged, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    candidates = sorted(contours, key=cv2.contourArea, reverse=True)[:10]

    best_quad: Optional[np.ndarray] = None
    best_ratio = 0.0
    for contour in candidates:
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) != 4:
            continue
        area = cv2.contourArea(approx)
        ratio = area / image_area if image_area else 0.0
        if ratio > best_ratio:
            best_quad = approx
            best_ratio = ratio

    if best_quad is not None:
        warped = _four_point_transform(image, best_quad)
        return PageDetectionResult(
            page_found=True,
            page_area_ratio=best_ratio,
            contour=best_quad,
            warped=warped,
        )

    return PageDetectionResult(
        page_found=False,
        page_area_ratio=1.0,
        contour=None,
        warped=image.copy(),
    )
