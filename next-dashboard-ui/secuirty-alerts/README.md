# Security Alerts Anomaly Service

This folder now contains a standalone, production-style hybrid classroom security service.

## What it does

- Loads fight, fall, fire, audio-security, and crowd-motion branches once at startup
- Runs unified inference over uploaded video or live stream sources
- Standardizes model outputs into one schema
- Fuses multiple detectors into final alert decisions
- Can forward fused alerts to the existing website ingest route

## Folder layout

- `secuirty-alerts/main.py`: FastAPI app entrypoint and CLI runner
- `secuirty-alerts/anomaly_system/`: modular inference package
- `secuirty-alerts/anomalyModels/`: trained checkpoints

## Checkpoint placement

Place trained checkpoints in:

- `next-dashboard-ui/secuirty-alerts/anomalyModels/`

Default filenames already wired:

- `best_fight_binary_mobilenetv3_gru.pth`
- `best_payutch_final_refined_model _fall.pth`
- `fire_best.onnx`
- `final_audio_model_extratune.keras`
- `final_audio_config_extratune.json`

Any extra `.onnx` file dropped into `anomalyModels/` is auto-discovered as an additional visual detector.

## Install

From the security alert environment:

```powershell
cd next-dashboard-ui/secuirty-alerts
C:\Users\USER\AppData\Local\Python\pythoncore-3.10-64\python.exe -m pip install -r requirements.txt
```

## Start the app

```powershell
cd next-dashboard-ui/secuirty-alerts
C:\Users\USER\AppData\Local\Python\pythoncore-3.10-64\python.exe main.py --serve --port 8010
```

## NPU / iGPU realtime profile (Windows)

For low-power laptops without a dedicated GPU, use:

```powershell
cd next-dashboard-ui/secuirty-alerts
./start-realtime-npu.ps1
```

This enables:

- adaptive realtime stride for stream processing
- lower-latency stream buffering
- tuned fight/fall/fire/audio thresholds for classroom recall
- ONNX DirectML preference with automatic CPU fallback

Optional acceleration package (Windows):

```powershell
pip install onnxruntime-directml
```

If `onnxruntime-directml` is not installed, the service keeps working on CPU.

## Test the API

Health:

```powershell
curl http://localhost:8010/anomaly/health
```

List models:

```powershell
curl http://localhost:8010/anomaly/models
```

Analyze uploaded audio:

```powershell
curl -X POST http://localhost:8010/anomaly/analyze-audio `
  -F "audio=@C:/audio/security_clip.wav"
```

Analyze uploaded video:

```powershell
curl -X POST http://localhost:8010/anomaly/analyze-video `
  -F "video=@C:/videos/classroom.mp4" `
  -F "camera_name=Star Classroom Camera" `
  -F "class_name=star (kg)"
```

Analyze stream / RTSP / webcam URL:

```powershell
curl -X POST http://localhost:8010/anomaly/analyze-stream `
  -H "Content-Type: application/json" `
  -d "{\"stream_url\":\"rtsp://camera/stream\",\"camera_name\":\"Gate Camera\",\"class_name\":\"corridor\",\"max_frames\":240}"
```

## Optional website ingest integration

To forward fused alerts into the Next.js security-alert notice system, set:

- `ANOMALY_NOTIFY_INGEST=true`
- `ANOMALY_INGEST_URL=http://localhost:3000/api/security-alerts/ingest`
- `MODEL_ALERT_TOKEN=...` if your ingest route expects it

Then either:

- call the API with `notify_ingest=true`
- or run CLI with `--notify-ingest`

## Where checkpoint-specific work belongs

If a checkpoint needs custom tensor shape, frame sampling, normalization, or output parsing, update only the wrapper adapter sections:

- `anomaly_system/fight_wrapper.py`
- `anomaly_system/fall_wrapper.py`
- `anomaly_system/other_anomaly_wrapper.py`
- `anomaly_system/audio_wrapper.py`

That keeps model-specific uncertainty isolated instead of spreading hacks across the whole pipeline.
