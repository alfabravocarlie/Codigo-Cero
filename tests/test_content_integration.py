"""Integración con el contenido real: crear curso y comprobar un ejercicio."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from app import content
from app.config import CONTENT_DIR
from app.server import create_app


class ContentIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        if not (CONTENT_DIR / "python.json").exists():
            self.skipTest("Todavía no hay contenido semilla de Python.")
        self._tmp = tempfile.TemporaryDirectory()
        self.app = create_app(db_path=Path(self._tmp.name) / "test.db", testing=True)
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def test_python_course_uses_seed_and_grades(self) -> None:
        response = self.client.post(
            "/api/courses", json={"track": "python", "level": "principiante",
                                  "goal": "aprender", "pace": "1 hora"}
        )
        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        course = response.get_json()["course"]
        self.assertGreaterEqual(course["lessons_total"], 10)

        detail = self.client.get(f"/api/courses/{course['id']}").get_json()
        first_lesson_id = detail["modules"][0]["lessons"][0]["id"]
        self.assertTrue(detail["modules"][0]["lessons"][0]["has_content"])

        lesson = self.client.get(f"/api/lessons/{first_lesson_id}").get_json()
        self.assertGreater(len(lesson["lesson"]["body_md"]), 500)
        self.assertTrue(lesson["exercises"])

        track = content.load_track("python")
        solution = track["modules"][0]["lessons"][0]["exercises"][0]["solution_code"]
        exercised_id = lesson["exercises"][0]["id"]
        checked = self.client.post(
            f"/api/exercises/{exercised_id}/check", json={"code": solution}
        ).get_json()
        self.assertTrue(checked["passed"], checked)

    def test_sql_track_runs_query(self) -> None:
        if not (CONTENT_DIR / "sql.json").exists():
            self.skipTest("Todavía no hay contenido de SQL.")
        response = self.client.post(
            "/api/courses", json={"track": "sql", "level": "principiante", "goal": "datos",
                                  "pace": "una semana"}
        )
        course = response.get_json()["course"]
        detail = self.client.get(f"/api/courses/{course['id']}").get_json()
        lesson_id = detail["modules"][0]["lessons"][0]["id"]
        lesson = self.client.get(f"/api/lessons/{lesson_id}").get_json()
        track = content.load_track("sql")
        exercise = track["modules"][0]["lessons"][0]["exercises"][0]
        checked = self.client.post(
            f"/api/exercises/{lesson['exercises'][0]['id']}/check",
            json={"code": exercise["solution_code"]},
        ).get_json()
        self.assertTrue(checked["passed"], checked)

    def test_cpp_track_compiles(self) -> None:
        from app import runner

        if not (CONTENT_DIR / "cpp.json").exists():
            self.skipTest("Todavía no hay contenido de C++.")
        if runner.cpp_compiler() is None:
            self.skipTest("No hay compilador de C++ en este equipo.")
        response = self.client.post(
            "/api/courses", json={"track": "cpp", "level": "principiante", "goal": "probar",
                                  "pace": "una semana"}
        )
        course = response.get_json()["course"]
        detail = self.client.get(f"/api/courses/{course['id']}").get_json()
        lesson_id = detail["modules"][0]["lessons"][0]["id"]
        lesson = self.client.get(f"/api/lessons/{lesson_id}").get_json()
        track = content.load_track("cpp")
        exercise = track["modules"][0]["lessons"][0]["exercises"][0]
        checked = self.client.post(
            f"/api/exercises/{lesson['exercises'][0]['id']}/check",
            json={"code": exercise["solution_code"]},
        ).get_json()
        self.assertTrue(checked["passed"], checked)


if __name__ == "__main__":
    unittest.main(verbosity=2)
