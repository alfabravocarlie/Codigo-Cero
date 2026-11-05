"""Cliente de IA: Ollama y endpoints compatibles con OpenAI, con streaming."""

from __future__ import annotations

import json
from typing import Iterator

import requests

OLLAMA_DEFAULT = "http://127.0.0.1:11434"
OPENAI_DEFAULT = "http://127.0.0.1:1234/v1"
FAMILIES = ("qwen", "llama", "gemma", "mistral", "phi", "deepseek", "codellama", "starcoder", "yi")


class AIError(Exception):
    """Error de IA con mensaje apto para mostrar al usuario."""


def guess_family(name: str) -> str:
    lowered = name.lower()
    for family in FAMILIES:
        if family in lowered:
            return family
    return ""


class AIClient:
    def __init__(self, settings: dict):
        self.settings = settings
        self.provider = str(settings.get("ai.provider") or "ollama")
        self.model = str(settings.get("ai.model") or "")
        default_url = OPENAI_DEFAULT if self.provider == "openai" else OLLAMA_DEFAULT
        self.base_url = str(settings.get("ai.base_url") or default_url).rstrip("/")
        self.api_key = str(settings.get("ai.api_key") or "")
        self.temperature = float(settings.get("ai.temperature") or 0.35)
        self.num_ctx = int(settings.get("ai.num_ctx") or 4096)
        self.num_predict = int(settings.get("ai.num_predict") or 512)

    @property
    def configured(self) -> bool:
        if self.provider == "ollama":
            return bool(self.model)
        return bool(self.model and self.base_url)

    def _timeout(self, read: int = 180):
        return (4.05, read)

    # ---------------------------------------------------------------- estado
    def ping(self, timeout: float = 2.5) -> bool:
        try:
            if self.provider == "ollama":
                response = requests.get(f"{self.base_url}/api/tags", timeout=timeout)
            else:
                response = requests.get(
                    f"{self.base_url}/models",
                    headers=self._headers(),
                    timeout=timeout,
                )
            return response.status_code == 200
        except requests.RequestException:
            return False

    def list_models(self) -> list[dict]:
        if self.provider == "ollama":
            try:
                response = requests.get(f"{self.base_url}/api/tags", timeout=self._timeout(6))
                response.raise_for_status()
                data = response.json()
            except (requests.RequestException, ValueError) as exc:
                raise AIError(f"No se pudo consultar Ollama: {_short(exc)}") from exc
            models = []
            for item in data.get("models", []):
                name = item.get("name") or item.get("model") or ""
                if not name:
                    continue
                models.append(
                    {
                        "name": name,
                        "size_gb": round((item.get("size") or 0) / (1024 ** 3), 1),
                        "family": guess_family(name),
                        "source": "imported" if name.startswith("cc-") else "ollama",
                    }
                )
            return sorted(models, key=lambda m: m["name"])

        try:
            response = requests.get(
                f"{self.base_url}/models", headers=self._headers(), timeout=self._timeout(6)
            )
            response.raise_for_status()
            data = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise AIError(f"No se pudo consultar el servidor de IA: {_short(exc)}") from exc
        return [
            {
                "name": item.get("id", ""),
                "size_gb": 0,
                "family": guess_family(item.get("id", "")),
                "source": "openai",
            }
            for item in data.get("data", [])
            if item.get("id")
        ]

    # ------------------------------------------------------------------ chat
    def chat_stream(self, messages: list[dict], temperature: float | None = None) -> Iterator[str]:
        if not self.configured:
            raise AIError("No hay ningún profesor configurado.")
        if self.provider == "ollama":
            yield from self._ollama_stream(messages, temperature)
        else:
            yield from self._openai_stream(messages, temperature)

    def complete(self, messages: list[dict], json_mode: bool = False,
                 temperature: float | None = None) -> str:
        if not self.configured:
            raise AIError("No hay ningún profesor configurado.")
        if self.provider == "ollama":
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": self._options(temperature),
            }
            if json_mode:
                payload["format"] = "json"
            response = self._post(f"{self.base_url}/api/chat", payload, 240)
            try:
                data = response.json()
            except ValueError as exc:
                raise AIError("La respuesta del profesor no era válida.") from exc
            if data.get("error"):
                raise AIError(str(data["error"]))
            content = (data.get("message") or {}).get("content", "")
        else:
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "temperature": temperature if temperature is not None else self.temperature,
            }
            if json_mode:
                payload["response_format"] = {"type": "json_object"}
            response = self._post(f"{self._openai_url()}/chat/completions", payload, 240)
            try:
                data = response.json()
            except ValueError as exc:
                raise AIError("La respuesta del profesor no era válida.") from exc
            try:
                content = data["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError) as exc:
                raise AIError("La respuesta del profesor llegó vacía.") from exc
        if not content or not content.strip():
            raise AIError("El profesor no devolvió texto.")
        return content.strip()

    # --------------------------------------------------------------- interno
    def _options(self, temperature: float | None) -> dict:
        return {
            "temperature": self.temperature if temperature is None else temperature,
            "num_ctx": self.num_ctx,
            "num_predict": self.num_predict,
        }

    def _headers(self) -> dict:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _openai_url(self) -> str:
        base = self.base_url
        if base.endswith("/chat/completions"):
            return base[: -len("/chat/completions")]
        if base.endswith("/v1"):
            return base
        return base + "/v1"

    def _post(self, url: str, payload: dict, read_timeout: int):
        try:
            response = requests.post(url, json=payload, headers=self._headers(),
                                     timeout=self._timeout(read_timeout))
        except requests.RequestException as exc:
            raise AIError(
                f"No se pudo conectar con el profesor en {self.base_url}. "
                "Comprueba que Ollama esté en marcha."
            ) from exc
        if response.status_code != 200:
            raise AIError(f"El profesor respondió con un error ({response.status_code}): "
                          f"{_short(response.text)}")
        return response

    def _ollama_stream(self, messages: list[dict], temperature: float | None) -> Iterator[str]:
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "options": self._options(temperature),
        }
        response = self._post(f"{self.base_url}/api/chat", payload, 240)
        try:
            for line in response.iter_lines(decode_unicode=True):
                if not line:
                    continue
                try:
                    chunk = json.loads(line)
                except ValueError:
                    continue
                if chunk.get("error"):
                    raise AIError(str(chunk["error"]))
                content = (chunk.get("message") or {}).get("content") or ""
                if content:
                    yield content
                if chunk.get("done"):
                    break
        finally:
            response.close()

    def _openai_stream(self, messages: list[dict], temperature: float | None) -> Iterator[str]:
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "temperature": temperature if temperature is not None else self.temperature,
        }
        response = self._post(f"{self._openai_url()}/chat/completions", payload, 240)
        try:
            for line in response.iter_lines(decode_unicode=True):
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                except ValueError:
                    continue
                try:
                    delta = chunk["choices"][0].get("delta", {}).get("content")
                except (KeyError, IndexError):
                    delta = None
                if delta:
                    yield delta
        finally:
            response.close()


def _short(value, limit: int = 180) -> str:
    text = str(value).replace("\n", " ").strip()
    return text[:limit] + ("…" if len(text) > limit else "")
