"""Ajustes persistentes con valores por defecto y validación básica."""

from __future__ import annotations

import sqlite3

from .db import get_db, load_json

DEFAULTS: dict[str, object] = {
    "ai.provider": "ollama",
    "ai.model": "",
    "ai.base_url": "",
    "ai.api_key": "",
    "ai.temperature": 0.35,
    "ai.num_ctx": 4096,
    "ai.num_predict": 512,
    "exec.timeout_ms": 5000,
    "exec.max_output_kb": 64,
    "ui.theme": "dark",
    "ui.font_size": 15,
    "app.locale": "es",
    "onboarding.done": False,
}

BOOL_KEYS = {"onboarding.done"}
INT_KEYS = {"ai.num_ctx": (512, 32768), "ai.num_predict": (64, 4096), "exec.timeout_ms": (1000, 60000),
            "exec.max_output_kb": (4, 512), "ui.font_size": (12, 22)}
FLOAT_KEYS = {"ai.temperature": (0.0, 2.0)}
CHOICES = {"ui.theme": {"dark", "light"}, "ai.provider": {"ollama", "openai"}}


def load_settings(db: sqlite3.Connection | None = None) -> dict:
    db = db or get_db()
    values = dict(DEFAULTS)
    for row in db.execute("SELECT key, value FROM settings"):
        values[row["key"]] = load_json(row["value"], row["value"])
    return values


def save_settings(updates: dict, db: sqlite3.Connection | None = None) -> dict:
    db = db or get_db()
    clean = {}
    for key, raw in updates.items():
        if key not in DEFAULTS:
            continue
        clean[key] = _coerce(key, raw)
    for key, value in clean.items():
        db.execute(
            "INSERT INTO settings(key, value) VALUES(?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, _encode(value)),
        )
    db.commit()
    return load_settings(db)


def _encode(value):
    import json

    return json.dumps(value, ensure_ascii=False)


def _coerce(key: str, value):
    if key in BOOL_KEYS:
        if isinstance(value, bool):
            return value
        return str(value).strip().lower() in {"1", "true", "si", "sí", "yes"}
    if key in INT_KEYS:
        low, high = INT_KEYS[key]
        try:
            number = int(value)
        except (TypeError, ValueError):
            return DEFAULTS[key]
        return max(low, min(high, number))
    if key in FLOAT_KEYS:
        low, high = FLOAT_KEYS[key]
        try:
            number = float(value)
        except (TypeError, ValueError):
            return DEFAULTS[key]
        return round(max(low, min(high, number)), 2)
    if key in CHOICES:
        text = str(value).strip().lower()
        return text if text in CHOICES[key] else DEFAULTS[key]
    return str(value).strip() if value is not None else ""
