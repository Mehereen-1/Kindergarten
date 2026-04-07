from __future__ import annotations

from typing import Iterable, List, Optional

from anomaly_system.alert_logic import positives
from anomaly_system.config import FusionConfig
from anomaly_system.schemas import ModelResult, UnifiedAlert


class FusionEngine:
    def __init__(self, config: FusionConfig) -> None:
        self.config = config

    def fuse(self, results: Iterable[ModelResult]) -> List[UnifiedAlert]:
        detections = positives(results, min_confidence=self.config.medium_confidence)
        alerts: List[UnifiedAlert] = []

        fight = self._best_event(detections, "fight")
        fall = self._best_event(detections, "fall")
        fire = self._best_event(detections, "fire")
        running_surge = self._best_event(detections, "running_surge")
        sudden_gathering = self._best_event(detections, "sudden_gathering")
        rush_to_zone = self._best_event(detections, "rush_to_zone")
        density_spike = self._best_event(detections, "density_spike")

        alarm = self._best_audio(detections, {"alarm"})
        distress = self._best_audio(detections, {"distress_scream"})
        impact = self._best_audio(detections, {"crash_impact", "glass_break"})
        generic_security_audio = self._best_audio(detections, {"security_audio"})

        if fire:
            severity = "critical" if (alarm or fire.confidence >= self.config.high_confidence) else "high"
            summary = "Fire with alarm detected" if alarm else "Fire detected in classroom"
            alerts.append(self._alert("fire_emergency", severity, summary, [fire, alarm]))

        if fall and impact:
            alerts.append(
                self._alert(
                    "possible_accident",
                    "high",
                    "Fall with crash/impact sound detected",
                    [fall, impact],
                )
            )
        elif fall:
            alerts.append(self._alert("fall_alert", "medium", "Possible fall detected", [fall]))

        if fight and distress:
            alerts.append(
                self._alert(
                    "violence_alert",
                    "critical",
                    "Fight with distress scream detected",
                    [fight, distress],
                )
            )
        elif fight and (running_surge or sudden_gathering or rush_to_zone):
            alerts.append(
                self._alert(
                    "escalation_alert",
                    "high",
                    "Fight with crowd escalation detected",
                    [fight, running_surge, sudden_gathering, rush_to_zone],
                )
            )
        elif fight and generic_security_audio:
            alerts.append(
                self._alert(
                    "security_alert",
                    "high",
                    "Fight with security audio detected",
                    [fight, generic_security_audio],
                )
            )
        elif fight:
            alerts.append(self._alert("fight_alert", "high", "Fight detected in classroom", [fight]))

        if alarm and running_surge:
            alerts.append(
                self._alert(
                    "evacuation_alert",
                    "critical",
                    "Alarm with running surge detected",
                    [alarm, running_surge],
                )
            )
        elif alarm:
            alerts.append(self._alert("alarm_alert", "high", "Alarm sound detected", [alarm]))
        elif generic_security_audio and generic_security_audio.confidence >= self.config.high_confidence:
            alerts.append(
                self._alert(
                    "security_audio_alert",
                    "medium",
                    "Security-relevant emergency audio detected",
                    [generic_security_audio],
                )
            )

        if sudden_gathering and fight is None:
            alerts.append(self._alert("crowd_gathering_alert", "medium", "Sudden crowd gathering detected", [sudden_gathering]))
        if rush_to_zone and fight is None:
            alerts.append(self._alert("rush_to_zone_alert", "medium", "Crowd rushed to one zone", [rush_to_zone]))
        if density_spike and not any(alert.type in {"crowd_gathering_alert", "rush_to_zone_alert", "escalation_alert"} for alert in alerts):
            alerts.append(self._alert("density_spike_alert", "medium", "Crowd density spike detected", [density_spike]))
        if running_surge and not any(alert.type in {"evacuation_alert", "escalation_alert"} for alert in alerts):
            alerts.append(self._alert("running_surge_alert", "medium", "Running surge detected", [running_surge]))

        if not alerts and len(detections) >= 2:
            alerts.append(
                UnifiedAlert(
                    type="multi_signal_alert",
                    severity="medium",
                    triggered_by=sorted({result.model_name for result in detections}),
                    summary="Multiple security anomaly signals detected",
                    confidence=max(result.confidence for result in detections),
                    metadata={"event_types": sorted({result.event_type for result in detections})},
                )
            )

        return self._dedupe(alerts)

    def _best_event(self, results: Iterable[ModelResult], event_type: str) -> Optional[ModelResult]:
        matches = [result for result in results if result.event_type == event_type]
        return max(matches, key=lambda item: item.confidence) if matches else None

    def _best_audio(self, results: Iterable[ModelResult], event_types: set[str]) -> Optional[ModelResult]:
        matches = [
            result
            for result in results
            if result.model_name == "audio_security_model" and result.event_type in event_types
        ]
        if not matches and "security_audio" in event_types:
            matches = [
                result
                for result in results
                if result.model_name == "audio_security_model" and result.event_type != "normal"
            ]
        return max(matches, key=lambda item: item.confidence) if matches else None

    def _alert(
        self,
        alert_type: str,
        severity: str,
        summary: str,
        sources: List[Optional[ModelResult]],
    ) -> UnifiedAlert:
        active = [source for source in sources if source is not None]
        return UnifiedAlert(
            type=alert_type,
            severity=severity,  # type: ignore[arg-type]
            triggered_by=sorted({source.model_name for source in active}),
            summary=summary,
            confidence=max(source.confidence for source in active),
            metadata={
                "event_types": sorted({source.event_type for source in active}),
                "labels": sorted({source.label for source in active}),
            },
        )

    def _dedupe(self, alerts: List[UnifiedAlert]) -> List[UnifiedAlert]:
        deduped: dict[str, UnifiedAlert] = {}
        for alert in alerts:
            key = alert.type
            current = deduped.get(key)
            if current is None or alert.confidence > current.confidence:
                deduped[key] = alert
        return list(deduped.values())
