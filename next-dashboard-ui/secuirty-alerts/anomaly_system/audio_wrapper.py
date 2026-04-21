from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from anomaly_system.audio_inference import (
    AudioInferenceResult,
    RealtimeAudioAlertEngine,
    load_audio_model_and_config,
    load_yamnet,
    process_video_file,
    process_wav_file,
)
from anomaly_system.config import AudioModelConfig
from anomaly_system.loaders import LoadedKerasArtifact
from anomaly_system.schemas import ModelInfo, ModelResult
from anomaly_system.utils import get_logger


class AudioSecurityWrapper:
    def __init__(self, config: AudioModelConfig, temp_dir: Path) -> None:
        self.config = config
        self.temp_dir = temp_dir
        self.logger = get_logger("security_alerts.anomaly.audio")
        self.loaded = False
        self.load_attempted = False
        self.load_error: Optional[str] = None
        self.artifact: Optional[LoadedKerasArtifact] = None
        self.audio_model = None
        self.yamnet = None
        self.deployment_config = None
        self.engine: Optional[RealtimeAudioAlertEngine] = None
        self.frame_time_sec = float(
            self.config.adapter_kwargs.get("raw_config", {}).get("realtime_rules", {}).get("frame_time_sec", self.config.window_seconds)
        )

    @property
    def name(self) -> str:
        return self.config.name

    def ensure_loaded(self) -> None:
        if self.loaded or not self.config.enabled:
            return
        if self.load_attempted and self.load_error:
            raise RuntimeError(self.load_error)

        self.load_attempted = True
        try:
            self.audio_model, self.deployment_config = self._load_deployment_bundle()
            self.yamnet = load_yamnet(self.deployment_config.yamnet_handle)
            self.engine = RealtimeAudioAlertEngine(self.audio_model, self.yamnet, self.deployment_config)
            self.engine.warmup()
            self.artifact = LoadedKerasArtifact(
                model=self.audio_model,
                metadata={
                    "checkpoint_path": str(self.deployment_config.model_path),
                    "config_path": str(self.deployment_config.config_path),
                    "framework": "keras",
                    "yamnet_handle": self.deployment_config.yamnet_handle,
                },
            )
            self.loaded = True
            self.load_error = None
            self.logger.info("Loaded audio checkpoint: %s", self.deployment_config.model_path)
        except Exception as exc:
            self.loaded = False
            self.load_error = str(exc)
            raise

    def _load_deployment_bundle(self):
        model, deployment_config = load_audio_model_and_config(
            str(self.config.checkpoint_path),
            str(self.config.config_path),
        )
        return model, deployment_config

    def info(self) -> ModelInfo:
        extra = {
            "load_error": self.load_error,
            **self.config.adapter_kwargs,
        }
        if self.deployment_config is not None:
            extra.update(
                {
                    "frame_time_sec": self.deployment_config.frame_time_sec,
                    "chunk_window_seconds": self.deployment_config.chunk_window_seconds,
                    "hop_seconds": self.deployment_config.hop_seconds,
                    "instant_threshold": self.deployment_config.instant_threshold,
                    "sustain_threshold": self.deployment_config.sustain_threshold,
                    "instant_window_size": self.deployment_config.instant_window_size,
                    "instant_min_count": self.deployment_config.instant_min_count,
                    "window_size": self.deployment_config.window_size,
                    "min_count_in_window": self.deployment_config.min_count_in_window,
                    "consecutive_needed": self.deployment_config.consecutive_needed,
                }
            )
        return ModelInfo(
            name=self.name,
            event_type="security_audio",
            enabled=self.config.enabled,
            loaded=self.loaded,
            framework="keras+yamnet",
            temporal=True,
            checkpoint_path=str(self.config.checkpoint_path),
            threshold=self.config.threshold,
            extra=extra,
        )

    def analyze_source(
        self,
        media_source: str,
        *,
        source_type: str,
        max_duration_seconds: Optional[float] = None,
    ) -> List[ModelResult]:
        if not self.config.enabled:
            return []

        self.ensure_loaded()
        assert self.audio_model is not None
        assert self.yamnet is not None
        assert self.deployment_config is not None

        try:
            if source_type == "audio":
                result = process_wav_file(
                    media_source,
                    audio_model=self.audio_model,
                    yamnet_model=self.yamnet,
                    config=self.deployment_config,
                )
            else:
                result = process_video_file(
                    media_source,
                    audio_model=self.audio_model,
                    yamnet_model=self.yamnet,
                    config=self.deployment_config,
                    max_duration_seconds=max_duration_seconds,
                )
            return [self._to_model_result(result, source_type=source_type)]
        except Exception as exc:
            self.load_error = str(exc)
            raise

    def _to_model_result(self, result: AudioInferenceResult, *, source_type: str) -> ModelResult:
        detected_label = "emergency" if result.alert else "normal"
        event_type = self._normalize_audio_event_type(detected_label if result.alert else "normal")
        frame_time_sec = self.deployment_config.frame_time_sec if self.deployment_config is not None else self.frame_time_sec
        timestamp = float(
            result.alert_at_sec if result.alert_at_sec is not None else max(result.num_frames - 1, 0) * frame_time_sec
        )
        frame_index = int(round(timestamp / max(frame_time_sec, 1e-6)))
        confidence = float(max(result.clip_prob, result.max_frame_prob))
        return ModelResult(
            model_name=self.name,
            event_type=event_type,
            label=detected_label,
            confidence=confidence,
            detected=result.alert,
            frame_index=frame_index,
            timestamp=timestamp,
            metadata={
                "audio_source": source_type,
                "reason": result.reason,
                "alert": result.alert,
                "clip_prob": result.clip_prob,
                "max_frame_prob": result.max_frame_prob,
                "num_frames": result.num_frames,
                "alert_at_sec": result.alert_at_sec,
                "frame_probs": result.frame_probs,
            },
        )

    def _normalize_audio_event_type(self, label: str) -> str:
        text = label.strip().lower().replace("-", "_").replace(" ", "_")
        if "alarm" in text or "siren" in text:
            return "alarm"
        if "scream" in text or "distress" in text or "cry" in text:
            return "distress_scream"
        if "glass" in text and "break" in text:
            return "glass_break"
        if "impact" in text or "crash" in text or "bang" in text:
            return "crash_impact"
        if text in {"normal", "none", "background"}:
            return "normal"
        return "security_audio"
