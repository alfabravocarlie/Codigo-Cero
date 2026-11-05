"""Comprueba que los módulos del frontend exporten lo que las vistas usan."""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "web" / "js"


def exports_of(source: str, marker: str) -> set[str]:
    index = source.find(marker)
    if index < 0:
        return set()
    block = source[index:index + 4000]
    keys = set()
    for match in re.finditer(r"^\s{2,4}([A-Za-z_$][\w$]*)\s*:", block, re.MULTILINE):
        keys.add(match.group(1))
    return keys


def main() -> None:
    files = {path.name: path.read_text(encoding="utf-8") for path in sorted(ROOT.glob("*.js"))}
    modules = {
        "ui": exports_of(files["ui.js"], "global.CC.ui = {"),
        "markdown": exports_of(files["markdown.js"], "CC.markdown = {"),
        "chat": exports_of(files["chat.js"], "CC.chat = {"),
        "editor": exports_of(files["editor.js"], "CC.editor = {"),
    }
    for name, keys in modules.items():
        print(name, "->", len(keys), "exports")

    aliases = {"md": "markdown", "ui": "ui", "chat": "chat", "editor": "editor"}
    icon_block = files["ui.js"].split("var ICONS = {", 1)[1].split("\n  };", 1)[0]
    icon_keys = set(re.findall(r"^\s{4}([A-Za-z]+):", icon_block, re.MULTILINE))
    used_icons: set[str] = set()
    for source in files.values():
        used_icons.update(re.findall(r"icon\(\s*['\"]([A-Za-z]+)['\"]", source))
        used_icons.update(re.findall(r"icon:\s*['\"]([A-Za-z]+)['\"]", source))
    missing_icons = sorted(used_icons - icon_keys)
    if missing_icons:
        print("\nIconos usados que no existen:", ", ".join(missing_icons))
    else:
        print("\nIconos: todos disponibles (" + str(len(icon_keys)) + ")")

    problems = []
    for filename, source in files.items():
        for alias, module in aliases.items():
            for match in re.finditer(r"\b" + alias + r"\.([A-Za-z_$][\w$]*)", source):
                member = match.group(1)
                if module in modules and member not in modules[module]:
                    problems.append((filename, alias + "." + member))
    counts = Counter(problems)
    if counts:
        print("\nReferencias sin exportar:")
        for (filename, member), times in sorted(counts.items()):
            print(f"  {filename}: {member} ({times})")
    else:
        print("\nTodo resuelto.")


if __name__ == "__main__":
    main()
