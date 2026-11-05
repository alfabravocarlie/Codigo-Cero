#!/usr/bin/env python3
"""Valida el contenido semilla de Código Cero.

Uso:
    python tools/validate_content.py            # valida todo
    python tools/validate_content.py python     # un itinerario

Comprueba estructura, slugs, quizzes y que cada solución propuesta pase sus
propios tests (Python/JavaScript/SQL). No necesita dependencias externas.
"""

from __future__ import annotations

import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRACKS_DIR = ROOT / "content" / "tracks"
KINDS = {"stdout", "sql", "checklist"}
LANGUAGES = {"python", "javascript", "web", "sql", "csharp", "cpp"}
_cpp_warned = False

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def normalize(text: str) -> str:
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip() for line in text.split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def run_python(code: str, stdin: str, timeout: int = 10) -> tuple[bool, str, str]:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "main.py"
        path.write_text(code, encoding="utf-8")
        try:
            proc = subprocess.run(
                [sys.executable, "-I", str(path)],
                input=stdin,
                capture_output=True,
                text=True,
                timeout=timeout,
                encoding="utf-8",
                errors="replace",
            )
        except subprocess.TimeoutExpired:
            return False, "", "tiempo de ejecución agotado"
        return proc.returncode == 0, proc.stdout, proc.stderr


def run_javascript(code: str, stdin: str, timeout: int = 10) -> tuple[bool, str, str]:
    node = shutil.which("node")
    if not node:
        return True, "", ""  # sin Node no se puede comprobar: no es un error de contenido
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "main.js"
        path.write_text(code, encoding="utf-8")
        try:
            proc = subprocess.run(
                [node, str(path)],
                input=stdin,
                capture_output=True,
                text=True,
                timeout=timeout,
                encoding="utf-8",
                errors="replace",
            )
        except subprocess.TimeoutExpired:
            return False, "", "tiempo de ejecución agotado"
        return proc.returncode == 0, proc.stdout, proc.stderr


def run_sql(code: str, setup: str) -> tuple[list[list], str]:
    try:
        conn = sqlite3.connect(":memory:")
        conn.executescript(setup or "")
        cur = conn.execute(code)
        rows = [list(row) for row in cur.fetchall()]
        conn.close()
        return rows, ""
    except Exception as exc:  # noqa: BLE001 - queremos el mensaje para el informe
        return [], str(exc)


def as_rows(rows: list[list]) -> list[tuple[str, ...]]:
    return sorted(tuple("" if v is None else str(v) for v in row) for row in rows)


CPP_CANDIDATES = (
    r"C:\msys64\mingw64\bin\g++.exe",
    r"C:\msys64\ucrt64\bin\g++.exe",
    r"C:\msys64\clang64\bin\clang++.exe",
    r"C:\mingw64\bin\g++.exe",
    r"C:\TDM-GCC-64\bin\g++.exe",
    r"C:\Program Files\LLVM\bin\clang++.exe",
    r"C:\Program Files\WinLibs\mingw64\bin\g++.exe",
)


def cpp_compiler() -> str | None:
    for name in ("g++", "clang++"):
        path = shutil.which(name)
        if path:
            return path
    for candidate in CPP_CANDIDATES:
        if Path(candidate).exists():
            return candidate
    return None


def run_cpp(code: str, stdin: str, timeout: int = 15):
    compiler = cpp_compiler()
    if not compiler:
        return None
    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / "main.cpp"
        source.write_text(code, encoding="utf-8")
        binary = Path(tmp) / ("programa.exe" if sys.platform == "win32" else "programa")
        env = dict(os.environ)
        compiler_dir = str(Path(compiler).parent)
        env["PATH"] = compiler_dir + os.pathsep + env.get("PATH", "")
        try:
            build = subprocess.run(
                [compiler, "-std=c++17", "-O0", "-o", str(binary), str(source)],
                capture_output=True, text=True, timeout=45,
                encoding="utf-8", errors="replace", env=env,
            )
        except subprocess.TimeoutExpired:
            return False, "", "la compilación tardó demasiado"
        if build.returncode != 0:
            return False, "", (build.stderr or "error de compilación")[:400]
        try:
            proc = subprocess.run(
                [str(binary)], input=stdin, capture_output=True, text=True,
                timeout=timeout, encoding="utf-8", errors="replace", env=env,
            )
        except subprocess.TimeoutExpired:
            return False, "", "tiempo de ejecución agotado"
        return proc.returncode == 0, proc.stdout, proc.stderr


def check_solution_runtime(where: str, language: str, solution: str, tests: list) -> None:
    global _cpp_warned
    if language == "python":
        runner = run_python
    elif language == "javascript":
        runner = run_javascript
    elif language == "cpp":
        if cpp_compiler() is None:
            if not _cpp_warned:
                warn("C++: no hay compilador instalado; no se ejecutan las soluciones.")
                _cpp_warned = True
            return
        runner = run_cpp
    else:
        return
    for index, test in enumerate(tests, 1):
        outcome = runner(solution, test.get("stdin", ""))
        if outcome is None:
            return
        ok, out, stderr = outcome
        if not ok:
            err(f"{where}: la solución falla en el test {index}: {stderr.strip()[:200]}")
        elif normalize(out) != normalize(test.get("expected_stdout", "")):
            err(
                f"{where}: test {index} no coincide; esperado "
                f"{normalize(test.get('expected_stdout', ''))!r}, obtenido {normalize(out)!r}"
            )


def check_exercise(where: str, ex: dict, language: str) -> None:
    if not isinstance(ex, dict):
        err(f"{where}: ejercicio no es un objeto")
        return
    slug = ex.get("slug")
    if not slug:
        err(f"{where}: ejercicio sin slug")
        return
    where = f"{where}.{slug}"
    kind = ex.get("kind")
    if kind not in KINDS:
        err(f"{where}: kind inválido {kind!r}")
        return
    if not ex.get("title"):
        err(f"{where}: sin título")
    if not ex.get("prompt_md"):
        err(f"{where}: sin prompt_md")
    hints = ex.get("hints") or []
    if not isinstance(hints, list) or len(hints) < 1:
        warn(f"{where}: sin pistas")
    tests = ex.get("tests") or []
    solution = ex.get("solution_code") or ""

    if kind == "stdout":
        if language not in {"python", "javascript", "csharp", "cpp"}:
            err(f"{where}: kind stdout no soportado en {language}")
        if not tests:
            err(f"{where}: sin tests")
        if not solution:
            err(f"{where}: sin solution_code")
        if solution and tests:
            check_solution_runtime(where, language, solution, tests)
        if language == "csharp" and not ex.get("starter_code"):
            warn(f"{where}: sin starter_code")

    elif kind == "sql":
        if language != "sql":
            err(f"{where}: kind sql en itinerario {language}")
        if not solution:
            err(f"{where}: sin solution_code")
        if not tests:
            err(f"{where}: sin tests")
        for i, test in enumerate(tests, 1):
            if "setup" not in test or "expected_rows" not in test:
                err(f"{where}: test {i} necesita setup y expected_rows")
                continue
            if solution:
                rows, problem = run_sql(solution, test.get("setup", ""))
                if problem:
                    err(f"{where}: la consulta falla en el test {i}: {problem}")
                elif as_rows(rows) != as_rows(test["expected_rows"]):
                    err(f"{where}: filas distintas en el test {i}: {rows!r}")

    elif kind == "checklist":
        items = ex.get("items") or []
        if not isinstance(items, list) or len(items) < 2:
            err(f"{where}: checklist necesita al menos 2 items")
        if not ex.get("starter_code"):
            warn(f"{where}: checklist sin starter_code")


def check_lesson(where: str, lesson: dict, language: str) -> None:
    for field in ("slug", "title", "summary", "body_md"):
        if not lesson.get(field):
            err(f"{where}: lección sin {field}")
            return
    where = f"{where}.{lesson['slug']}"
    objectives = lesson.get("objectives") or []
    if len(objectives) < 2:
        warn(f"{where}: pocos objetivos")
    minutes = lesson.get("minutes")
    if not isinstance(minutes, int) or minutes <= 0:
        err(f"{where}: minutes inválido")
    words = len(str(lesson.get("body_md", "")).split())
    if words < 250:
        warn(f"{where}: cuerpo corto ({words} palabras)")
    quiz = lesson.get("quiz") or []
    if not isinstance(quiz, list) or not quiz:
        warn(f"{where}: sin quiz")
    for i, q in enumerate(quiz, 1):
        if not q.get("question") or not isinstance(q.get("options"), list) or len(q["options"]) < 3:
            err(f"{where}: quiz {i} incompleto")
            continue
        idx = q.get("answer_index")
        if not isinstance(idx, int) or not 0 <= idx < len(q["options"]):
            err(f"{where}: quiz {i} answer_index inválido")
    exercises = lesson.get("exercises") or []
    if len(exercises) < 1:
        warn(f"{where}: sin ejercicios")
    for ex in exercises:
        check_exercise(where, ex, language)


def check_lab(where: str, lab: dict, language: str) -> None:
    for field in ("slug", "title", "summary"):
        if not lab.get(field):
            err(f"{where}: laboratorio sin {field}")
            return
    where = f"{where}.{lab['slug']}"
    steps = lab.get("steps") or []
    if len(steps) < 2:
        err(f"{where}: laboratorio con menos de 2 pasos")
    for i, step in enumerate(steps, 1):
        if not step.get("title") or not step.get("instructions_md"):
            err(f"{where}: paso {i} incompleto")
            continue
        kind = step.get("kind", "stdout")
        if kind not in KINDS:
            err(f"{where}: paso {i} kind inválido")
        if kind == "stdout":
            tests = step.get("tests") or []
            if not tests:
                err(f"{where}: paso {i} sin tests")
            for j, test in enumerate(tests, 1):
                if "expected_stdout" not in test:
                    err(f"{where}: paso {i} test {j} sin expected_stdout")
        elif kind == "checklist":
            items = step.get("items") or []
            if len(items) < 2:
                err(f"{where}: paso {i} checklist necesita 2 items")


def check_track(path: Path, data: dict) -> None:
    track = data.get("track")
    if not track:
        err(f"{path.name}: falta track")
        return
    if path.stem != track:
        err(f"{path.name}: el nombre del archivo no coincide con track={track}")
    if data.get("language") not in LANGUAGES:
        err(f"{path.name}: language inválido")
    language = data.get("language", "")
    for field in ("title", "description"):
        if not data.get(field):
            err(f"{path.name}: falta {field}")
    modules = data.get("modules") or []
    if not modules:
        err(f"{path.name}: sin módulos")
    slugs: set[str] = set()
    for module in modules:
        if not module.get("title"):
            err(f"{path.name}: módulo sin título")
        for lesson in module.get("lessons") or []:
            slug = lesson.get("slug", "")
            if slug in slugs:
                err(f"{path.name}: slug de lección repetido {slug!r}")
            slugs.add(slug)
            check_lesson(path.stem, lesson, language)
    labs = data.get("labs") or []
    lab_slugs: set[str] = set()
    for lab in labs:
        if lab.get("slug") in lab_slugs:
            err(f"{path.name}: slug de laboratorio repetido {lab.get('slug')!r}")
        lab_slugs.add(lab.get("slug"))
        check_lab(path.stem, lab, language)
    print(f"  {track}: {len(modules)} módulos, {len(slugs)} lecciones, {len(labs)} laboratorios")


def main() -> int:
    wanted = set(sys.argv[1:])
    files = sorted(TRACKS_DIR.glob("*.json"))
    if not files:
        print("No hay archivos en content/tracks")
        return 1
    for path in files:
        if wanted and path.stem not in wanted:
            continue
        print(f"Validando {path.name}…")
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            err(f"{path.name}: JSON inválido: {exc}")
            continue
        check_track(path, data)

    for w in warnings:
        print(f"AVISO  {w}")
    for e in errors:
        print(f"ERROR  {e}")
    print(f"\n{len(errors)} errores, {len(warnings)} avisos")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
