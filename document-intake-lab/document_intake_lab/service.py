from __future__ import annotations

import hashlib
from collections import OrderedDict
from typing import Optional

from document_intake_lab.config import AppConfig, get_settings
from document_intake_lab.ocr_backends import OcrBackendError, available_backends, build_backend
from document_intake_lab.page_detector import detect_document_page
from document_intake_lab.parsers import detect_document_type, extract_fields
from document_intake_lab.quality import assess_document_quality, crop_content_region, enhance_document_for_ocr
from document_intake_lab.schemas import DocumentAnalysisResponse, HealthResponse
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
                ocr_source = crop_content_region(cleaned)
                lines = backend.read(ocr_source)
                raw_text = "\n".join(line.text for line in lines).strip()
            else:
                warnings.append(
                    "No OCR backend is currently available. Install EasyOCR or Tesseract to enable text extraction."
                )
        except OcrBackendError as exc:
            warnings.append(str(exc))

        document_type, type_confidence = detect_document_type(raw_text, requested_type)
        fields = extract_fields(document_type, raw_text, lines)

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
