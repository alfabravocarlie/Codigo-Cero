"""Pruebas de la API con un itinerario de ejemplo y base de datos temporal."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from app import content
from app.server import create_app

TRACK = {
    "track": "python",
    "title": "Python de prueba",
    "language": "python",
    "description": "Itinerario mínimo para pruebas.",
    "level": "principiante",
    "modules": [
        {
            "title": "Primeros pasos",
            "summary": "Lo básico.",
            "lessons": [
                {
                    "slug": "salida",
                    "title": "Mostrar por pantalla",
                    "summary": "Aprende a imprimir.",
                    "minutes": 10,
                    "objectives": ["Usar print", "Leer la salida"],
                    "body_md": "## Conceptos\n\n`print` muestra texto.\n\n```python\nprint('hola')\n```\n",
                    "exercises": [
                        {
                            "slug": "imprime-cuatro",
                            "title": "Imprime un cuatro",
                            "kind": "stdout",
                            "prompt_md": "Escribe un programa que muestre `4`.",
                            "starter_code": "# tu código\n",
                            "solution_code": "print(4)\n",
                            "tests": [{"name": "Caso único", "stdin": "", "expected_stdout": "4"}],
                            "hints": ["Usa print.", "El número es 4.", "print(4)."],
                        }
                    ],
                    "quiz": [
                        {"question": "¿Qué hace print?", "options": ["Imprime", "Borra", "Suma", "Nada"],
                         "answer_index": 0, "explanation": "Muestra texto en la salida."}
                    ],
                }
            ],
        }
    ],
    "labs": [
        {
            "slug": "lab-uno",
            "title": "Laboratorio de prueba",
            "summary": "Dos pasos.",
            "minutes": 20,
            "steps": [
                {
                    "title": "Imprime 4",
                    "instructions_md": "Muestra 4.",
                    "kind": "stdout",
                    "starter_code": "",
                    "tests": [{"name": "Paso 1", "stdin": "", "expected_stdout": "4"}],
                },
                {
                    "title": "Imprime 8",
                    "instructions_md": "Muestra 8.",
                    "kind": "stdout",
                    "starter_code": "",
                    "tests": [{"name": "Paso 2", "stdin": "", "expected_stdout": "8"}],
                },
            ],
        }
    ],
}


class ApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        root = Path(self._tmp.name)
        tracks = root / "tracks"
        tracks.mkdir()
        (tracks / "python.json").write_text(json.dumps(TRACK, ensure_ascii=False), encoding="utf-8")
        self._old_content = content.CONTENT_DIR
        content.CONTENT_DIR = tracks
        content._cache.clear()

        self.app = create_app(db_path=root / "test.db", testing=True)
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        content.CONTENT_DIR = self._old_content
        content._cache.clear()
        self._tmp.cleanup()

    # ------------------------------------------------------------------
    def create_course(self) -> dict:
        response = self.client.post(
            "/api/courses",
            json={"track": "python", "level": "principiante", "goal": "probar", "pace": "hoy"},
        )
        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        return response.get_json()["course"]

    def test_health(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["ok"])
        self.assertFalse(data["ai"]["configured"])

    def test_settings_roundtrip(self) -> None:
        response = self.client.put("/api/settings", json={"ui.theme": "light", "ai.temperature": 9})
        self.assertEqual(response.status_code, 200)
        settings = response.get_json()["settings"]
        self.assertEqual(settings["ui.theme"], "light")
        self.assertEqual(settings["ai.temperature"], 2.0)

        response = self.client.get("/api/settings")
        self.assertEqual(response.get_json()["settings"]["ui.theme"], "light")

    def test_unknown_track(self) -> None:
        response = self.client.post("/api/courses", json={"track": "cobol"})
        self.assertEqual(response.status_code, 404)

    def test_course_and_lesson_flow(self) -> None:
        course = self.create_course()
        self.assertEqual(course["lessons_total"], 1)
        self.assertEqual(course["progress"], 0)

        detail = self.client.get(f"/api/courses/{course['id']}").get_json()
        self.assertEqual(len(detail["modules"]), 1)
        lesson_id = detail["modules"][0]["lessons"][0]["id"]
        self.assertEqual(detail["next_lesson"], lesson_id)
        self.assertEqual(len(detail["labs"]), 1)

        lesson = self.client.get(f"/api/lessons/{lesson_id}").get_json()
        self.assertIn("print", lesson["lesson"]["body_md"])
        self.assertEqual(len(lesson["exercises"]), 1)
        self.assertEqual(lesson["nav"], {"prev": None, "next": None})

        done = self.client.post(f"/api/lessons/{lesson_id}/complete").get_json()
        self.assertEqual(done["xp"], 10)
        self.assertEqual(done["course_progress"], 1.0)

        again = self.client.post(f"/api/lessons/{lesson_id}/complete").get_json()
        self.assertEqual(again["xp"], 0)

        stats = self.client.get("/api/stats").get_json()
        self.assertGreaterEqual(stats["xp"], 10)
        self.assertEqual(stats["lessons_done"], 1)

    def test_exercise_grading(self) -> None:
        course = self.create_course()
        detail = self.client.get(f"/api/courses/{course['id']}").get_json()
        lesson_id = detail["modules"][0]["lessons"][0]["id"]
        lesson = self.client.get(f"/api/lessons/{lesson_id}").get_json()
        exercise_id = lesson["exercises"][0]["id"]

        wrong = self.client.post(f"/api/exercises/{exercise_id}/check", json={"code": "print(9)"})
        self.assertEqual(wrong.status_code, 200)
        self.assertFalse(wrong.get_json()["passed"])
        self.assertEqual(wrong.get_json()["xp"], 0)

        right = self.client.post(f"/api/exercises/{exercise_id}/check", json={"code": "print(4)"})
        self.assertTrue(right.get_json()["passed"])
        self.assertEqual(right.get_json()["xp"], 15)

        repeat = self.client.post(f"/api/exercises/{exercise_id}/check", json={"code": "print(4)"})
        self.assertTrue(repeat.get_json()["passed"])
        self.assertEqual(repeat.get_json()["xp"], 0)

    def test_run_endpoint(self) -> None:
        response = self.client.post("/api/run", json={"language": "python", "code": "print(2 + 2)"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["stdout"], "4\n")
        self.assertTrue(response.get_json()["ok"])

    def test_run_timeout(self) -> None:
        self.client.put("/api/settings", json={"exec.timeout_ms": 1000})
        response = self.client.post(
            "/api/run", json={"language": "python", "code": "while True:\n    pass\n"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["timed_out"])

    def test_chat_without_model(self) -> None:
        response = self.client.post("/api/chat", json={"message": "hola", "lesson_id": 1})
        self.assertEqual(response.status_code, 503)

    def test_chat_streams_and_saves_history(self) -> None:
        from app.ai import AIClient

        self.client.put("/api/settings", json={"ai.model": "modelo-de-prueba"})
        course = self.create_course()
        lesson_id = self.client.get(f"/api/courses/{course['id']}").get_json()[
            "modules"][0]["lessons"][0]["id"]

        original = AIClient.chat_stream

        def fake_stream(self, messages, temperature=None):
            for token in ("Hola", ", ", "alumno"):
                yield token

        AIClient.chat_stream = fake_stream
        try:
            response = self.client.post(
                "/api/chat", json={"message": "¿qué es print?", "lesson_id": lesson_id}
            )
            body = response.get_data(as_text=True)
            self.assertEqual(response.status_code, 200)
            self.assertIn('"delta": "Hola"', body)
            self.assertIn('"done": true', body)
        finally:
            AIClient.chat_stream = original

        history = self.client.get(
            f"/api/chat/history?lesson_id={lesson_id}"
        ).get_json()["messages"]
        self.assertEqual([message["role"] for message in history], ["user", "assistant"])
        self.assertEqual(history[1]["content"], "Hola, alumno")

    def test_lab_checkpoint(self) -> None:
        course = self.create_course()
        lab = self.client.get("/api/labs").get_json()["labs"][0]
        first = self.client.post(f"/api/labs/{lab['id']}/checkpoint",
                                 json={"step": 0, "code": "print(4)"}).get_json()
        self.assertTrue(first["passed"])
        self.assertEqual(first["xp"], 20)
        second = self.client.post(f"/api/labs/{lab['id']}/checkpoint",
                                  json={"step": 1, "code": "print(8)"}).get_json()
        self.assertTrue(second["passed"])
        self.assertEqual(second["done"], 2)
        self.assertEqual(second["xp"], 70)  # 20 del paso + 50 de laboratorio completado


    def test_tools_catalog(self) -> None:
        response = self.client.get("/api/tools")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("winget", data)
        ids = {tool["id"] for tool in data["tools"]}
        self.assertTrue({"node", "dotnet", "gcc", "java", "git", "ollama"} <= ids)
        for tool in data["tools"]:
            self.assertIsInstance(tool["installed"], bool)
            self.assertTrue(tool["download_url"].startswith("https://"))
            self.assertGreaterEqual(len(tool["steps"]), 2)

        self.assertEqual(self.client.post("/api/tools/install", json={"id": "nope"}).status_code, 400)
        self.assertEqual(self.client.post("/api/tools/open", json={"id": "nope"}).status_code, 400)


if __name__ == "__main__":
    unittest.main(verbosity=2)
