"""Detección e instalación guiada de las herramientas que necesita el equipo."""

from __future__ import annotations

import os
import shutil
import subprocess
import threading
import time
import webbrowser

NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0) if os.name == "nt" else 0

CATALOG: list[dict] = [
    {
        "id": "node",
        "name": "Node.js",
        "kind": "runtime",
        "why": "Ejecuta los ejercicios de JavaScript en tu equipo.",
        "tracks": ["javascript"],
        "commands": ["node"],
        "args": ["--version"],
        "winget_id": "OpenJS.NodeJS.LTS",
        "download_url": "https://nodejs.org/es/download",
        "docs_url": "https://nodejs.org/es/learn",
        "size": "unos 35 MB",
        "requires_admin": True,
        "steps": [
            "Descarga el instalador «LTS» desde nodejs.org.",
            "Ejecútalo y acepta las opciones por defecto.",
            "Cierra y vuelve a abrir Código Cero si estaba abierto.",
            "Pulsa «Volver a comprobar».",
        ],
    },
    {
        "id": "dotnet",
        "name": "SDK de .NET 8",
        "kind": "runtime",
        "why": "Compila y ejecuta los ejercicios de C#.",
        "tracks": ["csharp"],
        "commands": ["dotnet"],
        "args": ["--list-sdks"],
        "winget_id": "Microsoft.DotNet.SDK.8",
        "download_url": "https://dotnet.microsoft.com/es-es/download/dotnet/8.0",
        "docs_url": "https://learn.microsoft.com/es-es/dotnet/",
        "size": "unos 200 MB",
        "requires_admin": True,
        "steps": [
            "Descarga el «SDK» de .NET 8 (no solo el runtime).",
            "Ejecuta el instalador y espera a que termine.",
            "Cierra y vuelve a abrir Código Cero.",
            "Pulsa «Volver a comprobar»: debe aparecer una versión del SDK.",
        ],
    },
    {
        "id": "gcc",
        "name": "Compilador GCC (MinGW-w64)",
        "kind": "compiler",
        "why": "Compila y ejecuta los ejercicios de C++.",
        "tracks": ["cpp"],
        "commands": ["g++", "clang++"],
        "args": ["--version"],
        "winget_id": "BrechtSanders.WinLibs.POSIX.UCRT",
        "download_url": "https://winlibs.com/",
        "docs_url": "https://gcc.gnu.org/onlinedocs/",
        "size": "unos 150 MB",
        "requires_admin": True,
        "steps": [
            "Instala WinLibs con winget o descarga el paquete de winlibs.com.",
            "Si lo descargas a mano, descomprímelo en una carpeta fija (por ejemplo C:\\mingw64).",
            "Añade la carpeta «bin» al PATH de Windows si el instalador no lo hizo.",
            "Abre una consola nueva y comprueba con «g++ --version».",
            "Pulsa «Volver a comprobar».",
        ],
    },
    {
        "id": "java",
        "name": "JDK de Java",
        "kind": "runtime",
        "why": "Compila y ejecuta código Java si sigues un itinerario de Java.",
        "tracks": [],
        "commands": ["javac"],
        "args": ["-version"],
        "winget_id": "EclipseAdoptium.Temurin.21.JDK",
        "download_url": "https://adoptium.net/es/temurin/releases/",
        "docs_url": "https://docs.oracle.com/en/java/",
        "size": "unos 180 MB",
        "requires_admin": True,
        "steps": [
            "Descarga el JDK 21 (Temurin) desde adoptium.net.",
            "Ejecuta el instalador y deja marcada la opción de configurar JAVA_HOME.",
            "Abre una consola nueva y comprueba con «javac -version».",
            "Pulsa «Volver a comprobar».",
        ],
    },
    {
        "id": "git",
        "name": "Git",
        "kind": "tool",
        "why": "Guarda tu proyecto y súbelo a GitHub cuando quieras.",
        "tracks": [],
        "commands": ["git"],
        "args": ["--version"],
        "winget_id": "Git.Git",
        "download_url": "https://git-scm.com/download/win",
        "docs_url": "https://git-scm.com/book/es/v2",
        "size": "unos 60 MB",
        "requires_admin": True,
        "steps": [
            "Descarga Git para Windows desde git-scm.com.",
            "Instálalo con las opciones por defecto.",
            "Abre una consola nueva y comprueba con «git --version».",
            "Pulsa «Volver a comprobar».",
        ],
    },
    {
        "id": "ollama",
        "name": "Ollama",
        "kind": "service",
        "why": "Ejecuta el profesor de IA local. Es opcional: sin él puedes usar modo lectura o un endpoint compatible.",
        "tracks": [],
        "commands": ["ollama"],
        "args": ["--version"],
        "winget_id": "Ollama.Ollama",
        "download_url": "https://ollama.com/download",
        "docs_url": "https://ollama.com/docs",
        "size": "unos 700 MB con un modelo pequeño",
        "requires_admin": False,
        "steps": [
            "Descarga e instala Ollama desde ollama.com.",
            "Comprueba que aparece el icono en la bandeja del sistema.",
            "Vuelve a Código Cero y pulsa «Probar conexión» en Ajustes.",
        ],
    },
]


class ToolError(Exception):
    pass


_cache: dict[str, object] = {"at": 0.0, "tools": None}
_jobs: dict[str, dict] = {}
_lock = threading.Lock()


def winget_available() -> bool:
    return os.name == "nt" and shutil.which("winget") is not None


def _run_probe(command: str, args: list[str]) -> tuple[bool, str]:
    path = shutil.which(command)
    if not path:
        return False, ""
    try:
        proc = subprocess.run(
            [path] + args,
            capture_output=True,
            text=True,
            timeout=10,
            encoding="utf-8",
            errors="replace",
            creationflags=NO_WINDOW,
        )
    except (OSError, subprocess.SubprocessError):
        return bool(path), ""
    output = ((proc.stdout or "") + "\n" + (proc.stderr or "")).strip()
    return True, output


def _version_line(output: str) -> str:
    for line in output.splitlines():
        text = " ".join(line.split())
        if text:
            return text[:80]
    return ""


def detect(tool: dict) -> dict:
    found = False
    output = ""
    location = ""
    detail = ""
    for command in tool["commands"]:
        found, output = _run_probe(command, tool["args"])
        if found:
            location = shutil.which(command) or command
            break
    if not found and tool["id"] == "gcc":
        from .runner import cpp_compiler

        compiler = cpp_compiler()
        if compiler:
            found = True
            location = compiler
            try:
                proc = subprocess.run(
                    [compiler] + tool["args"],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    encoding="utf-8",
                    errors="replace",
                    creationflags=NO_WINDOW,
                )
                output = ((proc.stdout or "") + "\n" + (proc.stderr or "")).strip()
            except (OSError, subprocess.SubprocessError):
                output = ""
            detail = "Detectado fuera del PATH; Código Cero lo usará directamente."
    version = _version_line(output)
    installed = found
    if tool["id"] == "dotnet":
        installed = bool(output.strip())
        if found and not installed:
            detail = "Solo está el runtime; falta el SDK."
    return {
        "id": tool["id"],
        "name": tool["name"],
        "kind": tool["kind"],
        "installed": installed,
        "found": found,
        "version": version,
        "detail": detail,
        "location": location,
        "why": tool["why"],
        "tracks": tool["tracks"],
        "winget_id": tool["winget_id"],
        "download_url": tool["download_url"],
        "docs_url": tool["docs_url"],
        "size": tool["size"],
        "steps": tool["steps"],
        "requires_admin": tool["requires_admin"],
    }


def all_tools(force: bool = False) -> dict:
    now = time.time()
    if not force and _cache["tools"] and now - float(_cache["at"]) < 30:
        return _cache["tools"]  # type: ignore[return-value]
    tools = [detect(tool) for tool in CATALOG]
    payload = {
        "winget": winget_available(),
        "os": "Windows" if os.name == "nt" else os.name,
        "tools": tools,
    }
    _cache["at"] = now
    _cache["tools"] = payload
    return payload


def get_tool(tool_id: str) -> dict:
    for tool in all_tools()["tools"]:
        if tool["id"] == tool_id:
            return tool
    raise ToolError("Esa herramienta no existe.")


def install_status(tool_id: str) -> dict:
    job = _jobs.get(tool_id)
    if job:
        return {**job}
    tool = get_tool(tool_id)
    return {
        "id": tool_id,
        "status": "idle" if not tool["installed"] else "installed",
        "log": "",
        "installed": tool["installed"],
    }


def start_install(tool_id: str) -> dict:
    tool = get_tool(tool_id)
    if tool["installed"]:
        return {"started": False, "status": "installed", "log": "", "id": tool_id}
    if not winget_available():
        raise ToolError(
            "winget no está disponible en este equipo. Usa el botón de descarga manual."
        )
    with _lock:
        for other_id, other in _jobs.items():
            if other["status"] == "running" and other_id != tool_id:
                raise ToolError(f"Ya hay una instalación en curso ({other['name']}).")
        job = {
            "id": tool_id,
            "name": tool["name"],
            "status": "running",
            "log": "",
            "installed": False,
            "started_at": time.time(),
        }
        _jobs[tool_id] = job
        thread = threading.Thread(target=_run_install, args=(tool, job), daemon=True)
        thread.start()
    return {"started": True, **job}


def _append(job: dict, text: str) -> None:
    job["log"] = (job["log"] + text)[-20000:]


def _run_install(tool: dict, job: dict) -> None:
    command = [
        "winget",
        "install",
        "--id",
        tool["winget_id"],
        "--exact",
        "--silent",
        "--accept-package-agreements",
        "--accept-source-agreements",
        "--disable-interactivity",
    ]
    _append(job, "$ " + " ".join(command) + "\n")
    try:
        proc = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            creationflags=NO_WINDOW,
            bufsize=1,
        )
    except OSError as exc:
        job["status"] = "error"
        _append(job, f"\nNo se pudo iniciar winget: {exc}\n")
        return
    try:
        assert proc.stdout is not None
        for line in proc.stdout:
            _append(job, line)
        code = proc.wait(timeout=900)
    except subprocess.TimeoutExpired:
        proc.kill()
        job["status"] = "error"
        _append(job, "\nLa instalación tardó demasiado y se canceló.\n")
        return
    job["exit_code"] = code
    _cache["tools"] = None
    if code == 0:
        job["status"] = "done"
        job["installed"] = True
        _append(job, "\nInstalación terminada. Comprueba la herramienta.\n")
    else:
        job["status"] = "error"
        _append(
            job,
            "\nwinget devolvió un error. Si pedía permisos de administrador, ejecuta "
            "la instalación manual desde la web oficial.\n",
        )


def open_target(tool_id: str, target: str) -> None:
    tool = get_tool(tool_id)
    url = tool["download_url"] if target == "download" else tool["docs_url"]
    if not webbrowser.open(url):
        raise ToolError("No se pudo abrir el navegador. Copia la dirección a mano.")
