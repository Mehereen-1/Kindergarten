from __future__ import annotations

import time
from pathlib import Path
from typing import Dict, Generator, List, Optional

import cv2
import requests

from anomaly_system.audio_wrapper import AudioSecurityWrapper
from anomaly_system.base import FrameContext
from anomaly_system.config import ServiceConfig, get_settings
from anomaly_system.fusion import FusionEngine
from anomaly_system.model_registry import ModelRegistry
from anomaly_system.schemas import AnalysisResponse, HealthResponse, ModelResult, SystemMetrics
from anomaly_system.utils import ensure_directory, get_logger
from anomaly_system.video_buffer import RollingFrameBuffer


class AnomalyInferenceService:
    def __init__(self, settings: Optional[ServiceConfig] = None) -> None:
        self.settings = settings or get_settings()
        self.logger = get_logger("security_alerts.anomaly.service")
        self.registry = ModelRegistry(self.settings)
        self.audio_wrapper = AudioSecurityWrapper(self.settings.audio, self.settings.temp_files.directory)
        self.fusion = FusionEngine(self.settings.fusion)
        self.initialized = False
        self.init_errors: List[str] = []

    def initialize(self) -> None:
        if self.initialized:
            return
        ensure_directory(self.settings.temp_files.directory)
        self.registry.load_all()
        if self.settings.audio.enabled:
            try:
                self.audio_wrapper.ensure_loaded()
            except Exception as exc:
                self.audio_wrapper.load_error = str(exc)
        self.init_errors = [
            info.extra.get("load_error")
            for info in [*self.registry.models_info(), self.audio_wrapper.info()]
            if info.extra.get("load_error")
        ]
        self.initialized = True

    def health(self) -> HealthResponse:
        status = "ok" if self.initialized else "degraded"
        if self.init_errors:
            status = "error"
        return HealthResponse(
            status=status,
            initialized=self.initialized,
            models=[*self.registry.models_info(), self.audio_wrapper.info()],
            errors=list(self.init_errors),
        )

    def models(self) -> List[dict]:
        return [info.dict() for info in [*self.registry.models_info(), self.audio_wrapper.info()]]

    def analyze_video(
        self,
        video_path: Path,
        *,
        source: str,
        camera_name: Optional[str] = None,
        class_name: Optional[str] = None,
        max_frames: Optional[int] = None,
        notify_ingest: bool = False,
    ) -> AnalysisResponse:
        self.initialize()
        if not video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        capture = cv2.VideoCapture(str(video_path))
        if not capture.isOpened():
            raise RuntimeError(f"Could not open video source: {video_path}")

        audio_results: List[ModelResult] = []
        audio_errors: List[str] = []
        if self.settings.audio.enabled and not self.audio_wrapper.load_error:
            try:
                duration_limit = None
                if max_frames:
                    fps = capture.get(cv2.CAP_PROP_FPS) or 25.0
                    duration_limit = max_frames / fps
                audio_results = self.audio_wrapper.analyze_source(
                    str(video_path), source_type="video", max_duration_seconds=duration_limit
                )
            except Exception as exc:
                self.logger.warning("Audio analysis skipped for video: %s", exc)
                audio_errors.append(f"audio_analysis_skipped: {exc}")

        return self._run_capture(
            capture,
            source=source,
            camera_name=camera_name,
            class_name=class_name,
            max_frames=max_frames,
            notify_ingest=notify_ingest,
            audio_results=audio_results,
            preload_errors=audio_errors,
        )

    def stream_video_analysis(
        self,
        video_path: Path,
        *,
        source: str,
        camera_name: Optional[str] = None,
        class_name: Optional[str] = None,
        max_frames: Optional[int] = None,
    ) -> Generator[dict, None, None]:
        self.initialize()
        if not video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        capture = cv2.VideoCapture(str(video_path))
        if not capture.isOpened():
            raise RuntimeError(f"Could not open video source: {video_path}")

        try:
            yield from self._run_capture_stream(
                capture,
                source=source,
                camera_name=camera_name,
                class_name=class_name,
                max_frames=max_frames,
            )
        finally:
            capture.release()

    def analyze_stream(
        self,
        stream_url: str,
        *,
        camera_name: Optional[str] = None,
        class_name: Optional[str] = None,
        max_frames: Optional[int] = None,
        duration_seconds: Optional[float] = None,
        notify_ingest: bool = False,
    ) -> AnalysisResponse:
        self.initialize()
        stream_source = int(stream_url) if stream_url.isdigit() else stream_url
        capture = cv2.VideoCapture(stream_source)
        if not capture.isOpened():
            raise RuntimeError(f"Could not open stream source: {stream_url}")

        # Keep stream latency low by minimizing internal buffering when supported.
        if hasattr(cv2, "CAP_PROP_BUFFERSIZE"):
            capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        frame_limit = max_frames or self.settings.default_stream_frames
        audio_results: List[ModelResult] = []
        audio_errors: List[str] = []
        if duration_seconds is not None:
            fps = capture.get(cv2.CAP_PROP_FPS) or 25.0
            frame_limit = min(frame_limit, max(1, int(duration_seconds * fps)))
        if self.settings.audio.enabled and not self.audio_wrapper.load_error:
            try:
                audio_results = self.audio_wrapper.analyze_source(
                    stream_url,
                    source_type="stream",
                    max_duration_seconds=duration_seconds,
                )
            except Exception as exc:
                self.logger.warning("Audio analysis skipped for stream: %s", exc)
                audio_errors.append(f"audio_analysis_skipped: {exc}")

        return self._run_capture(
            capture,
            source="stream",
            camera_name=camera_name,
            class_name=class_name,
            max_frames=frame_limit,
            notify_ingest=notify_ingest,
            audio_results=audio_results,
            preload_errors=audio_errors,
        )

    def _run_capture(
        self,
        capture: cv2.VideoCapture,
        *,
        source: str,
        camera_name: Optional[str],
        class_name: Optional[str],
        max_frames: Optional[int],
        notify_ingest: bool,
        audio_results: Optional[List[ModelResult]] = None,
        preload_errors: Optional[List[str]] = None,
    ) -> AnalysisResponse:
        fps = capture.get(cv2.CAP_PROP_FPS) or 25.0
        buffer = RollingFrameBuffer(self.settings.buffer_max_frames)
        self.registry.reset_stream_state()

        current_stride = max(1, self.settings.processing_frame_stride)
        max_stride = max(current_stride, self.settings.realtime_max_frame_stride)
        auto_stride_enabled = bool(self.settings.realtime_auto_stride and source == "stream")
        target_processing_fps = max(1.0, float(self.settings.realtime_target_processing_fps))
        stride_window_started = time.perf_counter()
        stride_window_samples = 0

        started = time.perf_counter()
        frame_index = 0
        sampled_frames = 0
        last_timestamp = 0.0
        best_results: Dict[str, ModelResult] = {}
        errors: List[str] = list(preload_errors or [])

        frame_limit = max_frames or self.settings.max_video_frames
        while True:
            ok, frame = capture.read()
            if not ok:
                break

            frame_index += 1
            if frame_limit and frame_index > frame_limit:
                break

            timestamp = max(0.0, frame_index / fps)
            last_timestamp = timestamp
            buffer.append(frame_index, timestamp, frame)

            if frame_index % current_stride != 0:
                continue

            sampled_frames += 1
            stride_window_samples += 1
            height, width = frame.shape[:2]
            context = FrameContext(
                source=source,
                frame_index=frame_index,
                timestamp=timestamp,
                fps=fps,
                width=width,
                height=height,
                camera_name=camera_name,
                class_name=class_name,
            )

            try:
                results = self.registry.predict(frame, context, buffer)
            except Exception as exc:
                errors.append(str(exc))
                continue

            for result in results:
                self._merge_best_result(best_results, result)

            if auto_stride_enabled and stride_window_samples >= 24:
                elapsed = max(1e-6, time.perf_counter() - stride_window_started)
                observed_fps = float(stride_window_samples / elapsed)
                if observed_fps < (target_processing_fps * 0.85) and current_stride < max_stride:
                    current_stride += 1
                    self.logger.info("Realtime auto-stride increased to %s (observed_fps=%.2f)", current_stride, observed_fps)
                elif observed_fps > (target_processing_fps * 1.25) and current_stride > 1:
                    current_stride -= 1
                    self.logger.info("Realtime auto-stride decreased to %s (observed_fps=%.2f)", current_stride, observed_fps)
                stride_window_started = time.perf_counter()
                stride_window_samples = 0

        capture.release()

        for result in audio_results or []:
            self._merge_best_result(best_results, result)

        metrics = SystemMetrics(
            fps=float(sampled_frames / max(1e-6, time.perf_counter() - started)),
            processing_time_ms=(time.perf_counter() - started) * 1000.0,
            processed_frames=frame_index,
            sampled_frames=sampled_frames,
            active_models=[
                *self.registry.active_model_names(),
                *([self.audio_wrapper.name] if self.settings.audio.enabled and not self.audio_wrapper.load_error else []),
            ],
        )

        fused_alerts = self.fusion.fuse(best_results.values())

        response = AnalysisResponse(
            status="warning" if errors else "ok",
            source=source,
            frame_index=frame_index,
            timestamp=last_timestamp,
            alerts=fused_alerts,
            model_results=sorted(best_results.values(), key=lambda item: item.confidence, reverse=True),
            system_metrics=metrics,
            errors=errors,
        )

        if notify_ingest and response.alerts:
            try:
                self._notify_ingest(response, camera_name=camera_name, class_name=class_name)
            except Exception as exc:
                self.logger.exception("Failed to notify ingest endpoint")
                response.errors.append(f"ingest_notify_failed: {exc}")
                response.status = "warning"

        return response

    def _run_capture_stream(
        self,
        capture: cv2.VideoCapture,
        *,
        source: str,
        camera_name: Optional[str],
        class_name: Optional[str],
        max_frames: Optional[int],
    ) -> Generator[dict, None, None]:
        fps = capture.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames_raw = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        frame_limit = max_frames or self.settings.max_video_frames or None
        total_frames = min(total_frames_raw, frame_limit) if total_frames_raw and frame_limit else (frame_limit or total_frames_raw)

        buffer = RollingFrameBuffer(self.settings.buffer_max_frames)
        self.registry.reset_stream_state()

        current_stride = max(1, self.settings.processing_frame_stride)
        max_stride = max(current_stride, self.settings.realtime_max_frame_stride)
        auto_stride_enabled = bool(self.settings.realtime_auto_stride and source == "stream")
        target_processing_fps = max(1.0, float(self.settings.realtime_target_processing_fps))
        stride_window_started = time.perf_counter()
        stride_window_samples = 0

        started = time.perf_counter()
        frame_index = 0
        sampled_frames = 0
        last_timestamp = 0.0
        best_results: Dict[str, ModelResult] = {}
        errors: List[str] = []
        last_progress_emit = 0

        yield {
            "type": "started",
            "progress_percent": 0.0,
            "processed_frames": 0,
            "total_frames": total_frames,
            "message": "Video analysis started",
        }

        while True:
            ok, frame = capture.read()
            if not ok:
                break

            frame_index += 1
            if frame_limit and frame_index > frame_limit:
                break

            timestamp = max(0.0, frame_index / fps)
            last_timestamp = timestamp
            buffer.append(frame_index, timestamp, frame)

            if frame_index % current_stride != 0:
                continue

            sampled_frames += 1
            stride_window_samples += 1
            height, width = frame.shape[:2]
            context = FrameContext(
                source=source,
                frame_index=frame_index,
                timestamp=timestamp,
                fps=fps,
                width=width,
                height=height,
                camera_name=camera_name,
                class_name=class_name,
            )

            new_detection = False
            try:
                results = self.registry.predict(frame, context, buffer)
            except Exception as exc:
                errors.append(str(exc))
                results = []

            for result in results:
                self._merge_best_result(best_results, result)
                new_detection = new_detection or result.detected

            if auto_stride_enabled and stride_window_samples >= 24:
                elapsed = max(1e-6, time.perf_counter() - stride_window_started)
                observed_fps = float(stride_window_samples / elapsed)
                if observed_fps < (target_processing_fps * 0.85) and current_stride < max_stride:
                    current_stride += 1
                    self.logger.info("Realtime auto-stride increased to %s (observed_fps=%.2f)", current_stride, observed_fps)
                elif observed_fps > (target_processing_fps * 1.25) and current_stride > 1:
                    current_stride -= 1
                    self.logger.info("Realtime auto-stride decreased to %s (observed_fps=%.2f)", current_stride, observed_fps)
                stride_window_started = time.perf_counter()
                stride_window_samples = 0

            should_emit = False
            if new_detection:
                should_emit = True
            elif total_frames:
                step = max(1, int(total_frames * 0.05))
                if frame_index - last_progress_emit >= step:
                    should_emit = True
            elif frame_index - last_progress_emit >= 60:
                should_emit = True

            if should_emit:
                last_progress_emit = frame_index
                progress_percent = (frame_index / max(1, total_frames)) * 100.0 if total_frames else 0.0
                partial_results = sorted(best_results.values(), key=lambda item: item.confidence, reverse=True)
                yield {
                    "type": "progress",
                    "progress_percent": round(progress_percent, 1),
                    "processed_frames": frame_index,
                    "total_frames": total_frames,
                    "current_stride": current_stride,
                    "timestamp": round(timestamp, 2),
                    "message": f"Processed frame {frame_index}" + (f" / {total_frames}" if total_frames else ""),
                    "alerts": [alert.dict() for alert in self.fusion.fuse(partial_results)],
                    "model_results": [item.dict() for item in partial_results],
                    "errors": list(errors[-3:]),
                }

        metrics = SystemMetrics(
            fps=float(sampled_frames / max(1e-6, time.perf_counter() - started)),
            processing_time_ms=(time.perf_counter() - started) * 1000.0,
            processed_frames=frame_index,
            sampled_frames=sampled_frames,
            active_models=[
                *self.registry.active_model_names(),
                *([self.audio_wrapper.name] if self.settings.audio.enabled and not self.audio_wrapper.load_error else []),
            ],
        )

        fused_alerts = self.fusion.fuse(best_results.values())
        response = AnalysisResponse(
            status="warning" if errors else "ok",
            source=source,
            frame_index=frame_index,
            timestamp=last_timestamp,
            alerts=fused_alerts,
            model_results=sorted(best_results.values(), key=lambda item: item.confidence, reverse=True),
            system_metrics=metrics,
            errors=errors,
        )

        yield {
            "type": "final",
            "progress_percent": 100.0,
            "processed_frames": frame_index,
            "total_frames": total_frames,
            "result": response.dict(),
        }

    def _notify_ingest(
        self,
        response: AnalysisResponse,
        *,
        camera_name: Optional[str],
        class_name: Optional[str],
    ) -> None:
        notification = self.settings.notification
        if not notification.enabled or not notification.ingest_url:
            return

        headers = {"Content-Type": "application/json"}
        if notification.api_token:
            headers["x-model-alert-token"] = notification.api_token

        payload = {
            "source": response.source,
            "cameraName": camera_name or "",
            "className": class_name or "",
            "frameIndex": response.frame_index,
            "timestamp": response.timestamp,
            "alerts": [alert.dict() for alert in response.alerts],
            "modelResults": [result.dict() for result in response.model_results],
            "systemMetrics": response.system_metrics.dict(),
        }

        requests.post(notification.ingest_url, json=payload, headers=headers, timeout=notification.timeout_seconds).raise_for_status()

    def analyze_audio(
        self,
        media_path: Path,
        *,
        source: str,
        camera_name: Optional[str] = None,
        class_name: Optional[str] = None,
        notify_ingest: bool = False,
    ) -> AnalysisResponse:
        self.initialize()
        if not media_path.exists():
            raise FileNotFoundError(f"Audio source not found: {media_path}")

        started = time.perf_counter()
        audio_results = self.audio_wrapper.analyze_source(str(media_path), source_type=source)
        alerts = self.fusion.fuse(audio_results)
        response = AnalysisResponse(
            status="ok",
            source=source,
            frame_index=max((result.frame_index for result in audio_results), default=0),
            timestamp=max((result.timestamp for result in audio_results), default=0.0),
            alerts=alerts,
            model_results=audio_results,
            system_metrics=SystemMetrics(
                fps=0.0,
                processing_time_ms=(time.perf_counter() - started) * 1000.0,
                processed_frames=0,
                sampled_frames=0,
                active_models=[self.audio_wrapper.name] if self.settings.audio.enabled and not self.audio_wrapper.load_error else [],
            ),
            errors=[],
        )
        if notify_ingest and response.alerts:
            try:
                self._notify_ingest(response, camera_name=camera_name, class_name=class_name)
            except Exception as exc:
                self.logger.exception("Failed to notify ingest endpoint")
                response.errors.append(f"ingest_notify_failed: {exc}")
                response.status = "warning"
        return response

    def _merge_best_result(self, best_results: Dict[str, ModelResult], result: ModelResult) -> None:
        key = f"{result.model_name}:{result.event_type}"
        existing = best_results.get(key)
        if existing is None:
            best_results[key] = result
            return

        if result.detected and not existing.detected:
            best_results[key] = result
            return

        if result.detected == existing.detected and result.confidence > existing.confidence:
            best_results[key] = result


_service: Optional[AnomalyInferenceService] = None


def get_anomaly_service() -> AnomalyInferenceService:
    global _service
    if _service is None:
        _service = AnomalyInferenceService()
    return _service
