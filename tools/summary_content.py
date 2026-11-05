#!/usr/bin/env python3
"""Resumen legible de los itinerarios de content/tracks."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "content" / "tracks"


def main() -> None:
    for path in sorted(ROOT.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        lessons = sum(len(m.get("lessons") or []) for m in data.get("modules") or [])
        exercises = sum(len(l.get("exercises") or []) for m in data.get("modules") or []
                        for l in m.get("lessons") or [])
        print(f"\n== {data['track']} | {data['title']} | {data['language']} | "
              f"{lessons} lecciones, {exercises} ejercicios, {len(data.get('labs') or [])} labs ==")
        print(f"   {data.get('description', '')[:110]}")
        for module in data.get("modules") or []:
            print(f"  - {module['title']}")
            for lesson in module.get("lessons") or []:
                words = len((lesson.get("body_md") or "").split())
                kinds = {ex.get("kind") for ex in lesson.get("exercises") or []}
                print(f"      · {lesson['title']} ({lesson.get('minutes')} min, {words} palabras, "
                      f"{len(lesson.get('exercises') or [])} ej. {sorted(k for k in kinds if k)})")
        for lab in data.get("labs") or []:
            print(f"  * LAB {lab['title']} ({len(lab.get('steps') or [])} pasos)")


if __name__ == "__main__":
    main()
