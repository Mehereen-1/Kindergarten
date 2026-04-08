from __future__ import annotations

from typing import Iterable, Sequence, Tuple

import cv2
import numpy as np

from anomaly_system.video_buffer import FrameRecord


def resize_rgb(frame: np.ndarray, size: Tuple[int, int]) -> np.ndarray:
    width, height = size
    resized = cv2.resize(frame, (width, height), interpolation=cv2.INTER_LINEAR)
    return cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)


def normalize_image(rgb_image: np.ndarray, mean: Sequence[float], std: Sequence[float]) -> np.ndarray:
    image = rgb_image.astype(np.float32) / 255.0
    mean_arr = np.asarray(mean, dtype=np.float32).reshape(1, 1, -1)
    std_arr = np.asarray(std, dtype=np.float32).reshape(1, 1, -1)
    return (image - mean_arr) / std_arr


def frame_to_nchw(
    frame: np.ndarray,
    size: Tuple[int, int],
    mean: Sequence[float],
    std: Sequence[float],
) -> np.ndarray:
    normalized = normalize_image(resize_rgb(frame, size), mean, std)
    chw = np.transpose(normalized, (2, 0, 1))
    return np.expand_dims(chw, axis=0).astype(np.float32)


def clip_to_ncthw(
    clip: Iterable[FrameRecord],
    size: Tuple[int, int],
    mean: Sequence[float],
    std: Sequence[float],
) -> np.ndarray:
    frames = [normalize_image(resize_rgb(item.frame, size), mean, std) for item in clip]
    if not frames:
        raise ValueError("Clip is empty")
    stacked = np.stack(frames, axis=0)  # T H W C
    btchw = np.transpose(stacked, (0, 3, 1, 2))
    return np.expand_dims(btchw, axis=0).astype(np.float32)


def adapt_numpy_to_onnx_shape(array: np.ndarray, expected_rank: int) -> np.ndarray:
    if expected_rank == array.ndim:
        return array.astype(np.float32)
    if expected_rank == 4 and array.ndim == 5:
        return array[:, -1, :, :, :].astype(np.float32)
    if expected_rank == 5 and array.ndim == 4:
        return np.expand_dims(array, axis=1).astype(np.float32)
    return array.astype(np.float32)
