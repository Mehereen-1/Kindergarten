from __future__ import annotations

import os
import sys
import tempfile
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple


def _env_flag(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _env_str(name: str, default: str) -> str:
    value = os.getenv(name)
    return value.strip() if value else default


def _env_optional(name: str) -> Optional[str]:
    value = os.getenv(name)
    return value.strip() if value and value.strip() else None


def _env_tuple(name: str, default: Sequence[float]) -> Tuple[float, ...]:
    value = os.getenv(name)
    if not value:
        return tuple(default)
    items: List[float] = []
    for part in value.split(","):
        try:
            items.append(float(part.strip()))
        except (TypeError, ValueError):
            return tuple(default)
    return tuple(items) if items else tuple(default)


def _python_supports_audio_stack() -> bool:
    return sys.version_info < (3, 13)


def _default_onnx_providers() -> Tuple[str, ...]:
    # Prefer DirectML on Windows when available. It can use integrated accelerators
    # and falls back to CPU automatically if unsupported in the runtime build.
    prefer_dml = _env_flag("ANOMALY_ONNX_PREFER_DML", os.name == "nt")
    if prefer_dml:
        return ("DmlExecutionProvider", "CPUExecutionProvider")
    return ("CPUExecutionProvider",)


@dataclass(frozen=True)
class ModelAdapterConfig:
    name: str
    event_type: str
    checkpoint_path: Path
    framework: str
    enabled: bool = True
    threshold: float = 0.65
    run_every_n_frames: int = 1
    temporal: bool = False
    clip_length: int = 16
    clip_stride: int = 2
    input_size: Tuple[int, int] = (224, 224)
    normalization_mean: Tuple[float, ...] = (0.485, 0.456, 0.406)
    normalization_std: Tuple[float, ...] = (0.229, 0.224, 0.225)
    positive_class_id: Optional[int] = 1
    positive_label: Optional[str] = None
    label_map: Dict[int, str] = field(default_factory=dict)
    builder_import_path: Optional[str] = None
    strict_state_dict: bool = False
    device: str = "auto"
    onnx_providers: Tuple[str, ...] = ("CPUExecutionProvider",)
    adapter_kwargs: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CrowdMotionConfig:
    enabled: bool = True
    run_every_n_frames: int = 4
    resize_width: int = 960
    tracker_max_distance_px: float = 90.0
    tracker_max_missing_frames: int = 12
    track_history_size: int = 24
    running_speed_px_per_sec: float = 180.0
    running_ratio_threshold: float = 0.65
    density_spike_multiplier: float = 2.0
    density_window: int = 20
    density_min_people: int = 8
    convergence_zone_ratio: float = 0.7
    convergence_min_people: int = 6
    center_zone: Tuple[float, float, float, float] = (0.25, 0.2, 0.75, 0.8)
    left_zone: Tuple[float, float, float, float] = (0.0, 0.0, 0.35, 1.0)
    right_zone: Tuple[float, float, float, float] = (0.65, 0.0, 1.0, 1.0)


@dataclass(frozen=True)
class FusionConfig:
    medium_confidence: float = 0.6
    high_confidence: float = 0.82
    min_alert_gap_frames: int = 18
    fight_min_confidence: float = 0.8
    fall_min_confidence: float = 0.88
    fire_min_confidence: float = 0.75
    enable_ambiguous_motion_alerts: bool = False


@dataclass(frozen=True)
class AudioModelConfig:
    name: str
    checkpoint_path: Path
    config_path: Path
    enabled: bool = True
    threshold: float = 0.4
    sample_rate: int = 16000
    embedding_size: int = 1024
    window_seconds: float = 0.48
    hop_seconds: float = 0.24
    instant_threshold: float = 0.6
    sustain_threshold: float = 0.4
    sustain_window_size: int = 5
    sustain_min_count: int = 3
    sustain_consecutive_needed: int = 2
    label_map: Dict[int, str] = field(default_factory=dict)
    positive_labels: Tuple[str, ...] = tuple()
    adapter_kwargs: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class TempFileConfig:
    directory: Path
    suffix: str = ".mp4"


@dataclass(frozen=True)
class NotificationConfig:
    enabled: bool = False
    ingest_url: Optional[str] = None
    api_token: str = ""
    timeout_seconds: float = 5.0


@dataclass(frozen=True)
class ServiceConfig:
    project_root: Path
    models_dir: Path
    device: str = "auto"
    processing_frame_stride: int = 2
    realtime_auto_stride: bool = True
    realtime_target_processing_fps: float = 10.0
    realtime_max_frame_stride: int = 4
    buffer_max_frames: int = 96
    max_video_frames: Optional[int] = None
    default_stream_frames: int = 300
    temp_files: TempFileConfig = field(default_factory=lambda: TempFileConfig(directory=Path(tempfile.gettempdir())))
    notification: NotificationConfig = field(default_factory=NotificationConfig)
    fusion: FusionConfig = field(default_factory=FusionConfig)
    fight: ModelAdapterConfig = field(default_factory=lambda: ModelAdapterConfig("", "", Path("."), "torch"))
    fall: ModelAdapterConfig = field(default_factory=lambda: ModelAdapterConfig("", "", Path("."), "torch"))
    other_models: List[ModelAdapterConfig] = field(default_factory=list)
    audio: AudioModelConfig = field(default_factory=lambda: AudioModelConfig("", Path("."), Path(".")))
    crowd_motion: CrowdMotionConfig = field(default_factory=CrowdMotionConfig)


def _model_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _discover_additional_models(models_dir: Path, known_names: Sequence[str]) -> List[ModelAdapterConfig]:
    known = {name.lower() for name in known_names}
    discovered: List[ModelAdapterConfig] = []
    for path in sorted(models_dir.glob("*.onnx")):
        if path.name.lower() in known:
            continue
        stem = path.stem.lower().replace(" ", "_")
        discovered.append(
            ModelAdapterConfig(
                name=f"{stem}_model",
                event_type=stem,
                checkpoint_path=path,
                framework="onnx",
                enabled=_env_flag(f"ANOMALY_ENABLE_{stem.upper()}", True),
                threshold=_env_float(f"ANOMALY_{stem.upper()}_THRESHOLD", 0.6),
                run_every_n_frames=_env_int(f"ANOMALY_{stem.upper()}_RUN_EVERY", 3),
                temporal=False,
                clip_length=1,
                clip_stride=1,
                input_size=(
                    _env_int(f"ANOMALY_{stem.upper()}_WIDTH", 640),
                    _env_int(f"ANOMALY_{stem.upper()}_HEIGHT", 640),
                ),
                positive_class_id=_env_int(f"ANOMALY_{stem.upper()}_POSITIVE_CLASS", 0),
                positive_label=_env_str(f"ANOMALY_{stem.upper()}_POSITIVE_LABEL", stem),
                label_map={0: stem},
                device="cpu",
                onnx_providers=_default_onnx_providers(),
            )
        )
    return discovered


@lru_cache(maxsize=1)
def get_settings() -> ServiceConfig:
    project_root = _model_root()
    models_dir = project_root / "secuirty-alerts" / "anomalyModels"
    temp_dir = Path(_env_str("ANOMALY_TEMP_DIR", str(Path(tempfile.gettempdir()) / "kindergarten-security-alerts")))

    fight = ModelAdapterConfig(
        name="fight_model",
        event_type="fight",
        checkpoint_path=models_dir / "best_fight_binary_mobilenetv3_gru.pth",
        framework="torch",
        enabled=_env_flag("ANOMALY_ENABLE_FIGHT", True),
        threshold=_env_float("ANOMALY_FIGHT_THRESHOLD", 0.72),
        run_every_n_frames=_env_int("ANOMALY_FIGHT_RUN_EVERY", 2),
        temporal=True,
        clip_length=_env_int("ANOMALY_FIGHT_CLIP_LENGTH", 16),
        clip_stride=_env_int("ANOMALY_FIGHT_CLIP_STRIDE", 1),
        input_size=(
            _env_int("ANOMALY_FIGHT_WIDTH", 224),
            _env_int("ANOMALY_FIGHT_HEIGHT", 224),
        ),
        positive_class_id=_env_int("ANOMALY_FIGHT_POSITIVE_CLASS", 1),
        positive_label=_env_str("ANOMALY_FIGHT_POSITIVE_LABEL", "fight"),
        label_map={0: "normal", 1: "fight"},
        builder_import_path=_env_optional("ANOMALY_FIGHT_BUILDER") or "anomaly_system.checkpoint_builders:build_fight_model",
        strict_state_dict=_env_flag("ANOMALY_FIGHT_STRICT", False),
        device=_env_str("ANOMALY_FIGHT_DEVICE", _env_str("ANOMALY_DEVICE", "auto")),
        adapter_kwargs={
            "logits_key": _env_optional("ANOMALY_FIGHT_LOGITS_KEY"),
            "invert_binary_scores": _env_flag("ANOMALY_FIGHT_INVERT_SCORES", False),
            "ema_alpha": _env_float("ANOMALY_FIGHT_EMA_ALPHA", 0.55),
            "hysteresis_on_margin": _env_float("ANOMALY_FIGHT_ON_MARGIN", 0.08),
            "hysteresis_off_margin": _env_float("ANOMALY_FIGHT_OFF_MARGIN", 0.18),
            "min_on_frames": _env_int("ANOMALY_FIGHT_MIN_ON_FRAMES", 2),
            "min_off_frames": _env_int("ANOMALY_FIGHT_MIN_OFF_FRAMES", 3),
            "maybe_margin": _env_float("ANOMALY_FIGHT_MAYBE_MARGIN", 0.10),
        },
    )

    fall = ModelAdapterConfig(
        name="fall_model",
        event_type="fall",
        checkpoint_path=models_dir / "best_payutch_final_refined_model _fall.pth",
        framework="torch",
        enabled=_env_flag("ANOMALY_ENABLE_FALL", True),
        threshold=_env_float("ANOMALY_FALL_THRESHOLD", 0.70),
        run_every_n_frames=_env_int("ANOMALY_FALL_RUN_EVERY", 2),
        temporal=True,
        clip_length=_env_int("ANOMALY_FALL_CLIP_LENGTH", 20),
        clip_stride=_env_int("ANOMALY_FALL_CLIP_STRIDE", 1),
        input_size=(
            _env_int("ANOMALY_FALL_WIDTH", 192),
            _env_int("ANOMALY_FALL_HEIGHT", 192),
        ),
        positive_class_id=_env_int("ANOMALY_FALL_POSITIVE_CLASS", 1),
        positive_label=_env_str("ANOMALY_FALL_POSITIVE_LABEL", "fall"),
        label_map={0: "normal", 1: "fall"},
        builder_import_path=_env_optional("ANOMALY_FALL_BUILDER") or "anomaly_system.checkpoint_builders:build_fall_model",
        strict_state_dict=_env_flag("ANOMALY_FALL_STRICT", False),
        device=_env_str("ANOMALY_FALL_DEVICE", _env_str("ANOMALY_DEVICE", "auto")),
        adapter_kwargs={
            "logits_key": _env_optional("ANOMALY_FALL_LOGITS_KEY"),
            "ema_alpha": _env_float("ANOMALY_FALL_EMA_ALPHA", 0.55),
            "hysteresis_on_margin": _env_float("ANOMALY_FALL_ON_MARGIN", 0.08),
            "hysteresis_off_margin": _env_float("ANOMALY_FALL_OFF_MARGIN", 0.18),
            "min_on_frames": _env_int("ANOMALY_FALL_MIN_ON_FRAMES", 2),
            "min_off_frames": _env_int("ANOMALY_FALL_MIN_OFF_FRAMES", 3),
            "maybe_margin": _env_float("ANOMALY_FALL_MAYBE_MARGIN", 0.10),
        },
    )

    fire = ModelAdapterConfig(
        name="fire_model",
        event_type="fire",
        checkpoint_path=models_dir / "fire_best.onnx",
        framework="onnx",
        enabled=_env_flag("ANOMALY_ENABLE_FIRE", True),
        threshold=_env_float("ANOMALY_FIRE_THRESHOLD", 0.68),
        run_every_n_frames=_env_int("ANOMALY_FIRE_RUN_EVERY", 3),
        temporal=False,
        clip_length=1,
        clip_stride=1,
        input_size=(
            _env_int("ANOMALY_FIRE_WIDTH", 640),
            _env_int("ANOMALY_FIRE_HEIGHT", 640),
        ),
        positive_class_id=_env_int("ANOMALY_FIRE_POSITIVE_CLASS", 0),
        positive_label=_env_str("ANOMALY_FIRE_POSITIVE_LABEL", "fire"),
        label_map={0: "fire"},
        device="cpu",
        onnx_providers=_default_onnx_providers(),
        adapter_kwargs={"output_name": _env_optional("ANOMALY_FIRE_OUTPUT")},
    )

    audio_config_path = models_dir / "final_audio_config_extratune.json"
    raw_audio_config: Dict[str, Any] = {}
    if audio_config_path.exists():
        try:
            import json

            raw_audio_config = json.loads(audio_config_path.read_text(encoding="utf-8"))
        except Exception:
            raw_audio_config = {}

    raw_label_map = raw_audio_config.get("label_map", {}) if isinstance(raw_audio_config, dict) else {}
    inverted_label_map: Dict[int, str] = {}
    if isinstance(raw_label_map, dict):
        for label, index in raw_label_map.items():
            try:
                inverted_label_map[int(index)] = str(label)
            except (TypeError, ValueError):
                continue

    realtime_rules = raw_audio_config.get("realtime_rules", {}) if isinstance(raw_audio_config, dict) else {}
    audio = AudioModelConfig(
        name="audio_security_model",
        checkpoint_path=models_dir / "final_audio_model_extratune.keras",
        config_path=audio_config_path,
        enabled=_env_flag("ANOMALY_ENABLE_AUDIO", _python_supports_audio_stack()),
        threshold=_env_float("ANOMALY_AUDIO_THRESHOLD", float(raw_audio_config.get("threshold", 0.35) or 0.35)),
        sample_rate=_env_int("ANOMALY_AUDIO_SR", int(raw_audio_config.get("sr", 16000) or 16000)),
        embedding_size=_env_int("ANOMALY_AUDIO_EMBEDDING_SIZE", 1024),
        window_seconds=_env_float("ANOMALY_AUDIO_WINDOW_SECONDS", float(realtime_rules.get("frame_time_sec", 0.48) or 0.48)),
        hop_seconds=_env_float(
            "ANOMALY_AUDIO_HOP_SECONDS",
            float((realtime_rules.get("frame_time_sec", 0.48) or 0.48) / 2.0),
        ),
        instant_threshold=_env_float("ANOMALY_AUDIO_INSTANT_THRESHOLD", float(realtime_rules.get("instant_threshold", 0.55) or 0.55)),
        sustain_threshold=_env_float("ANOMALY_AUDIO_SUSTAIN_THRESHOLD", float(realtime_rules.get("sustain_threshold", 0.35) or 0.35)),
        sustain_window_size=_env_int("ANOMALY_AUDIO_WINDOW_SIZE", int(realtime_rules.get("window_size", 5) or 5)),
        sustain_min_count=_env_int("ANOMALY_AUDIO_MIN_COUNT", int(realtime_rules.get("min_count_in_window", 3) or 3)),
        sustain_consecutive_needed=_env_int(
            "ANOMALY_AUDIO_CONSECUTIVE_NEEDED",
            int(realtime_rules.get("consecutive_needed", 2) or 2),
        ),
        label_map=inverted_label_map or {0: "normal", 1: "emergency"},
        positive_labels=tuple(
            label
            for label in (inverted_label_map or {0: "normal", 1: "emergency"}).values()
            if label.lower() != "normal"
        ),
        adapter_kwargs={"raw_config": raw_audio_config},
    )

    discovered_models = _discover_additional_models(models_dir, known_names=["fire_best.onnx"])

    notification = NotificationConfig(
        enabled=_env_flag("ANOMALY_NOTIFY_INGEST", False),
        ingest_url=_env_optional("ANOMALY_INGEST_URL"),
        api_token=_env_str("MODEL_ALERT_TOKEN", ""),
        timeout_seconds=_env_float("ANOMALY_NOTIFY_TIMEOUT", 5.0),
    )

    return ServiceConfig(
        project_root=project_root,
        models_dir=models_dir,
        device=_env_str("ANOMALY_DEVICE", "auto"),
        processing_frame_stride=_env_int("ANOMALY_FRAME_STRIDE", 2),
        realtime_auto_stride=_env_flag("ANOMALY_REALTIME_AUTOSTRIDE", True),
        realtime_target_processing_fps=_env_float("ANOMALY_REALTIME_TARGET_FPS", 10.0),
        realtime_max_frame_stride=_env_int("ANOMALY_REALTIME_MAX_STRIDE", 4),
        buffer_max_frames=_env_int("ANOMALY_BUFFER_MAX_FRAMES", 96),
        max_video_frames=_env_int("ANOMALY_MAX_VIDEO_FRAMES", 0) or None,
        default_stream_frames=_env_int("ANOMALY_DEFAULT_STREAM_FRAMES", 300),
        temp_files=TempFileConfig(directory=temp_dir, suffix=_env_str("ANOMALY_TEMP_SUFFIX", ".mp4")),
        notification=notification,
        fusion=FusionConfig(
            medium_confidence=_env_float("ANOMALY_FUSION_MEDIUM_CONF", 0.6),
            high_confidence=_env_float("ANOMALY_FUSION_HIGH_CONF", 0.82),
            min_alert_gap_frames=_env_int("ANOMALY_FUSION_GAP_FRAMES", 18),
            fight_min_confidence=_env_float("ANOMALY_FUSION_FIGHT_MIN_CONF", 0.8),
            fall_min_confidence=_env_float("ANOMALY_FUSION_FALL_MIN_CONF", 0.88),
            fire_min_confidence=_env_float("ANOMALY_FUSION_FIRE_MIN_CONF", 0.75),
            enable_ambiguous_motion_alerts=_env_flag("ANOMALY_ENABLE_AMBIGUOUS_MOTION_ALERTS", False),
        ),
        fight=fight,
        fall=fall,
        other_models=[fire, *discovered_models],
        audio=audio,
        crowd_motion=CrowdMotionConfig(
            enabled=_env_flag("ANOMALY_ENABLE_CROWD", True),
            run_every_n_frames=_env_int("ANOMALY_CROWD_RUN_EVERY", 4),
            resize_width=_env_int("ANOMALY_CROWD_RESIZE_WIDTH", 960),
            tracker_max_distance_px=_env_float("ANOMALY_CROWD_TRACK_DISTANCE", 90.0),
            tracker_max_missing_frames=_env_int("ANOMALY_CROWD_TRACK_MISSING", 12),
            track_history_size=_env_int("ANOMALY_CROWD_HISTORY", 24),
            running_speed_px_per_sec=_env_float("ANOMALY_CROWD_RUNNING_SPEED", 180.0),
            running_ratio_threshold=_env_float("ANOMALY_CROWD_RUNNING_RATIO", 0.65),
            density_spike_multiplier=_env_float("ANOMALY_CROWD_DENSITY_MULTIPLIER", 2.0),
            density_window=_env_int("ANOMALY_CROWD_DENSITY_WINDOW", 20),
            density_min_people=_env_int("ANOMALY_CROWD_DENSITY_MIN_PEOPLE", 8),
            convergence_zone_ratio=_env_float("ANOMALY_CROWD_CONVERGENCE_RATIO", 0.7),
            convergence_min_people=_env_int("ANOMALY_CROWD_CONVERGENCE_MIN_PEOPLE", 6),
            center_zone=tuple(_env_tuple("ANOMALY_CROWD_CENTER_ZONE", (0.25, 0.2, 0.75, 0.8))),  # type: ignore[arg-type]
            left_zone=tuple(_env_tuple("ANOMALY_CROWD_LEFT_ZONE", (0.0, 0.0, 0.35, 1.0))),  # type: ignore[arg-type]
            right_zone=tuple(_env_tuple("ANOMALY_CROWD_RIGHT_ZONE", (0.65, 0.0, 1.0, 1.0))),  # type: ignore[arg-type]
        ),
    )
