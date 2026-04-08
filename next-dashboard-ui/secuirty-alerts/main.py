from __future__ import annotations

import argparse
import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from anomaly_system.api import router as anomaly_router
from anomaly_system.service import get_anomaly_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    service = get_anomaly_service()
    service.initialize()
    yield


app = FastAPI(
    title="Kindergarten Security Alert Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(anomaly_router)


@app.get("/")
def root() -> dict:
    return {
        "service": "security-alerts",
        "status": "ok",
        "health": "/anomaly/health",
        "models": "/anomaly/models",
        "analyze_video": "/anomaly/analyze-video",
        "analyze_audio": "/anomaly/analyze-audio",
        "analyze_stream": "/anomaly/analyze-stream",
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Security alert anomaly service")
    parser.add_argument("--serve", action="store_true", help="Run the FastAPI service")
    parser.add_argument("--host", default="0.0.0.0", help="Bind host for uvicorn")
    parser.add_argument("--port", type=int, default=8010, help="Bind port for uvicorn")
    parser.add_argument("--video", default="", help="Optional local video path for one-shot CLI analysis")
    parser.add_argument("--camera-name", default="", help="Optional camera name for CLI analysis")
    parser.add_argument("--class-name", default="", help="Optional class/zone name for CLI analysis")
    parser.add_argument("--notify-ingest", action="store_true", help="Notify configured ingest endpoint after analysis")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.serve or not args.video:
        import uvicorn

        uvicorn.run(app, host=args.host, port=args.port)
        return

    service = get_anomaly_service()
    result = service.analyze_video(
        Path(args.video),
        source="video",
        camera_name=args.camera_name or None,
        class_name=args.class_name or None,
        notify_ingest=args.notify_ingest,
    )
    print(json.dumps(result.dict(), indent=2))


if __name__ == "__main__":
    main()
