/* Código Cero — panel del tutor con streaming SSE. */
(function (global) {
  'use strict';

  var CC = global.CC = global.CC || {};
  var ui = CC.ui;
  var api = CC.api;
  var toast = ui.toast;

  var SUGGESTIONS = [
    'Explícame esta lección con un ejemplo',
    '¿Qué errores son habituales aquí?',
    'Hazme una pregunta para practicar'
  ];

  function mount(container, options) {
    if (!container) return { destroy: function () {} };
    var opts = options || {};

    var state = {
      lessonId: opts.lessonId == null ? null : opts.lessonId,
      courseId: opts.courseId == null ? null : opts.courseId,
      health: opts.health || null,
      messages: [],
      history: 'idle',
      streaming: false,
      controller: null,
      destroyed: false
    };

    var root = ui.el('section', { class: 'tutor', 'aria-label': 'Tutor de la lección' });
    var subtitle = ui.el('p', { class: 'tutor-sub', text: 'Profesor local' });

    var clearButton = ui.el('button', {
      type: 'button',
      class: 'icon-btn tutor-clear',
      'aria-label': 'Limpiar conversación',
      title: 'Limpiar conversación',
      onClick: clearConversation
    });
    clearButton.appendChild(ui.el('span', { html: ui.icon('trash', 16) }));

    root.appendChild(
      ui.el(
        'header',
        { class: 'tutor-head' },
        ui.el(
          'div',
          { class: 'tutor-id' },
          ui.el('span', { class: 'tutor-avatar', 'aria-hidden': 'true', html: ui.icon('sparkles', 18) }),
          ui.el(
            'div',
            { class: 'tutor-meta' },
            ui.el('p', { class: 'tutor-title', text: 'Tutor' }),
            subtitle
          )
        ),
        ui.el('div', { class: 'tutor-tools' }, clearButton)
      )
    );

    var body = ui.el('div', { class: 'tutor-body' });
    var log = ui.el('div', {
      class: 'tutor-log',
      role: 'log',
      'aria-live': 'polite',
      'aria-relevant': 'additions text',
      'aria-label': 'Conversación con el tutor'
    });

    var input = ui.el('textarea', {
      class: 'tutor-input',
      rows: '1',
      placeholder: 'Pregunta sobre esta lección…',
      'aria-label': 'Mensaje para el tutor',
      maxlength: '2000'
    });

    var sendButton = ui.el('button', {
      type: 'submit',
      class: 'tutor-send',
      'aria-label': 'Enviar mensaje',
      title: 'Enviar (Enter)'
    });
    sendButton.appendChild(ui.el('span', { html: ui.icon('send', 17) }));

    var stopButton = ui.el(
      'button',
      { type: 'button', class: 'btn btn-ghost btn-sm tutor-stop', onClick: stopStreaming },
      ui.el('span', { class: 'btn-icon', html: ui.icon('stop', 14) }),
      'Detener'
    );
    stopButton.hidden = true;

    var form = ui.el(
      'form',
      { class: 'tutor-form' },
      ui.el('div', { class: 'tutor-input-wrap' }, input, sendButton, stopButton),
      ui.el(
        'div',
        { class: 'tutor-foot' },
        ui.el('span', { class: 'tutor-hint', text: 'Enter envía · Shift+Enter salto de línea' })
      )
    );

    var chatView = ui.el(
      'div',
      { class: 'tutor-chat' },
      log,
      form,
      ui.el('p', {
        class: 'tutor-note',
        text: 'El tutor puede equivocarse. Los tests de los ejercicios son la referencia.'
      })
    );

    root.appendChild(body);
    container.appendChild(root);

    input.addEventListener('input', autoGrow);
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        if (!state.streaming && input.value.trim()) {
          send();
        }
      }
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      send();
    });
    stopButton.addEventListener('click', stopStreaming);

    function aiState() {
      var ai = state.health && state.health.ai;
      if (!ai) return 'unknown';
      if (!ai.configured) return 'unconfigured';
      if (ai.reachable === false) return 'offline';
      return 'ready';
    }

    function updateHeader() {
      clearButton.disabled = state.streaming || !state.messages.length;
      var ai = state.health && state.health.ai;
      if (aiState() === 'ready') {
        var model = ai.model ? String(ai.model) : 'Modelo local';
        var provider = ai.provider ? ui.capitalize(String(ai.provider)) : 'Ollama';
        subtitle.textContent = model + ' · ' + provider;
      } else if (aiState() === 'unconfigured') {
        subtitle.textContent = 'Sin profesor configurado';
      } else if (aiState() === 'offline') {
        subtitle.textContent = 'Sin conexión con el profesor';
      } else {
        subtitle.textContent = 'Estado desconocido';
      }
    }

    function autoGrow() {
      input.style.height = 'auto';
      input.style.height = Math.min(132, Math.max(42, input.scrollHeight)) + 'px';
      updateComposer();
    }

    function updateComposer() {
      var empty = !input.value.trim();
      sendButton.disabled = state.streaming || empty || state.history === 'loading';
      stopButton.hidden = !state.streaming;
      input.disabled = state.history === 'loading';
      clearButton.disabled = state.streaming || !state.messages.length;
      root.classList.toggle('is-streaming', state.streaming);
    }

    function isNearBottom() {
      return log.scrollHeight - log.scrollTop - log.clientHeight < 90;
    }

    function scrollToBottom() {
      log.scrollTop = log.scrollHeight;
    }

    function renderLocked() {
      var mode = aiState();
      var config = {
        unconfigured: {
          icon: 'lock',
          title: 'El tutor necesita un profesor',
          text:
            'Configura un modelo local en Ajustes para conversar, generar lecciones y pedir ' +
            'explicaciones. Las lecciones y los ejercicios funcionan igualmente.',
          retry: false
        },
        offline: {
          icon: 'server',
          title: 'El profesor no responde',
          text:
            'Ollama no contesta. Comprueba que esté abierto e inténtalo de nuevo; el resto de la ' +
            'app sigue disponible.',
          retry: true
        },
        unknown: {
          icon: 'alert',
          title: 'No se pudo comprobar el profesor',
          text:
            'No hay respuesta del servidor local. Cuando vuelva la conexión podrás hablar con el ' +
            'tutor.',
          retry: true
        }
      }[mode] || {};

      var actions = ui.el('div', { class: 'tutor-lock-actions' });
      actions.appendChild(
        ui.el(
          'a',
          { class: 'btn btn-primary btn-sm', href: '#/ajustes' },
          ui.el('span', { class: 'btn-icon', html: ui.icon('settings', 15) }),
          'Abrir Ajustes'
        )
      );
      if (config.retry) {
        var retry = ui.el(
          'button',
          { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { retryConnection(retry); } },
          ui.el('span', { class: 'btn-icon', html: ui.icon('refresh', 15) }),
          'Reintentar'
        );
        actions.appendChild(retry);
      }

      var locked = ui.el(
        'div',
        { class: 'tutor-locked' },
        ui.el(
          'span',
          { class: 'tutor-lock-art', 'aria-hidden': 'true' },
          ui.el('span', { class: 'tutor-lock-icon', html: ui.icon(config.icon || 'lock', 22) })
        ),
        ui.el('p', { class: 'tutor-lock-title', text: config.title || '' }),
        ui.el('p', { class: 'tutor-lock-text', text: config.text || '' }),
        actions
      );
      body.replaceChildren(locked);
    }

    function render() {
      if (state.destroyed) return;
      updateHeader();
      if (aiState() !== 'ready') {
        renderLocked();
        return;
      }
      if (!body.contains(chatView)) {
        body.replaceChildren(chatView);
        if (state.history === 'idle') loadHistory();
        else renderLog(true);
      } else {
        renderLog(true);
      }
      updateComposer();
    }

    function retryConnection(button) {
      ui.busy(button, true, 'Comprobando…');
      var request = opts.resolveHealth
        ? Promise.resolve().then(opts.resolveHealth)
        : api.health();
      request
        .then(function (health) {
          state.health = health || null;
          if (aiState() === 'ready') {
            toast('Profesor conectado', { variant: 'success' });
            state.history = 'idle';
            render();
          } else {
            render();
            toast('El profesor sigue sin responder.', { variant: 'warn' });
          }
        })
        .catch(function (error) {
          state.health = null;
          render();
          toast(error.message || 'No se pudo comprobar el profesor.', { variant: 'error' });
        })
        .then(function () { ui.busy(button, false); });
    }

    function loadHistory() {
      if (state.lessonId == null) {
        state.history = 'ready';
        renderLog(true);
        return;
      }
      state.history = 'loading';
      renderLog(true);
      updateComposer();
      api.chatHistory(state.lessonId).then(
        function (data) {
          if (state.destroyed) return;
          var messages = data && Array.isArray(data.messages) ? data.messages : [];
          state.messages = messages
            .filter(function (message) {
              return message && (message.role === 'user' || message.role === 'assistant') &&
                typeof message.content === 'string';
            })
            .map(function (message) {
              return {
                id: ui.nextId('msg'),
                role: message.role,
                content: message.content,
                status: 'done'
              };
            });
          state.history = 'ready';
          renderLog(true);
          updateComposer();
        },
        function () {
          if (state.destroyed) return;
          state.history = 'error';
          renderLog(true);
          updateComposer();
        }
      );
    }

    function historyErrorNode() {
      var retry = ui.el('button', {
        type: 'button',
        class: 'link-button',
        text: 'Reintentar',
        onClick: function () { loadHistory(); }
      });
      return ui.el(
        'div',
        { class: 'tutor-history-error' },
        ui.el('span', { class: 'tutor-history-icon', html: ui.icon('alert', 14) }),
        ui.el('span', { text: 'No se pudo cargar la conversación anterior.' }),
        retry
      );
    }

    function skeletonMessage(long) {
      return ui.el(
        'div',
        { class: 'msg msg-assistant msg-skeleton' },
        ui.el('span', { class: 'skeleton sk-bubble' + (long ? ' sk-bubble-long' : '') })
      );
    }

    function emptyChat() {
      var chips = ui.el('div', { class: 'tutor-chips' });
      SUGGESTIONS.forEach(function (text) {
        chips.appendChild(
          ui.el('button', {
            type: 'button',
            class: 'chip-suggest',
            text: text,
            onClick: function () { send(text); }
          })
        );
      });
      return ui.el(
        'div',
        { class: 'tutor-empty' },
        ui.el('span', { class: 'tutor-empty-art', 'aria-hidden': 'true', html: ui.icon('sparkles', 20) }),
        ui.el('p', { class: 'tutor-empty-title', text: 'Pregunta lo que quieras' }),
        ui.el('p', {
          class: 'tutor-empty-text',
          text: 'El tutor conoce esta lección y responde en tu equipo.'
        }),
        chips
      );
    }

    function messageNode(message) {
      var isUser = message.role === 'user';
      var node = ui.el('article', {
        class:
          'msg ' + (isUser ? 'msg-user' : 'msg-assistant') +
          (message.status === 'streaming' ? ' is-streaming' : ''),
        dataset: { msgId: message.id }
      });
      node.appendChild(
        ui.el('p', { class: 'msg-role', text: isUser ? 'Tú' : 'Tutor' })
      );
      var bubble = ui.el('div', { class: 'msg-bubble' });

      if (isUser) {
        bubble.appendChild(ui.el('p', { class: 'msg-text', text: message.content }));
      } else {
        var prose = ui.el('div', { class: 'msg-prose prose' });
        if (message.content) {
          prose.innerHTML = CC.markdown.render(message.content);
          CC.markdown.bind(prose);
        }
        bubble.appendChild(prose);

        if (message.status === 'error') {
          bubble.appendChild(
            ui.el(
              'div',
              { class: 'msg-error' },
              ui.el('span', { class: 'msg-error-icon', html: ui.icon('alert', 14) }),
              ui.el('span', { text: message.error || 'El tutor no pudo responder.' })
            )
          );
          var retry = ui.el('button', {
            type: 'button',
            class: 'link-button',
            text: 'Reintentar',
            onClick: function () { retryMessage(message); }
          });
          bubble.appendChild(retry);
        } else if (message.stopped) {
          bubble.appendChild(ui.el('p', { class: 'msg-note', text: 'Respuesta detenida' }));
        }
      }

      node.appendChild(bubble);
      return node;
    }

    function renderLog(forceScroll) {
      if (state.destroyed) return;
      var stick = forceScroll || isNearBottom();
      log.replaceChildren();

      if (state.history === 'loading' && !state.messages.length) {
        log.append(skeletonMessage(false), skeletonMessage(true), skeletonMessage(false));
      } else {
        if (state.history === 'error') log.appendChild(historyErrorNode());
        if (!state.messages.length) {
          log.appendChild(emptyChat());
        } else {
          state.messages.forEach(function (message) {
            log.appendChild(messageNode(message));
          });
        }
      }

      if (stick) global.requestAnimationFrame(scrollToBottom);
      updateComposer();
    }

    function updateStreamingMessage(message) {
      if (state.destroyed) return;
      var node = log.querySelector('[data-msg-id="' + message.id + '"]');
      if (!node) return;
      var prose = node.querySelector('.msg-prose');
      if (!prose) return;
      var stick = isNearBottom();
      prose.innerHTML = CC.markdown.render(message.content);
      if (stick) global.requestAnimationFrame(scrollToBottom);
    }

    var frame = 0;
    function scheduleStreamUpdate(message) {
      if (frame) return;
      frame = global.requestAnimationFrame(function () {
        frame = 0;
        updateStreamingMessage(message);
      });
    }

    function streamReply(reply, message) {
      state.streaming = true;
      updateComposer();
      var controller = new AbortController();
      state.controller = controller;

      api.chatStream(
        { message: message, course_id: state.courseId, lesson_id: state.lessonId },
        {
          signal: controller.signal,
          onDelta: function (delta) {
            reply.content += delta;
            scheduleStreamUpdate(reply);
          },
          onDone: function () {}
        }
      ).then(
        function () {
          reply.status = 'done';
        },
        function (error) {
          if (error && error.name === 'AbortError') {
            reply.stopped = true;
            reply.status = 'done';
          } else {
            reply.status = 'error';
            reply.error = error && error.message ? error.message : 'El tutor no pudo responder.';
          }
        }
      ).then(function () {
        state.streaming = false;
        state.controller = null;
        if (reply.stopped && !reply.content) {
          var index = state.messages.indexOf(reply);
          if (index !== -1) state.messages.splice(index, 1);
        }
        if (state.destroyed) return;
        renderLog(true);
      });
    }

    function send(text) {
      if (state.destroyed || state.streaming) return;
      if (aiState() !== 'ready') {
        toast('El tutor no está disponible todavía.', { variant: 'warn' });
        return;
      }
      var message = String(text == null ? input.value : text).trim();
      if (!message) return;

      var userMessage = {
        id: ui.nextId('msg'),
        role: 'user',
        content: message,
        status: 'done'
      };
      var reply = {
        id: ui.nextId('msg'),
        role: 'assistant',
        content: '',
        status: 'streaming'
      };
      state.messages.push(userMessage, reply);
      input.value = '';
      autoGrow();
      renderLog(true);
      streamReply(reply, message);
    }

    function retryMessage(reply) {
      if (state.streaming) return;
      var index = state.messages.indexOf(reply);
      if (index === -1) return;
      var original = null;
      for (var i = index - 1; i >= 0; i -= 1) {
        if (state.messages[i].role === 'user') {
          original = state.messages[i];
          break;
        }
      }
      if (!original) return;
      reply.content = '';
      reply.error = null;
      reply.stopped = false;
      reply.status = 'streaming';
      renderLog(true);
      streamReply(reply, original.content);
    }

    function stopStreaming() {
      if (state.controller) {
        state.controller.abort();
        state.controller = null;
      }
    }

    function clearConversation() {
      if (state.streaming) return;
      ui.confirm({
        title: '¿Borrar la conversación?',
        message:
          'Se eliminarán los mensajes de esta lección guardados en el equipo. El tutor empezará de cero.',
        confirmLabel: 'Borrar conversación',
        danger: true
      }).then(function (confirmed) {
        if (!confirmed) return;
        if (state.lessonId == null) {
          state.messages = [];
          renderLog(true);
          return;
        }
        api.clearChat(state.lessonId).then(
          function () {
            state.messages = [];
            state.history = 'ready';
            renderLog(true);
            toast('Conversación borrada', { variant: 'success' });
          },
          function (error) {
            toast(error.message || 'No se pudo borrar la conversación.', { variant: 'error' });
          }
        );
      });
    }

    render();

    return {
      destroy: function () {
        state.destroyed = true;
        if (state.controller) {
          try { state.controller.abort(); } catch (error) { /* ya detenido */ }
          state.controller = null;
        }
        root.remove();
      },
      setHealth: function (health) {
        state.health = health || null;
        render();
      }
    };
  }

  CC.chat = { mount: mount };
})(window);
