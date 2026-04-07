# Document Intake Lab

A separate, review-first document registration prototype. This is intentionally isolated from the running school dashboard so you can test a safer image-processing feature without touching the main project.

## What it does

- uploads a document photo
- checks whether the image is usable
- finds and flattens the page when possible
- enhances the page for OCR
- runs OCR through an available backend
- detects document type
- extracts likely fields
- returns a decision:
  - `rejected`
  - `review_required`
  - `high_confidence_prefill`

## Why this is safer than the anomaly work

This tool is not blind automation. It is built to reject bad images and ask for review when confidence is weak. That is how you get something that behaves predictably.

## Supported document types

- `admission_form`
- `birth_certificate`
- `national_id`
- `auto`

## OCR backends

The app supports two OCR backends:

1. `easyocr`
2. `tesseract`

It will auto-pick the first available backend.

### Tesseract notes

`pytesseract` is listed in `requirements.txt`, but the Tesseract binary itself must also be installed on the machine. For Bangladesh-style documents, install Bengali and English language data and set:

```powershell
$env:TESSERACT_CMD="C:\Program Files\Tesseract-OCR\tesseract.exe"
```

### EasyOCR notes

If you want to use EasyOCR instead of Tesseract, install it manually:

```powershell
pip install easyocr
```

## Run

```powershell
cd "c:\system project\Kindergarten\document-intake-lab"
python -m pip install -r requirements.txt
python main.py --serve --port 8020
```

Open:

`http://127.0.0.1:8020`

## CLI usage

```powershell
python main.py --image "C:\path\to\document.jpg" --document-type admission_form
```

## What "works correctly" means here

This app is built for assisted correctness, not blind correctness.

- It is good at rejecting blurry, dark, glared, and badly framed images.
- It is good at page cleanup and structured review.
- It can prefill many fields when the document is clear.
- It should still be reviewed by a human before final save.

That is the honest, safe version for real document intake.
