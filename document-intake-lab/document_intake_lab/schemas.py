from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class QualityIssue(BaseModel):
    code: str
    severity: Literal["info", "warning", "critical"]
    message: str


class DocumentQuality(BaseModel):
    score: float = Field(ge=0.0, le=1.0)
    page_found: bool
    page_area_ratio: float = Field(ge=0.0)
    blur_score: float = Field(ge=0.0)
    brightness: float = Field(ge=0.0, le=255.0)
    glare_ratio: float = Field(ge=0.0, le=1.0)
    edge_density: float = Field(ge=0.0, le=1.0)
    issues: List[QualityIssue] = Field(default_factory=list)


class OcrLine(BaseModel):
    text: str
    confidence: float = Field(ge=0.0, le=1.0)
    bbox: List[List[int]] = Field(default_factory=list)


class ExtractedField(BaseModel):
    key: str
    label: str
    value: str
    confidence: float = Field(ge=0.0, le=1.0)
    source_text: Optional[str] = None


class DocumentAnalysisResponse(BaseModel):
    status: Literal["rejected", "review_required", "high_confidence_prefill"]
    document_type: str
    document_type_confidence: float = Field(ge=0.0, le=1.0)
    ocr_backend: str
    quality: DocumentQuality
    fields: List[ExtractedField] = Field(default_factory=list)
    raw_text: str = ""
    ocr_lines: List[OcrLine] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    review_required: bool = True
    cleaned_preview_base64: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    ocr_backends: List[str]
