from __future__ import annotations

from typing import Iterable, List, Optional

from anomaly_system.schemas import ModelResult


def positives(results: Iterable[ModelResult], *, event_type: Optional[str] = None, min_confidence: float = 0.0) -> List[ModelResult]:
    items = [result for result in results if result.detected and result.confidence >= min_confidence]
    if event_type is not None:
        items = [result for result in items if result.event_type == event_type]
    return items


def top_result(results: Iterable[ModelResult], *, event_type: Optional[str] = None) -> Optional[ModelResult]:
    matches = positives(results, event_type=event_type)
    if not matches:
        return None
    return max(matches, key=lambda item: item.confidence)
