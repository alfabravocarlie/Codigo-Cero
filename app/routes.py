"""API HTTP de Código Cero."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta, timezone

from flask import (Blueprint, Response, current_app, jsonify, request,
                   stream_with_context)

from . import content, curriculum, grader, models_ai, prompts, runner, system, toolchains
from .ai import AIClient, AIError
from .config import APP_NAME, MAX_CHAT_HISTORY, MAX_CODE_BYTES, VERSION
from .db import dump_json, get_db, load_json
from .settings import load_settings, save_settings

bp = Blueprint("api", __name__, url_prefix="/api")


# --------------------------------------------------------------- utilidades
def _error(message: str, status: int = 400):
    return jsonify({"error": message}), status


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _ai() -> tuple[AIClient, dict]:
    settings = load_settings()
    return AIClient(settings), settings


def _exec_limits(settings: dict) -> tuple[int, int]:
    return int(settings.get("exec.timeout_ms") or 5000), int(settings.get("exec.max_output_kb") or 64)


def _course_progress(db: sqlite3.Connection, course_id: int) -> float:
    row = db.execute(
        "SELECT COUNT(*) AS total, COALESCE(SUM(status = 'done'), 0) AS done "
        "FROM lessons WHERE course_id = ?",
        (course_id,),
    ).fetchone()
    return round(row["done"] / row["total"], 3) if row["total"] else 0.0


def _course_summary(db: sqlite3.Connection, row) -> dict:
    counts = db.execute(
        "SELECT COUNT(*) AS total, COALESCE(SUM(status = 'done'), 0) AS done "
        "FROM lessons WHERE course_id = ?",
        (row["id"],),
    ).fetchone()
    return {
        "id": row["id"],
        "title": row["title"],
        "track": row["track"],
        "language": row["language"],
        "level": row["level"],
        "goal": row["goal"],
        "pace": row["pace"],
        "status": row["status"],
        "source": row["source"],
        "topic": row["topic"],
        "created_at": row["created_at"],
        "lessons_total": counts["total"],
        "lessons_done": counts["done"],
        "progress": round(counts["done"] / counts["total"], 3) if counts["total"] else 0.0,
    }


def _first_pending(db: sqlite3.Connection, course_id: int):
    row = db.execute(
        "SELECT id FROM lessons WHERE course_id = ? AND status != 'done' "
        "ORDER BY position LIMIT 1",
        (course_id,),
    ).fetchone()
    return row["id"] if row else None


def _lesson_dict(row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "body_md": row["body_md"],
        "objectives": load_json(row["objectives"], []),
        "minutes": row["minutes"],
        "status": row["status"],
        "summary": row["summary"],
        "quiz": load_json(row["quiz"], []),
    }


def _lab_done(db: sqlite3.Connection, lab_id: int, steps: list) -> int:
    rows = db.execute(
        "SELECT step FROM lab_progress WHERE lab_id = ? AND status = 'done'", (lab_id,)
    ).fetchall()
    done = {row["step"] for row in rows}
    return sum(1 for index in range(len(steps)) if index in done)


def _event(db: sqlite3.Connection, kind: str, payload: dict) -> None:
    db.execute(
        "INSERT INTO events(type, payload, created_at) VALUES(?,?,?)",
        (kind, dump_json(payload), _now()),
    )


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


# ------------------------------------------------------------------ sistema
@bp.get("/health")
def health():
    ai, _settings = _ai()
    reachable = ai.ping(1.5)
    return jsonify(
        {
            "ok": True,
            "app": {"name": APP_NAME, "version": VERSION},
            "ai": {
                "configured": ai.configured,
                "provider": ai.provider,
                "model": ai.model,
                "reachable": reachable,
            },
            "ollama": {
                "installed": bool(models_ai.ollama_bin()),
                "running": reachable if ai.provider == "ollama" else False,
            },
        }
    )


@bp.get("/system")
def system_info():
    return jsonify(system.info())


# ------------------------------------------------------------------- modelos
@bp.get("/models")
def list_models():
    _client, settings = _ai()
    data = models_ai.scan(settings)
    active = None
    if settings.get("ai.model"):
        active = {
            "name": settings.get("ai.model"),
            "provider": settings.get("ai.provider"),
            "num_ctx": settings.get("ai.num_ctx"),
        }
    return jsonify({**data, "active": active})


@bp.post("/models/scan")
def scan_models():
    return list_models()


@bp.post("/models/import")
def import_model():
    body = request.get_json(silent=True) or {}
    filename = str(body.get("file") or "").strip()
    if not filename:
        return _error("Indica el archivo .gguf que quieres importar.")
    _client, settings = _ai()
    try:
        result = models_ai.import_model(filename, int(settings.get("ai.num_ctx") or 4096))
    except models_ai.ModelError as exc:
        message = str(exc)
        status = 503 if "no está instalado" in message else 500
        return _error(message, status)
    return jsonify(
        {
            "model": {"name": result["name"], "family": result["family"], "source": "imported"},
            "log": result["log"],
        }
    )


@bp.post("/models/select")
def select_model():
    body = request.get_json(silent=True) or {}
    name = str(body.get("name") or "").strip()
    provider = str(body.get("provider") or "ollama").strip().lower()
    if not name and provider != "openai":
        return _error("Indica el modelo que quieres usar.")
    updates = {"ai.provider": provider, "ai.model": name}
    if body.get("base_url") is not None:
        updates["ai.base_url"] = str(body.get("base_url") or "").strip()
    if body.get("api_key") is not None:
        updates["ai.api_key"] = str(body.get("api_key") or "").strip()
    if body.get("num_ctx") is not None:
        updates["ai.num_ctx"] = body.get("num_ctx")
    settings = save_settings(updates)
    return jsonify(
        {
            "active": {
                "name": settings.get("ai.model"),
                "provider": settings.get("ai.provider"),
                "num_ctx": settings.get("ai.num_ctx"),
            }
        }
    )


@bp.delete("/models")
def remove_model():
    body = request.get_json(silent=True) or {}
    name = str(body.get("name") or "").strip()
    try:
        models_ai.delete_model(name)
    except models_ai.ModelError as exc:
        return _error(str(exc), 400)
    settings = load_settings()
    if settings.get("ai.model") == name:
        save_settings({"ai.model": ""})
    return jsonify({"ok": True})


# ---------------------------------------------------------------- herramientas
@bp.get("/tools")
def list_tools():
    return jsonify(toolchains.all_tools())


@bp.post("/tools/check")
def check_tools():
    return jsonify(toolchains.all_tools(force=True))


@bp.post("/tools/install")
def install_tool():
    body = request.get_json(silent=True) or {}
    tool_id = str(body.get("id") or "").strip()
    try:
        return jsonify(toolchains.start_install(tool_id))
    except toolchains.ToolError as exc:
        return _error(str(exc), 400)


@bp.get("/tools/install/<tool_id>")
def tool_install_status(tool_id: str):
    try:
        return jsonify(toolchains.install_status(tool_id))
    except toolchains.ToolError as exc:
        return _error(str(exc), 404)


@bp.post("/tools/open")
def open_tool_link():
    body = request.get_json(silent=True) or {}
    tool_id = str(body.get("id") or "").strip()
    target = str(body.get("target") or "download").strip()
    if target not in {"download", "docs"}:
        return _error("Destino no válido.")
    try:
        toolchains.open_target(tool_id, target)
    except toolchains.ToolError as exc:
        return _error(str(exc), 400)
    return jsonify({"ok": True})


# ------------------------------------------------------------------- cursos
@bp.get("/courses")
def list_courses():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM courses ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, id DESC"
    ).fetchall()
    return jsonify(
        {
            "courses": [_course_summary(db, row) for row in rows],
            "tracks": content.list_tracks(),
        }
    )


@bp.post("/courses")
def create_course():
    body = request.get_json(silent=True) or {}
    track = str(body.get("track") or "python").strip()
    level = str(body.get("level") or "principiante").strip()
    goal = str(body.get("goal") or "").strip()
    pace = str(body.get("pace") or "").strip()
    topic = str(body.get("topic") or "").strip()
    title = str(body.get("title") or "").strip() or None
    generate = bool(body.get("generate"))
    db = get_db()

    if track != "custom" and not content.load_track(track):
        return _error(f"No existe el itinerario «{track}».", 404)
    if track == "custom" and not topic:
        return _error("Escribe sobre qué quieres aprender.")
    if generate or track == "custom":
        ai, _settings = _ai()
        if not ai.configured:
            return _error(
                "Para diseñar una ruta con IA necesitas configurar un profesor en Ajustes.",
                503,
            )
        try:
            course_id = curriculum.create_ai_course(
                db, ai, topic or (content.load_track(track) or {}).get("title", track),
                level, goal, pace, track if track != "custom" else "",
            )
        except curriculum.CurriculumError as exc:
            return _error(str(exc), 502)
        except AIError as exc:
            return _error(str(exc), 502)
    else:
        try:
            course_id = curriculum.create_seed_course(db, track, level, goal, pace, title)
        except curriculum.CurriculumError as exc:
            return _error(str(exc), 404)

    row = db.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()
    return jsonify({"course": _course_summary(db, row), "generated": bool(generate or track == "custom")})


@bp.get("/courses/<int:course_id>")
def course_detail(course_id: int):
    db = get_db()
    course = db.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()
    if not course:
        return _error("Ese curso no existe.", 404)
    modules = []
    for module in db.execute(
        "SELECT * FROM modules WHERE course_id = ? ORDER BY position", (course_id,)
    ).fetchall():
        lessons = [
            {
                "id": lesson["id"],
                "title": lesson["title"],
                "summary": lesson["summary"],
                "minutes": lesson["minutes"],
                "status": lesson["status"],
                "has_content": bool((lesson["body_md"] or "").strip()),
            }
            for lesson in db.execute(
                "SELECT * FROM lessons WHERE module_id = ? ORDER BY position", (module["id"],)
            ).fetchall()
        ]
        modules.append(
            {
                "id": module["id"],
                "title": module["title"],
                "summary": module["summary"],
                "lessons": lessons,
            }
        )
    labs = []
    for lab in db.execute(
        "SELECT * FROM labs WHERE course_id = ? ORDER BY position", (course_id,)
    ).fetchall():
        steps = load_json(lab["steps"], [])
        labs.append(
            {
                "id": lab["id"],
                "title": lab["title"],
                "summary": lab["summary"],
                "steps": len(steps),
                "done": _lab_done(db, lab["id"], steps),
            }
        )
    return jsonify(
        {
            "course": _course_summary(db, course),
            "modules": modules,
            "labs": labs,
            "next_lesson": _first_pending(db, course_id),
        }
    )


@bp.patch("/courses/<int:course_id>")
def update_course(course_id: int):
    db = get_db()
    body = request.get_json(silent=True) or {}
    status = str(body.get("status") or "").strip()
    if status not in {"active", "archived"}:
        return _error("Estado no válido.")
    db.execute("UPDATE courses SET status = ? WHERE id = ?", (status, course_id))
    db.commit()
    row = db.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()
    if not row:
        return _error("Ese curso no existe.", 404)
    return jsonify({"course": _course_summary(db, row)})


@bp.delete("/courses/<int:course_id>")
def delete_course(course_id: int):
    db = get_db()
    db.execute("DELETE FROM courses WHERE id = ?", (course_id,))
    db.commit()
    return jsonify({"ok": True})


# ---------------------------------------------------------------- lecciones
@bp.get("/lessons/<int:lesson_id>")
def lesson_detail(lesson_id: int):
    db = get_db()
    row = db.execute(
        "SELECT l.*, m.title AS module_title, m.position AS module_position, "
        "c.title AS course_title, c.track, c.language, c.level "
        "FROM lessons l JOIN modules m ON m.id = l.module_id "
        "JOIN courses c ON c.id = l.course_id WHERE l.id = ?",
        (lesson_id,),
    ).fetchone()
    if not row:
        return _error("Esa lección no existe.", 404)
    prev_row = db.execute(
        "SELECT id FROM lessons WHERE course_id = ? AND position < ? "
        "ORDER BY position DESC LIMIT 1",
        (row["course_id"], row["position"]),
    ).fetchone()
    next_row = db.execute(
        "SELECT id FROM lessons WHERE course_id = ? AND position > ? "
        "ORDER BY position LIMIT 1",
        (row["course_id"], row["position"]),
    ).fetchone()
    exercises = []
    for exercise in db.execute(
        "SELECT id, title, kind FROM exercises WHERE lesson_id = ? ORDER BY position",
        (lesson_id,),
    ).fetchall():
        passed = db.execute(
            "SELECT 1 FROM attempts WHERE exercise_id = ? AND passed = 1 LIMIT 1",
            (exercise["id"],),
        ).fetchone()
        attempts = db.execute(
            "SELECT COUNT(*) AS n FROM attempts WHERE exercise_id = ?", (exercise["id"],)
        ).fetchone()["n"]
        exercises.append(
            {
                "id": exercise["id"],
                "title": exercise["title"],
                "kind": exercise["kind"],
                "passed": bool(passed),
                "attempts": attempts,
            }
        )
    return jsonify(
        {
            "lesson": _lesson_dict(row),
            "course": {"id": row["course_id"], "title": row["course_title"],
                        "track": row["track"]},
            "module": {"title": row["module_title"], "position": row["module_position"]},
            "nav": {"prev": prev_row["id"] if prev_row else None,
                     "next": next_row["id"] if next_row else None},
            "exercises": exercises,
        }
    )


@bp.post("/lessons/<int:lesson_id>/complete")
def complete_lesson(lesson_id: int):
    db = get_db()
    row = db.execute("SELECT * FROM lessons WHERE id = ?", (lesson_id,)).fetchone()
    if not row:
        return _error("Esa lección no existe.", 404)
    xp = 0
    if row["status"] != "done":
        db.execute("UPDATE lessons SET status = 'done' WHERE id = ?", (lesson_id,))
        _event(db, "lesson_complete", {"xp": 10, "lesson_id": lesson_id,
                                       "course_id": row["course_id"]})
        db.commit()
        xp = 10
    return jsonify(
        {
            "status": "done",
            "xp": xp,
            "next": _first_pending(db, row["course_id"]),
            "course_progress": _course_progress(db, row["course_id"]),
        }
    )


@bp.post("/lessons/<int:lesson_id>/generate")
def generate_lesson(lesson_id: int):
    db = get_db()
    row = db.execute(
        "SELECT l.*, c.title AS course_title, c.language, c.level "
        "FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?",
        (lesson_id,),
    ).fetchone()
    if not row:
        return _error("Esa lección no existe.", 404)
    ai, _settings = _ai()
    if not ai.configured:
        return _error("Configura un profesor para generar la lección.", 503)
    try:
        body = curriculum.generate_lesson_body(
            ai,
            {
                "title": row["title"],
                "summary": row["summary"],
                "objectives": row["objectives"],
            },
            row["course_title"],
            row["language"],
            row["level"],
        )
    except AIError as exc:
        return _error(str(exc), 502)
    db.execute("UPDATE lessons SET body_md = ? WHERE id = ?", (body, lesson_id))
    db.commit()
    row = db.execute("SELECT * FROM lessons WHERE id = ?", (lesson_id,)).fetchone()
    return jsonify({"lesson": _lesson_dict(row)})


# -------------------------------------------------------------------- chat
@bp.post("/chat")
def chat():
    body = request.get_json(silent=True) or {}
    message = str(body.get("message") or "").strip()
    lesson_id = body.get("lesson_id")
    course_id = body.get("course_id")
    if not message:
        return _error("Escribe una pregunta.")
    if len(message) > 4000:
        return _error("La pregunta es demasiado larga.")
    ai, _settings = _ai()
    if not ai.configured:
        return _error("Configura un profesor en Ajustes para poder conversar.", 503)

    db = get_db()
    context = ""
    if lesson_id:
        row = db.execute(
            "SELECT l.*, c.title AS course_title, c.language "
            "FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?",
            (lesson_id,),
        ).fetchone()
        if row:
            lesson_id = row["id"]
            course_id = row["course_id"]
            excerpt = (row["body_md"] or "")[:2500]
            context = prompts.tutor_context(row["title"], row["course_title"],
                                            row["language"], excerpt)
    if not context and course_id:
        course = db.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()
        if course:
            context = prompts.tutor_context("", course["title"], course["language"], "")

    history_rows = db.execute(
        "SELECT role, content FROM chat_messages WHERE "
        + ("lesson_id = ?" if lesson_id else "course_id = ? AND lesson_id IS NULL")
        + " ORDER BY id DESC LIMIT ?",
        ((lesson_id or course_id), MAX_CHAT_HISTORY),
    ).fetchall()
    history = [{"role": row["role"], "content": row["content"]} for row in reversed(history_rows)]
    system_prompt = prompts.TUTOR_SYSTEM.format(context=context)
    messages = [{"role": "system", "content": system_prompt}] + history + [
        {"role": "user", "content": message}
    ]

    db.execute(
        "INSERT INTO chat_messages(course_id, lesson_id, role, content, created_at) "
        "VALUES(?,?,?,?,?)",
        (course_id, lesson_id, "user", message, _now()),
    )
    db.commit()
    db_path = current_app.config["DB_PATH"]

    @stream_with_context
    def generate():
        parts: list[str] = []
        failed = False
        try:
            for delta in ai.chat_stream(messages):
                parts.append(delta)
                yield _sse({"delta": delta})
        except AIError as exc:
            failed = True
            yield _sse({"error": str(exc)})
        finally:
            text = "".join(parts).strip()
            if text:
                # Conexión propia: la del request puede haberse cerrado al empezar
                # a transmitir la respuesta.
                con = sqlite3.connect(db_path, timeout=10)
                try:
                    con.execute(
                        "INSERT INTO chat_messages(course_id, lesson_id, role, content,"
                        " created_at) VALUES(?,?,?,?,?)",
                        (course_id, lesson_id, "assistant", text, _now()),
                    )
                    con.commit()
                finally:
                    con.close()
            if not failed:
                yield _sse({"done": True})

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@bp.get("/chat/history")
def chat_history():
    db = get_db()
    lesson_id = request.args.get("lesson_id", type=int)
    course_id = request.args.get("course_id", type=int)
    if lesson_id:
        rows = db.execute(
            "SELECT role, content, created_at FROM chat_messages WHERE lesson_id = ? "
            "ORDER BY id DESC LIMIT 50",
            (lesson_id,),
        ).fetchall()
    elif course_id:
        rows = db.execute(
            "SELECT role, content, created_at FROM chat_messages WHERE course_id = ? "
            "AND lesson_id IS NULL ORDER BY id DESC LIMIT 50",
            (course_id,),
        ).fetchall()
    else:
        return _error("Indica lesson_id o course_id.")
    return jsonify(
        {"messages": [{"role": row["role"], "content": row["content"]}
                      for row in reversed(rows)]}
    )


@bp.post("/chat/clear")
def clear_chat():
    db = get_db()
    body = request.get_json(silent=True) or {}
    lesson_id = body.get("lesson_id")
    course_id = body.get("course_id")
    if lesson_id:
        db.execute("DELETE FROM chat_messages WHERE lesson_id = ?", (lesson_id,))
    elif course_id:
        db.execute("DELETE FROM chat_messages WHERE course_id = ?", (course_id,))
    else:
        return _error("Indica lesson_id o course_id.")
    db.commit()
    return jsonify({"ok": True})


# --------------------------------------------------------------- ejecución
@bp.post("/run")
def run_code():
    body = request.get_json(silent=True) or {}
    language = str(body.get("language") or "python").lower()
    code = str(body.get("code") or "")
    stdin = str(body.get("stdin") or "")
    if len(code.encode("utf-8")) > MAX_CODE_BYTES:
        return _error("El código es demasiado grande (máximo 64 KB).", 413)
    _ai_client, settings = _ai()
    timeout_ms, max_kb = _exec_limits(settings)
    try:
        return jsonify(runner.run(language, code, stdin, timeout_ms, max_kb))
    except runner.RunnerError as exc:
        return _error(str(exc), 400)


# -------------------------------------------------------------- ejercicios
@bp.get("/exercises/<int:exercise_id>")
def exercise_detail(exercise_id: int):
    db = get_db()
    row = db.execute(
        "SELECT e.*, l.title AS lesson_title, l.id AS lesson_id FROM exercises e "
        "JOIN lessons l ON l.id = e.lesson_id WHERE e.id = ?",
        (exercise_id,),
    ).fetchone()
    if not row:
        return _error("Ese ejercicio no existe.", 404)
    attempts = db.execute(
        "SELECT id, passed, duration_ms, created_at FROM attempts "
        "WHERE exercise_id = ? ORDER BY id DESC LIMIT 10",
        (exercise_id,),
    ).fetchall()
    solved = any(attempt["passed"] for attempt in attempts)
    return jsonify(
        {
            "exercise": {
                "id": row["id"],
                "title": row["title"],
                "kind": row["kind"],
                "prompt_md": row["prompt_md"],
                "starter_code": row["starter_code"],
                "language": row["language"],
                "hints": load_json(row["hints"], []),
                "checklist": load_json(row["items"], []),
            },
            "lesson": {"id": row["lesson_id"], "title": row["lesson_title"]},
            "attempts": [
                {"id": attempt["id"], "passed": bool(attempt["passed"]),
                 "duration_ms": attempt["duration_ms"], "created_at": attempt["created_at"]}
                for attempt in attempts
            ],
            "solved": solved,
        }
    )


@bp.post("/exercises/<int:exercise_id>/check")
def check_exercise(exercise_id: int):
    db = get_db()
    row = db.execute("SELECT * FROM exercises WHERE id = ?", (exercise_id,)).fetchone()
    if not row:
        return _error("Ese ejercicio no existe.", 404)
    body = request.get_json(silent=True) or {}
    kind = row["kind"]
    code = body.get("checks") if kind == "checklist" else body.get("code", "")
    if kind != "checklist" and len(str(code).encode("utf-8")) > MAX_CODE_BYTES:
        return _error("El código es demasiado grande (máximo 64 KB).", 413)
    _ai_client, settings = _ai()
    timeout_ms, max_kb = _exec_limits(settings)
    try:
        passed, results, output = grader.grade(
            kind, code, load_json(row["tests"], []), load_json(row["items"], []),
            row["language"], timeout_ms, max_kb,
        )
    except runner.RunnerError as exc:
        return _error(str(exc), 400)
    first_pass = passed and not db.execute(
        "SELECT 1 FROM attempts WHERE exercise_id = ? AND passed = 1 LIMIT 1",
        (exercise_id,),
    ).fetchone()
    db.execute(
        "INSERT INTO attempts(exercise_id, code, passed, output, duration_ms, created_at) "
        "VALUES(?,?,?,?,?,?)",
        (exercise_id, code if isinstance(code, str) else dump_json(code),
         int(passed), (output or "")[:4000], 0, _now()),
    )
    xp = 0
    if first_pass:
        _event(db, "exercise_pass", {"xp": 15, "exercise_id": exercise_id,
                                     "course_id": row["course_id"]})
        xp = 15
    db.commit()
    return jsonify({"passed": passed, "xp": xp, "results": results,
                    "output": (output or "")[:2000]})


@bp.post("/exercises/<int:exercise_id>/hint")
def exercise_hint(exercise_id: int):
    db = get_db()
    row = db.execute("SELECT * FROM exercises WHERE id = ?", (exercise_id,)).fetchone()
    if not row:
        return _error("Ese ejercicio no existe.", 404)
    body = request.get_json(silent=True) or {}
    level = max(1, min(3, int(body.get("level") or 1)))
    static = load_json(row["hints"], [])
    fallback = static[level - 1] if level - 1 < len(static) else (
        static[-1] if static else "Vuelve a leer el enunciado y prueba con un caso pequeño."
    )
    ai, _settings = _ai()
    if ai.configured:
        try:
            text = ai.complete(
                [
                    {"role": "system", "content": prompts.HINT_SYSTEM},
                    {"role": "user",
                     "content": prompts.HINT_TEMPLATE.format(
                         title=row["title"], prompt=row["prompt_md"], level=level)},
                ],
                temperature=0.4,
            )
            return jsonify({"text": text, "source": "ai"})
        except AIError:
            pass
    return jsonify({"text": fallback, "source": "static"})


# ------------------------------------------------------------- laboratorios
@bp.get("/labs")
def list_labs():
    db = get_db()
    labs = []
    for row in db.execute(
        "SELECT lb.*, c.title AS course_title, c.track FROM labs lb "
        "JOIN courses c ON c.id = lb.course_id ORDER BY lb.course_id, lb.position"
    ).fetchall():
        steps = load_json(row["steps"], [])
        labs.append(
            {
                "id": row["id"],
                "title": row["title"],
                "summary": row["summary"],
                "track": row["track"],
                "course_title": row["course_title"],
                "steps": len(steps),
                "done": _lab_done(db, row["id"], steps),
            }
        )
    return jsonify({"labs": labs})


@bp.get("/labs/<int:lab_id>")
def lab_detail(lab_id: int):
    db = get_db()
    row = db.execute(
        "SELECT lb.*, c.track FROM labs lb JOIN courses c ON c.id = lb.course_id "
        "WHERE lb.id = ?",
        (lab_id,),
    ).fetchone()
    if not row:
        return _error("Ese laboratorio no existe.", 404)
    steps = load_json(row["steps"], [])
    done = {
        item["step"]
        for item in db.execute(
            "SELECT step FROM lab_progress WHERE lab_id = ? AND status = 'done'", (lab_id,)
        ).fetchall()
    }
    return jsonify(
        {
            "lab": {"id": row["id"], "title": row["title"], "brief_md": row["brief_md"],
                     "track": row["track"], "course_id": row["course_id"]},
            "steps": [
                {
                    "index": index,
                    "title": step.get("title") or f"Paso {index + 1}",
                    "instructions_md": step.get("instructions_md") or "",
                    "starter_code": step.get("starter_code") or "",
                    "kind": step.get("kind") or "stdout",
                    "items": step.get("items") or [],
                    "done": index in done,
                }
                for index, step in enumerate(steps)
            ],
        }
    )


@bp.post("/labs/<int:lab_id>/checkpoint")
def lab_checkpoint(lab_id: int):
    db = get_db()
    row = db.execute(
        "SELECT lb.*, c.language FROM labs lb JOIN courses c ON c.id = lb.course_id "
        "WHERE lb.id = ?",
        (lab_id,),
    ).fetchone()
    if not row:
        return _error("Ese laboratorio no existe.", 404)
    body = request.get_json(silent=True) or {}
    try:
        index = int(body.get("step"))
    except (TypeError, ValueError):
        return _error("Paso no válido.")
    steps = load_json(row["steps"], [])
    if not 0 <= index < len(steps):
        return _error("Ese paso no existe.", 404)
    step = steps[index]
    kind = step.get("kind") or "stdout"
    code = body.get("checks") if kind == "checklist" else body.get("code", "")
    _ai_client, settings = _ai()
    timeout_ms, max_kb = _exec_limits(settings)
    try:
        passed, results, output = grader.grade(
            kind, code, step.get("tests") or [], step.get("items") or [],
            row["language"], timeout_ms, max_kb,
        )
    except runner.RunnerError as exc:
        return _error(str(exc), 400)
    already = db.execute(
        "SELECT status FROM lab_progress WHERE lab_id = ? AND step = ?", (lab_id, index)
    ).fetchone()
    xp = 0
    if passed:
        if not already or already["status"] != "done":
            xp = 20
            _event(db, "lab_step", {"xp": 20, "lab_id": lab_id, "step": index})
        db.execute(
            "INSERT INTO lab_progress(lab_id, step, status, evidence, updated_at) "
            "VALUES(?,?,?,?,?) ON CONFLICT(lab_id, step) DO UPDATE SET status = 'done', "
            "evidence = excluded.evidence, updated_at = excluded.updated_at",
            (lab_id, index, "done", (output or "")[:2000], _now()),
        )
        db.commit()
    done = _lab_done(db, lab_id, steps)
    if done == len(steps) and len(steps) > 0:
        completed = db.execute(
            "SELECT 1 FROM events WHERE type = 'lab_complete' AND json_extract(payload, '$.lab_id') = ?",
            (lab_id,),
        ).fetchone()
        if not completed:
            _event(db, "lab_complete", {"xp": 50, "lab_id": lab_id})
            db.commit()
            xp += 50
    return jsonify({"passed": passed, "results": results, "xp": xp,
                    "done": done, "total": len(steps),
                    "message": "Paso superado." if passed else "Todavía no."})


# ---------------------------------------------------------------- progreso
@bp.get("/stats")
def stats():
    db = get_db()
    events = db.execute(
        "SELECT type, payload, created_at FROM events ORDER BY created_at"
    ).fetchall()
    xp = 0
    per_date: dict[str, int] = {}
    for event in events:
        payload = load_json(event["payload"], {})
        gained = int(payload.get("xp") or 0)
        xp += gained
        date = event["created_at"][:10]
        per_date[date] = per_date.get(date, 0) + gained

    today = datetime.now(timezone.utc).date()
    streak = 0
    cursor = today
    if cursor.isoformat() not in per_date:
        cursor = today - timedelta(days=1)
    while cursor.isoformat() in per_date:
        streak += 1
        cursor -= timedelta(days=1)

    week = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        week.append({"date": day.isoformat(), "xp": per_date.get(day.isoformat(), 0)})

    lessons_done = db.execute(
        "SELECT COUNT(*) AS n FROM lessons WHERE status = 'done'"
    ).fetchone()["n"]
    exercises_done = db.execute(
        "SELECT COUNT(DISTINCT exercise_id) AS n FROM attempts WHERE passed = 1"
    ).fetchone()["n"]
    labs_done = 0
    labs = db.execute("SELECT id, steps FROM labs").fetchall()
    for lab in labs:
        steps = load_json(lab["steps"], [])
        if steps and _lab_done(db, lab["id"], steps) == len(steps):
            labs_done += 1

    by_track = []
    for row in db.execute(
        "SELECT c.track, COUNT(l.id) AS total, COALESCE(SUM(l.status = 'done'), 0) AS done "
        "FROM courses c LEFT JOIN lessons l ON l.course_id = c.id "
        "WHERE c.status != 'archived' GROUP BY c.track"
    ).fetchall():
        by_track.append({"track": row["track"], "lessons_total": row["total"],
                         "lessons_done": row["done"]})

    return jsonify(
        {
            "xp": xp,
            "streak": streak,
            "lessons_done": lessons_done,
            "exercises_done": exercises_done,
            "labs_done": labs_done,
            "week": week,
            "by_track": by_track,
        }
    )


# ----------------------------------------------------------------- ajustes
@bp.get("/settings")
def get_settings():
    return jsonify({"settings": load_settings()})


@bp.put("/settings")
def put_settings():
    body = request.get_json(silent=True) or {}
    if not isinstance(body, dict):
        return _error("Los ajustes deben ser un objeto.")
    return jsonify({"settings": save_settings(body)})


@bp.get("/export")
def export_data():
    db = get_db()
    data = {"app": APP_NAME, "version": VERSION, "exported_at": _now(),
            "settings": load_settings(), "courses": []}
    for course in db.execute("SELECT * FROM courses").fetchall():
        item = dict(course)
        item["modules"] = []
        for module in db.execute(
            "SELECT * FROM modules WHERE course_id = ? ORDER BY position", (course["id"],)
        ).fetchall():
            entry = dict(module)
            entry["lessons"] = []
            for lesson in db.execute(
                "SELECT * FROM lessons WHERE module_id = ? ORDER BY position", (module["id"],)
            ).fetchall():
                lesson_item = dict(lesson)
                lesson_item["exercises"] = [
                    dict(row) for row in db.execute(
                        "SELECT * FROM exercises WHERE lesson_id = ? ORDER BY position",
                        (lesson["id"],),
                    ).fetchall()
                ]
                entry["lessons"].append(lesson_item)
            item["modules"].append(entry)
        item["labs"] = [dict(row) for row in db.execute(
            "SELECT * FROM labs WHERE course_id = ? ORDER BY position", (course["id"],)
        ).fetchall()]
        data["courses"].append(item)
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    return Response(
        payload,
        mimetype="application/json",
        headers={"Content-Disposition": "attachment; filename=codigo-cero.json"},
    )
