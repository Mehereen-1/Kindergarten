"""Security alert runner for ONNX anomaly detection.

Usage example:
python secuirty-alerts/main.py --video path/to/cctv.mp4 --camera "Front Gate Camera" --class-name "star (kg)"

The script:
1. Loads ONNX model (+ .data if external tensor file exists in same folder).
2. Runs inference on sampled video frames.
3. Sends alert to website when mobile detection confidence >= threshold (default 0.65).
"""

from __future__ import annotations

import argparse
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np
import onnxruntime as ort
import requests


DEFAULT_API_URL = "http://localhost:3000/api/security-alerts/ingest"
DEFAULT_THRESHOLD = 0.65
DEFAULT_TARGET_FPS = 2.0
DEFAULT_COOLDOWN_SECONDS = 30


@dataclass
class Detection:
	class_id: int
	score: float


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(description="Run ONNX anomaly detection and send mobile alerts")
	parser.add_argument("--model", default="", help="Path to ONNX model file")
	parser.add_argument("--video", required=True, help="Path to input CCTV video")
	parser.add_argument("--labels", default="", help="Optional labels file (json list or txt one label per line)")
	parser.add_argument(
		"--mobile-class-ids",
		default="",
		help="Comma-separated class IDs considered mobile when label names are unavailable, e.g. 0,2",
	)
	parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Alert ingest endpoint URL")
	parser.add_argument("--api-token", default=os.getenv("MODEL_ALERT_TOKEN", ""), help="API token for x-model-alert-token")
	parser.add_argument("--camera", default="Front Gate Camera", help="Camera name")
	parser.add_argument("--class-name", default="Unknown Area", help="Class or area name")
	parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD, help="Mobile confidence threshold")
	parser.add_argument("--fps", type=float, default=DEFAULT_TARGET_FPS, help="Inference FPS target")
	parser.add_argument("--cooldown", type=int, default=DEFAULT_COOLDOWN_SECONDS, help="Alert cooldown per camera in seconds")
	parser.add_argument("--img-size", type=int, default=640, help="Square input size for model")
	parser.add_argument("--provider", default="CPUExecutionProvider", help="ONNX Runtime provider")
	return parser.parse_args()


def find_default_model() -> Optional[Path]:
	project_root = Path(__file__).resolve().parent.parent
	candidate_dirs = [
		Path(__file__).resolve().parent,
		project_root / "src" / "app" / "api" / "security-alerts",
	]
	for directory in candidate_dirs:
		if not directory.exists():
			continue
		onnx_files = sorted(directory.glob("*.onnx"), key=lambda item: item.stat().st_size, reverse=True)
		if onnx_files:
			return onnx_files[0]
	return None


def load_labels(labels_path: str) -> List[str]:
	if not labels_path:
		return []

	path = Path(labels_path)
	if not path.exists():
		return []

	text = path.read_text(encoding="utf-8", errors="ignore").strip()
	if not text:
		return []

	if path.suffix.lower() == ".json":
		try:
			data = json.loads(text)
			if isinstance(data, list):
				return [str(item).strip() for item in data if str(item).strip()]
		except json.JSONDecodeError:
			return []

	return [line.strip() for line in text.splitlines() if line.strip()]


def preprocess(frame: np.ndarray, size: int) -> np.ndarray:
	resized = cv2.resize(frame, (size, size), interpolation=cv2.INTER_LINEAR)
	rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
	normalized = rgb.astype(np.float32) / 255.0
	chw = np.transpose(normalized, (2, 0, 1))
	return np.expand_dims(chw, axis=0)


def parse_detections(output: np.ndarray) -> List[Detection]:
	detections: List[Detection] = []

	if output.ndim == 3 and output.shape[0] == 1:
		arr = output[0]

		# Common YOLO export: [num_preds, attrs]
		if arr.shape[-1] >= 6 and arr.shape[0] >= 1:
			for row in arr:
				row = np.asarray(row).astype(np.float32)
				if row.shape[0] == 6:
					score = float(row[4])
					class_id = int(row[5])
				else:
					obj_score = float(row[4])
					class_scores = row[5:]
					if class_scores.size == 0:
						continue
					class_id = int(np.argmax(class_scores))
					score = float(obj_score * class_scores[class_id])
				detections.append(Detection(class_id=class_id, score=score))
			return detections

		# Alternate YOLO shape: [attrs, num_preds]
		if arr.shape[0] >= 6 and arr.shape[1] >= 1:
			transposed = arr.T
			for row in transposed:
				row = np.asarray(row).astype(np.float32)
				if row.shape[0] < 6:
					continue
				obj_score = float(row[4])
				class_scores = row[5:]
				if class_scores.size == 0:
					continue
				class_id = int(np.argmax(class_scores))
				score = float(obj_score * class_scores[class_id])
				detections.append(Detection(class_id=class_id, score=score))
			return detections

	# Generic fallback: treat as probability vector for one class output
	flat = output.flatten().astype(np.float32)
	if flat.size:
		class_id = int(np.argmax(flat))
		score = float(flat[class_id])
		detections.append(Detection(class_id=class_id, score=score))

	return detections


def class_name_from_id(class_id: int, labels: List[str]) -> str:
	if 0 <= class_id < len(labels):
		return labels[class_id]
	return f"class_{class_id}"


def is_mobile_label(label: str) -> bool:
	value = label.strip().lower()
	return (
		"mobile" in value
		or "phone" in value
		or "cell" in value
		or "smartphone" in value
	)


def parse_mobile_class_ids(raw: str) -> set[int]:
	ids: set[int] = set()
	if not raw:
		return ids
	for part in raw.split(","):
		part = part.strip()
		if not part:
			continue
		try:
			ids.add(int(part))
		except ValueError:
			continue
	return ids


def send_alert(
	api_url: str,
	api_token: str,
	label: str,
	confidence: float,
	camera_name: str,
	class_name: str,
	video_name: str,
	playback_sec: int,
) -> None:
	payload = {
		"label": label,
		"confidence": confidence,
		"cameraName": camera_name,
		"className": class_name,
		"videoName": video_name,
		"playbackAtSec": playback_sec,
		"detectedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
	}

	headers = {"Content-Type": "application/json"}
	if api_token:
		headers["x-model-alert-token"] = api_token

	response = requests.post(api_url, json=payload, headers=headers, timeout=5)
	response.raise_for_status()


def run() -> None:
	args = parse_args()

	model_path = Path(args.model) if args.model else find_default_model()
	if not model_path or not model_path.exists():
		raise FileNotFoundError(
			"ONNX model not found. Pass --model path/to/model.onnx or place it in secuirty-alerts/."
		)

	labels = load_labels(args.labels)
	mobile_class_ids = parse_mobile_class_ids(args.mobile_class_ids)

	providers = [args.provider] if args.provider else ["CPUExecutionProvider"]
	session = ort.InferenceSession(str(model_path), providers=providers)
	input_name = session.get_inputs()[0].name
	output_names = [out.name for out in session.get_outputs()]

	cap = cv2.VideoCapture(args.video)
	if not cap.isOpened():
		raise RuntimeError(f"Could not open video: {args.video}")

	native_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
	frame_step = max(1, int(round(native_fps / max(args.fps, 0.1))))
	frame_index = 0
	last_alert_time = 0.0
	video_name = Path(args.video).name

	print(f"[INFO] Model: {model_path}")
	print(f"[INFO] Video: {args.video}")
	print(f"[INFO] Sending alerts to: {args.api_url}")
	print(f"[INFO] Threshold: {args.threshold}")

	while True:
		ok, frame = cap.read()
		if not ok:
			break

		frame_index += 1
		if frame_index % frame_step != 0:
			continue

		input_tensor = preprocess(frame, args.img_size)
		outputs = session.run(output_names, {input_name: input_tensor})

		all_detections: List[Detection] = []
		for output in outputs:
			all_detections.extend(parse_detections(np.asarray(output)))

		if not all_detections:
			continue

		best = max(all_detections, key=lambda item: item.score)
		class_label = class_name_from_id(best.class_id, labels)
		confidence = float(best.score)

		if not (is_mobile_label(class_label) or best.class_id in mobile_class_ids):
			continue

		if confidence < args.threshold:
			continue

		now = time.time()
		if now - last_alert_time < args.cooldown:
			continue

		playback_sec = int(cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0)

		try:
			send_alert(
				api_url=args.api_url,
				api_token=args.api_token,
				label=class_label,
				confidence=confidence,
				camera_name=args.camera,
				class_name=args.class_name,
				video_name=video_name,
				playback_sec=playback_sec,
			)
			last_alert_time = now
			print(
				f"[ALERT] mobile detection sent | label={class_label} confidence={confidence:.3f} "
				f"time={playback_sec}s"
			)
		except Exception as error:  # pragma: no cover - runtime I/O branch
			print(f"[WARN] Failed to send alert: {error}")

	cap.release()
	print("[INFO] Completed video processing.")


if __name__ == "__main__":
	run()
