"""Pruebas de nombres y detección de archivos de modelo."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from app import models_ai, system


class ModelNamesTest(unittest.TestCase):
    def test_simple_name(self) -> None:
        name = models_ai.model_name_for("Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf")
        self.assertTrue(name.startswith("cc-qwen2-5-coder-3b"))
        self.assertLessEqual(len(name), 48)

    def test_split_model_uses_base_name(self) -> None:
        name = models_ai.model_name_for("Modelo-00001-of-00002.gguf")
        self.assertNotIn("00001", name)
        self.assertTrue(name.startswith("cc-modelo"))

    def test_list_files_ignores_extra_parts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            original = models_ai.MODELS_DIR
            models_ai.MODELS_DIR = Path(tmp)
            try:
                (Path(tmp) / "Pieza-00001-of-00002.gguf").write_bytes(b"x")
                (Path(tmp) / "Pieza-00002-of-00002.gguf").write_bytes(b"x")
                (Path(tmp) / "Suelto.gguf").write_bytes(b"x")
                (Path(tmp) / "notas.txt").write_text("no es un modelo")
                files = models_ai.list_files()
            finally:
                models_ai.MODELS_DIR = original
        names = [item["file"] for item in files]
        self.assertIn("Pieza-00001-of-00002.gguf", names)
        self.assertNotIn("Pieza-00002-of-00002.gguf", names)
        self.assertIn("Suelto.gguf", names)
        self.assertNotIn("notas.txt", names)
        parts = {item["file"]: item["parts"] for item in files}
        self.assertEqual(parts["Pieza-00001-of-00002.gguf"], 2)


class RecommendedModelTest(unittest.TestCase):
    def test_by_memory(self) -> None:
        self.assertIn("1.5b", system.recommended_model(8))
        self.assertIn("3b", system.recommended_model(16))
        self.assertIn("7b", system.recommended_model(32))


if __name__ == "__main__":
    unittest.main(verbosity=2)
