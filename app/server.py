"""Fábrica de la aplicación Flask."""

from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from .config import APP_NAME, BACKUP_DIR, DB_PATH, VERSION, WEB_DIR
from .db import close_db, init_db
from .routes import bp


def create_app(db_path: str | Path | None = None, testing: bool = False) -> Flask:
    app = Flask(__name__, static_folder=str(WEB_DIR), static_url_path="")
    path = Path(db_path or DB_PATH)
    app.config["DB_PATH"] = str(path)
    app.config["TESTING"] = testing
    init_db(path)
    if not testing:
        _backup(path)
    app.teardown_appcontext(close_db)
    app.register_blueprint(bp)

    try:
        app.json.ensure_ascii = False
        app.json.sort_keys = False
    except AttributeError:  # Flask antiguo
        app.config["JSON_AS_ASCII"] = False
        app.config["JSON_SORT_KEYS"] = False

    @app.get("/")
    def index():
        return _index()

    @app.get("/favicon.svg")
    def favicon():
        return send_from_directory(WEB_DIR, "favicon.svg", mimetype="image/svg+xml")

    @app.errorhandler(404)
    def not_found(_error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Ruta no encontrada."}), 404
        return _index()

    @app.errorhandler(405)
    def not_allowed(_error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Método no permitido."}), 405
        return _index()

    return app


def _index():
    index_file = WEB_DIR / "index.html"
    if not index_file.exists():
        return (
            "<h1>Código Cero</h1><p>La interfaz todavía no está instalada.</p>",
            503,
            {"Content-Type": "text/html; charset=utf-8"},
        )
    return send_from_directory(WEB_DIR, "index.html")


def _backup(db_path: Path) -> None:
    if not db_path.exists() or db_path.stat().st_size == 0:
        return
    try:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        target = BACKUP_DIR / f"app-{stamp}.db"
        shutil.copy2(db_path, target)
        backups = sorted(BACKUP_DIR.glob("app-*.db"))
        for old in backups[:-5]:
            old.unlink(missing_ok=True)
    except OSError:
        pass


__all__ = ["create_app", "APP_NAME", "VERSION"]
