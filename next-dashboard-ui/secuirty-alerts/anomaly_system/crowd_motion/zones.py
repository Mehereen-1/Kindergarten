from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, Tuple


@dataclass(frozen=True)
class Zone:
    name: str
    x1: float
    y1: float
    x2: float
    y2: float

    def contains(self, point: Tuple[float, float], width: int, height: int) -> bool:
        px, py = point
        return self.x1 * width <= px <= self.x2 * width and self.y1 * height <= py <= self.y2 * height


class ZoneManager:
    def __init__(self, zones: Iterable[Zone]) -> None:
        self._zones = list(zones)

    def occupancy(self, points: Iterable[Tuple[float, float]], width: int, height: int) -> Dict[str, int]:
        counts = {zone.name: 0 for zone in self._zones}
        for point in points:
            for zone in self._zones:
                if zone.contains(point, width, height):
                    counts[zone.name] += 1
        return counts
