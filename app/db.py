"""Acceso a SQLite: esquema, conexiones y utilidades JSON."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from flask import current_app, g

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    track TEXT NOT NULL,
    language TEXT NOT NULL,
    level TEXT,
    goal TEXT,
    pace TEXT,
    model TEXT,
    topic TEXT,
    source TEXT NOT NULL DEFAULT 'seed',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    slug TEXT,
    title TEXT NOT NULL,
    summary TEXT,
    objectives TEXT NOT NULL DEFAULT '[]',
    minutes INTEGER DEFAULT 10,
    body_md TEXT NOT NULL DEFAULT '',
    quiz TEXT NOT NULL DEFAULT '[]',
    position INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    slug TEXT,
    title TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'stdout',
    prompt_md TEXT NOT NULL DEFAULT '',
    starter_code TEXT NOT NULL DEFAULT '',
    solution_code TEXT NOT NULL DEFAULT '',
    tests TEXT NOT NULL DEFAULT '[]',
    hints TEXT NOT NULL DEFAULT '[]',
    items TEXT NOT NULL DEFAULT '[]',
    language TEXT NOT NULL DEFAULT 'python',
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    code TEXT NOT NULL DEFAULT '',
    passed INTEGER NOT NULL DEFAULT 0,
    output TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS labs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    slug TEXT,
    title TEXT NOT NULL,
    summary TEXT,
    brief_md TEXT NOT NULL DEFAULT '',
    steps TEXT NOT NULL DEFAULT '[]',
    minutes INTEGER DEFAULT 30,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lab_progress (
    lab_id INTEGER NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
    step INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    evidence TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (lab_id, step)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,
    lesson_id INTEGER,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id, position);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id, position);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id, position);
CREATE INDEX IF NOT EXISTS idx_exercises_lesson ON exercises(lesson_id, position);
CREATE INDEX IF NOT EXISTS idx_attempts_exercise ON attempts(exercise_id, created_at);
CREATE INDEX IF NOT EXISTS idx_labs_course ON labs(course_id, position);
CREATE INDEX IF NOT EXISTS idx_chat_lesson ON chat_messages(lesson_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
"""


def connect(path: str | Path) -> sqlite3.Connection:
    con = sqlite3.connect(str(path), timeout=15)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def init_db(path: str | Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    con = connect(path)
    try:
        con.execute("PRAGMA journal_mode = WAL")
        con.executescript(SCHEMA)
        con.commit()
    finally:
        con.close()


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = connect(current_app.config["DB_PATH"])
    return g.db


def close_db(_exception=None) -> None:
    con = g.pop("db", None)
    if con is not None:
        con.close()


def load_json(value, default):
    if value is None or value == "":
        return default
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default


def dump_json(value) -> str:
    return json.dumps(value, ensure_ascii=False)
