# Classroom Anomaly Detection Design Plan

## 1. Current Root Cause (Why it works on training but fails in class)

Your current inference path drops temporal detail too aggressively for real-world classroom events:

- Global frame stride is 4 (processes only every 4th frame).
- Fight and fall models run every 4th processed frame.
- Fire model runs every 6th processed frame.

At 25 FPS input, the effective model rates become:

- Fight/Fall: 25 / (4 x 4) = 1.56 decisions per second
- Fire: 25 / (4 x 6) = 1.04 decisions per second

This is too sparse for brief, messy classroom events.

## 2. Design Goal

Design for stable classroom performance, not benchmark clips:

- High recall first (catch events)
- Then suppress false alarms with temporal confirmation
- Produce explainable alerts with evidence snippets

## 3. Architecture You Should Present

### Stage A: Per-model sensing (high recall)

- Lower model thresholds slightly.
- Run models more frequently.
- Keep per-frame confidence traces.

### Stage B: Temporal confirmation (stability)

- Convert frame detections into rolling event scores (3 to 10 second windows).
- Trigger only when confidence is sustained (not one-frame spikes).
- Use cooldown windows to avoid duplicate alerts.

### Stage C: Multi-signal fusion (precision)

- Promote severity only if two or more branches agree (example: fight + distress audio).
- Keep single-branch alerts as medium severity, not ignored.

### Stage D: Human-readable evidence

- Attach event type, confidence trend, trigger reason, and frame/time range.
- Save 5-second pre and post evidence clips for teacher trust.

## 4. Immediate Tuning (Do this first)

Set environment variables for a classroom pilot:

- ANOMALY_FRAME_STRIDE=1
- ANOMALY_FIGHT_RUN_EVERY=2
- ANOMALY_FALL_RUN_EVERY=2
- ANOMALY_FIRE_RUN_EVERY=3
- ANOMALY_FIGHT_THRESHOLD=0.72
- ANOMALY_FALL_THRESHOLD=0.70
- ANOMALY_FIRE_THRESHOLD=0.68
- ANOMALY_FUSION_MEDIUM_CONF=0.60
- ANOMALY_FUSION_HIGH_CONF=0.82
- ANOMALY_FUSION_GAP_FRAMES=18

If CPU is too slow, change only:

- ANOMALY_FRAME_STRIDE=2
- Keep model run_every values the same

## 5. Calibration Protocol (What makes it real)

Create a classroom calibration set before final thresholds:

- 20 to 30 minutes normal classroom footage (negative set)
- 10 to 15 staged incidents (fight-like motion, fall, loud distress, sudden crowding)
- Different times: morning, noon, low-light, noisy periods

Then run threshold sweeps per event type and choose values by:

- False alarms per hour (target less than 1 per camera-hour in normal class)
- Recall on staged incidents (target greater than 85%)

## 6. Deployment Pattern for Reliability

- Fix camera position, angle, and zoom.
- Define classroom ROIs to ignore door/window/background traffic.
- Run one quick auto-check each day:
  - lighting score
  - blur score
  - FPS health
  - model loaded status
- If quality is poor, show warning instead of silent failure.

## 7. Output Design Teachers Will Trust

For every alert, show:

- Event: fight/fall/fire/crowd/audio
- Confidence: current and 3-second average
- Why triggered: sustained_confidence, multi_signal_match, or instant_high_confidence
- Evidence: timestamp and short clip reference

This moves perception from magic AI to measurable system behavior.

## 8. Demo Script (Use this in presentation)

1. Show health endpoint with loaded models.
2. Run normal classroom clip and show low false alarms.
3. Run staged incident clip and show event appears with explanation.
4. Show fused alert where two branches agree and severity increases.
5. Show saved evidence segment for manual verification.

## 9. Honest Limitations Slide

Include these points to show maturity:

- Not a punishment tool, only an early warning aid.
- Performance depends on camera placement, lighting, and audio quality.
- Needs monthly recalibration after classroom layout changes.
- Human review remains mandatory.

## 10. 14-Day Execution Plan

Day 1 to 2

- Apply pilot tuning values.
- Log all raw model scores and fusion decisions.

Day 3 to 5

- Collect calibration dataset in your real classrooms.
- Label true and false alerts.

Day 6 to 8

- Per-event threshold tuning and temporal window tuning.
- Freeze candidate configuration v1.

Day 9 to 11

- Shadow mode in live classroom (alerts logged, no operational action).
- Measure false alarms per hour and recall on staged checks.

Day 12 to 14

- Final config freeze.
- Prepare teacher demo with 3 successful and 2 failure-case examples.

## 11. Success Criteria

- Fight/fall/fire recall on staged classroom incidents >= 85%
- False alerts < 1 per camera-hour during normal classes
- 100% alerts include reason and evidence snippet
- Teacher feedback score improves over baseline trial

