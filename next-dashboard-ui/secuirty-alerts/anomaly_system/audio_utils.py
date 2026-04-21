from __future__ import annotations

import os
import subprocess
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Generator, Iterable, Iterator, Optional

import librosa
import numpy as np
import soundfile as sf


def ensure_float32_mono(waveform: np.ndarray) -> np.ndarray:
    array = np.asarray(waveform, dtype=np.float32)
    if array.ndim == 0:
        array = array.reshape(1)
    if array.ndim > 1:
        array = np.mean(array, axis=-1)
    return np.clip(array.reshape(-1), -1.0, 1.0).astype(np.float32, copy=False)


def resample_waveform(waveform: np.ndarray, source_sr: int, target_sr: int) -> np.ndarray:
    if source_sr == target_sr:
        return ensure_float32_mono(waveform)
    if waveform.size == 0:
        return np.asarray([], dtype=np.float32)
    return librosa.resample(ensure_float32_mono(waveform), orig_sr=source_sr, target_sr=target_sr).astype(np.float32)


def pad_or_trim(waveform: np.ndarray, target_samples: int) -> np.ndarray:
    array = ensure_float32_mono(waveform)
    if target_samples <= 0:
        return array
    if array.size > target_samples:
        return array[:target_samples].astype(np.float32, copy=False)
    if array.size < target_samples:
        return np.pad(array, (0, target_samples - array.size), mode="constant").astype(np.float32, copy=False)
    return array


def iter_sliding_windows(
    blocks: Iterable[np.ndarray],
    *,
    window_samples: int,
    hop_samples: int,
) -> Iterator[np.ndarray]:
    if window_samples <= 0:
        raise ValueError("window_samples must be positive")
    if hop_samples <= 0:
        raise ValueError("hop_samples must be positive")

    buffer = np.asarray([], dtype=np.float32)
    for block in blocks:
        block_array = ensure_float32_mono(block)
        if block_array.size == 0:
            continue
        buffer = np.concatenate([buffer, block_array])
        while buffer.size >= window_samples:
            yield buffer[:window_samples].astype(np.float32, copy=False)
            if buffer.size <= hop_samples:
                buffer = np.asarray([], dtype=np.float32)
                break
            buffer = buffer[hop_samples:]

    if buffer.size > 0:
        yield pad_or_trim(buffer, window_samples)


def iter_wav_blocks(
    wav_path: Path,
    *,
    target_sample_rate: int,
    hop_seconds: float,
) -> Iterator[np.ndarray]:
    if not wav_path.exists():
        raise FileNotFoundError(f"Audio file not found: {wav_path}")

    with sf.SoundFile(str(wav_path), mode="r") as handle:
        source_sr = int(handle.samplerate or 0)
        if source_sr <= 0:
            raise RuntimeError(f"Unable to determine sample rate for {wav_path}")

        read_frames = max(1, int(round(source_sr * hop_seconds)))
        while True:
            block = handle.read(read_frames, dtype="float32", always_2d=True)
            if block is None or getattr(block, "size", 0) == 0:
                break
            mono = ensure_float32_mono(block)
            if source_sr != target_sample_rate:
                mono = resample_waveform(mono, source_sr=source_sr, target_sr=target_sample_rate)
            yield mono


def iter_ffmpeg_audio_blocks(
    source: str,
    *,
    target_sample_rate: int,
    hop_seconds: float,
    max_duration_seconds: Optional[float] = None,
) -> Iterator[np.ndarray]:
    read_frames = max(1, int(round(target_sample_rate * hop_seconds)))
    read_bytes = read_frames * 2  # s16le mono

    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-i",
        source,
        "-vn",
        "-ac",
        "1",
        "-ar",
        str(target_sample_rate),
    ]
    if max_duration_seconds is not None:
        command.extend(["-t", f"{max_duration_seconds:.3f}"])
    command.extend([
        "-f",
        "s16le",
        "pipe:1",
    ])

    creationflags = 0
    if os.name == "nt" and hasattr(subprocess, "CREATE_NO_WINDOW"):
        creationflags = subprocess.CREATE_NO_WINDOW

    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=creationflags,
    )
    assert process.stdout is not None
    assert process.stderr is not None

    try:
        while True:
            raw = process.stdout.read(read_bytes)
            if not raw:
                break
            samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
            if samples.size:
                yield samples
    finally:
        stderr_text = ""
        try:
            stderr_text = process.stderr.read().decode("utf-8", errors="ignore").strip()
        except Exception:
            stderr_text = ""
        process.stdout.close()
        process.stderr.close()
        return_code = process.wait()
        if return_code != 0:
            detail = stderr_text or f"ffmpeg exited with code {return_code}"
            raise RuntimeError(f"ffmpeg audio extraction failed for {source}: {detail}")


def iter_microphone_audio_blocks(
    *,
    target_sample_rate: int,
    hop_seconds: float,
    device: Optional[int | str] = None,
) -> Iterator[np.ndarray]:
    try:
        import sounddevice as sd
    except ImportError as exc:
        raise RuntimeError(
            "Microphone streaming requires the optional 'sounddevice' package. Install it to enable live mic input."
        ) from exc

    block_size = max(1, int(round(target_sample_rate * hop_seconds)))
    with sd.InputStream(
        samplerate=target_sample_rate,
        channels=1,
        dtype="float32",
        blocksize=block_size,
        device=device,
    ) as stream:
        while True:
            data, _overflowed = stream.read(block_size)
            yield ensure_float32_mono(data)
