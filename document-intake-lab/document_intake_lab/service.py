from __future__ import annotations

import hashlib
from collections import OrderedDict
from typing import Optional, Tuple

import cv2
import numpy as np

from document_intake_lab.config import AppConfig, get_settings
from document_intake_lab.ocr_backends import OcrBackendError, available_backends, build_backend
from document_intake_lab.page_detector import detect_document_page
from document_intake_lab.parsers import detect_document_type, extract_fields
from document_intake_lab.quality import assess_document_quality, crop_content_region, enhance_document_for_ocr
from document_intake_lab.schemas import DocumentAnalysisResponse, DocumentQuality, HealthResponse, OcrLine, QualityIssue
from document_intake_lab.utils import (
    decode_image,
    encode_preview_base64,
    ensure_directory,
    get_logger,
    resize_long_side,
)


class DocumentIntakeService:
    def __init__(self, settings: Optional[AppConfig] = None) -> None:
        self.settings = settings or get_settings()
        self.logger = get_logger("document_intake_lab.service")
        ensure_directory(self.settings.temp_dir)
        self._analysis_cache: OrderedDict[str, DocumentAnalysisResponse] = OrderedDict()
        self._cache_size = 16
        self._warm_default_backend()

    def _warm_default_backend(self) -> None:
        try:
            backend = build_backend(self.settings.ocr, self.settings.ocr.preferred_backend)
            backend.warm()
        except Exception as exc:  # pragma: no cover - warmup should never crash the app
            self.logger.warning("OCR warmup skipped: %s", exc)

    def _make_cache_key(self, image_bytes: bytes, requested_type: Optional[str], requested_backend: str) -> str:
        digest = hashlib.sha256(image_bytes).hexdigest()
        return f"{digest}:{requested_type or 'auto'}:{requested_backend or 'auto'}"

    def _get_cached_result(self, cache_key: str) -> Optional[DocumentAnalysisResponse]:
        cached = self._analysis_cache.get(cache_key)
        if cached is None:
            return None
        self._analysis_cache.move_to_end(cache_key)
        return DocumentAnalysisResponse.model_validate(cached.model_dump())

    def _store_cached_result(self, cache_key: str, result: DocumentAnalysisResponse) -> None:
        self._analysis_cache[cache_key] = DocumentAnalysisResponse.model_validate(result.model_dump())
        self._analysis_cache.move_to_end(cache_key)
        while len(self._analysis_cache) > self._cache_size:
            self._analysis_cache.popitem(last=False)

    def _upscale_small_image(self, image: np.ndarray, *, min_long_side: int = 1400) -> np.ndarray:
        if image.size == 0:
            return image
        height, width = image.shape[:2]
        long_side = max(height, width)
        if long_side >= min_long_side:
            return image
        scale = float(min_long_side) / float(long_side)
        return cv2.resize(
            image,
            (int(width * scale), int(height * scale)),
            interpolation=cv2.INTER_CUBIC,
        )

    def _read_with_fallbacks(
        self,
        backend,
        image: np.ndarray,
        warped: np.ndarray,
        cleaned: np.ndarray,
        *,
        requested_type: Optional[str] = None,
    ) -> Tuple[str, list[OcrLine]]:
        hinted_type = (requested_type or "").lower()

        if hinted_type == "national_id":
            variants = (
                self._upscale_small_image(crop_content_region(image), min_long_side=1700),
                self._upscale_small_image(image, min_long_side=1700),
                self._upscale_small_image(crop_content_region(warped), min_long_side=1700),
                self._upscale_small_image(warped, min_long_side=1700),
                self._upscale_small_image(crop_content_region(cleaned), min_long_side=1700),
                self._upscale_small_image(cleaned, min_long_side=1700),
            )
        else:
            variants = (
                self._upscale_small_image(crop_content_region(cleaned)),
                self._upscale_small_image(crop_content_region(warped)),
                self._upscale_small_image(cleaned),
                self._upscale_small_image(warped),
            )

        best_lines: list[OcrLine] = []
        best_text = ""
        best_score = -1

        for variant in variants:
            lines = backend.read(variant)
            text = "\n".join(line.text for line in lines).strip()
            score = sum(len(line.text.strip()) for line in lines if line.text.strip())
            if score > best_score:
                best_lines = lines
                best_text = text
                best_score = score
            if text and len(lines) >= 2:
                return text, lines

        return best_text, best_lines

    def _looks_like_card_capture(self, image: np.ndarray, raw_text: str, requested_type: Optional[str], document_type: str) -> bool:
        hint = (requested_type or "").lower()
        if hint == "national_id" or document_type == "national_id":
            return True
        height, width = image.shape[:2]
        aspect = max(width, height) / max(1, min(width, height))
        if 1.35 <= aspect <= 1.95:
            return True
        return bool(raw_text) and 1.20 <= aspect <= 2.10

    def _relax_card_quality(self, quality: DocumentQuality) -> DocumentQuality:
        adjusted_issues: list[QualityIssue] = []
        for issue in quality.issues:
            if issue.code == "page_missing":
                adjusted_issues.append(
                    QualityIssue(
                        code=issue.code,
                        severity="warning",
                        message="Full-page edges were not found, but the card-style crop is still readable. Review the extracted fields before saving.",
                    )
                )
            else:
                adjusted_issues.append(issue)

        adjusted_score = min(1.0, quality.score + 0.20)
        return DocumentQuality(
            score=adjusted_score,
            page_found=quality.page_found,
            page_area_ratio=quality.page_area_ratio,
            blur_score=quality.blur_score,
            brightness=quality.brightness,
            glare_ratio=quality.glare_ratio,
            edge_density=quality.edge_density,
            issues=adjusted_issues,
        )

    def health(self) -> HealthResponse:
        return HealthResponse(status="ok", ocr_backends=available_backends(self.settings.ocr))

    def analyze_document(
        self,
        image_bytes: bytes,
        *,
        filename: str = "upload",
        requested_type: Optional[str] = None,
        requested_backend: str = "auto",
    ) -> DocumentAnalysisResponse:
        cache_key = self._make_cache_key(image_bytes, requested_type, requested_backend)
        cached = self._get_cached_result(cache_key)
        if cached is not None:
            return cached

        image = decode_image(image_bytes)
        if image is None:
            raise ValueError("Could not decode the uploaded image.")

        image = resize_long_side(image, self.settings.quality.max_preview_side)
        page = detect_document_page(image)
        quality = assess_document_quality(image, page, self.settings.quality)
        cleaned = enhance_document_for_ocr(page.warped)
        cleaned_preview = encode_preview_base64(cleaned)

        warnings = [issue.message for issue in quality.issues]
        backend_name = "none"
        raw_text = ""
        lines = []

        try:
            backend = build_backend(self.settings.ocr, requested_backend)
            backend_name = backend.name
            if backend.available():
                raw_text, lines = self._read_with_fallbacks(
                    backend,
                    image,
                    page.warped,
                    cleaned,
                    requested_type=requested_type,
                )
            else:
                warnings.append(
                    "No OCR backend is currently available. Install EasyOCR or Tesseract to enable text extraction."
                )
        except OcrBackendError as exc:
            warnings.append(str(exc))

        document_type, type_confidence = detect_document_type(raw_text, requested_type)
        fields = extract_fields(document_type, raw_text, lines)

        if self._looks_like_card_capture(page.warped, raw_text, requested_type, document_type):
            quality = self._relax_card_quality(quality)
            warnings = [
                (
                    "Full-page edges were not found, but the image looks like a card-style document, so OCR continued with a tighter crop."
                    if warning == "Could not find a clear full-page document. Retake with all four corners visible."
                    else warning
                )
                for warning in warnings
            ]

        critical_count = sum(1 for issue in quality.issues if issue.severity == "critical")
        low_field_count = sum(1 for field in fields if field.confidence < 0.7)

        if critical_count:
            status = "rejected"
        elif raw_text and len(fields) >= 3 and low_field_count == 0 and quality.score >= 0.8:
            status = "high_confidence_prefill"
        else:
            status = "review_required"

        review_required = status != "high_confidence_prefill"
        if not raw_text:
            warnings.append("OCR did not return text. Use a flatter image or install a stronger OCR backend.")
        if document_type == "unknown":
            warnings.append("Document type could not be identified confidently. Choose the document type manually.")

        result = DocumentAnalysisResponse(
            status=status,
            document_type=document_type,
            document_type_confidence=type_confidence,
            ocr_backend=backend_name,
            quality=quality,
            fields=fields,
            raw_text=raw_text,
            ocr_lines=lines,
            warnings=warnings,
            review_required=review_required,
            cleaned_preview_base64=cleaned_preview or None,
        )
        self._store_cached_result(cache_key, result)
        return result
