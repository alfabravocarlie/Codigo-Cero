# Historial de cambios

## 0.1.0 — 2026-11-05

Primera versión utilizable.

- Aplicación web local con Flask y SQLite, sin dependencias externas.
- Seis itinerarios semilla: Python (12 lecciones), Web, JavaScript, SQL, C#
  (8 lecciones cada uno) y C++ (6 lecciones).
- Lecciones con objetivos, quiz y ejercicios corregidos por tests deterministas.
- Laboratorios guiados con verificación por pasos.
- Apartado **Entorno**: detecta Node.js, .NET, GCC, Java, Git y Ollama, y guía
  su instalación con winget, descarga oficial y pasos concretos. Reconoce
  herramientas instaladas fuera del PATH.
- Profesor de IA local mediante Ollama o endpoints compatibles con OpenAI.
- Importación de modelos GGUF desde la carpeta `models/`.
- Creación de rutas nuevas con IA (plan validado y lecciones generadas al abrirlas).
- Progreso, XP, racha y exportación de datos.
- Pruebas automáticas y validación de contenido en integración continua.
