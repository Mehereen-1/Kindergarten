# ═══════════════════════════════════════════════════════
# recognizer.py — Recognition Thread
# ═══════════════════════════════════════════════════════

import time
import cv2
from datetime import datetime
from .liveness_engine import LivenessEngine

from config.settings import (
    RECOG_WIDTH,
    RECOG_HEIGHT,
    RECOG_THRESHOLD,
    SLIDING_WINDOW_SIZE,
    MIN_CONFIRMATIONS,
)


# =========================
# RECOGNITION THREAD
# =========================

def recognition_thread(video_state, video_analytics, analytics_lock, results_lock,
                       engine, attendance_tracker, save_attendance, extract_and_store_face):
    """
    Pulls latest frame from recognition_queue, runs InsightFace,
    stores results. engine.recognize() returns (bbox, name, student_id) — 3 values.
    """
    print(f"🔍 Recognition started  window={SLIDING_WINDOW_SIZE} "
          f"min={MIN_CONFIRMATIONS} threshold={RECOG_THRESHOLD}")
    liveness_engine = LivenessEngine()

    while not video_state["stop_event"].is_set():
        frame_data = None
        try:
            # Drain stale frames — always process the most recent
            while len(video_state["recognition_queue"]) > 1:
                video_state["recognition_queue"].popleft()
            if video_state["recognition_queue"]:
                frame_data = video_state["recognition_queue"].popleft()
        except IndexError:
            pass

        if frame_data is None:
            time.sleep(0.01)
            continue

        frame_num, frame = frame_data

        with analytics_lock:
            video_analytics["processed_frames"] += 1

        try:
            orig_h, orig_w = frame.shape[:2]
            small = cv2.resize(frame, (RECOG_WIDTH, RECOG_HEIGHT))
            sx = orig_w / RECOG_WIDTH
            sy = orig_h / RECOG_HEIGHT

            # Returns List[(bbox, name, student_id, score)] — 4 values
            raw_results = engine.recognize(small, threshold=RECOG_THRESHOLD)
            
            # Debug: always log detection results
            if raw_results:
                print(f"👁️  Frame {frame_num}: Detected {len(raw_results)} face(s)")

            with analytics_lock:
                video_analytics["faces_detected"] += len(raw_results)

            scaled = []
            for bbox, name, student_id, score in raw_results:
                x1 = max(0, int(bbox[0]))
                y1 = max(0, int(bbox[1]))
                x2 = min(RECOG_WIDTH, int(bbox[2]))
                y2 = min(RECOG_HEIGHT, int(bbox[3]))

                face_crop = small[y1:y2, x1:x2]
                sid = str(student_id) if student_id else None
                if sid:
                    face_id = sid
                else:
                    cx = (x1 + x2) // 2
                    cy = (y1 + y2) // 2
                    face_id = f"u_{cx // 32}_{cy // 32}"

                is_live = liveness_engine.check_liveness(face_crop, face_id)
                if not is_live:
                    orig_bbox = (
                        int(bbox[0] * sx), int(bbox[1] * sy),
                        int(bbox[2] * sx), int(bbox[3] * sy),
                    )
                    scaled.append({
                        "bbox": orig_bbox,
                        "name": "Spoof",
                        "detected_at_frame": frame_num,
                    })
                    video_state["detections"].append({
                        "name": "Spoof",
                        "student_id": None,
                        "timestamp": datetime.now().isoformat(),
                        "frame_num": frame_num,
                    })
                    with analytics_lock:
                        video_analytics["unknown_faces"] += 1
                    continue

                is_confirmed = False
                display_name = name

                if name != "Unknown" and student_id:
                    sid = str(student_id)
                    pending = attendance_tracker.get_pending_count(sid, frame_num)
                    is_confirmed = attendance_tracker.is_confirmed(sid)
                    display_name = (f"✓ {name}" if is_confirmed
                                   else f"{name} ({pending}/{MIN_CONFIRMATIONS})")
                    with analytics_lock:
                        video_analytics["matched_faces"] += 1

                    should_save = attendance_tracker.add_detection(sid, frame_num, score)
                    if should_save:
                        save_attendance(name, student_id)
                else:
                    with analytics_lock:
                        video_analytics["unknown_faces"] += 1

                orig_bbox = (
                    int(bbox[0] * sx), int(bbox[1] * sy),
                    int(bbox[2] * sx), int(bbox[3] * sy),
                )
                scaled.append({
                    "bbox": orig_bbox,
                    "name": display_name,
                    "detected_at_frame": frame_num,  # will be rebased below
                })

                video_state["detections"].append({
                    "name": name,
                    "student_id": str(student_id) if student_id else None,
                    "timestamp": datetime.now().isoformat(),
                    "frame_num": frame_num,
                })

                extract_and_store_face(frame, orig_bbox, name, student_id,
                                       0.0, frame_num, is_confirmed)

            # Rebase detected_at_frame to the CURRENT playback position.
            # Recognition is slow; by the time we get here, playback is
            # far ahead of `frame_num`.  Without rebasing, the BOX_TTL
            # filter in playback_thread would discard every result as stale.
            current_playback = video_state["current_frame_num"]
            for item in scaled:
                item["detected_at_frame"] = current_playback

            with results_lock:
                video_state["latest_results"] = scaled

            if scaled:
                print(f"📦 Recognition done: {len(scaled)} face(s) on recog-frame {frame_num}, "
                      f"tagged at playback-frame {current_playback}")

        except Exception as e:
            print(f"❌ Recognition error: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(0.01)

    print("🔍 Recognition stopped")
