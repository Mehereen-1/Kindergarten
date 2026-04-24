from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Mapping, Optional, Tuple

AUDIO_MODEL_FILENAME = "final_audio_model_extratune.keras"
AUDIO_CONFIG_FILENAME = "final_audio_config_extratune.json"
AUDIO_YAMNET_HANDLE = "https://tfhub.dev/google/yamnet/1"

DEFAULT_AUDIO_THRESHOLD = 0.65
DEFAULT_AUDIO_SAMPLE_RATE = 16000
DEFAULT_AUDIO_INSTANT_THRESHOLD = 0.65
DEFAULT_AUDIO_SUSTAIN_THRESHOLD = 0.65
DEFAULT_AUDIO_INSTANT_WINDOW_SIZE = 4
DEFAULT_AUDIO_INSTANT_MIN_COUNT = 3
DEFAULT_AUDIO_WINDOW_SIZE = 5
DEFAULT_AUDIO_MIN_COUNT_IN_WINDOW = 3
DEFAULT_AUDIO_CONSECUTIVE_NEEDED = 3
DEFAULT_AUDIO_FRAME_TIME_SEC = 0.48
DEFAULT_AUDIO_EMBEDDING_SIZE = 1024
DEFAULT_AUDIO_LABEL_MAP = {0: "normal", 1: "emergency"}


@dataclass(frozen=True)
class AudioDeploymentConfig:
    model_path: Path
    config_path: Path
    threshold: float = DEFAULT_AUDIO_THRESHOLD
    sample_rate: int = DEFAULT_AUDIO_SAMPLE_RATE
    instant_threshold: float = DEFAULT_AUDIO_INSTANT_THRESHOLD
    sustain_threshold: float = DEFAULT_AUDIO_SUSTAIN_THRESHOLD
    instant_window_size: int = DEFAULT_AUDIO_INSTANT_WINDOW_SIZE
    instant_min_count: int = DEFAULT_AUDIO_INSTANT_MIN_COUNT
    window_size: int = DEFAULT_AUDIO_WINDOW_SIZE
    min_count_in_window: int = DEFAULT_AUDIO_MIN_COUNT_IN_WINDOW
    consecutive_needed: int = DEFAULT_AUDIO_CONSECUTIVE_NEEDED
    frame_time_sec: float = DEFAULT_AUDIO_FRAME_TIME_SEC
    chunk_window_seconds: float = DEFAULT_AUDIO_FRAME_TIME_SEC * 2.0
    hop_seconds: float = DEFAULT_AUDIO_FRAME_TIME_SEC
    yamnet_handle: str = AUDIO_YAMNET_HANDLE
    embedding_size: int = DEFAULT_AUDIO_EMBEDDING_SIZE
    label_map: Dict[int, str] = field(default_factory=lambda: dict(DEFAULT_AUDIO_LABEL_MAP))
    positive_class_index: int = 1
    positive_labels: Tuple[str, ...] = ("emergency",)
    raw_config: Dict[str, Any] = field(default_factory=dict)


def resolve_audio_artifacts(models_dir: Path) -> tuple[Path, Path]:
    return models_dir / AUDIO_MODEL_FILENAME, models_dir / AUDIO_CONFIG_FILENAME


def load_audio_json_config(config_path: Path) -> Dict[str, Any]:
    if not config_path.exists():
        return {}

    try:
        return json.loads(config_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise RuntimeError(f"Unable to parse audio config JSON: {config_path}") from exc


def normalize_audio_label_map(raw_label_map: Any) -> Dict[int, str]:
    if not isinstance(raw_label_map, Mapping):
        return dict(DEFAULT_AUDIO_LABEL_MAP)

    inverted: Dict[int, str] = {}
    for key, value in raw_label_map.items():
        try:
            key_index = int(key)
            inverted[key_index] = str(value)
            continue
        except (TypeError, ValueError):
            pass

        try:
            inverted[int(value)] = str(key)
        except (TypeError, ValueError):
            continue

    return inverted or dict(DEFAULT_AUDIO_LABEL_MAP)


def select_positive_class_index(label_map: Mapping[int, str]) -> int:
    non_normal_indices = [
        class_id
        for class_id, label in sorted(label_map.items(), key=lambda item: item[0])
        if str(label).strip().lower() not in {"normal", "background", "none"}
    ]
    if non_normal_indices:
        return int(non_normal_indices[0])
    return 1 if 1 in label_map else (next(iter(label_map.keys())) if label_map else 1)


def build_audio_deployment_config(
    model_path: Path,
    config_path: Path,
    raw_config: Optional[Mapping[str, Any]] = None,
) -> AudioDeploymentConfig:
    payload: Dict[str, Any] = dict(raw_config or {})
    realtime_rules = payload.get("realtime_rules", {})
    realtime_rules = realtime_rules if isinstance(realtime_rules, Mapping) else {}

    threshold = float(payload.get("threshold", DEFAULT_AUDIO_THRESHOLD) or DEFAULT_AUDIO_THRESHOLD)
    sample_rate = int(payload.get("sr", DEFAULT_AUDIO_SAMPLE_RATE) or DEFAULT_AUDIO_SAMPLE_RATE)
    frame_time_sec = float(realtime_rules.get("frame_time_sec", DEFAULT_AUDIO_FRAME_TIME_SEC) or DEFAULT_AUDIO_FRAME_TIME_SEC)
    chunk_window_seconds = max(frame_time_sec * 2.0, frame_time_sec)
    hop_seconds = frame_time_sec

    label_map = normalize_audio_label_map(payload.get("label_map", {}))
    positive_class_index = select_positive_class_index(label_map)
    positive_labels = tuple(
        label
        for class_id, label in sorted(label_map.items(), key=lambda item: item[0])
        if class_id == positive_class_index or str(label).strip().lower() != "normal"
    )

    return AudioDeploymentConfig(
        model_path=model_path,
        config_path=config_path,
        threshold=threshold,
        sample_rate=sample_rate,
        instant_threshold=float(
            realtime_rules.get("instant_threshold", DEFAULT_AUDIO_INSTANT_THRESHOLD) or DEFAULT_AUDIO_INSTANT_THRESHOLD
        ),
        sustain_threshold=float(
            realtime_rules.get("sustain_threshold", DEFAULT_AUDIO_SUSTAIN_THRESHOLD) or DEFAULT_AUDIO_SUSTAIN_THRESHOLD
        ),
        instant_window_size=int(
            realtime_rules.get("instant_window_size", DEFAULT_AUDIO_INSTANT_WINDOW_SIZE) or DEFAULT_AUDIO_INSTANT_WINDOW_SIZE
        ),
        instant_min_count=int(
            realtime_rules.get("instant_min_count", DEFAULT_AUDIO_INSTANT_MIN_COUNT) or DEFAULT_AUDIO_INSTANT_MIN_COUNT
        ),
        window_size=int(realtime_rules.get("window_size", DEFAULT_AUDIO_WINDOW_SIZE) or DEFAULT_AUDIO_WINDOW_SIZE),
        min_count_in_window=int(
            realtime_rules.get("min_count_in_window", DEFAULT_AUDIO_MIN_COUNT_IN_WINDOW) or DEFAULT_AUDIO_MIN_COUNT_IN_WINDOW
        ),
        consecutive_needed=int(
            realtime_rules.get("consecutive_needed", DEFAULT_AUDIO_CONSECUTIVE_NEEDED) or DEFAULT_AUDIO_CONSECUTIVE_NEEDED
        ),
        frame_time_sec=frame_time_sec,
        chunk_window_seconds=chunk_window_seconds,
        hop_seconds=hop_seconds,
        label_map=label_map,
        positive_class_index=positive_class_index,
        positive_labels=positive_labels or ("emergency",),
        raw_config=payload,
    )
