from __future__ import annotations

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from document_intake_lab.config import get_settings
from document_intake_lab.service import DocumentIntakeService


def create_app() -> FastAPI:
    settings = get_settings()
    service = DocumentIntakeService(settings)
    templates = Jinja2Templates(directory=str(settings.root_dir / "document_intake_lab" / "templates"))

    app = FastAPI(
        title="Document Intake Lab",
        version="1.0.0",
        description="Separate, review-first document registration assistant for school intake workflows.",
    )

    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            request,
            "index.html",
            {
                "document_types": [
                    ("auto", "Auto Detect"),
                    ("admission_form", "Admission Form"),
                    ("birth_certificate", "Birth Certificate"),
                    ("national_id", "National ID"),
                ],
                "ocr_backends": ["auto", "easyocr", "tesseract"],
            },
        )

    @app.get("/health")
    async def health():
        return service.health()

    @app.post("/api/analyze-document")
    async def analyze_document(
        image: UploadFile = File(...),
        document_type: str = Form("auto"),
        ocr_backend: str = Form("auto"),
    ):
        content = await image.read()
        try:
            result = service.analyze_document(
                content,
                filename=image.filename or "upload",
                requested_type=document_type,
                requested_backend=ocr_backend,
            )
            return result
        except Exception as exc:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "detail": str(exc)},
            )

    return app
