# Security Alerts ONNX Setup

This folder runs your uploaded ONNX model and sends alerts to the website.

## 1) Model files
Place model files in:
- secuirty-alerts/

or in:
- src/app/api/security-alerts/

If your export has both files, keep both with original names:
- model.onnx
- model.onnx.data

## 2) Install packages
Use your existing Python env and install:
- onnxruntime
- opencv-python
- numpy
- requests

## 3) Run
Example command:

python secuirty-alerts/main.py \
  --video "C:/videos/cctv_sample.mp4" \
  --camera "Front Gate Camera" \
  --class-name "star (kg)" \
  --threshold 0.65 \
  --api-url "http://localhost:3000/api/security-alerts/ingest"

Optional:
- --model "C:/path/to/model.onnx"
- --labels "C:/path/to/labels.txt"
- --mobile-class-ids "0"   (if class 0 is mobile in your model)
- --api-token "your-token-if-set"
- --fps 2
- --cooldown 30

## 4) Threshold rule
Alert is sent only when:
- detected class label includes mobile/phone/cell/smartphone
- OR class ID is in --mobile-class-ids
- confidence >= 0.65

## 5) Where alerts appear
- Admin page: /admin/security-alerts
- Teacher page: /teacher/security-alerts
- Email and push are triggered through the ingest API.
