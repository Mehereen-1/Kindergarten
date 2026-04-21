from __future__ import annotations

import argparse
import json
from pathlib import Path

from anomaly_system.audio_inference import (
    AudioInferenceResult,
    load_audio_model_and_config,
    load_yamnet,
    process_microphone_stream,
    process_video_file,
    process_wav_file,
)


def _print_result(title: str, result: AudioInferenceResult) -> None:
    print(title)
    print(json.dumps(result.to_dict(), indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Audio deployment smoke test")
    parser.add_argument("--wav", default="", help="Path to a .wav file for chunked validation")
    parser.add_argument("--video", default="", help="Path to a video file to test via ffmpeg audio extraction")
    parser.add_argument("--mic", action="store_true", help="Run the live microphone monitoring loop")
    parser.add_argument("--mic-seconds", type=float, default=None, help="Optional mic capture duration")
    args = parser.parse_args()

    audio_model, config = load_audio_model_and_config()
    yamnet = load_yamnet(config.yamnet_handle)

    if args.wav:
        wav_result = process_wav_file(
            Path(args.wav),
            audio_model=audio_model,
            yamnet_model=yamnet,
            config=config,
        )
        _print_result("WAV result", wav_result)

    if args.video:
        video_result = process_video_file(
            Path(args.video),
            audio_model=audio_model,
            yamnet_model=yamnet,
            config=config,
        )
        _print_result("Video result", video_result)

    if args.mic:
        # Live monitoring loop example:
        #   for snapshot in process_microphone_stream(...):
        #       if snapshot.alert:
        #           trigger_alarm(snapshot.reason, snapshot.alert_at_sec)
        for snapshot in process_microphone_stream(
            audio_model=audio_model,
            yamnet_model=yamnet,
            config=config,
            duration_seconds=args.mic_seconds,
        ):
            print(json.dumps(snapshot.to_dict(), indent=2))


if __name__ == "__main__":
    main()
