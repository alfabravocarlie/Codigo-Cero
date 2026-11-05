"""Configuración y rutas de Código Cero."""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
APP_NAME = "Código Cero"
VERSION = "0.1.0"


def _env_path(name: str, default: Path) -> Path:
    value = os.environ.get(name)
    return Path(value).expanduser().resolve() if value else default


DATA_DIR = _env_path("CODIGOCERO_DATA", BASE_DIR / "data")
DB_PATH = DATA_DIR / "app.db"
WEB_DIR = BASE_DIR / "web"
CONTENT_DIR = BASE_DIR / "content" / "tracks"
MODELS_DIR = _env_path("CODIGOCERO_MODELS", BASE_DIR / "models")
BACKUP_DIR = DATA_DIR / "backups"

DEMO_TRACKS = ("python", "web", "javascript", "sql", "csharp")
DEFAULT_PORT = 8765
MAX_CODE_BYTES = 64 * 1024
MAX_CHAT_HISTORY = 6
