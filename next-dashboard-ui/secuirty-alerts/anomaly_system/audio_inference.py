from __future__ import annotations

from dataclasses import asdict, dataclass, field
from functools import lru_cache
from pathlib import Path
from time import perf_counter
from typing import Any, Dict, Iterable, Iterator, List, Optional, Sequence, Tuple

import numpy as np

from anomaly_system.audio_utils import (
    iter_ffmpeg_audio_blocks,
    iter_microphone_audio_blocks,
    iter_wav_blocks,
    pad_or_trim,
    resample_waveform,
    ensure_float32_mono,
)
from anomaly_system.config_loader import (
    AUDIO_YAMNET_HANDLE,
    AudioDeploymentConfig,
    build_audio_deployment_config,
    load_audio_json_config,
    resolve_audio_artifacts,
)


@dataclass(frozen=True)
class AudioInferenceResult:
    alert: bool
    reason: str
    clip_prob: float
    max_frame_prob: float
    num_frames: int
    alert_at_sec: Optional[float]
    frame_probs: List[float] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _lazy_import_tensorflow() -> Any:
    try:
        import tensorflow as tf
    except ImportError as exc:
        raise RuntimeError(
            "TensorFlow is required to load the audio deployment checkpoint. Install tensorflow in the security-alert environment."
        ) from exc
    return tf


def _lazy_import_tensorflow_hub() -> Any:
    try:
        import tensorflow_hub as hub
    except ImportError as exc:
        raise RuntimeError(
            "TensorFlow Hub is required to load YAMNet. Install tensorflow_hub in the security-alert environment."
        ) from exc
    return hub


def _softmax_last_axis(array: np.ndarray) -> np.ndarray:
    shifted = array - np.max(array, axis=-1, keepdims=True)
    exp = np.exp(shifted)
    denom = np.sum(exp, axis=-1, keepdims=True)
    denom = np.maximum(denom, 1e-9)
    return exp / denom


def _sigmoid(array: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-array))


def _extract_positive_probabilities(raw_output: Any, *, positive_class_index: int) -> np.ndarray:
    if isinstance(raw_output, dict):
        if "logits" in raw_output:
            raw_output = raw_output["logits"]
        elif "scores" in raw_output:
            raw_output = raw_output["scores"]
        else:
            raw_output = next(iter(raw_output.values()))

    array = np.asarray(raw_output, dtype=np.float32)
    if array.size == 0:
        return np.asarray([], dtype=np.float32)

    if array.ndim == 0:
        return np.asarray([float(_sigmoid(array))], dtype=np.float32)

    if array.ndim == 1:
        if array.size == 1:
            return np.asarray([float(_sigmoid(array)[0])], dtype=np.float32)
        if array.size == 2 and (np.min(array) < 0.0 or np.max(array) > 1.0):
            probs = _softmax_last_axis(array.reshape(1, -1))[0]
            index = min(positive_class_index, probs.size - 1)
            return np.asarray([float(probs[index])], dtype=np.float32)
        if array.size == 2:
            index = min(positive_class_index, 1)
            if np.max(array) <= 1.0 and np.min(array) >= 0.0:
                return np.asarray([float(array[index])], dtype=np.float32)
            probs = _softmax_last_axis(array.reshape(1, -1))[0]
            return np.asarray([float(probs[index])], dtype=np.float32)
        if np.max(array) <= 1.0 and np.min(array) >= 0.0:
            return array.astype(np.float32, copy=False)
        return _sigmoid(array).astype(np.float32, copy=False)

    if array.ndim >= 2 and array.shape[-1] == 1:
        return _sigmoid(array[..., 0]).astype(np.float32, copy=False).reshape(-1)

    if array.ndim >= 2 and array.shape[-1] >= 2:
        last_axis = array.shape[-1]
        if np.min(array) < 0.0 or np.max(array) > 1.0:
            probs = _softmax_last_axis(array)
        else:
            row_sums = np.sum(array, axis=-1, keepdims=True)
            if np.allclose(row_sums, 1.0, atol=1e-3):
                probs = array
            else:
                probs = _softmax_last_axis(array)
        index = min(positive_class_index, last_axis - 1)
        return probs[..., index].astype(np.float32, copy=False).reshape(-1)

    return array.astype(np.float32, copy=False).reshape(-1)


@lru_cache(maxsize=1)
def load_audio_model_and_config(
    model_path: Optional[str] = None,
    config_path: Optional[str] = None,
) -> tuple[Any, AudioDeploymentConfig]:
    tf = _lazy_import_tensorflow()

    default_model_path, default_config_path = resolve_audio_artifacts(
        Path(__file__).resolve().parents[1] / "anomalyModels"
    )
    resolved_model_path = Path(model_path) if model_path else default_model_path
    resolved_config_path = Path(config_path) if config_path else default_config_path

    if not resolved_model_path.exists():
        raise FileNotFoundError(f"Missing audio model checkpoint: {resolved_model_path}")
    if not resolved_config_path.exists():
        raise FileNotFoundError(f"Missing audio config file: {resolved_config_path}")

    raw_config = load_audio_json_config(resolved_config_path)
    deployment_config = build_audio_deployment_config(resolved_model_path, resolved_config_path, raw_config)
    model = tf.keras.models.load_model(str(resolved_model_path), compile=False)
    return model, deployment_config


@lru_cache(maxsize=1)
def load_yamnet(handle: str = AUDIO_YAMNET_HANDLE) -> Any:
    hub = _lazy_import_tensorflow_hub()
    return hub.load(handle)


def extract_yamnet_embeddings_from_waveform(
    waveform: np.ndarray,
    yamnet_model: Any,
) -> np.ndarray:
    if waveform.size == 0:
        return np.asarray([], dtype=np.float32).reshape(0, 0)

    _scores, embeddings, _spectrogram = yamnet_model(waveform)
    if hasattr(embeddings, "numpy"):
        embeddings = embeddings.numpy()
    return np.asarray(embeddings, dtype=np.float32)


def preprocess_audio_chunk(
    audio_chunk: np.ndarray,
    sample_rate: int,
    target_sample_rate: int = 16000,
    target_window_seconds: Optional[float] = None,
) -> np.ndarray:
    waveform = ensure_float32_mono(np.asarray(audio_chunk, dtype=np.float32))
    if waveform.size == 0:
        return np.asarray([], dtype=np.float32)

    if sample_rate != target_sample_rate:
        waveform = resample_waveform(waveform, source_sr=sample_rate, target_sr=target_sample_rate)

    if target_window_seconds is not None:
        target_samples = max(1, int(round(target_sample_rate * target_window_seconds)))
        waveform = pad_or_trim(waveform, target_samples)

    return np.clip(waveform, -1.0, 1.0).astype(np.float32, copy=False)


def predict_audio_chunk(
    audio_model: Any,
    embeddings: np.ndarray,
    config: AudioDeploymentConfig,
) -> np.ndarray:
    if embeddings.size == 0:
        return np.asarray([], dtype=np.float32)

    try:
        input_tensors = list(getattr(audio_model, "inputs", []) or [])
        if len(input_tensors) == 1 and getattr(input_tensors[0], "name", None):
            input_name = str(input_tensors[0].name).split(":")[0]
            raw_output = audio_model({input_name: embeddings}, training=False)
        else:
            raw_output = audio_model(embeddings, training=False)
    except Exception:
        raw_output = audio_model.predict(embeddings, verbose=0)
    frame_probs = _extract_positive_probabilities(
        raw_output,
        positive_class_index=config.positive_class_index,
    )
    return np.asarray(frame_probs, dtype=np.float32).reshape(-1)


def _resolve_runtime_bundle(
    audio_model: Optional[Any],
    yamnet_model: Optional[Any],
    config: Optional[AudioDeploymentConfig],
) -> tuple[Any, Any, AudioDeploymentConfig]:
    if config is None:
        audio_model, config = load_audio_model_and_config()
    elif audio_model is None:
        audio_model, config = load_audio_model_and_config(str(config.model_path), str(config.config_path))
    if yamnet_model is None:
        yamnet_model = load_yamnet(config.yamnet_handle)
    return audio_model, yamnet_model, config


class RealtimeAudioAlertEngine:
    def __init__(
        self,
        audio_model: Any,
        yamnet_model: Any,
        config: AudioDeploymentConfig,
    ) -> None:
        self.audio_model = audio_model
        self.yamnet_model = yamnet_model
        self.config = config
        self.window_samples = max(1, int(round(self.config.sample_rate * self.config.chunk_window_seconds)))
        self.hop_samples = max(1, int(round(self.config.sample_rate * self.config.hop_seconds)))
        self.reset()

    def reset(self) -> None:
        self._sample_buffer = np.asarray([], dtype=np.float32)
        self._frame_probs: List[float] = []
        self._frame_timestamps: List[float] = []
        self._alert = False
        self._reason = "none"
        self._alert_at_sec: Optional[float] = None
        self._consecutive_medium = 0
        self._recent_high_flags: List[int] = []
        self._recent_flags: List[int] = []
        self._processed_windows = 0
        self._last_window_start_sec = 0.0

    def warmup(self) -> None:
        """Run one tiny inference pass so the first real alert is low-latency."""
        dummy_window = np.zeros(self.window_samples, dtype=np.float32)
        window = preprocess_audio_chunk(
            dummy_window,
            sample_rate=self.config.sample_rate,
            target_sample_rate=self.config.sample_rate,
            target_window_seconds=self.config.chunk_window_seconds,
        )
        embeddings = extract_yamnet_embeddings_from_waveform(window, self.yamnet_model)
        if embeddings.size == 0:
            return
        predict_audio_chunk(self.audio_model, embeddings, self.config)

    def ingest_samples(self, samples: np.ndarray, *, finalize: bool = False) -> List[AudioInferenceResult]:
        outputs: List[AudioInferenceResult] = []
        block = ensure_float32_mono(samples)
        if block.size:
            self._sample_buffer = np.concatenate([self._sample_buffer, block])

        while self._sample_buffer.size >= self.window_samples:
            window = self._sample_buffer[: self.window_samples]
            outputs.append(self._process_window(window))
            self._processed_windows += 1
            self._last_window_start_sec = self._processed_windows * self.config.frame_time_sec
            if self._sample_buffer.size <= self.hop_samples:
                self._sample_buffer = np.asarray([], dtype=np.float32)
                break
            self._sample_buffer = self._sample_buffer[self.hop_samples :]

        if finalize and self._sample_buffer.size > 0:
            padded = np.pad(self._sample_buffer, (0, self.window_samples - self._sample_buffer.size), mode="constant")
            outputs.append(self._process_window(padded))
            self._sample_buffer = np.asarray([], dtype=np.float32)
        return outputs

    def finalize(self) -> AudioInferenceResult:
        if self._sample_buffer.size > 0:
            self.ingest_samples(np.asarray([], dtype=np.float32), finalize=True)
        return self.snapshot()

    def snapshot(self) -> AudioInferenceResult:
        frame_probs = [float(prob) for prob in self._frame_probs]
        if frame_probs:
            clip_prob = float(np.mean(frame_probs))
            max_prob = float(np.max(frame_probs))
        else:
            clip_prob = 0.0
            max_prob = 0.0
        return AudioInferenceResult(
            alert=self._alert,
            reason=self._reason if self._alert else "none",
            clip_prob=clip_prob,
            max_frame_prob=max_prob,
            num_frames=len(frame_probs),
            alert_at_sec=self._alert_at_sec if self._alert else None,
            frame_probs=frame_probs,
        )

    def _process_window(self, waveform_window: np.ndarray) -> AudioInferenceResult:
        window = preprocess_audio_chunk(
            waveform_window,
            sample_rate=self.config.sample_rate,
            target_sample_rate=self.config.sample_rate,
            target_window_seconds=self.config.chunk_window_seconds,
        )
        embeddings = extract_yamnet_embeddings_from_waveform(window, self.yamnet_model)
        frame_probs = predict_audio_chunk(self.audio_model, embeddings, self.config)
        if frame_probs.size == 0:
            return self.snapshot()

        window_start_sec = self._processed_windows * self.config.frame_time_sec
        for index, prob in enumerate(frame_probs):
            timestamp = float(window_start_sec + index * self.config.frame_time_sec)
            self._observe_frame(float(prob), timestamp)

        return self.snapshot()

    def _observe_frame(self, prob: float, timestamp_sec: float) -> None:
        self._frame_probs.append(float(prob))
        self._frame_timestamps.append(float(timestamp_sec))

        if self._alert:
            return

        self._recent_high_flags.append(1 if prob >= self.config.instant_threshold else 0)
        if len(self._recent_high_flags) > self.config.instant_window_size:
            self._recent_high_flags = self._recent_high_flags[-self.config.instant_window_size :]
        if len(self._recent_high_flags) >= self.config.instant_window_size:
            if sum(self._recent_high_flags[-self.config.instant_window_size :]) >= self.config.instant_min_count:
                self._alert = True
                self._reason = "instant_high_confidence"
                self._alert_at_sec = float(timestamp_sec)
                return

        if prob >= self.config.sustain_threshold:
            self._consecutive_medium += 1
        else:
            self._consecutive_medium = 0

        if self._consecutive_medium >= self.config.consecutive_needed:
            self._alert = True
            self._reason = "consecutive_medium_confidence"
            self._alert_at_sec = float(timestamp_sec)
            return

        self._recent_flags.append(1 if prob >= self.config.sustain_threshold else 0)
        if len(self._recent_flags) > self.config.window_size:
            self._recent_flags = self._recent_flags[-self.config.window_size :]

        if len(self._recent_flags) >= self.config.window_size:
            if sum(self._recent_flags[-self.config.window_size :]) >= self.config.min_count_in_window:
                self._alert = True
                self._reason = "window_sustained_confidence"
                self._alert_at_sec = float(timestamp_sec)


def _process_source_with_engine(
    engine: RealtimeAudioAlertEngine,
    block_iter: Iterable[np.ndarray],
) -> AudioInferenceResult:
    for block in block_iter:
        engine.ingest_samples(block)
    return engine.finalize()


def _stream_source_with_engine(
    engine: RealtimeAudioAlertEngine,
    block_iter: Iterable[np.ndarray],
) -> Iterator[AudioInferenceResult]:
    for block in block_iter:
        for result in engine.ingest_samples(block):
            yield result
    yield engine.finalize()


def process_wav_file(
    wav_path: str | Path,
    *,
    audio_model: Optional[Any] = None,
    yamnet_model: Optional[Any] = None,
    config: Optional[AudioDeploymentConfig] = None,
) -> AudioInferenceResult:
    audio_model, yamnet_model, config = _resolve_runtime_bundle(audio_model, yamnet_model, config)

    engine = RealtimeAudioAlertEngine(audio_model, yamnet_model, config)
    block_iter = iter_wav_blocks(Path(wav_path), target_sample_rate=config.sample_rate, hop_seconds=config.hop_seconds)
    return _process_source_with_engine(engine, block_iter)


def process_video_file(
    video_path: str | Path,
    *,
    audio_model: Optional[Any] = None,
    yamnet_model: Optional[Any] = None,
    config: Optional[AudioDeploymentConfig] = None,
    max_duration_seconds: Optional[float] = None,
) -> AudioInferenceResult:
    audio_model, yamnet_model, config = _resolve_runtime_bundle(audio_model, yamnet_model, config)

    engine = RealtimeAudioAlertEngine(audio_model, yamnet_model, config)
    block_iter = iter_ffmpeg_audio_blocks(
        str(video_path),
        target_sample_rate=config.sample_rate,
        hop_seconds=config.hop_seconds,
        max_duration_seconds=max_duration_seconds,
    )
    return _process_source_with_engine(engine, block_iter)


def process_wav_file_stream(
    wav_path: str | Path,
    *,
    audio_model: Optional[Any] = None,
    yamnet_model: Optional[Any] = None,
    config: Optional[AudioDeploymentConfig] = None,
) -> Iterator[AudioInferenceResult]:
    audio_model, yamnet_model, config = _resolve_runtime_bundle(audio_model, yamnet_model, config)

    engine = RealtimeAudioAlertEngine(audio_model, yamnet_model, config)
    block_iter = iter_wav_blocks(Path(wav_path), target_sample_rate=config.sample_rate, hop_seconds=config.hop_seconds)
    yield from _stream_source_with_engine(engine, block_iter)


def process_video_file_stream(
    video_path: str | Path,
    *,
    audio_model: Optional[Any] = None,
    yamnet_model: Optional[Any] = None,
    config: Optional[AudioDeploymentConfig] = None,
    max_duration_seconds: Optional[float] = None,
) -> Iterator[AudioInferenceResult]:
    audio_model, yamnet_model, config = _resolve_runtime_bundle(audio_model, yamnet_model, config)

    engine = RealtimeAudioAlertEngine(audio_model, yamnet_model, config)
    block_iter = iter_ffmpeg_audio_blocks(
        str(video_path),
        target_sample_rate=config.sample_rate,
        hop_seconds=config.hop_seconds,
        max_duration_seconds=max_duration_seconds,
    )
    yield from _stream_source_with_engine(engine, block_iter)


def process_microphone_stream(
    *,
    audio_model: Optional[Any] = None,
    yamnet_model: Optional[Any] = None,
    config: Optional[AudioDeploymentConfig] = None,
    device: Optional[int | str] = None,
    duration_seconds: Optional[float] = None,
) -> Iterator[AudioInferenceResult]:
    audio_model, yamnet_model, config = _resolve_runtime_bundle(audio_model, yamnet_model, config)

    engine = RealtimeAudioAlertEngine(audio_model, yamnet_model, config)
    started = perf_counter()
    for block in iter_microphone_audio_blocks(
        target_sample_rate=config.sample_rate,
        hop_seconds=config.hop_seconds,
        device=device,
    ):
        for result in engine.ingest_samples(block):
            yield result
        if duration_seconds is not None and (perf_counter() - started) >= duration_seconds:
            break

    yield engine.finalize()
