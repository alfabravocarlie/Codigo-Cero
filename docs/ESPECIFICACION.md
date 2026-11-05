# Código Cero — especificación técnica

Documento de trabajo para construir la v1. Es la fuente de verdad del contrato
entre backend, interfaz y contenido. Todo en español, UTF-8, sin dependencias
externas ni CDNs.

## 1. Producto

App web local (Flask) para aprender a programar con un profesor de IA que corre
en Ollama. Seis itinerarios: `python`, `web`, `javascript`, `sql`, `csharp` y
`cpp`. Sin profesor por defecto: los GGUF se copian en `models/` y se importan.

- Puerto 8765 (si está ocupado, el siguiente libre).
- Base de datos: `data/app.db` (SQLite, WAL).
- Contenido semilla: `content/tracks/<track>.json`.

## 2. Estructura

```
run.py                 arranque (puerto libre, navegador en modo app)
Iniciar.bat
app/
  __init__.py
  config.py            rutas y versión
  db.py                esquema, conexión, utilidades
  settings.py          ajustes con valores por defecto
  ai.py                cliente Ollama / OpenAI-compatible, streaming
  models_ai.py         escaneo e importación de GGUF
  runner.py            ejecución de código con límites
  grader.py            evaluación de ejercicios y checkpoints
  content.py           carga y validación de content/tracks
  curriculum.py        creación de cursos desde semilla o IA
  prompts.py           prompts del sistema por rol
  routes.py            API HTTP (blueprint /api)
web/
  index.html
  css/app.css
  js/*.js
content/tracks/*.json
tools/validate_content.py
tests/
```

## 3. Convenciones

- Respuestas JSON; errores: `{"error": "mensaje"}` con código HTTP adecuado.
- Fechas ISO 8601 en UTC (`2026-11-05T20:00:00Z`).
- Idioma de la interfaz: español.
- Sin recursos externos: ni fuentes, ni iconos, ni librerías por CDN.
- Slugs en minúsculas con guiones; únicos dentro de su ámbito.

## 4. API

### Herramientas del equipo

`GET /api/tools` (y `POST /api/tools/check`, que fuerza un nuevo escaneo)
```json
{"winget": true, "os": "Windows",
 "tools": [{"id": "gcc", "name": "Compilador GCC (MinGW-w64)", "kind": "compiler",
            "installed": false, "found": false, "version": "", "detail": "",
            "why": "Compila y ejecuta los ejercicios de C++.",
            "tracks": ["cpp"], "winget_id": "BrechtSanders.WinLibs.POSIX.UCRT",
            "download_url": "https://winlibs.com/", "docs_url": "https://gcc.gnu.org/onlinedocs/",
            "size": "unos 150 MB", "steps": ["..."], "requires_admin": true}]}
```

`POST /api/tools/install` — `{"id": "gcc"}`
→ `{"started": true, "id": "gcc", "status": "running", "log": ""}`. 400 si no
existe o si winget no está disponible.

`GET /api/tools/install/<id>` → `{"id","status":"running|done|error|idle|installed","log","installed"}`
El log se actualiza mientras winget trabaja; la interfaz consulta cada 1,5 s.

`POST /api/tools/open` — `{"id": "gcc", "target": "download"|"docs"}`
Abre la página oficial en el navegador del sistema. → `{"ok": true}`

Catálogo actual: `node`, `dotnet` (SDK), `gcc` (g++/clang++), `java` (javac),
`git` y `ollama`.

### Sistema y modelos

`GET /api/health`
```json
{"ok": true, "app": {"name": "Código Cero", "version": "0.1.0"},
 "ai": {"configured": true, "provider": "ollama", "model": "qwen2.5-coder-3b", "reachable": true},
 "ollama": {"installed": true, "running": true}}
```

`GET /api/system`
```json
{"os": "Windows 11", "cpu": {"name": "Intel Core i5-8265U", "cores": 8},
 "ram_gb": 15.9, "gpu": "Intel UHD Graphics 620",
 "runtimes": {"python": true, "node": false, "dotnet": false, "sqlite": true},
 "recommended_model": "qwen2.5-coder-3b"}
```

`GET /api/models` (y `POST /api/models/scan`, misma respuesta)
```json
{"active": {"name": "cc-qwen2-5-coder-3b", "provider": "ollama", "num_ctx": 4096},
 "ollama": {"installed": true, "running": true},
 "models": [{"name": "cc-qwen2-5-coder-3b", "size_gb": 2.0, "family": "qwen", "source": "imported"}],
 "files": [{"file": "qwen2.5-coder-3b-instruct-q4_k_m.gguf", "size_gb": 1.9,
            "imported_as": "cc-qwen2-5-coder-3b"}]}
```

`POST /api/models/import` — `{"file": "nombre.gguf"}`
→ `{"model": {...}, "log": "salida de ollama"}`.
Errores: 404 archivo, 409 ya importado, 503 Ollama no instalado, 500 fallo con `log`.

`POST /api/models/select` — `{"name": "...", "provider": "ollama", "num_ctx": 4096}`
→ `{"active": {...}}`. Acepta también `provider: "openai"` con `base_url`, `api_key`.

`DELETE /api/models` — `{"name": "cc-..."}`; solo elimina modelos `cc-`.
→ `{"ok": true}`.

### Cursos

`GET /api/courses`
```json
{"courses": [{"id": 1, "title": "Python desde cero", "track": "python",
              "level": "principiante", "status": "active", "progress": 0.25,
              "lessons_total": 12, "lessons_done": 3}],
 "tracks": [{"track": "python", "title": "Python desde cero", "language": "python",
             "description": "...", "lessons": 12, "labs": 2, "available": true}]}
```

`POST /api/courses`
```json
{"track": "python", "level": "principiante", "goal": "proyecto propio",
 "pace": "1 hora al día", "generate": false, "title": "Mi curso", "topic": ""}
```
- `track` conocido + `generate:false` → copia la semilla (`generated:false`).
- `generate:true` o `track:"custom"` (con `topic`) → pide el plan a la IA y crea
  lecciones vacías que se redactan al abrirlas.
→ `{"course": {...}, "generated": true}`. 503 si se pidió IA y no hay profesor.

`GET /api/courses/<id>`
```json
{"course": {"id": 1, "title": "...", "track": "python", "level": "...", "status": "active"},
 "modules": [{"id": 1, "title": "...", "summary": "...",
              "lessons": [{"id": 1, "title": "...", "summary": "...", "minutes": 10,
                           "status": "pending", "has_content": true}]}],
 "labs": [{"id": 1, "title": "...", "steps": 5, "done": 0}],
 "next_lesson": 1}
```

`PATCH /api/courses/<id>` — `{"status": "archived"}` → `{"course": {...}}`
`DELETE /api/courses/<id>` → `{"ok": true}`

### Lecciones

`GET /api/lessons/<id>`
```json
{"lesson": {"id": 1, "title": "...", "body_md": "# ...", "objectives": ["..."],
            "minutes": 10, "status": "pending", "summary": "...",
            "quiz": [{"question": "...", "options": ["..."], "answer_index": 0, "explanation": "..."}]},
 "course": {"id": 1, "title": "...", "track": "python"},
 "module": {"title": "...", "position": 0},
 "nav": {"prev": null, "next": 2},
 "exercises": [{"id": 1, "title": "...", "kind": "stdout", "passed": false, "attempts": 0}]}
```

`POST /api/lessons/<id>/complete` → `{"status": "done", "xp": 10, "next": 2, "course_progress": 0.16}`

`POST /api/lessons/<id>/generate` → `{"lesson": {...}}`; 503 sin profesor.
Genera `body_md` y `quiz` con la IA y los guarda.

### Chat del tutor (SSE)

`POST /api/chat` — `{"message": "...", "course_id": 1, "lesson_id": 2}`
Respuesta `text/event-stream`, una línea `data: <json>` por evento:
```
data: {"delta": "Hola"}
data: {"delta": ", ¿qué tal?"}
data: {"done": true}
```
En error: `data: {"error": "..."}`. El servidor guarda ambos mensajes.

`GET /api/chat/history?lesson_id=2` → `{"messages": [{"role": "user", "content": "..."}]}`
`POST /api/chat/clear` — `{"lesson_id": 2}` → `{"ok": true}`

### Ejecución y ejercicios

`POST /api/run` — `{"language": "python", "code": "...", "stdin": ""}`
→ `{"ok": true, "stdout": "...", "stderr": "", "exit_code": 0, "duration_ms": 120, "timed_out": false}`

`GET /api/exercises/<id>`
```json
{"exercise": {"id": 1, "title": "...", "kind": "stdout", "prompt_md": "...",
              "starter_code": "...", "language": "python",
              "hints": ["...", "...", "..."],
              "checklist": []},
 "lesson": {"id": 1, "title": "..."},
 "attempts": [{"id": 3, "passed": false, "created_at": "..."}],
 "solved": false}
```

`POST /api/exercises/<id>/check` — `{"code": "..."}`
```json
{"passed": true, "xp": 15,
 "results": [{"name": "Caso 1", "passed": true, "expected": "4", "actual": "4", "message": ""}],
 "output": "..."}
```
Para `kind:"checklist"`: `{"checks": [true, true, false]}` → pasa si todos true.

`POST /api/exercises/<id>/hint` — `{"level": 1}` → `{"text": "..."}`
Nivel 1–3. Si hay profesor, redacta la pista con IA; si no, devuelve la guardada.

### Laboratorios

`GET /api/labs` → `{"labs": [{"id": 1, "title": "...", "track": "python", "steps": 5, "done": 2}]}`
`GET /api/labs/<id>`
```json
{"lab": {"id": 1, "title": "...", "brief_md": "...", "track": "python"},
 "steps": [{"index": 0, "title": "...", "instructions_md": "...", "starter_code": "...",
            "kind": "stdout", "done": false}]}
```
`POST /api/labs/<id>/checkpoint` — `{"step": 0, "code": "..."}`
→ `{"passed": true, "results": [...], "message": "...", "xp": 20, "done": 2}`

### Progreso y ajustes

`GET /api/stats`
```json
{"xp": 120, "streak": 3, "lessons_done": 4, "exercises_done": 6, "labs_done": 0,
 "week": [{"date": "2026-11-01", "xp": 30}],
 "by_track": [{"track": "python", "lessons_done": 4, "lessons_total": 12}]}
```

`GET /api/settings` → `{"settings": {...}}`
`PUT /api/settings` — `{"ai.temperature": 0.4}` → `{"settings": {...}}`

Ajustes y valores por defecto:
```
ai.provider=ollama  ai.model=""  ai.base_url=http://127.0.0.1:11434
ai.api_key=""  ai.temperature=0.35  ai.num_ctx=4096  ai.num_predict=512
exec.timeout_ms=5000  exec.max_output_kb=64
ui.theme=dark  ui.font_size=15  app.locale=es
onboarding.done=false
```

`GET /api/export` → descarga JSON con todo (cursos, lecciones, intentos, ajustes).

## 5. Contenido semilla

Un archivo por itinerario: `content/tracks/<track>.json`.

```json
{
  "track": "python", "title": "Python desde cero", "language": "python",
  "description": "Una frase para la tarjeta del itinerario.",
  "level": "principiante",
  "modules": [
    {"title": "Primeros pasos", "summary": "Una frase.",
     "lessons": [
       {"slug": "variables", "title": "Variables y tipos", "summary": "Una frase.",
        "minutes": 12, "objectives": ["...", "...", "..."],
        "body_md": "## ...", 
        "exercises": [
          {"slug": "suma", "title": "Suma de dos números", "kind": "stdout",
           "prompt_md": "...", "starter_code": "# lee dos números y muestra la suma\n",
           "solution_code": "a = int(input())\nb = int(input())\nprint(a + b)\n",
           "tests": [{"name": "Caso 1", "stdin": "2\\n3\\n", "expected_stdout": "5"}],
           "hints": ["...", "...", "..."]}
        ],
        "quiz": [{"question": "...", "options": ["A", "B", "C", "D"],
                  "answer_index": 0, "explanation": "..."}]}
     ]}
  ],
  "labs": [
    {"slug": "calculadora", "title": "Calculadora de consola", "summary": "...",
     "minutes": 45,
     "steps": [{"title": "Leer dos números", "instructions_md": "...",
                "kind": "stdout", "starter_code": "# ...\n",
                "tests": [{"name": "Suma", "stdin": "2\\n3\\n", "expected_stdout": "5"}]}]}
  ]
}
```

### Kinds de ejercicio

- `stdout`: ejecutar el código con cada `stdin` y comparar `expected_stdout`.
- `sql`: el código es una consulta; cada test trae `setup` (SQL) y
  `expected_rows` (lista de listas, comparación sin orden).
- `checklist`: sin ejecución; `items` (lista de cadenas) que el alumno marca.
  Para web/HTML.

### Normalización de salida

`\r\n → \n`; espacios al final de cada línea eliminados; líneas vacías finales
eliminadas; comparación exacta del resto.

### Reglas de contenido

- Español neutro, tono cercano, sin emojis en el cuerpo.
- Lecciones de 450–800 palabras, con ejemplos ejecutables y errores típicos.
- 2 ejercicios por lección (python), 1–2 en el resto; tests deterministas.
- `solution_code` debe pasar sus propios tests.
- Slugs únicos por archivo; quiz con 4 opciones y `answer_index` válido.

## 6. Interfaz

SPA con router por hash. Vistas: `#/inicio`, `#/nueva`, `#/clase/:id`,
`#/leccion/:id`, `#/ejercicio/:id`, `#/laboratorio/:id`, `#/labs`,
`#/progreso`, `#/ajustes`.

Diseño: tema oscuro por defecto, superficies suaves, un acento, tipografía del
sistema. Sin imágenes externas. Debe verse como un producto cuidado, no como una
demo: estados vacíos, esqueletos de carga, avisos y transiciones discretas.

Barra lateral: marca, navegación, estado del profesor y del equipo.
Cabecera de vista: título, migas y acciones.

Puntos clave por vista:
- **Inicio**: continuar, progreso, racha, tarjetas de itinerarios, estado del
  profesor, primeros pasos si no hay curso.
- **Nueva**: asistente de 4 pasos con validación y resumen; opción «dejar que la
  IA diseñe la ruta» y aviso si no hay profesor.
- **Clase**: cabecera con progreso, módulos en acordeón, lecciones con estado,
  laboratorios.
- **Lección**: contenido Markdown, objetivos, quiz, «marcar completada» y panel
  de tutor a la derecha con streaming, detener y limpiar.
- **Ejercicio**: enunciado, editor con números de línea, ejecutar, comprobar,
  resultados por test, pistas progresivas, intentos.
- **Laboratorio**: pasos en vertical, instrucciones, editor y checkpoint.
- **Progreso**: métricas, gráfico semanal SVG, avance por itinerario.
- **Ajustes**: profesor (escanear/importar/seleccionar/probar), ejecución,
  apariencia, datos (exportar), diagnóstico del equipo.

Accesibilidad: foco visible, contraste suficiente, `aria-label` en iconos,
navegación por teclado en el asistente y el editor (Tab inserta espacios,
Ctrl+Enter ejecuta).

## 7. Comportamiento sin profesor

- Todo funciona salvo chat y generación: se muestra un aviso con enlace a Ajustes.
- Nunca se elige modelo automáticamente.
- Si Ollama está caído, el estado se marca como «sin conexión» y se reintenta al
  pulsar.
