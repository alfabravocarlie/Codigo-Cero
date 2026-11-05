# Contribuir a Código Cero

Gracias por querer mejorar el proyecto. Estas son las reglas básicas.

## Preparar el entorno

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python tools/validate_content.py
python run.py --no-browser
```

No se necesitan Node, npm ni conexión a internet para desarrollar.

## Estilo

- Python 3.10+, sin dependencias nuevas salvo Flask. Si crees que hace falta una,
  abre antes una propuesta explicando por qué.
- Español en la interfaz, en los prompts y en los mensajes de error.
- Nada de recursos externos en `web/`: ni fuentes, ni iconos, ni CDNs.
- Código pequeño y legible; funciones con una responsabilidad.

## Añadir o cambiar contenido

1. Edita el archivo del itinerario en `content/tracks/<track>.json`.
2. Cada ejercicio debe incluir `solution_code` que pase sus propios tests.
3. Ejecuta `python tools/validate_content.py` y deja **0 errores**.
4. Si añades un itinerario nuevo, actualiza también `docs/ESPECIFICACION.md`.

## Pruebas

- Cualquier cambio en la API debe venir con una prueba en `tests/`.
- Las pruebas no pueden depender de que Ollama esté encendido.
- La integración continua debe quedar en verde en Windows y Linux.

## Enviar cambios

- Un cambio por pull request, con un título claro.
- Explica qué problema resuelve y cómo lo probaste.
- No incluyas modelos `.gguf`, bases de datos ni la carpeta `data/`.
