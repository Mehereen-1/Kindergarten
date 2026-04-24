from __future__ import annotations

import asyncio
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from anomaly_system.schemas import AnalysisResponse, HealthResponse, StreamAnalyzeRequest
from anomaly_system.service import get_anomaly_service
from anomaly_system.utils import ensure_directory, safe_unlink


router = APIRouter(prefix="/anomaly", tags=["anomaly"])


def _parse_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _decode_frame_bytes(frame_bytes: bytes) -> np.ndarray:
    array = np.frombuffer(frame_bytes, dtype=np.uint8)
    frame = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if frame is None:
        raise RuntimeError("Could not decode webcam frame")
    return frame


def _decode_audio_bytes(frame_bytes: bytes, *, encoding: str, channels: int) -> np.ndarray:
    normalized_encoding = (encoding or "float32").strip().lower()
    if normalized_encoding in {"float32", "f32", "pcm_f32", "pcm32"}:
        samples = np.frombuffer(frame_bytes, dtype=np.float32)
    elif normalized_encoding in {"int16", "pcm16", "s16", "pcm_s16"}:
        samples = np.frombuffer(frame_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    else:
        raise RuntimeError(f"Unsupported live audio encoding: {encoding}")

    if channels > 1 and samples.size >= channels:
        usable = samples.size - (samples.size % channels)
        if usable != samples.size:
            samples = samples[:usable]
        samples = samples.reshape(-1, channels).mean(axis=1)

    return np.clip(samples.astype(np.float32, copy=False), -1.0, 1.0)


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return get_anomaly_service().health()


@router.get("/models")
def models() -> dict:
    service = get_anomaly_service()
    return {"models": service.models()}


@router.post("/analyze-video", response_model=AnalysisResponse)
async def analyze_video(
    video: UploadFile = File(...),
    camera_name: str = Form(""),
    class_name: str = Form(""),
    notify_ingest: bool = Form(False),
) -> AnalysisResponse:
    service = get_anomaly_service()
    temp_dir = ensure_directory(service.settings.temp_files.directory)
    suffix = Path(video.filename or "upload.mp4").suffix or service.settings.temp_files.suffix
    temp_path: Optional[Path] = None

    try:
        with NamedTemporaryFile(dir=temp_dir, delete=False, suffix=suffix) as handle:
            temp_path = Path(handle.name)
            while True:
                chunk = await video.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)

        return service.analyze_video(
            temp_path,
            source="video",
            camera_name=camera_name or None,
            class_name=class_name or None,
            notify_ingest=notify_ingest,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        safe_unlink(temp_path)


@router.post("/analyze-video-progress")
async def analyze_video_progress(
    video: UploadFile = File(...),
    camera_name: str = Form(""),
    class_name: str = Form(""),
):
    service = get_anomaly_service()
    temp_dir = ensure_directory(service.settings.temp_files.directory)
    suffix = Path(video.filename or "upload.mp4").suffix or service.settings.temp_files.suffix
    temp_path: Optional[Path] = None

    try:
        with NamedTemporaryFile(dir=temp_dir, delete=False, suffix=suffix) as handle:
            temp_path = Path(handle.name)
            while True:
                chunk = await video.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)

        def generate():
            import json

            try:
                for event in service.stream_video_analysis(
                    temp_path,
                    source="video",
                    camera_name=camera_name or None,
                    class_name=class_name or None,
                ):
                    yield json.dumps(event) + "\n"
            except Exception as exc:
                yield json.dumps({"type": "error", "error": str(exc)}) + "\n"
            finally:
                safe_unlink(temp_path)

        return StreamingResponse(generate(), media_type="application/x-ndjson")
    except FileNotFoundError as exc:
        safe_unlink(temp_path)
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        safe_unlink(temp_path)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        safe_unlink(temp_path)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/analyze-audio", response_model=AnalysisResponse)
async def analyze_audio(
    audio: UploadFile = File(...),
    camera_name: str = Form(""),
    class_name: str = Form(""),
    notify_ingest: bool = Form(False),
) -> AnalysisResponse:
    service = get_anomaly_service()
    temp_dir = ensure_directory(service.settings.temp_files.directory)
    suffix = Path(audio.filename or "upload.wav").suffix or ".wav"
    temp_path: Optional[Path] = None

    try:
        with NamedTemporaryFile(dir=temp_dir, delete=False, suffix=suffix) as handle:
            temp_path = Path(handle.name)
            while True:
                chunk = await audio.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)

        return service.analyze_audio(
            temp_path,
            source="audio",
            camera_name=camera_name or None,
            class_name=class_name or None,
            notify_ingest=notify_ingest,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        safe_unlink(temp_path)


@router.post("/analyze-audio-progress")
async def analyze_audio_progress(
    media: UploadFile = File(...),
    media_type: str = Form("audio"),
    camera_name: str = Form(""),
    class_name: str = Form(""),
    notify_ingest: bool = Form(False),
):
    service = get_anomaly_service()
    temp_dir = ensure_directory(service.settings.temp_files.directory)
    suffix = Path(media.filename or ("upload.wav" if media_type == "audio" else "upload.mp4")).suffix
    if not suffix:
        suffix = ".wav" if media_type == "audio" else ".mp4"
    temp_path: Optional[Path] = None

    try:
        with NamedTemporaryFile(dir=temp_dir, delete=False, suffix=suffix) as handle:
            temp_path = Path(handle.name)
            while True:
                chunk = await media.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)

        def generate():
            import json

            try:
                for event in service.stream_audio_analysis(
                    temp_path,
                    source=media_type or "audio",
                    camera_name=camera_name or None,
                    class_name=class_name or None,
                    notify_ingest=notify_ingest,
                ):
                    yield json.dumps(event) + "\n"
            except Exception as exc:
                yield json.dumps({"type": "error", "error": str(exc)}) + "\n"
            finally:
                safe_unlink(temp_path)

        return StreamingResponse(generate(), media_type="application/x-ndjson")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/analyze-stream", response_model=AnalysisResponse)
def analyze_stream(request: StreamAnalyzeRequest) -> AnalysisResponse:
    service = get_anomaly_service()
    try:
        return service.analyze_stream(
            request.stream_url,
            camera_name=request.camera_name,
            class_name=request.class_name,
            max_frames=request.max_frames,
            duration_seconds=request.duration_seconds,
            notify_ingest=request.notify_ingest,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.websocket("/live-audio")
async def live_audio(websocket: WebSocket) -> None:
    await websocket.accept()
    service = get_anomaly_service()

    camera_name = (websocket.query_params.get("camera_name") or "").strip() or None
    class_name = (websocket.query_params.get("class_name") or "").strip() or None
    notify_ingest = _parse_bool(websocket.query_params.get("notify_ingest"), True)
    encoding = (websocket.query_params.get("encoding") or "float32").strip().lower()
    channels_raw = websocket.query_params.get("channels")
    sample_rate_raw = websocket.query_params.get("sample_rate")

    try:
        channels = max(1, int(channels_raw or 1))
    except Exception:
        channels = 1

    try:
        input_sample_rate = int(sample_rate_raw or 0) or None
    except Exception:
        input_sample_rate = None

    try:
        session = service.create_live_audio_session(
            camera_name=camera_name,
            class_name=class_name,
            notify_ingest=notify_ingest,
            input_sample_rate=input_sample_rate,
        )

        assert service.audio_wrapper.deployment_config is not None
        await websocket.send_json(
            {
                "type": "started",
                "message": "Live microphone session started",
                "input_sample_rate": session.input_sample_rate,
                "target_sample_rate": service.audio_wrapper.deployment_config.sample_rate,
                "chunk_window_seconds": service.audio_wrapper.deployment_config.chunk_window_seconds,
                "hop_seconds": service.audio_wrapper.deployment_config.hop_seconds,
                "encoding": encoding,
                "channels": channels,
                "notify_ingest": notify_ingest,
            }
        )

        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break

            text = str(message.get("text") or "").strip().lower()
            if text in {"stop", "__stop__"}:
                await websocket.send_json({"type": "stopped", "message": "Live microphone session stopped"})
                break

            frame_bytes = message.get("bytes")
            if not frame_bytes:
                continue

            try:
                samples = _decode_audio_bytes(frame_bytes, encoding=encoding, channels=channels)
            except Exception as exc:
                await websocket.send_json({"type": "error", "error": str(exc)})
                continue

            if samples.size == 0:
                continue

            try:
                payloads = await asyncio.to_thread(service.process_live_audio_chunk, session, samples)
            except Exception as exc:
                await websocket.send_json({"type": "error", "error": str(exc)})
                continue

            for payload in payloads:
                await websocket.send_json(payload)
    except WebSocketDisconnect:
        return
    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "error": str(exc)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


@router.websocket("/live-webcam")
async def live_webcam(websocket: WebSocket) -> None:
    await websocket.accept()
    service = get_anomaly_service()

    camera_name = (websocket.query_params.get("camera_name") or "").strip() or None
    class_name = (websocket.query_params.get("class_name") or "").strip() or None
    notify_ingest = _parse_bool(websocket.query_params.get("notify_ingest"), True)

    try:
        session = service.create_live_webcam_session(
            camera_name=camera_name,
            class_name=class_name,
            notify_ingest=notify_ingest,
        )

        await websocket.send_json(
            {
                "type": "started",
                "message": "Live webcam session started",
                "current_stride": session.current_stride,
                "target_processing_fps": session.target_processing_fps,
                "notify_ingest": notify_ingest,
            }
        )

        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break

            text = str(message.get("text") or "").strip().lower()
            if text in {"stop", "__stop__"}:
                await websocket.send_json({"type": "stopped", "message": "Live webcam session stopped"})
                break

            frame_bytes = message.get("bytes")
            if not frame_bytes:
                continue

            try:
                frame = _decode_frame_bytes(frame_bytes)
            except Exception as exc:
                await websocket.send_json({"type": "error", "error": str(exc)})
                continue

            payload = await asyncio.to_thread(service.process_live_webcam_frame, session, frame)
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        return
    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "error": str(exc)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
