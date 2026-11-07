"""Configuración y rutas de Código Cero."""

from __future__ import annotations

import os
import sys
from pathlib import Path

APP_NAME = "Código Cero"
VERSION = "0.1.0"


def _is_frozen() -> bool:
    """True cuando la app corre como .exe empaquetado con PyInstaller."""
    return bool(getattr(sys, "frozen", False)) and hasattr(sys, "_MEIPASS")


def _bundle_dir() -> Path:
    """Carpeta de los assets de solo lectura (web/, content/).

    Sin congelar: la raíz del repo (padre de app/).
    Congelado (PyInstaller --onefile): la carpeta temporal _MEIPASS,
    donde PyInstaller extrae los archivos empaquetados.
    """
    if _is_frozen():
        return Path(sys._MEIPASS)  # type: ignore[attr-defined]
    return Path(__file__).resolve().parent.parent


def _app_dir() -> Path:
    """Carpeta donde vive el ejecutable / el repo.

    Sin congelar: la raíz del repo.
    Congelado: la carpeta que contiene Codigo-Cero.exe. Ahí van los
    datos escribibles (data/, models/), porque _MEIPASS es temporal
    y se borra al cerrar la app.
    """
    if _is_frozen():
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


BASE_DIR = _bundle_dir()


def _env_path(name: str, default: Path) -> Path:
    value = os.environ.get(name)
    return Path(value).expanduser().resolve() if value else default


# Escribibles: junto al .exe en modo portable, en el repo en modo fuente.
DATA_DIR = _env_path("CODIGOCERO_DATA", _app_dir() / "data")
DB_PATH = DATA_DIR / "app.db"
# Solo lectura: del bundle (_MEIPASS en exe, repo en fuente).
WEB_DIR = _bundle_dir() / "web"
CONTENT_DIR = _bundle_dir() / "content" / "tracks"
MODELS_DIR = _env_path("CODIGOCERO_MODELS", _app_dir() / "models")
BACKUP_DIR = DATA_DIR / "backups"

# En modo portable, deja listas las carpetas junto al .exe para que el
# usuario solo tenga que soltar ahí su .gguf. Sin congelar no se toca nada.
if _is_frozen():
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass

DEMO_TRACKS = ("python", "web", "javascript", "sql", "csharp")
DEFAULT_PORT = 8765
MAX_CODE_BYTES = 64 * 1024
MAX_CHAT_HISTORY = 6
