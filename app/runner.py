"""Ejecución de código del alumno con límites de tiempo y salida."""

from __future__ import annotations

import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from .config import MAX_CODE_BYTES

LANGUAGES = ("python", "javascript", "sql", "csharp", "cpp", "web")
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0) if os.name == "nt" else 0

CPP_CANDIDATES = (
    r"C:\msys64\mingw64\bin\g++.exe",
    r"C:\msys64\ucrt64\bin\g++.exe",
    r"C:\msys64\clang64\bin\clang++.exe",
    r"C:\mingw64\bin\g++.exe",
    r"C:\TDM-GCC-64\bin\g++.exe",
    r"C:\Program Files\LLVM\bin\clang++.exe",
    r"C:\Program Files\WinLibs\mingw64\bin\g++.exe",
)


class RunnerError(Exception):
    pass


def cpp_compiler() -> str | None:
    """Busca un compilador de C++ en el PATH y en instalaciones habituales."""
    for name in ("g++", "clang++"):
        path = shutil.which(name)
        if path:
            return path
    for candidate in CPP_CANDIDATES:
        if Path(candidate).exists():
            return candidate
    return None


def dotnet_sdk() -> bool:
    """True solo si hay SDK (no basta con el runtime de .NET)."""
    dotnet = shutil.which("dotnet")
    if not dotnet:
        return False
    try:
        proc = subprocess.run(
            [dotnet, "--list-sdks"],
            capture_output=True,
            text=True,
            timeout=10,
            encoding="utf-8",
            errors="replace",
            creationflags=NO_WINDOW,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return proc.returncode == 0 and bool((proc.stdout or "").strip())


def runtime_available(language: str) -> bool:
    if language in {"python", "sql", "web"}:
        return True
    if language == "javascript":
        return shutil.which("node") is not None
    if language == "csharp":
        return dotnet_sdk()
    if language == "cpp":
        return cpp_compiler() is not None
    return False


def run(language: str, code: str, stdin: str = "", timeout_ms: int = 5000,
        max_output_kb: int = 64) -> dict:
    language = (language or "python").lower()
    if language not in LANGUAGES:
        raise RunnerError(f"Lenguaje no soportado: {language}")
    if len(code.encode("utf-8")) > MAX_CODE_BYTES:
        raise RunnerError("El código es demasiado grande (máximo 64 KB).")
    if not runtime_available(language):
        raise RunnerError(
            "Este lenguaje no está instalado en el equipo. "
            "Puedes seguir el itinerario en modo guiado o instalarlo desde Ajustes → Entorno."
        )

    started = time.perf_counter()
    if language == "python":
        result = _run_python(code, stdin, timeout_ms, max_output_kb)
    elif language == "javascript":
        result = _run_javascript(code, stdin, timeout_ms, max_output_kb)
    elif language == "csharp":
        result = _run_csharp(code, stdin, timeout_ms, max_output_kb)
    elif language == "cpp":
        result = _run_cpp(code, stdin, timeout_ms, max_output_kb)
    elif language == "sql":
        result = _run_sql(code, max_output_kb)
    else:
        result = {
            "ok": True,
            "stdout": "",
            "stderr": "",
            "exit_code": 0,
            "timed_out": False,
            "note": "La vista previa web se muestra en el navegador.",
        }
    result["duration_ms"] = int((time.perf_counter() - started) * 1000)
    return result


# --------------------------------------------------------------------- python
def _run_python(code: str, stdin: str, timeout_ms: int, max_kb: int) -> dict:
    tmp = tempfile.mkdtemp(prefix="cc-py-")
    try:
        script = Path(tmp) / "main.py"
        script.write_text(code, encoding="utf-8")
        cmd = [sys.executable, "-I", "-X", "utf8", str(script)]
        return _process(cmd, tmp, stdin, timeout_ms, max_kb)
    finally:
        _rmtree(tmp)


def _run_javascript(code: str, stdin: str, timeout_ms: int, max_kb: int) -> dict:
    node = shutil.which("node")
    if not node:
        raise RunnerError("Node.js no está instalado.")
    tmp = tempfile.mkdtemp(prefix="cc-js-")
    try:
        script = Path(tmp) / "main.js"
        script.write_text(code, encoding="utf-8")
        return _process([node, str(script)], tmp, stdin, timeout_ms, max_kb)
    finally:
        _rmtree(tmp)


def _run_csharp(code: str, stdin: str, timeout_ms: int, max_kb: int) -> dict:
    dotnet = shutil.which("dotnet")
    if not dotnet:
        raise RunnerError("El SDK de .NET no está instalado.")
    tmp = tempfile.mkdtemp(prefix="cc-cs-")
    try:
        project = Path(tmp) / "Programa.csproj"
        project.write_text(
            "<Project Sdk=\"Microsoft.NET.Sdk\">\n"
            "  <PropertyGroup>\n"
            "    <OutputType>Exe</OutputType>\n"
            "    <TargetFramework>net8.0</TargetFramework>\n"
            "    <ImplicitUsings>enable</ImplicitUsings>\n"
            "    <Nullable>disable</Nullable>\n"
            "  </PropertyGroup>\n"
            "</Project>\n",
            encoding="utf-8",
        )
        Path(tmp, "Program.cs").write_text(code, encoding="utf-8")
        cmd = [dotnet, "run", "--project", str(project), "-v", "q", "--nologo"]
        env = dict(os.environ)
        env.update(
            {
                "DOTNET_CLI_TELEMETRY_OPTOUT": "1",
                "DOTNET_NOLOGO": "1",
                "DOTNET_CLI_HOME": tmp,
                "DOTNET_SKIP_FIRST_TIME_EXPERIENCE": "1",
            }
        )
        return _process(cmd, tmp, stdin, max(int(timeout_ms), 45000), max_kb, env=env)
    finally:
        _rmtree(tmp)


def _run_cpp(code: str, stdin: str, timeout_ms: int, max_kb: int) -> dict:
    compiler = cpp_compiler()
    if not compiler:
        raise RunnerError("No hay ningún compilador de C++ instalado.")
    tmp = tempfile.mkdtemp(prefix="cc-cpp-")
    try:
        source = Path(tmp) / "main.cpp"
        source.write_text(code, encoding="utf-8")
        binary = Path(tmp) / ("programa.exe" if os.name == "nt" else "programa")
        env = _clean_env(tmp)
        compiler_dir = str(Path(compiler).parent)
        if env.get("PATH"):
            env["PATH"] = compiler_dir + os.pathsep + env["PATH"]
        else:
            env["PATH"] = compiler_dir
        try:
            build = subprocess.run(
                [compiler, "-std=c++17", "-O0", "-o", str(binary), str(source)],
                capture_output=True,
                text=True,
                timeout=45,
                encoding="utf-8",
                errors="replace",
                creationflags=NO_WINDOW,
                env=env,
            )
        except subprocess.TimeoutExpired:
            return {
                "ok": False,
                "stdout": "",
                "stderr": "La compilación tardó demasiado.",
                "exit_code": 1,
                "timed_out": True,
            }
        if build.returncode != 0 or not binary.exists():
            message = (build.stderr or build.stdout or "Error de compilación.").strip()
            return {
                "ok": False,
                "stdout": "",
                "stderr": message[: max_kb * 1024],
                "exit_code": build.returncode or 1,
                "timed_out": False,
                "compile_error": True,
            }
        return _process([str(binary)], tmp, stdin, timeout_ms, max_kb, env=env)
    finally:
        _rmtree(tmp)


def _rmtree(path: str) -> None:
    """Borra la carpeta temporal; en Windows el proceso puede tardar en soltarla."""
    for _ in range(25):
        try:
            shutil.rmtree(path)
            return
        except OSError:
            time.sleep(0.08)
    shutil.rmtree(path, ignore_errors=True)


def _process(cmd: list[str], cwd: str, stdin: str, timeout_ms: int, max_kb: int,
             env: dict | None = None) -> dict:
    if env is None:
        env = _clean_env(cwd)
    try:
        proc = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=env,
        )
    except OSError as exc:
        raise RunnerError(f"No se pudo iniciar el programa: {exc}") from exc

    timed_out = False
    try:
        out, err = proc.communicate(stdin or "", timeout=timeout_ms / 1000)
    except subprocess.TimeoutExpired:
        timed_out = True
        _kill_tree(proc)
        try:
            out, err = proc.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            out, err = "", ""
    limit = max_kb * 1024
    out, out_cut = _truncate(out, limit)
    err, err_cut = _truncate(err, limit)
    if out_cut or err_cut:
        err += "\n[Salida recortada]"
    return {
        "ok": not timed_out and proc.returncode == 0,
        "stdout": out,
        "stderr": err,
        "exit_code": proc.returncode,
        "timed_out": timed_out,
    }


def _kill_tree(proc: subprocess.Popen) -> None:
    try:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                capture_output=True,
                timeout=5,
            )
        else:
            proc.kill()
    except (OSError, subprocess.SubprocessError):
        pass
    deadline = time.time() + 5
    while proc.poll() is None and time.time() < deadline:
        try:
            proc.kill()
        except OSError:
            pass
        time.sleep(0.05)


def _truncate(text: str, limit: int) -> tuple[str, bool]:
    if len(text) <= limit:
        return text, False
    return text[:limit], True


def _clean_env(cwd: str) -> dict:
    env = {
        "PATH": os.environ.get("PATH", ""),
        "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
        "TEMP": cwd,
        "TMP": cwd,
        "HOME": cwd,
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUTF8": "1",
        "PYTHONUNBUFFERED": "1",
    }
    return {k: v for k, v in env.items() if v}


# ------------------------------------------------------------------------ sql
def run_sql(code: str, setup: str = "") -> tuple[list[str], list[list]]:
    conn = sqlite3.connect(":memory:")
    try:
        if setup:
            conn.executescript(setup)
        cursor = conn.execute(code)
        columns = [item[0] for item in cursor.description] if cursor.description else []
        rows = [[_jsonable(value) for value in row] for row in cursor.fetchall()]
        return columns, rows
    finally:
        conn.close()


def _run_sql(code: str, max_kb: int) -> dict:
    try:
        columns, rows = run_sql(code)
    except sqlite3.Error as exc:
        return {"ok": False, "stdout": "", "stderr": f"Error de SQL: {exc}",
                "exit_code": 1, "timed_out": False}
    text = " | ".join(columns) + "\n" if columns else ""
    text += "\n".join(" | ".join(str(value) for value in row) for row in rows)
    text, _ = _truncate(text, max_kb * 1024)
    return {"ok": True, "stdout": text, "stderr": "", "exit_code": 0,
            "timed_out": False, "rows": rows[:200], "columns": columns}


def _jsonable(value):
    if isinstance(value, bytes):
        return f"<{len(value)} bytes>"
    return value
