/*
 * Prueba de humo de la interfaz con el protocolo DevTools de Edge.
 * Uso: node tools/qa_ui.js [puertoCDP]
 * Requiere Edge abierto con --remote-debugging-port=9223 en la app local.
 */

const PORT = process.argv[2] || '9223';
const BASE = 'http://127.0.0.1:8899';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('No hay pestaña abierta en Edge.');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const problems = [];
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const detail = message.params.exceptionDetails;
      problems.push('EXCEPCIÓN: ' + (detail.exception?.description || detail.text));
    }
  });

  function send(method, params) {
    const id = ++nextId;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (result.result?.exceptionDetails) {
      throw new Error(result.result.exceptionDetails.exception?.description || 'Fallo al evaluar');
    }
    return result.result?.result?.value;
  }

  await send('Page.enable');
  await send('Runtime.enable');

  async function navigate(hash) {
    await send('Page.navigate', { url: `${BASE}/${hash}` });
    await sleep(2600);
  }

  // 1. Ejercicio: escribir una solución y comprobar.
  await navigate('#/ejercicio/1');
  const exercise = await evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const area = document.querySelector('textarea');
    if (!area) return { ok: false, error: 'sin editor' };
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(area, 'nombre = input()\\nprint("Hola, " + nombre + "!")');
    area.dispatchEvent(new Event('input', { bubbles: true }));
    const button = [...document.querySelectorAll('button')]
      .find((item) => item.textContent.trim() === 'Comprobar');
    if (!button) return { ok: false, error: 'sin botón comprobar' };
    button.click();
    await wait(3000);
    const text = document.body.innerText;
    return {
      ok: true,
      solved: text.includes('Ya has superado este ejercicio'),
      toast: text.includes('Ejercicio superado'),
      excerpt: text.slice(0, 260)
    };
  })()`);

  // 2. Lección: marcarla como completada.
  await navigate('#/leccion/1');
  const lesson = await evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const button = [...document.querySelectorAll('button')]
      .find((item) => item.textContent.trim().startsWith('Completar lección'));
    if (!button) return { ok: false, error: 'sin botón completar' };
    button.click();
    await wait(1600);
    return { ok: true, text: document.body.innerText.slice(0, 200) };
  })()`);

  // 3. La portada carga sin errores y muestra el curso.
  await navigate('#/inicio');
  const home = await evaluate(`(() => {
    const text = document.body.innerText;
    return {
      ok: text.includes('Retoma donde lo dejaste') || text.includes('Inicio'),
      hasCourse: text.includes('Python desde cero'),
      length: text.length
    };
  })()`);

  console.log(JSON.stringify({ exercise, lesson, home, problems }, null, 2));
  ws.close();
}

main().catch((error) => {
  console.error('FALLO:', error.message);
  process.exit(1);
});
