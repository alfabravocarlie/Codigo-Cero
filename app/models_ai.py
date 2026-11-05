"""Descubrimiento e importación de modelos GGUF a Ollama."""

from __future__ import annotations

import re
import shutil
import subprocess
import tempfile
import unicodedata
from pathlib import Path

from .ai import AIClient, AIError, guess_family
from .config import MODELS_DIR

SPLIT_RE = re.compile(r"-(\d{5})-of-(\d{5})\.gguf$", re.IGNORECASE)

QWEN_TEMPLATE = """{{ if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{ if .Prompt }}<|im_start|>user
{{ .Prompt }}<|im_end|>
{{ end }}<|im_start|>assistant
"""

STOPS = {
    "qwen": ["<|im_end|>", "<|endoftext|>"],
    "llama": ["<|eot_id|>", "<|end_of_text|>"],
    "gemma": ["<end_of_turn>", "<eos>"],
    "mistral": ["</s>", "[/INST]"],
}


class ModelError(Exception):
    pass


def ollama_bin() -> str | None:
    return shutil.which("ollama")


def slugify(text: str, limit: int = 42) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    ascii_text = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    return ascii_text[:limit] or "modelo"


def model_name_for(filename: str) -> str:
    stem = Path(filename).stem
    split = SPLIT_RE.search(Path(filename).name)
    if split:
        stem = Path(filename).name[: split.start()]
    return "cc-" + slugify(stem)


def list_files() -> list[dict]:
    if not MODELS_DIR.exists():
        return []
    entries = []
    for path in sorted(MODELS_DIR.glob("*.gguf")):
        match = SPLIT_RE.search(path.name)
        if match and match.group(1) != "00001":
            continue
        entries.append(
            {
                "file": path.name,
                "size_gb": round(path.stat().st_size / (1024 ** 3), 2),
                "parts": int(match.group(2)) if match else 1,
            }
        )
    return entries


def scan(settings: dict) -> dict:
    client = AIClient(settings)
    installed_bin = ollama_bin()
    models: list[dict] = []
    running = False
    if client.provider == "ollama":
        running = client.ping()
        if running:
            try:
                models = client.list_models()
            except AIError:
                models = []
    names = {model["name"] for model in models}
    files = []
    for entry in list_files():
        item = dict(entry)
        proposed = model_name_for(entry["file"])
        item["suggested_name"] = proposed
        item["imported_as"] = proposed if any(
            name == proposed or name.startswith(proposed + ":") for name in names
        ) else ""
        files.append(item)
    return {
        "models": models,
        "files": files,
        "ollama": {"installed": bool(installed_bin), "running": running},
    }


def import_model(filename: str, num_ctx: int = 4096) -> dict:
    binary = ollama_bin()
    if not binary:
        raise ModelError(
            "Ollama no está instalado. Instálalo desde ollama.com o conecta un servidor "
            "compatible con OpenAI en Ajustes."
        )
    path = (MODELS_DIR / filename).resolve()
    try:
        path.relative_to(MODELS_DIR.resolve())
    except ValueError as exc:
        raise ModelError("El archivo debe estar dentro de la carpeta models/.") from exc
    if not path.exists() or path.suffix.lower() != ".gguf":
        raise ModelError("No se encontró ese archivo .gguf en la carpeta models/.")

    name = model_name_for(path.name)
    family = guess_family(name)
    lines = [f'FROM "{path.as_posix()}"', f"PARAMETER num_ctx {int(num_ctx)}"]
    if family == "qwen":
        lines.append(f'TEMPLATE """{QWEN_TEMPLATE}"""')
    for stop in STOPS.get(family, []):
        lines.append(f'PARAMETER stop "{stop}"')

    with tempfile.TemporaryDirectory(prefix="cc-import-") as tmp:
        modelfile = Path(tmp) / "Modelfile"
        modelfile.write_text("\n".join(lines) + "\n", encoding="utf-8")
        try:
            proc = subprocess.run(
                [binary, "create", name, "-f", str(modelfile)],
                capture_output=True,
                text=True,
                timeout=900,
                encoding="utf-8",
                errors="replace",
            )
        except subprocess.TimeoutExpired as exc:
            raise ModelError("La importación tardó demasiado. Inténtalo de nuevo.") from exc
    log = ((proc.stdout or "") + "\n" + (proc.stderr or "")).strip()
    if proc.returncode != 0:
        tail = "\n".join(log.splitlines()[-12:])
        raise ModelError(f"Ollama no pudo crear el modelo:\n{tail}")
    return {"name": name, "family": family, "log": log[-2000:]}


def delete_model(name: str) -> None:
    if not name.startswith("cc-"):
        raise ModelError("Solo se pueden eliminar los modelos importados desde Código Cero.")
    binary = ollama_bin()
    if not binary:
        raise ModelError("Ollama no está instalado.")
    proc = subprocess.run(
        [binary, "rm", name], capture_output=True, text=True, timeout=60,
        encoding="utf-8", errors="replace",
    )
    if proc.returncode != 0:
        raise ModelError(f"No se pudo eliminar el modelo: {proc.stderr.strip()}")
