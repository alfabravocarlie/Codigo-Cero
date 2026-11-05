/* Código Cero — cliente de la API local. Sin dependencias. */
(function (global) {
  'use strict';

  var CC = global.CC = global.CC || {};

  function ApiError(message, options) {
    Error.call(this, message);
    this.name = 'ApiError';
    this.message = message;
    this.status = (options && options.status) || 0;
    this.payload = (options && options.payload) || null;
    this.code = (options && options.code) || 'http';
    if (Error.captureStackTrace) Error.captureStackTrace(this, ApiError);
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  var STATUS_MESSAGES = {
    400: 'La petición no es válida.',
    401: 'No tienes permiso para esta acción.',
    403: 'No tienes permiso para esta acción.',
    404: 'No se encontró lo que buscabas.',
    409: 'La operación ya se había realizado.',
    422: 'Faltan datos o no son correctos.',
    429: 'Demasiadas peticiones seguidas.',
    500: 'El servidor ha fallado al procesar la petición.',
    502: 'El servidor no ha podido comunicarse con el profesor.',
    503: 'El profesor no está disponible.'
  };

  function parseError(response) {
    return response
      .json()
      .catch(function () { return null; })
      .then(function (payload) {
        var message =
          payload && typeof payload.error === 'string' && payload.error.trim()
            ? payload.error
            : STATUS_MESSAGES[response.status] ||
              'El servidor respondió con un error (' + response.status + ').';
        return new ApiError(message, { status: response.status, payload: payload });
      });
  }

  function request(method, path, options) {
    var opts = options || {};
    var headers = { Accept: 'application/json' };
    var hasBody = opts.body !== undefined;

    if (hasBody) headers['Content-Type'] = 'application/json';

    return fetch(path, {
      method: method,
      headers: headers,
      body: hasBody ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal
    }).then(
      function (response) {
        if (!response.ok) return parseError(response).then(function (error) { throw error; });
        if (opts.raw) return response;
        if (response.status === 204) return null;
        var type = response.headers.get('content-type') || '';
        if (type.indexOf('application/json') === -1) return null;
        return response.json().catch(function () { return null; });
      },
      function (error) {
        if (error && error.name === 'AbortError') throw error;
        throw new ApiError(
          'No se pudo conectar con el servidor local. Comprueba que Código Cero siga abierto.',
          { code: 'network' }
        );
      }
    );
  }

  function resolveId(id) {
    return encodeURIComponent(String(id));
  }

  function parseEvent(block) {
    var dataLines = [];
    block.split('\n').forEach(function (line) {
      var trimmed = line.trim();
      if (trimmed.indexOf('data:') === 0) dataLines.push(trimmed.slice(5).trim());
    });
    if (!dataLines.length) return null;
    var raw = dataLines.join('\n');
    if (!raw || raw === '[DONE]') return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  /**
   * POST /api/chat con streaming SSE.
   * Resuelve cuando el servidor cierra la respuesta; lanza ApiError si hay error.
   */
  function chatStream(payload, handlers) {
    var callbacks = handlers || {};
    var signal = callbacks.signal;

    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(payload),
      signal: signal
    }).then(
      function (response) {
        if (!response.ok) return parseError(response).then(function (error) { throw error; });
        if (!response.body || typeof response.body.getReader !== 'function') {
          throw new ApiError(
            'Este navegador no puede leer la respuesta del tutor en directo.',
            { code: 'stream' }
          );
        }

        var reader = response.body.getReader();
        var decoder = new TextDecoder('utf-8');
        var buffer = '';

        function handleBlock(block) {
          var event = parseEvent(block);
          if (!event) return false;
          if (event.error) {
            throw new ApiError(String(event.error), { code: 'stream', payload: event });
          }
          if (typeof event.delta === 'string' && event.delta) {
            if (typeof callbacks.onDelta === 'function') callbacks.onDelta(event.delta);
          }
          return event.done === true;
        }

        function flush(block) {
          if (!block.trim()) return false;
          return handleBlock(block);
        }

        function read() {
          return reader.read().then(function (chunk) {
            if (chunk.done) {
              buffer += decoder.decode();
              flush(buffer);
              if (typeof callbacks.onDone === 'function') callbacks.onDone();
              return;
            }

            buffer += decoder.decode(chunk.value, { stream: true });
            var index = buffer.indexOf('\n\n');
            var finished = false;
            while (index !== -1) {
              var block = buffer.slice(0, index);
              buffer = buffer.slice(index + 2);
              finished = handleBlock(block);
              if (finished) break;
              index = buffer.indexOf('\n\n');
            }

            if (finished) {
              return reader.cancel().catch(function () {}).then(function () {
                if (typeof callbacks.onDone === 'function') callbacks.onDone();
              });
            }
            return read();
          });
        }

        return read().catch(function (error) {
          return reader.cancel().catch(function () {}).then(function () {
            throw error;
          });
        });
      },
      function (error) {
        if (error && error.name === 'AbortError') throw error;
        throw new ApiError(
          'No se pudo conectar con el tutor. Comprueba que el servidor siga abierto.',
          { code: 'network' }
        );
      }
    );
  }

  function fileNameFromDisposition(header) {
    if (!header) return null;
    var utf = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (utf && utf[1]) {
      try {
        return decodeURIComponent(utf[1]);
      } catch (error) {
        return utf[1];
      }
    }
    var plain = /filename="?([^";]+)"?/i.exec(header);
    return plain && plain[1] ? plain[1] : null;
  }

  function dateStamp() {
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  }

  function exportAll() {
    return request('GET', '/api/export', { raw: true }).then(function (response) {
      return response.blob().then(function (blob) {
        var name =
          fileNameFromDisposition(response.headers.get('content-disposition')) ||
          'codigo-cero-' + dateStamp() + '.json';
        var url = URL.createObjectURL(blob);
        var anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = name;
        anchor.rel = 'noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        global.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        return name;
      });
    });
  }

  CC.api = {
    ApiError: ApiError,
    request: request,

    health: function () {
      return request('GET', '/api/health');
    },
    system: function () {
      return request('GET', '/api/system');
    },

    models: function () {
      return request('GET', '/api/models');
    },
    scanModels: function () {
      return request('POST', '/api/models/scan');
    },
    importModel: function (file) {
      return request('POST', '/api/models/import', { body: { file: file } });
    },
    selectModel: function (payload) {
      return request('POST', '/api/models/select', { body: payload });
    },
    deleteModel: function (name) {
      return request('DELETE', '/api/models', { body: { name: name } });
    },

    courses: function () {
      return request('GET', '/api/courses');
    },
    createCourse: function (payload) {
      return request('POST', '/api/courses', { body: payload });
    },
    course: function (id) {
      return request('GET', '/api/courses/' + resolveId(id));
    },
    updateCourse: function (id, payload) {
      return request('PATCH', '/api/courses/' + resolveId(id), { body: payload });
    },
    deleteCourse: function (id) {
      return request('DELETE', '/api/courses/' + resolveId(id));
    },

    lesson: function (id) {
      return request('GET', '/api/lessons/' + resolveId(id));
    },
    completeLesson: function (id) {
      return request('POST', '/api/lessons/' + resolveId(id) + '/complete');
    },
    generateLesson: function (id) {
      return request('POST', '/api/lessons/' + resolveId(id) + '/generate');
    },

    chatStream: chatStream,
    chatHistory: function (lessonId) {
      return request('GET', '/api/chat/history?lesson_id=' + resolveId(lessonId));
    },
    clearChat: function (lessonId) {
      return request('POST', '/api/chat/clear', { body: { lesson_id: lessonId } });
    },

    run: function (payload) {
      return request('POST', '/api/run', { body: payload });
    },
    exercise: function (id) {
      return request('GET', '/api/exercises/' + resolveId(id));
    },
    checkExercise: function (id, payload) {
      return request('POST', '/api/exercises/' + resolveId(id) + '/check', { body: payload });
    },
    hint: function (id, level) {
      return request('POST', '/api/exercises/' + resolveId(id) + '/hint', {
        body: { level: level }
      });
    },

    labs: function () {
      return request('GET', '/api/labs');
    },
    lab: function (id) {
      return request('GET', '/api/labs/' + resolveId(id));
    },
    labCheckpoint: function (id, payload) {
      return request('POST', '/api/labs/' + resolveId(id) + '/checkpoint', { body: payload });
    },

    stats: function () {
      return request('GET', '/api/stats');
    },

    tools: function () {
      return request('GET', '/api/tools');
    },
    checkTools: function () {
      return request('POST', '/api/tools/check');
    },
    installTool: function (id) {
      return request('POST', '/api/tools/install', { body: { id: id } });
    },
    toolInstall: function (id) {
      return request('GET', '/api/tools/install/' + resolveId(id));
    },
    openTool: function (id, target) {
      return request('POST', '/api/tools/open', {
        body: { id: id, target: target || 'download' }
      });
    },

    settings: function () {
      return request('GET', '/api/settings');
    },
    saveSettings: function (patch) {
      return request('PUT', '/api/settings', { body: patch });
    },
    exportAll: exportAll
  };
})(window);
