"""Creación de cursos: desde la semilla o con un plan generado por la IA."""

from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timezone

from . import content, prompts
from .ai import AIClient, AIError
from .db import dump_json


class CurriculumError(Exception):
    pass


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def create_seed_course(db: sqlite3.Connection, track_slug: str, level: str, goal: str,
                       pace: str, title: str | None = None) -> int:
    track = content.load_track(track_slug)
    if not track:
        raise CurriculumError(f"No existe el itinerario «{track_slug}».")
    course_title = (title or track.get("title") or track_slug).strip()
    cursor = db.execute(
        "INSERT INTO courses(title, track, language, level, goal, pace, model, topic, source,"
        " status, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        (course_title, track_slug, track.get("language") or "python", level, goal, pace,
         "", "", "seed", "active", now_iso()),
    )
    course_id = cursor.lastrowid
    lesson_position = 0
    for module_index, module in enumerate(track.get("modules") or []):
        module_cursor = db.execute(
            "INSERT INTO modules(course_id, title, summary, position) VALUES(?,?,?,?)",
            (course_id, module.get("title") or f"Módulo {module_index + 1}",
             module.get("summary") or "", module_index),
        )
        module_id = module_cursor.lastrowid
        for lesson in module.get("lessons") or []:
            lesson_cursor = db.execute(
                "INSERT INTO lessons(course_id, module_id, slug, title, summary, objectives,"
                " minutes, body_md, quiz, position, status, created_at)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    course_id, module_id, lesson.get("slug") or "",
                    lesson.get("title") or "Lección", lesson.get("summary") or "",
                    dump_json(lesson.get("objectives") or []),
                    int(lesson.get("minutes") or 10),
                    lesson.get("body_md") or "",
                    dump_json(lesson.get("quiz") or []),
                    lesson_position, "pending", now_iso(),
                ),
            )
            lesson_id = lesson_cursor.lastrowid
            for exercise_index, exercise in enumerate(lesson.get("exercises") or []):
                db.execute(
                    "INSERT INTO exercises(course_id, lesson_id, slug, title, kind, prompt_md,"
                    " starter_code, solution_code, tests, hints, items, language, position)"
                    " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (
                        course_id, lesson_id, exercise.get("slug") or "",
                        exercise.get("title") or "Ejercicio",
                        exercise.get("kind") or "stdout",
                        exercise.get("prompt_md") or "",
                        exercise.get("starter_code") or "",
                        exercise.get("solution_code") or "",
                        dump_json(exercise.get("tests") or []),
                        dump_json(exercise.get("hints") or []),
                        dump_json(exercise.get("items") or []),
                        track.get("language") or "python",
                        exercise_index,
                    ),
                )
            lesson_position += 1
    for lab_index, lab in enumerate(track.get("labs") or []):
        db.execute(
            "INSERT INTO labs(course_id, slug, title, summary, brief_md, steps, minutes, position)"
            " VALUES(?,?,?,?,?,?,?,?)",
            (
                course_id, lab.get("slug") or "", lab.get("title") or "Laboratorio",
                lab.get("summary") or "", lab.get("brief_md") or lab.get("summary") or "",
                dump_json(lab.get("steps") or []), int(lab.get("minutes") or 30), lab_index,
            ),
        )
    db.commit()
    return course_id


def create_ai_course(db: sqlite3.Connection, ai: AIClient, topic: str, level: str, goal: str,
                     pace: str, track_slug: str = "") -> int:
    if not ai.configured:
        raise CurriculumError("Necesitas configurar un profesor para diseñar la ruta con IA.")
    base = content.load_track(track_slug) if track_slug else None
    title_hint = (base or {}).get("title") or topic
    language = (base or {}).get("language") or "python"
    plan = _request_plan(ai, title_hint or topic, topic, level, goal, pace, language)
    course_title = (plan.get("title") or title_hint or "Mi itinerario").strip()[:120]
    cursor = db.execute(
        "INSERT INTO courses(title, track, language, level, goal, pace, model, topic, source,"
        " status, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        (course_title, track_slug or "custom", language, level, goal, pace, ai.model,
         topic, "ai", "active", now_iso()),
    )
    course_id = cursor.lastrowid
    lesson_position = 0
    for module_index, module in enumerate(plan["modules"]):
        module_cursor = db.execute(
            "INSERT INTO modules(course_id, title, summary, position) VALUES(?,?,?,?)",
            (course_id, module.get("title") or f"Módulo {module_index + 1}",
             module.get("summary") or "", module_index),
        )
        module_id = module_cursor.lastrowid
        for lesson in module.get("lessons") or []:
            db.execute(
                "INSERT INTO lessons(course_id, module_id, slug, title, summary, objectives,"
                " minutes, body_md, quiz, position, status, created_at)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    course_id, module_id, "", lesson.get("title") or "Lección",
                    lesson.get("summary") or "",
                    dump_json(lesson.get("objectives") or []),
                    int(lesson.get("minutes") or 12),
                    "", "[]", lesson_position, "pending", now_iso(),
                ),
            )
            lesson_position += 1
    db.commit()
    return course_id


def _request_plan(ai: AIClient, title_hint: str, topic: str, level: str, goal: str,
                  pace: str, language: str) -> dict:
    prompt = (
        f"Diseña un itinerario de aprendizaje de programación.\n"
        f"Tema: {topic or title_hint}\n"
        f"Lenguaje principal: {language}\n"
        f"Nivel: {level or 'principiante'}\n"
        f"Objetivo del alumno: {goal or 'aprender desde cero'}\n"
        f"Tiempo disponible: {pace or '1 hora al día'}\n\n"
        "Devuelve 3 o 4 módulos con 3 o 4 lecciones cada uno (entre 9 y 12 lecciones).\n"
        "Cada lección: título corto, resumen de una frase, 3 objetivos y minutos (8-20).\n"
        f"Formato exacto:\n{prompts.PLAN_SCHEMA}"
    )
    messages = [{"role": "system", "content": prompts.PLAN_SYSTEM},
                {"role": "user", "content": prompt}]
    last_error = ""
    for attempt in range(3):
        try:
            text = ai.complete(messages, json_mode=True, temperature=0.5)
            plan = _parse_plan(text)
            return plan
        except (AIError, CurriculumError) as exc:
            last_error = str(exc)
            messages = messages[:1] + [
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": "Lo siento, intentemos otra vez."},
                {"role": "user",
                 "content": "Devuelve solo el objeto JSON con el formato exacto, sin texto adicional."},
            ]
    raise CurriculumError(f"No se pudo generar la ruta: {last_error}")


def _parse_plan(text: str) -> dict:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end <= start:
        raise CurriculumError("La respuesta del profesor no contiene un plan válido.")
    try:
        data = json.loads(cleaned[start:end + 1])
    except ValueError as exc:
        raise CurriculumError("El plan generado no es JSON válido.") from exc
    modules = data.get("modules")
    if not isinstance(modules, list) or not modules:
        raise CurriculumError("El plan generado no tiene módulos.")
    clean_modules = []
    total = 0
    for module in modules[:4]:
        if not isinstance(module, dict):
            continue
        lessons = []
        for lesson in (module.get("lessons") or [])[:4]:
            if not isinstance(lesson, dict) or not lesson.get("title"):
                continue
            objectives = lesson.get("objectives")
            if not isinstance(objectives, list):
                objectives = []
            lessons.append(
                {
                    "title": str(lesson.get("title"))[:120],
                    "summary": str(lesson.get("summary") or "")[:240],
                    "objectives": [str(item)[:160] for item in objectives[:4]],
                    "minutes": max(5, min(30, int(lesson.get("minutes") or 12))),
                }
            )
        if not lessons:
            continue
        clean_modules.append(
            {
                "title": str(module.get("title") or "Módulo")[:120],
                "summary": str(module.get("summary") or "")[:240],
                "lessons": lessons,
            }
        )
        total += len(lessons)
    if not clean_modules or total < 3:
        raise CurriculumError("El plan generado es demasiado corto.")
    return {
        "title": str(data.get("title") or "Mi itinerario")[:120],
        "description": str(data.get("description") or "")[:240],
        "modules": clean_modules,
    }


def generate_lesson_body(ai: AIClient, lesson: dict, track_title: str,
                         language: str, level: str) -> str:
    objectives = lesson.get("objectives") or []
    if isinstance(objectives, str):
        try:
            objectives = json.loads(objectives)
        except ValueError:
            objectives = [objectives]
    prompt = prompts.LESSON_TEMPLATE.format(
        title=lesson.get("title") or "Lección",
        track_title=track_title or "programación",
        language=language or "python",
        level=level or "principiante",
        objectives="; ".join(objectives) or "comprender el tema",
        summary=lesson.get("summary") or "",
    )
    messages = [
        {"role": "system", "content": prompts.LESSON_SYSTEM},
        {"role": "user", "content": prompt},
    ]
    return ai.complete(messages, temperature=0.6)
