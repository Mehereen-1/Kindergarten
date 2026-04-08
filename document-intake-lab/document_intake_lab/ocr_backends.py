from __future__ import annotations

from functools import lru_cache
from typing import List, Optional, Sequence

import cv2
import numpy as np

from document_intake_lab.config import OcrConfig
from document_intake_lab.schemas import OcrLine


class OcrBackendError(RuntimeError):
    pass


class BaseOcrBackend:
    name = "base"

    def available(self) -> bool:
        raise NotImplementedError

    def read(self, image: np.ndarray) -> List[OcrLine]:
        raise NotImplementedError

    def warm(self) -> None:
        return None


class EasyOcrBackend(BaseOcrBackend):
    name = "easyocr"

    def __init__(self, languages: Sequence[str]) -> None:
        self.languages = list(languages)
        self._reader = None
        self._import_error: Optional[Exception] = None

    def available(self) -> bool:
        try:
            import easyocr  # noqa: F401

            return True
        except Exception as exc:
            self._import_error = exc
            return False

    def _ensure_reader(self):
        if self._reader is not None:
            return self._reader
        self._reader = _get_easyocr_reader(tuple(self.languages))
        return self._reader

    def read(self, image: np.ndarray) -> List[OcrLine]:
        if not self.available():
            raise OcrBackendError(f"EasyOCR unavailable: {self._import_error}")
        reader = self._ensure_reader()
        rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB) if image.ndim == 2 else cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        lines: List[OcrLine] = []
        for bbox, text, confidence in reader.readtext(rgb, paragraph=False):
            lines.append(
                OcrLine(
                    text=text.strip(),
                    confidence=max(0.0, min(1.0, float(confidence))),
                    bbox=[[int(point[0]), int(point[1])] for point in bbox],
                )
            )
        return [line for line in lines if line.text]

    def warm(self) -> None:
        if self.available():
            self._ensure_reader()


class TesseractOcrBackend(BaseOcrBackend):
    name = "tesseract"

    def __init__(self, languages: Sequence[str], tesseract_cmd: str = "") -> None:
        self.languages = "+".join(languages)
        self.tesseract_cmd = tesseract_cmd
        self._import_error: Optional[Exception] = None

    def available(self) -> bool:
        try:
            import pytesseract

            if self.tesseract_cmd:
                pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd
            return True
        except Exception as exc:
            self._import_error = exc
            return False

    def read(self, image: np.ndarray) -> List[OcrLine]:
        if not self.available():
            raise OcrBackendError(f"Tesseract unavailable: {self._import_error}")

        import pytesseract

        if self.tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd

        rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB) if image.ndim == 2 else cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        data = pytesseract.image_to_data(
            rgb,
            lang=self.languages,
            output_type=pytesseract.Output.DICT,
            config="--oem 3 --psm 6",
        )
        lines: List[OcrLine] = []
        for index, text in enumerate(data.get("text", [])):
            value = str(text).strip()
            if not value:
                continue
            try:
                confidence = max(0.0, min(1.0, float(data["conf"][index]) / 100.0))
            except (TypeError, ValueError, KeyError):
                confidence = 0.0
            left = int(data["left"][index])
            top = int(data["top"][index])
            width = int(data["width"][index])
            height = int(data["height"][index])
            bbox = [[left, top], [left + width, top], [left + width, top + height], [left, top + height]]
            lines.append(OcrLine(text=value, confidence=confidence, bbox=bbox))
        return lines

    def warm(self) -> None:
        self.available()


@lru_cache(maxsize=4)
def _get_easyocr_reader(languages: tuple[str, ...]):
    import easyocr

    lang_alias = {"eng": "en", "ben": "bn"}
    normalized = tuple(lang_alias.get(code.lower(), code.lower()) for code in languages)
    return easyocr.Reader(list(normalized), gpu=False)


@lru_cache(maxsize=8)
def _get_cached_backend(name: str, languages: tuple[str, ...], tesseract_cmd: str) -> BaseOcrBackend:
    if name == "easyocr":
        return EasyOcrBackend(languages)
    if name == "tesseract":
        return TesseractOcrBackend(languages, tesseract_cmd)
    raise OcrBackendError(f"Unknown OCR backend: {name}")


def build_backend(config: OcrConfig, preferred: str = "auto") -> BaseOcrBackend:
    choice = (preferred or config.preferred_backend or "auto").lower()
    languages = tuple(config.default_languages)
    if choice != "auto":
        return _get_cached_backend(choice, languages, config.tesseract_cmd)

    for name in ("easyocr", "tesseract"):
        backend = _get_cached_backend(name, languages, config.tesseract_cmd)
        if backend.available():
            return backend
    return _get_cached_backend("tesseract", languages, config.tesseract_cmd)


def available_backends(config: OcrConfig) -> List[str]:
    found: List[str] = []
    languages = tuple(config.default_languages)
    for backend in (
        _get_cached_backend("easyocr", languages, config.tesseract_cmd),
        _get_cached_backend("tesseract", languages, config.tesseract_cmd),
    ):
        if backend.available():
            found.append(backend.name)
    return found
