# Plan del proyecto — v2

> Revisado con tus decisiones: **app en el navegador**, **5 itinerarios**,
> **sin profesor por defecto**, carpeta `models/` para GGUF de Hugging Face,
> objetivo **equipos modestos** (i5-8265U / 16 GB) y publicación en **GitHub**.

---

## 0. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Formato | App web local, estética de producto real, se abre como ventana de app |
| Profesor | **Ninguno incluido**. El usuario descarga un GGUF de Hugging Face y lo copia en `models/` |
| Itinerarios | **5**: Python, Web (HTML/CSS), JavaScript, SQL y C# |
| Contenido | Basado en **prompts**: la IA genera planes y lecciones; hay esqueletos de calidad escritos a mano |
| Hardware | Objetivo: portátil modesto, CPU sin GPU dedicada, 16 GB (y funcionar en 8 GB) |
| Distribución | Repositorio GitHub con licencia MIT, sin modelos ni datos personales |

---

## 1. Entorno verificado

| Elemento | Estado |
|---|---|
| Python | 3.10.6 (Flask, requests, jinja2, pygments, sqlite3, yaml) |
| Ollama | 0.40.6, servidor activo en `127.0.0.1:11434` |
| Modelos instalados hoy | `qwen25-coder-14b`, `qwen35-4b`, `flux-schnell` |
| Internet / PyPI | No accesible → **cero dependencias nuevas** |
| Node / pnpm / git | Node 22 sí; pnpm y git no |

La app se construye con Flask + HTML/CSS/JS sin build. Nada que instalar.

---

## 2. Objetivo

Que alguien sin experiencia abra la app, elija qué aprender, reciba una ruta,
lea lecciones con un tutor de IA al lado, resuelva ejercicios con corrección
real y termine laboratorios guiados — todo en su equipo, sin cuentas ni nube.

**Principio rector:** la IA explica y acompaña; **los tests deciden** si un
ejercicio está bien. El progreso no depende de que el modelo acierte.

---

## 3. Los 5 itinerarios

| Itinerario | Ejecución local | Corrección | Requisito |
|---|---|---|---|
| **Python** | Real, con sandbox | Tests deterministas | Ninguno (Python ya está) |
| **Web (HTML/CSS)** | Vista previa en iframe | Comprobación del DOM y captura visual básica | Ninguno |
| **JavaScript** | Real con Node | Tests en Node | Node instalado (se detecta) |
| **SQL** | Real con SQLite | Consultas y resultados esperados | Ninguno (sqlite3) |
| **C#** | Real con `dotnet` | Tests con `dotnet test` | SDK de .NET (se detecta) |

**Modo guiado:** si falta Node o .NET, el itinerario sigue disponible: la IA
revisa el código y explica, pero se avisa de que no hay ejecución real. En
Configuración aparece qué está instalado y qué falta.

Los cinco comparten la misma estructura: módulos → lecciones → ejercicios →
laboratorio final. El esqueleto de cada ruta (temas y orden) está escrito a mano;
el desarrollo de cada lección lo redacta la IA con prompts específicos del
lenguaje, y queda guardado en la base para no regenerarlo.

---

## 4. Arquitectura

### 4.1 Aplicación web local
- Flask sirve la interfaz y la API en `127.0.0.1:8765` (puerto libre automático).
- `Iniciar.bat` arranca el servidor y abre Chrome/Edge en modo aplicación
  (`--app=http://127.0.0.1:8765`), sin barra de direcciones: parece un programa.
- Una sola instancia (si ya está abierta, enfoca la pestaña).
- SPA sin framework, CSS propio, tipografías del sistema. Presupuesto:
  **< 150 KB de JS/CSS** y **< 300 MB de RAM** para la parte Python.

### 4.2 Profesor: Ollama + importador de GGUF
- La app no trae modelo. Busca los `.gguf` que el usuario copie en `models/`.
- Al detectarlos, muestra una tarjeta y ofrece **«Añadir como profesor»**:
  crea un Modelfile (`FROM <archivo>`, plantilla de chat según la familia,
  `num_ctx` ajustado) y ejecuta `ollama create`. El modelo queda listado y listo.
- También lista los modelos que ya tenga Ollama y permite elegirlos.
- **Adaptador compatible con OpenAI** (LM Studio, llama.cpp, vLLM) como
  alternativa si no hay Ollama: URL, modelo y clave opcional.
- `ollama create` se apoya en el binario ya instalado; si no está, la app explica
  cómo instalarlo y ofrece el modo endpoint.

### 4.3 Ejecución de código
- `runner.py`: subproceso en carpeta temporal, `python -I`, entorno limpio,
  timeout 5 s, salida máxima 64 KB, límite de memoria con Job Objects (ctypes).
- JS: `node` con timeout. SQL: SQLite en memoria por intento. C#: `dotnet run`
  con timeout ampliado. Web: iframe aislado (`sandbox`), sin acceso a la API.
- El código del alumno nunca corre dentro del proceso del servidor.

### 4.4 Datos
- SQLite en `data/app.db` (WAL), copias automáticas al arrancar (últimas 5).
- Contenido semilla en `content/` (JSON + Markdown), editable a mano.
- Exportar/importar todo el progreso en JSON.

---

## 5. Hardware modesto: presupuesto y ajustes

Objetivo realista: **i5-8265U (4 núcleos, 15 W), 16 GB, gráficos integrados**.

| Modelo (GGUF Q4_K_M) | Peso | RAM en uso | Velocidad orientativa | Veredicto |
|---|---|---|---|---|
| Qwen2.5-Coder-1.5B | ~1,1 GB | ~2,5 GB | 20–35 tok/s | equipos justos |
| **Qwen2.5-Coder-3B** | ~2,0 GB | ~3,5 GB | 10–18 tok/s | **recomendado** |
| Llama-3.2-3B-Instruct | ~2,0 GB | ~3,5 GB | 10–18 tok/s | alternativa |
| Qwen2.5-Coder-7B | ~4,7 GB | ~6,5 GB | 4–7 tok/s | solo con paciencia |

Medidas de ahorro:
- `num_ctx` 4096 por defecto (subible en Configuración), `num_predict` 512.
- Ollama con `OLLAMA_NUM_PARALLEL=1` y `OLLAMA_MAX_LOADED_MODELS=1`; descarga del
  modelo tras 10 min de inactividad (`keep_alive`).
- Prompts compactos: la lección se resume antes de entrar al contexto.
- Generación **bajo demanda**: el plan trae títulos y objetivos; el cuerpo de cada
  lección se genera al abrirla y se guarda. Esto reduce contexto, latencia y
  errores de modelos pequeños.
- La interfaz no carga fuentes ni iconos externos; animaciones mínimas.
- Diagnóstico en Configuración: RAM/CPU detectadas, tokens/s medidos y aviso si
  el modelo elegido es demasiado grande para el equipo.

---

## 6. El profesor y la carpeta `models/`

```
models\
├─ README.md        ← instrucciones para el usuario
├─ .gitkeep
└─ (aquí copia el usuario sus .gguf)
```

Flujo:
1. El usuario busca en Hugging Face un GGUF pequeño (p. ej.
   `Qwen2.5-Coder-3B-Instruct-GGUF`, cuantización `Q4_K_M`).
2. Copia el archivo a `models/`.
3. En la app: Configuración → Profesor → **Escanear carpeta** → elige el archivo →
   **Añadir como profesor**. La app lo importa a Ollama con su plantilla correcta.
4. Primer arranque sin modelos: la app entra en **modo lectura** (lecciones y
   ejercicios con contenido semilla funcionan; el chat invita a añadir profesor).
   Nunca se elige un profesor por el usuario.

Detalles del importador:
- Soporta GGUF divididos (`-00001-of-0000X.gguf`).
- Detecta la familia por el nombre (qwen, llama, gemma, mistral…) y aplica la
  plantilla de chat adecuada; editable en Configuración avanzada.
- Nombre interno `cp-<archivo>`; reimporta si el archivo cambia de tamaño/fecha.
- Errores de Ollama mostrados tal cual, con explicación en lenguaje llano.

---

## 7. Pantallas

**Inicio** — continuar donde lo dejaste, progreso, racha, estado del profesor.
**Nueva clase** — asistente de 4 pasos (tema, punto de partida, objetivo/ritmo,
profesor) → plan generado y editable.
**Lecciones** — Markdown con código copiable, objetivos, duración, chat lateral
con streaming, botones «no lo entiendo / ejemplo / quiz», marcar completada.
**Ejercicios** — editor, ejecutar, comprobar con tests, diff de salida, 3 niveles
de pista, historial de intentos.
**Laboratorios** — proyecto por etapas con checkpoint verificable y reto final.
**Progreso** — mapa de la ruta, dominio por tema, tiempo y estadísticas.
**Configuración** — profesor, ejecución, apariencia, datos, diagnóstico.

Estética: fondo oscuro con superficies suaves, un color de acento, tipografía del
sistema, cero imágenes pesadas. Modo claro incluido.

---

## 8. Contenido con prompts

- Prompts separados por rol y por lenguaje (`prompts.py` + plantillas por track).
- **Planificador:** devuelve un JSON compacto (módulos y títulos) validado contra
  esquema; 2 reintentos y, si falla, esqueleto curado del itinerario.
- **Lección:** se genera al abrirla con el esquema del módulo como contexto;
  incluye objetivos, ejemplo comentado, errores típicos y un quiz.
- **Tutor:** socrático, contexto de la lección + últimos 6 mensajes, respuestas
  cortas, no revela soluciones antes de 3 intentos.
- **Pistas:** 3 niveles guardados para no repetir.
- **Revisor:** explica el fallo comparando salida real y esperada.
- Contenido semilla obligatorio: Python 12 lecciones + 3 laboratorios; Web 10 + 2;
  SQL 8 + 1; JavaScript 8 + 1; C# 8 + 1. Los cuerpos pueden nacer de la IA, pero
  los ejercicios y sus tests se escriben a mano.

---

## 9. Modelo de datos

`settings`, `models`, `courses`, `modules`, `lessons`, `exercises`, `attempts`,
`labs`, `lab_progress`, `chat_messages`, `progress`, `events`.
Todo con borrado en cascada, marcas de tiempo y exportación JSON.

---

## 10. API

```
GET  /api/health              estado servidor + IA
GET  /api/system              CPU/RAM/GPU, runtimes detectados
GET  /api/models              modelos Ollama + GGUF en carpeta
POST /api/models/scan         escanear models/
POST /api/models/import       importar GGUF a Ollama
POST /api/models/select       profesor activo
GET  /api/courses             clases
POST /api/courses             crear clase (plan IA o esqueleto)
GET  /api/courses/<id>        ruta completa
GET  /api/lessons/<id>        contenido + progreso
POST /api/lessons/<id>/complete
POST /api/chat                tutor en streaming (SSE)
POST /api/run                 ejecutar código
POST /api/exercises/<id>/check
POST /api/exercises/<id>/hint
POST /api/labs/<id>/checkpoint
GET/PUT /api/settings
GET  /api/stats
```

---

## 11. Repositorio GitHub

```
├─ README.md            ← qué es, capturas, inicio rápido, modelos recomendados
├─ LICENSE              ← MIT
├─ .gitignore           ← models/*.gguf, data/, __pycache__, .venv
├─ requirements.txt     ← solo Flask (versión fija)
├─ Iniciar.bat
├─ app\ ...
├─ web\ ...
├─ content\ ...
├─ models\README.md
├─ docs\ (arquitectura.md, prompts.md, modelos.md)
├─ tests\ (unittest, sin dependencias)
└─ .github\workflows\ci.yml
```

- CI en Windows y Ubuntu con Python 3.10 y 3.12: `python -m unittest discover`.
- Sin modelos, sin base de datos y sin rutas absolutas en el repo.
- Commits convencionales y `CHANGELOG.md`.
- Release portable en ZIP (sin instalador) más adelante.

---

## 12. Seguridad

Carpeta temporal aislada, timeout, tope de salida y memoria, sin elevación.
Aviso honesto: la IA puede equivocarse; los tests son la referencia.
Copias antes de cualquier operación destructiva destructiva.

---

## 13. Fases

| Fase | Contenido | Aceptación |
|---|---|---|
| **F0. Base** | Repo, servidor, SQLite, shell de UI, configuración, escaneo e importación de GGUF, onboarding, CI, README | Abre en el navegador, importa un GGUF y guarda ajustes |
| **F1. Lecciones + tutor** | Markdown, ruta Python curada, progreso, chat SSE | Completar lección y conversar en español |
| **F2. Ejercicios** | Editor, runner Python, tests, pistas, intentos | 5 ejercicios aprobables; salida mala no aprueba |
| **F3. Nueva clase** | Asistente, plan por prompts, validación, los 5 esqueletos | Crear clase de cualquier itinerario y navegarla |
| **F4. Laboratorios** | Pasos, checkpoints, proyecto guiado | Laboratorio «calculadora» de 5 pasos |
| **F5. Resto de lenguajes** | Runner Node/SQL/C#, vista web, modo guiado, exportar, pulido | Los 5 itinerarios usables según lo instalado |

---

## 14. Riesgos

| Riesgo | Mitigación |
|---|---|
| Modelo 3B en CPU lento | Streaming, respuestas cortas, generación bajo demanda |
| Modelo pequeño genera lecciones flojas | Esqueletos curados, validación, tests a mano |
| Sin modelo el primer día | Modo lectura con contenido semilla |
| Ollama no instalado | Instrucciones claras + endpoint compatible |
| Mucho alcance | Fases entregables; F0–F2 ya sirven |
| Pérdida de progreso | SQLite + copias + exportación |

---

## 15. Nombres propuestos

1. **Pupitre** — el mueble del aula; corto, español y memorable. (Recomendado)
2. **Pizarra** — la pizarra donde se explica y se escribe código.
3. **Código Cero** — empezar desde cero.
4. **La Fragua** — donde se forja el código.

Repositorio: `pupitre` (o el nombre elegido en minúsculas).

---

## 16. Próximo paso

Confirmar nombre y arrancar **F0**: servidor, base, UI, importador de GGUF,
onboarding y repositorio listo para GitHub. Después F1 con la ruta de Python.
