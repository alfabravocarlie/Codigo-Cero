"""Carga de los itinerarios semilla de content/tracks."""

from __future__ import annotations

import json
from pathlib import Path

from .config import CONTENT_DIR
from .runner import runtime_available

_cache: dict[str, tuple[float, dict]] = {}


def track_files() -> list[Path]:
    if not CONTENT_DIR.exists():
        return []
    return sorted(CONTENT_DIR.glob("*.json"))


def load_track(slug: str) -> dict | None:
    path = CONTENT_DIR / f"{slug}.json"
    if not path.exists():
        return None
    mtime = path.stat().st_mtime
    cached = _cache.get(slug)
    if cached and cached[0] == mtime:
        return cached[1]
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(data, dict) or not data.get("track"):
        return None
    _cache[slug] = (mtime, data)
    return data


def track_available(track: dict) -> bool:
    return runtime_available(str(track.get("language") or "python"))


def summary(track: dict) -> dict:
    lessons = sum(len(module.get("lessons") or []) for module in track.get("modules") or [])
    labs = len(track.get("labs") or [])
    return {
        "track": track.get("track"),
        "title": track.get("title") or track.get("track"),
        "language": track.get("language"),
        "description": track.get("description") or "",
        "level": track.get("level") or "principiante",
        "lessons": lessons,
        "labs": labs,
        "available": track_available(track),
    }


def list_tracks() -> list[dict]:
    tracks = []
    for path in track_files():
        track = load_track(path.stem)
        if track:
            tracks.append(summary(track))
    return tracks
