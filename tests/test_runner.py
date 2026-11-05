"""Pruebas del ejecutor de código."""

from __future__ import annotations

import unittest

from app import runner


class RunnerTest(unittest.TestCase):
    def test_python_runs(self) -> None:
        result = runner.run("python", "print(2 + 2)", "", 5000)
        self.assertTrue(result["ok"])
        self.assertEqual(result["stdout"].strip(), "4")

    def test_python_timeout(self) -> None:
        result = runner.run("python", "while True:\n    pass\n", "", 1000)
        self.assertTrue(result["timed_out"])

    def test_cpp_when_available(self) -> None:
        if runner.cpp_compiler() is None:
            self.skipTest("No hay compilador de C++ en este equipo.")
        code = (
            "#include <iostream>\n"
            "int main() {\n"
            "    int a = 0, b = 0;\n"
            "    std::cin >> a >> b;\n"
            "    std::cout << (a + b) << \"\\n\";\n"
            "    return 0;\n"
            "}\n"
        )
        result = runner.run("cpp", code, "2\n3\n", 8000)
        self.assertTrue(result["ok"], result.get("stderr"))
        self.assertEqual(result["stdout"].strip(), "5")

    def test_cpp_compile_error(self) -> None:
        if runner.cpp_compiler() is None:
            self.skipTest("No hay compilador de C++ en este equipo.")
        result = runner.run("cpp", "int main() { esto no compila }", "", 8000)
        self.assertFalse(result["ok"])
        self.assertTrue(result.get("compile_error"))

    def test_unknown_language(self) -> None:
        with self.assertRaises(runner.RunnerError):
            runner.run("cobol", "DISPLAY 'HOLA'.", "", 1000)


if __name__ == "__main__":
    unittest.main(verbosity=2)
