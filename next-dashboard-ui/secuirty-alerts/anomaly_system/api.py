from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from anomaly_system.schemas import AnalysisResponse, HealthResponse, StreamAnalyzeRequest
from anomaly_system.service import get_anomaly_service
from anomaly_system.utils import ensure_directory, safe_unlink


router = APIRouter(prefix="/anomaly", tags=["anomaly"])


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
