"""Evaluación determinista de ejercicios y checkpoints."""

from __future__ import annotations

import sqlite3


def normalize(text: str) -> str:
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip() for line in text.split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def _rows(rows) -> list[tuple[str, ...]]:
    return sorted(tuple("" if value is None else str(value) for value in row) for row in rows)


def grade_stdout(code: str, tests: list[dict], language: str, timeout_ms: int,
                 max_kb: int) -> tuple[bool, list[dict], str]:
    from . import runner

    results = []
    passed_all = True
    output = ""
    for index, test in enumerate(tests[:8], 1):
        name = test.get("name") or f"Caso {index}"
        try:
            run = runner.run(language, code, test.get("stdin", ""), timeout_ms, max_kb)
        except runner.RunnerError as exc:
            results.append(
                {"name": name, "passed": False, "expected": test.get("expected_stdout", ""),
                 "actual": "", "message": str(exc)}
            )
            passed_all = False
            continue
        actual = run.get("stdout", "")
        expected = test.get("expected_stdout", "")
        ok = not run.get("timed_out") and normalize(actual) == normalize(expected)
        message = ""
        if run.get("timed_out"):
            message = "El programa superó el tiempo límite."
        elif not ok:
            if normalize(actual) == "":
                message = "El programa no imprimió nada."
            elif (run.get("stderr") or "").strip():
                message = "El programa terminó con un error."
        results.append(
            {
                "name": name,
                "passed": ok,
                "expected": expected,
                "actual": actual,
                "message": message,
                "stderr": run.get("stderr", ""),
            }
        )
        if not output and actual:
            output = actual
        passed_all = passed_all and ok
    return passed_all, results, output


def grade_sql(code: str, tests: list[dict]) -> tuple[bool, list[dict], str]:
    from . import runner

    results = []
    passed_all = True
    for index, test in enumerate(tests[:8], 1):
        name = test.get("name") or f"Caso {index}"
        expected = test.get("expected_rows", [])
        try:
            _columns, actual = runner.run_sql(code, test.get("setup", ""))
            ok = _rows(actual) == _rows(expected)
            message = "" if ok else "El resultado no coincide con lo esperado."
        except sqlite3.Error as exc:
            actual = []
            ok = False
            message = f"Error de SQL: {exc}"
        results.append(
            {
                "name": name,
                "passed": ok,
                "expected": _preview(expected),
                "actual": _preview(actual),
                "message": message,
            }
        )
        passed_all = passed_all and ok
    return passed_all, results, ""


def grade_checklist(checks: list, items: list[str]) -> tuple[bool, list[dict], str]:
    results = []
    passed = True
    for index, item in enumerate(items):
        done = bool(checks[index]) if index < len(checks) else False
        passed = passed and done
        results.append(
            {"name": item, "passed": done, "expected": "marcado", "actual": "marcado" if done else "",
             "message": "" if done else "Aún no está comprobado."}
        )
    return passed, results, ""


def grade(kind: str, code: str, tests: list[dict], items: list[str],
          language: str, timeout_ms: int, max_kb: int) -> tuple[bool, list[dict], str]:
    if kind == "checklist":
        return grade_checklist(_checks(code), items)
    if kind == "sql":
        return grade_sql(code, tests)
    return grade_stdout(code, tests, language, timeout_ms, max_kb)


def _checks(code) -> list:
    import json

    if isinstance(code, list):
        return code
    if isinstance(code, str):
        try:
            data = json.loads(code)
            return data.get("checks", []) if isinstance(data, dict) else []
        except ValueError:
            return []
    if isinstance(code, dict):
        return code.get("checks", [])
    return []


def _preview(rows, limit: int = 20) -> str:
    if not rows:
        return "(sin filas)"
    lines = [" | ".join("" if value is None else str(value) for value in row) for row in rows[:limit]]
    if len(rows) > limit:
        lines.append(f"… {len(rows) - limit} filas más")
    return "\n".join(lines)
