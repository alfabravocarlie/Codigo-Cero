# Carpeta de modelos (tu profesor)

Aquí es donde pones el modelo de IA que quieras usar como profesor.
La aplicación **no incluye ningún modelo**: el profesor lo eliges y lo descargas tú.

## 1. Qué descargar

Busca en **Hugging Face** un modelo en formato **GGUF** (archivos que terminan en
`.gguf`). Los recomendados para portátiles sin GPU:

| Modelo en Hugging Face | Cuantización | Peso | RAM necesaria | Velocidad |
|---|---|---|---|---|
| `Qwen2.5-Coder-1.5B-Instruct-GGUF` | `Q4_K_M` | ~1,1 GB | ~2,5 GB | muy rápida |
| `Qwen2.5-Coder-3B-Instruct-GGUF` | `Q4_K_M` | ~2,0 GB | ~3,5 GB | recomendada |
| `Qwen2.5-Coder-7B-Instruct-GGUF` | `Q4_K_M` | ~4,7 GB | ~6,5 GB | lenta en CPU |

También funcionan `Llama-3.2-3B-Instruct-GGUF`, `Gemma-3-4B-it-GGUF` o cualquier
otro GGUF de instrucciones.

**Elige siempre `Q4_K_M`.** Las cuantizaciones `Q2`/`Q3` ocupan menos pero
responden mal; las `Q5`/`Q8` son mejores pero pesadas para un portátil.

## 2. Cómo ponerlo

1. Copia el archivo `.gguf` dentro de esta carpeta (`models/`).
   - Si el modelo viene **dividido en varios trozos**
     (`...-00001-of-00002.gguf`, etc.), copia **todos** los trozos.
2. Abre la aplicación.
3. Ve a **Configuración → Profesor** y pulsa **Escanear carpeta**.
4. Elige el archivo y pulsa **Añadir como profesor**.

La app lo importa a Ollama con su plantilla de chat y lo deja disponible.
La importación puede tardar un poco la primera vez (copia el archivo).

## 3. Requisitos

- **Ollama** instalado (https://ollama.com). La app lo detecta automáticamente.
- Si no puedes instalar Ollama, en Configuración puedes conectar un servidor
  compatible con OpenAI (LM Studio, llama.cpp, vLLM) indicando su URL y modelo.

## 4. Según tu equipo

- **8 GB de RAM**: usa 1.5B.
- **16 GB de RAM**: 3B va bien; 7B es posible pero lento.
- Sin GPU dedicada, la velocidad depende de la CPU: un i5 de 8.ª generación mueve
  un 3B a unas 10–18 palabras por segundo, suficiente para leer mientras responde.

## 5. Esto no se sube a GitHub

La carpeta está excluida en `.gitignore`: los `.gguf` pesan gigabytes y no deben
formar parte del repositorio. Solo se publica este README.

## 6. Problemas frecuentes

- **No aparece el modelo**: comprueba que el archivo termina en `.gguf` y que está
  completo; vuelve a pulsar *Escanear carpeta*.
- **Error al importar**: suele faltar Ollama o el archivo está dañado; el mensaje
  de la app indica cuál es.
- **Responde raro o se corta**: revisa la plantilla de chat en Configuración
  avanzada o prueba otra cuantización.
- **Va lentísimo**: cambia a un modelo más pequeño; el diagnóstico de la app
  muestra la velocidad medida.
