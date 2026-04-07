from __future__ import annotations

import json
import logging
from contextlib import contextmanager
from pathlib import Path
from statistics import mean
from time import perf_counter
from typing import Any, Callable, Dict, Iterable, Iterator, Optional

import numpy as np


def get_logger(name: str = "security_alerts.anomaly") -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s | %(name)s | %(levelname)s | %(message)s"))
    logger.addHandler(handler)
    return logger


def import_callable(import_path: str) -> Callable[..., Any]:
    if ":" in import_path:
        module_name, attr_name = import_path.split(":", 1)
    else:
        module_name, attr_name = import_path.rsplit(".", 1)
    module = __import__(module_name, fromlist=[attr_name])
    return getattr(module, attr_name)


def load_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def safe_unlink(path: Optional[Path]) -> None:
    if path and path.exists():
        try:
            path.unlink()
        except OSError:
            pass


def sigmoid(value: Any) -> np.ndarray:
    array = np.asarray(value, dtype=np.float32)
    return 1.0 / (1.0 + np.exp(-array))


def softmax(value: Any) -> np.ndarray:
    array = np.asarray(value, dtype=np.float32)
    if array.ndim == 0:
        return np.asarray([1.0], dtype=np.float32)
    shifted = array - np.max(array)
    exp = np.exp(shifted)
    total = np.sum(exp)
    return exp / total if total else exp


def average(values: Iterable[float], default: float = 0.0) -> float:
    values_list = list(values)
    return float(mean(values_list)) if values_list else default


@contextmanager
def timed() -> Iterator[Callable[[], float]]:
    start = perf_counter()
    yield lambda: (perf_counter() - start) * 1000.0
