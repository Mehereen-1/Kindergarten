from __future__ import annotations

import argparse
import json
from pathlib import Path

import uvicorn

from document_intake_lab.service import DocumentIntakeService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Document intake lab")
    parser.add_argument("--serve", action="store_true", help="Start the FastAPI server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8020)
    parser.add_argument("--image", type=str, help="Analyze a local image file from the command line")
    parser.add_argument("--document-type", default="auto")
    parser.add_argument("--ocr-backend", default="auto")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.serve:
        uvicorn.run("document_intake_lab.api:create_app", host=args.host, port=args.port, factory=True, reload=False)
        return

    if args.image:
        service = DocumentIntakeService()
        image_path = Path(args.image)
        result = service.analyze_document(
            image_path.read_bytes(),
            filename=image_path.name,
            requested_type=args.document_type,
            requested_backend=args.ocr_backend,
        )
        print(json.dumps(result.model_dump(), indent=2, ensure_ascii=False))
        return

    raise SystemExit("Use --serve to run the app or --image to analyze a local file.")


if __name__ == "__main__":
    main()
