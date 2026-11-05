"""Arranque de Código Cero: elige puerto libre, abre el navegador y sirve la app."""

from __future__ import annotations

import argparse
import shutil
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

from app.config import APP_NAME, DEFAULT_PORT, VERSION
from app.server import create_app


def free_port(start: int = DEFAULT_PORT, attempts: int = 20) -> int:
    for port in range(start, start + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return start


def app_candidates() -> list[Path]:
    if sys.platform != "win32":
        return []
    roots = [Path(p) for p in (
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    )]
    return [path for path in roots if path.exists()]


def open_window(url: str) -> None:
    for browser in app_candidates():
        try:
            subprocess.Popen(
                [str(browser), f"--app={url}", "--window-size=1440,920"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return
        except OSError:
            continue
    webbrowser.open(url)


def main() -> int:
    parser = argparse.ArgumentParser(description="Código Cero")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()

    port = free_port(args.port)
    url = f"http://{args.host}:{port}"
    app = create_app()

    print(f"\n  {APP_NAME} {VERSION}")
    print(f"  {url}")
    print("  Cierra esta ventana para detener la aplicación.\n")

    if not args.no_browser:
        threading.Thread(target=_delayed_open, args=(url,), daemon=True).start()

    try:
        app.run(host=args.host, port=port, threaded=True, use_reloader=False)
    except KeyboardInterrupt:
        pass
    return 0


def _delayed_open(url: str) -> None:
    time.sleep(1.2)
    try:
        open_window(url)
    except Exception:  # noqa: BLE001 - abrir el navegador nunca debe tumbar la app
        webbrowser.open(url)


if __name__ == "__main__":
    raise SystemExit(main())
