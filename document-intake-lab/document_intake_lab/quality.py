from __future__ import annotations

from typing import List

import cv2
import numpy as np

from document_intake_lab.config import QualityConfig
from document_intake_lab.page_detector import PageDetectionResult
from document_intake_lab.schemas import DocumentQuality, QualityIssue


def assess_document_quality(
    image: np.ndarray,
    page: PageDetectionResult,
    config: QualityConfig,
) -> DocumentQuality:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(gray.mean())
    glare_ratio = float((gray >= 245).sum()) / float(gray.size)
    edges = cv2.Canny(gray, 60, 180)
    edge_density = float(np.count_nonzero(edges)) / float(edges.size)

    issues: List[QualityIssue] = []
    penalties = 0.0

    if not page.page_found or page.page_area_ratio < config.min_page_area_ratio:
        issues.append(
            QualityIssue(
                code="page_missing",
                severity="critical",
                message="Could not find a clear full-page document. Retake with all four corners visible.",
            )
        )
        penalties += 0.35

    if blur_score < config.blur_threshold:
        issues.append(
            QualityIssue(
                code="blurry",
                severity="critical",
                message="Image is too blurry for reliable extraction. Hold the camera steady and retake.",
            )
        )
        penalties += 0.30

    if brightness < config.dark_threshold:
        issues.append(
            QualityIssue(
                code="too_dark",
                severity="warning",
                message="Image is too dark. Move to brighter light before capturing.",
            )
        )
        penalties += 0.15
    elif brightness > config.bright_threshold:
        issues.append(
            QualityIssue(
                code="too_bright",
                severity="warning",
                message="Image is overexposed. Reduce flash or move away from direct light.",
            )
        )
        penalties += 0.12

    if glare_ratio > config.glare_ratio_threshold:
        issues.append(
            QualityIssue(
                code="glare",
                severity="warning",
                message="Glare is covering parts of the document. Tilt the camera or document slightly.",
            )
        )
        penalties += 0.15

    if edge_density < config.edge_density_min:
        issues.append(
            QualityIssue(
                code="low_detail",
                severity="warning",
                message="The page lacks enough visible text detail. Move closer and refocus.",
            )
        )
        penalties += 0.10

    score = max(0.0, min(1.0, 1.0 - penalties))
    return DocumentQuality(
        score=score,
        page_found=page.page_found,
        page_area_ratio=page.page_area_ratio,
        blur_score=blur_score,
        brightness=brightness,
        glare_ratio=glare_ratio,
        edge_density=edge_density,
        issues=issues,
    )


def enhance_document_for_ocr(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    normalized = clahe.apply(gray)
    denoised = cv2.fastNlMeansDenoising(normalized, None, 9, 7, 21)
    cleaned = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        15,
    )
    return cleaned


def crop_content_region(image: np.ndarray, padding: int = 18) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    mask = gray < 248
    points = np.argwhere(mask)
    if points.size == 0:
        return image

    y1, x1 = points.min(axis=0)
    y2, x2 = points.max(axis=0)
    pad_y = max(padding, int((y2 - y1) * 0.02))
    pad_x = max(padding, int((x2 - x1) * 0.02))

    top = max(0, int(y1) - pad_y)
    left = max(0, int(x1) - pad_x)
    bottom = min(gray.shape[0], int(y2) + pad_y + 1)
    right = min(gray.shape[1], int(x2) + pad_x + 1)
    return image[top:bottom, left:right].copy()
