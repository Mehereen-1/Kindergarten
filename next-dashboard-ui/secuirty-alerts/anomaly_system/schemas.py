from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ModelResult(BaseModel):
    model_name: str
    event_type: str
    label: str
    confidence: float
    detected: bool
    frame_index: int
    timestamp: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UnifiedAlert(BaseModel):
    type: str
    severity: Literal["low", "medium", "high", "critical"]
    triggered_by: List[str] = Field(default_factory=list)
    summary: str
    confidence: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SystemMetrics(BaseModel):
    fps: float = 0.0
    processing_time_ms: float = 0.0
    processed_frames: int = 0
    sampled_frames: int = 0
    active_models: List[str] = Field(default_factory=list)


class AnalysisResponse(BaseModel):
    status: Literal["ok", "warning", "error"]
    source: str
    frame_index: int
    timestamp: float
    alerts: List[UnifiedAlert] = Field(default_factory=list)
    model_results: List[ModelResult] = Field(default_factory=list)
    system_metrics: SystemMetrics
    errors: List[str] = Field(default_factory=list)


class ModelInfo(BaseModel):
    name: str
    event_type: str
    enabled: bool
    loaded: bool
    framework: str
    temporal: bool
    checkpoint_path: str
    threshold: float
    extra: Dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded", "error"]
    initialized: bool
    models: List[ModelInfo] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


class StreamAnalyzeRequest(BaseModel):
    stream_url: str
    camera_name: Optional[str] = None
    class_name: Optional[str] = None
    max_frames: Optional[int] = None
    duration_seconds: Optional[float] = None
    notify_ingest: bool = False
