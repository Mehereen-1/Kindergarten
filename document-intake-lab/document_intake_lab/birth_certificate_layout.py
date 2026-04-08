from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable, List, Sequence, Tuple

import cv2
import numpy as np

from document_intake_lab.ocr_backends import BaseOcrBackend
from document_intake_lab.schemas import OcrLine


@dataclass(frozen=True)
class LayoutStrip:
    name: str
    bounds: Tuple[float, float, float, float]


@dataclass(frozen=True)
class FieldRegion:
    key: str
    label: str
    bounds: Tuple[float, float, float, float]
    parser: Callable[[str], str]


def _parse_text(text: str) -> str:
    return " ".join(text.replace("|", " ").replace(":", " ").split()).strip(" ,-:")


def _parse_multiline_text(text: str) -> str:
    parts = [part.strip(" :,-") for part in text.splitlines() if part.strip()]
    return ", ".join(parts)


def _parse_long_number(text: str) -> str:
    digits = "".join(character for character in text if character.isdigit())
    if 10 <= len(digits) <= 18:
        return digits
    return ""


def _parse_date(text: str) -> str:
    match = re.search(r"(\d{1,2})\D+(\d{1,2})\D+(\d{2,4})", text)
    if not match:
        return ""
    day, month, year = match.groups()
    year_value = year.zfill(4) if len(year) == 2 else year
    return f"{int(day):02d}/{int(month):02d}/{year_value}"


def _parse_sex(text: str) -> str:
    lowered = text.lower()
    if "female" in lowered:
        return "Female"
    if "male" in lowered:
        return "Male"
    return ""


TITLE_STRIP = LayoutStrip("title", (0.22, 0.10, 0.86, 0.24))

VALUE_REGIONS: Sequence[FieldRegion] = (
    FieldRegion("registration_date", "Date Of Registration", (0.03, 0.225, 0.20, 0.275), _parse_date),
    FieldRegion("registration_no", "Birth Registration Number", (0.33, 0.220, 0.68, 0.285), _parse_long_number),
    FieldRegion("date_of_issue", "Date Of Issuance", (0.78, 0.225, 0.94, 0.275), _parse_date),
    FieldRegion("date_of_birth", "Date Of Birth", (0.31, 0.300, 0.47, 0.355), _parse_date),
    FieldRegion("sex", "Sex", (0.79, 0.300, 0.91, 0.355), _parse_sex),
    FieldRegion("child_name", "Name", (0.58, 0.420, 0.90, 0.472), _parse_text),
    FieldRegion("mother_name", "Mother", (0.58, 0.470, 0.90, 0.522), _parse_text),
    FieldRegion("mother_nationality", "Nationality", (0.58, 0.520, 0.88, 0.572), _parse_text),
    FieldRegion("father_name", "Father", (0.58, 0.572, 0.90, 0.624), _parse_text),
    FieldRegion("father_nationality", "Nationality", (0.58, 0.622, 0.88, 0.674), _parse_text),
    FieldRegion("place_of_birth", "Place Of Birth", (0.58, 0.674, 0.92, 0.728), _parse_text),
    FieldRegion("permanent_address", "Permanent Address", (0.56, 0.735, 0.93, 0.845), _parse_multiline_text),
)


def _crop_region(image: np.ndarray, bounds: Tuple[float, float, float, float]) -> tuple[np.ndarray, int, int]:
    height, width = image.shape[:2]
    x1 = max(0, min(width - 1, int(bounds[0] * width)))
    y1 = max(0, min(height - 1, int(bounds[1] * height)))
    x2 = max(x1 + 1, min(width, int(bounds[2] * width)))
    y2 = max(y1 + 1, min(height, int(bounds[3] * height)))
    return image[y1:y2, x1:x2].copy(), x1, y1


def _sort_lines(lines: Sequence[OcrLine]) -> List[OcrLine]:
    def sort_key(line: OcrLine) -> tuple[int, int]:
        if not line.bbox:
            return (0, 0)
        top = min(point[1] for point in line.bbox)
        left = min(point[0] for point in line.bbox)
        return (top, left)

    return sorted(lines, key=sort_key)


def _shift_lines(lines: Sequence[OcrLine], x_offset: int, y_offset: int) -> List[OcrLine]:
    shifted: List[OcrLine] = []
    for line in lines:
        bbox = [[point[0] + x_offset, point[1] + y_offset] for point in line.bbox]
        shifted.append(OcrLine(text=line.text, confidence=line.confidence, bbox=bbox))
    return shifted


def _prepare_crop_for_ocr(image: np.ndarray) -> np.ndarray:
    if image.size == 0:
        return image
    height, width = image.shape[:2]
    if max(height, width) < 420:
        scale = 1.6
        return cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_CUBIC)
    if max(height, width) < 720:
        scale = 1.3
        return cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_CUBIC)
    return image


def _lines_to_text(lines: Sequence[OcrLine]) -> str:
    ordered = _sort_lines(lines)
    return "\n".join(line.text.strip() for line in ordered if line.text.strip())


def _ocr_region(image: np.ndarray, backend: BaseOcrBackend, bounds: Tuple[float, float, float, float]) -> tuple[str, List[OcrLine]]:
    crop, x_offset, y_offset = _crop_region(image, bounds)
    lines = backend.read(_prepare_crop_for_ocr(crop))
    shifted = _shift_lines(lines, x_offset, y_offset)
    ordered = _sort_lines(shifted)
    return _lines_to_text(ordered), ordered


def is_likely_birth_certificate(image: np.ndarray, backend: BaseOcrBackend) -> bool:
    title_text, _ = _ocr_region(image, backend, TITLE_STRIP.bounds)
    collapsed = title_text.lower().replace(" ", "")
    return "birthregistrationcertificate" in collapsed or "birthregistration" in collapsed


def extract_birth_certificate_layout_text(image: np.ndarray, backend: BaseOcrBackend) -> tuple[str, List[OcrLine]]:
    raw_sections: List[str] = []
    aggregated_lines: List[OcrLine] = []

    for region in VALUE_REGIONS:
        text, lines = _ocr_region(image, backend, region.bounds)
        aggregated_lines.extend(lines)
        value = region.parser(text)
        if value:
            raw_sections.append(f"{region.label}: {value}")

    return "\n".join(raw_sections).strip(), aggregated_lines
