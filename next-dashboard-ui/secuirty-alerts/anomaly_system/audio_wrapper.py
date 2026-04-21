from __future__ import annotations

import subprocess
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any, Dict, List, Optional

import numpy as np

from anomaly_system.config import AudioModelConfig
from anomaly_system.loaders import LoadedKerasArtifact, load_keras_checkpoint
from anomaly_system.schemas import ModelInfo, ModelResult
from anomaly_system.utils import ensure_directory, get_logger, safe_unlink


class AudioSecurityWrapper:
    YAMNET_HANDLE = "https://tfhub.dev/google/yamnet/1"

    def __init__(self, config: AudioModelConfig, temp_dir: Path) -> None:
        self.config = config
        self.temp_dir = temp_dir
        self.logger = get_logger("security_alerts.anomaly.audio")
        self.loaded = False
        self.load_attempted = False
        self.load_error: Optional[str] = None
        self.artifact: Optional[LoadedKerasArtifact] = None
        self.tf = None
        self.hub = None
        self.librosa = None
        self.yamnet = None
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
            self.artifact = load_keras_checkpoint(self.config.checkpoint_path)
            self._load_audio_stack()
            self.loaded = True
            self.load_error = None
            self.logger.info("Loaded audio checkpoint: %s", self.config.checkpoint_path)
        except Exception as exc:
            self.loaded = False
            self.load_error = str(exc)
            raise

    def _load_audio_stack(self) -> None:
        try:
            import tensorflow as tf
            import tensorflow_hub as hub
            import librosa
        except ImportError as exc:
            raise RuntimeError(
                "Audio security inference needs tensorflow, tensorflow_hub, and librosa."
            ) from exc

        self.tf = tf
        self.hub = hub
        self.librosa = librosa
        self.yamnet = hub.load(self.YAMNET_HANDLE)

    def info(self) -> ModelInfo:
        return ModelInfo(
            name=self.name,
            event_type="security_audio",
            enabled=self.config.enabled,
            loaded=self.loaded,
            framework="keras+yamnet",
            temporal=True,
            checkpoint_path=str(self.config.checkpoint_path),
            threshold=self.config.threshold,
            extra={"load_error": self.load_error, **self.config.adapter_kwargs},
        )

    def analyze_source(self, media_source: str, *, source_type: str, max_duration_seconds: Optional[float] = None) -> List[ModelResult]:
        if not self.config.enabled:
            return []
        self.ensure_loaded()
        wav_path: Optional[Path] = None
        try:
            wav_path = self._extract_audio(media_source, max_duration_seconds=max_duration_seconds)
            wav = self._load_wav_16k_mono(wav_path)
            if wav is None or len(wav) == 0:
                return []
            embeddings = self._extract_clip_embeddings(wav)
            if embeddings is None or len(embeddings) == 0:
                return []
            probs = self._predict_embeddings(embeddings)
            return self._to_results(probs, source_type=source_type)
        finally:
            safe_unlink(wav_path)

    def _extract_audio(self, media_source: str, *, max_duration_seconds: Optional[float]) -> Path:
        ensure_directory(self.temp_dir)
        with NamedTemporaryFile(dir=self.temp_dir, delete=False, suffix=".wav") as handle:
            wav_path = Path(handle.name)

        command = [
            "ffmpeg",
            "-y",
            "-i",
            media_source,
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(self.config.sample_rate),
        ]
        if max_duration_seconds:
            command.extend(["-t", f"{max_duration_seconds:.3f}"])
        command.append(str(wav_path))

        completed = subprocess.run(command, capture_output=True, text=True)
        if completed.returncode != 0:
            safe_unlink(wav_path)
            raise RuntimeError(f"ffmpeg audio extraction failed: {completed.stderr.strip() or completed.stdout.strip()}")
        return wav_path

    def _load_wav_16k_mono(self, path: Path):
        wav, _ = self.librosa.load(str(path), sr=self.config.sample_rate, mono=True)
        if wav is None or len(wav) == 0:
            return None
        wav = wav.astype(np.float32)
        wav = np.clip(wav, -1.0, 1.0)
        return wav

    def _extract_clip_embeddings(self, wav: np.ndarray) -> np.ndarray:
        scores, embeddings, spectrogram = self.yamnet(wav)
        return embeddings.numpy().astype(np.float32)

    def _predict_embeddings(self, embeddings: np.ndarray) -> np.ndarray:
        raw = self.artifact.model.predict(embeddings, verbose=0)  # type: ignore[union-attr]
        probs = np.asarray(raw, dtype=np.float32)
        if probs.ndim == 1:
            probs = probs.reshape(-1, 1)
        elif probs.ndim > 2:
            probs = probs.reshape(probs.shape[0], -1)
        return probs

    def _to_results(self, frame_probs: np.ndarray, *, source_type: str) -> List[ModelResult]:
        if frame_probs.size == 0:
            return []

        if frame_probs.ndim == 1:
            frame_probs = frame_probs.reshape(-1, 1)

        if frame_probs.shape[1] <= 1:
            event_type = "security_audio"
            event_label = "emergency"
            per_frame_event_probs = frame_probs.reshape(-1)
        else:
            label_map = self.config.label_map or {}
            normal_class_ids = {
                class_id
                for class_id, label in label_map.items()
                if str(label).strip().lower() == "normal"
            }
            candidate_ids = [idx for idx in range(frame_probs.shape[1]) if idx not in normal_class_ids]
            if not candidate_ids:
                candidate_ids = list(range(frame_probs.shape[1]))

            class_means = frame_probs.mean(axis=0)
            best_class_id = max(candidate_ids, key=lambda idx: float(class_means[idx]))
            event_label = str(label_map.get(best_class_id, "security_audio"))
            event_type = self._normalize_audio_event_type(event_label)
            per_frame_event_probs = frame_probs[:, best_class_id]

        clip_prob = float(np.mean(per_frame_event_probs))
        max_prob = float(np.max(per_frame_event_probs))
        positive_count = int(np.sum(per_frame_event_probs >= self.config.sustain_threshold))
        alert = False
        reason = "none"
        alert_at_sec: Optional[float] = None

        for index, prob in enumerate(per_frame_event_probs):
            if prob >= self.config.instant_threshold:
                alert = True
                reason = "instant_high_confidence"
                alert_at_sec = round(index * self.frame_time_sec, 2)
                break

        if not alert:
            consecutive = 0
            for index, prob in enumerate(per_frame_event_probs):
                if prob >= self.config.sustain_threshold:
                    consecutive += 1
                    if consecutive >= self.config.sustain_consecutive_needed:
                        alert = True
                        reason = "consecutive_medium_confidence"
                        alert_at_sec = round(index * self.frame_time_sec, 2)
                        break
                else:
                    consecutive = 0

        if not alert:
            flags = (per_frame_event_probs >= self.config.sustain_threshold).astype(np.int32)
            for index in range(len(flags)):
                left = max(0, index - self.config.sustain_window_size + 1)
                count = int(np.sum(flags[left : index + 1]))
                if count >= self.config.sustain_min_count:
                    alert = True
                    reason = "window_sustained_confidence"
                    alert_at_sec = round(index * self.frame_time_sec, 2)
                    break

        if not alert and clip_prob >= self.config.threshold:
            alert = True
            reason = "clip_level_emergency"
            alert_at_sec = round(float(np.argmax(per_frame_event_probs)) * self.frame_time_sec, 2)

        if not alert:
            return []

        timestamp = float(alert_at_sec or 0.0)
        confidence = max(max_prob, clip_prob)
        return [
            ModelResult(
                model_name=self.name,
                event_type=event_type,
                label=event_label,
                confidence=confidence,
                detected=True,
                frame_index=int(round(timestamp / max(self.frame_time_sec, 1e-6))),
                timestamp=timestamp,
                metadata={
                    "audio_source": source_type,
                    "reason": reason,
                    "clip_prob": clip_prob,
                    "max_frame_prob": max_prob,
                    "mean_frame_prob": clip_prob,
                    "num_frames": int(len(per_frame_event_probs)),
                    "positive_frames_over_threshold": positive_count,
                    "frame_probs": per_frame_event_probs.tolist(),
                },
            )
        ]

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
