from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Tuple


def _env_str(name: str, default: str) -> str:
    value = os.getenv(name)
    return value.strip() if value else default


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


@dataclass(frozen=True)
class QualityConfig:
    max_preview_side: int = 1280
    min_page_area_ratio: float = 0.28
    blur_threshold: float = 90.0
    dark_threshold: float = 70.0
    bright_threshold: float = 210.0
    glare_ratio_threshold: float = 0.07
    edge_density_min: float = 0.015


@dataclass(frozen=True)
class OcrConfig:
    preferred_backend: str = "auto"
    default_languages: Tuple[str, ...] = ("eng", "ben")
    tesseract_cmd: str = ""


@dataclass(frozen=True)
class AppConfig:
    root_dir: Path
    temp_dir: Path
    quality: QualityConfig = field(default_factory=QualityConfig)
    ocr: OcrConfig = field(default_factory=OcrConfig)


@lru_cache(maxsize=1)
def get_settings() -> AppConfig:
    root_dir = Path(__file__).resolve().parents[1]
    temp_dir = Path(
        _env_str(
            "DOC_LAB_TEMP_DIR",
            str(Path(tempfile.gettempdir()) / "document-intake-lab"),
        )
    )
    quality = QualityConfig(
        max_preview_side=_env_int("DOC_LAB_MAX_PREVIEW_SIDE", 1280),
        min_page_area_ratio=_env_float("DOC_LAB_MIN_PAGE_AREA", 0.28),
        blur_threshold=_env_float("DOC_LAB_BLUR_THRESHOLD", 90.0),
        dark_threshold=_env_float("DOC_LAB_DARK_THRESHOLD", 70.0),
        bright_threshold=_env_float("DOC_LAB_BRIGHT_THRESHOLD", 210.0),
        glare_ratio_threshold=_env_float("DOC_LAB_GLARE_RATIO", 0.07),
        edge_density_min=_env_float("DOC_LAB_EDGE_DENSITY_MIN", 0.015),
    )
    ocr = OcrConfig(
        preferred_backend=_env_str("DOC_LAB_OCR_BACKEND", "auto"),
        default_languages=tuple(
            lang.strip()
            for lang in _env_str("DOC_LAB_OCR_LANGS", "eng,ben").split(",")
            if lang.strip()
        )
        or ("eng", "ben"),
        tesseract_cmd=_env_str("TESSERACT_CMD", ""),
    )
    return AppConfig(root_dir=root_dir, temp_dir=temp_dir, quality=quality, ocr=ocr)
