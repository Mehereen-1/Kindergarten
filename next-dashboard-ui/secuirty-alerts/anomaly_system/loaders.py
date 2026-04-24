from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np

from anomaly_system.config import ModelAdapterConfig
from anomaly_system.utils import import_callable


class CheckpointLoadError(RuntimeError):
    pass


@dataclass
class LoadedTorchArtifact:
    model: Any
    torch: Any
    device: Any
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LoadedOnnxArtifact:
    session: Any
    input_name: str
    output_names: Tuple[str, ...]
    expected_rank: int
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LoadedKerasArtifact:
    model: Any
    metadata: Dict[str, Any] = field(default_factory=dict)


def lazy_import_torch() -> Any:
    try:
        import torch
    except ImportError as exc:
        raise CheckpointLoadError(
            "PyTorch is required for .pth anomaly checkpoints. Install torch in the security-alert environment."
        ) from exc
    return torch


def lazy_import_onnxruntime() -> Any:
    try:
        import onnxruntime as ort
    except ImportError as exc:
        raise CheckpointLoadError(
            "onnxruntime is required for ONNX anomaly checkpoints. Install onnxruntime in the security-alert environment."
        ) from exc
    return ort


def lazy_import_tensorflow() -> Any:
    try:
        import tensorflow as tf
    except ImportError as exc:
        raise CheckpointLoadError(
            "TensorFlow is required for the .keras audio checkpoint. Install tensorflow in the security-alert environment."
        ) from exc
    return tf


def select_torch_device(torch_module: Any, preferred: str) -> Any:
    if preferred and preferred not in {"", "auto"}:
        return torch_module.device(preferred)
    return torch_module.device("cuda" if torch_module.cuda.is_available() else "cpu")


def load_torch_checkpoint(config: ModelAdapterConfig) -> LoadedTorchArtifact:
    if not config.checkpoint_path.exists():
        raise CheckpointLoadError(f"Missing checkpoint: {config.checkpoint_path}")

    torch = lazy_import_torch()
    device = select_torch_device(torch, config.device)
    metadata: Dict[str, Any] = {"checkpoint_path": str(config.checkpoint_path), "framework": "torch"}

    try:
        model = torch.jit.load(str(config.checkpoint_path), map_location=device)
        model.eval()
        return LoadedTorchArtifact(model=model, torch=torch, device=device, metadata={**metadata, "format": "torchscript"})
    except Exception:
        pass

    checkpoint = torch.load(str(config.checkpoint_path), map_location=device)
    metadata["checkpoint_type"] = type(checkpoint).__name__

    if isinstance(checkpoint, torch.nn.Module):
        checkpoint.eval()
        checkpoint.to(device)
        return LoadedTorchArtifact(model=checkpoint, torch=torch, device=device, metadata={**metadata, "format": "module"})

    if isinstance(checkpoint, dict) and isinstance(checkpoint.get("model"), torch.nn.Module):
        model = checkpoint["model"]
        model.eval()
        model.to(device)
        return LoadedTorchArtifact(model=model, torch=torch, device=device, metadata={**metadata, "format": "dict:model"})

    state_dict = None
    if isinstance(checkpoint, dict):
        metadata["checkpoint_keys"] = list(checkpoint.keys())[:20]
        state_dict = checkpoint.get("state_dict") or checkpoint.get("model_state_dict") or checkpoint.get("model")
        if state_dict is None and checkpoint and _looks_like_state_dict(checkpoint):
            state_dict = checkpoint

    if isinstance(state_dict, dict):
        if not config.builder_import_path:
            raise CheckpointLoadError(
                f"{config.name} uses a state_dict checkpoint. Set builder_import_path for this wrapper to instantiate the model class."
            )
        builder = import_callable(config.builder_import_path)
        model = builder(checkpoint=checkpoint, config=config)
        model.load_state_dict(state_dict, strict=config.strict_state_dict)
        model.to(device)
        model.eval()
        return LoadedTorchArtifact(model=model, torch=torch, device=device, metadata={**metadata, "format": "state_dict"})

    raise CheckpointLoadError(
        f"Unsupported torch checkpoint structure for {config.name}. Provide a TorchScript/full-module checkpoint or set builder_import_path."
    )


def _looks_like_state_dict(checkpoint: Dict[str, Any]) -> bool:
    if not checkpoint:
        return False
    tensor_like = 0
    for value in checkpoint.values():
        if hasattr(value, "shape") or hasattr(value, "dtype"):
            tensor_like += 1
        else:
            return False
    return tensor_like > 0


def load_onnx_checkpoint(config: ModelAdapterConfig) -> LoadedOnnxArtifact:
    if not config.checkpoint_path.exists():
        raise CheckpointLoadError(f"Missing checkpoint: {config.checkpoint_path}")

    ort = lazy_import_onnxruntime()
    requested = list(config.onnx_providers or ("CPUExecutionProvider",))
    available = set(ort.get_available_providers())
    selected = [provider for provider in requested if provider in available]
    if not selected:
        selected = ["CPUExecutionProvider"]

    session = ort.InferenceSession(str(config.checkpoint_path), providers=selected)
    input_meta = session.get_inputs()[0]
    output_names = tuple(output.name for output in session.get_outputs())
    shape = getattr(input_meta, "shape", None) or []
    expected_rank = len(shape) if shape else 4
    return LoadedOnnxArtifact(
        session=session,
        input_name=input_meta.name,
        output_names=output_names,
        expected_rank=expected_rank,
        metadata={
            "shape": list(shape),
            "providers_requested": requested,
            "providers_selected": selected,
            "providers_available": sorted(available),
        },
    )


def load_keras_checkpoint(checkpoint_path: Path) -> LoadedKerasArtifact:
    if not checkpoint_path.exists():
        raise CheckpointLoadError(f"Missing checkpoint: {checkpoint_path}")

    tf = lazy_import_tensorflow()
    model = tf.keras.models.load_model(str(checkpoint_path), compile=False)
    return LoadedKerasArtifact(model=model, metadata={"checkpoint_path": str(checkpoint_path), "framework": "keras"})


def tensor_to_numpy(value: Any) -> np.ndarray:
    if value is None:
        return np.asarray([], dtype=np.float32)
    if isinstance(value, np.ndarray):
        return value
    if hasattr(value, "detach"):
        value = value.detach()
    if hasattr(value, "cpu"):
        value = value.cpu()
    if hasattr(value, "numpy"):
        return value.numpy()
    return np.asarray(value)
