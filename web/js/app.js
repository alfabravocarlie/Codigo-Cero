/* Código Cero — arranque, shell y router por hash. */
(function (global) {
  'use strict';

  const CC = global.CC = global.CC || {};
  const ui = CC.ui;
  const api = CC.api;

  const state = {
    health: null,
    healthError: null,
    system: null,
    systemError: null,
    settings: null
  };
  CC.state = state;

  let navSeq = 0;
  let currentCleanup = null;
  let pendingG = false;
  let gTimer = 0;

  const ROUTE_META = {
    inicio: { title: 'Inicio', crumbs: [{ label: 'Inicio' }] },
    nueva: { title: 'Nueva clase', crumbs: [{ label: 'Inicio', href: '#/inicio' }, { label: 'Nueva clase' }] },
    clase: { title: 'Clase', crumbs: [{ label: 'Inicio', href: '#/inicio' }, { label: 'Clase' }] },
    leccion: { title: 'Lección', crumbs: [{ label: 'Inicio', href: '#/inicio' }, { label: 'Lección' }] },
    ejercicio: { title: 'Ejercicio', crumbs: [{ label: 'Inicio', href: '#/inicio' }, { label: 'Ejercicio' }] },
    laboratorio: {
      title: 'Laboratorio',
      crumbs: [{ label: 'Inicio', href: '#/inicio' }, { label: 'Laboratorios', href: '#/labs' }, { label: 'Laboratorio' }]
    },
    labs: {
      title: 'Laboratorios',
      crumbs: [{ label: 'Inicio', href: '#/inicio' }, { label: 'Laboratorios' }]
    },
    progreso: { title: 'Progreso', crumbs: [{ label: 'Inicio', href: '#/inicio' }, { label: 'Progreso' }] },
    ajustes: { title: 'Ajustes', crumbs: [{ label: 'Inicio', href: '#/inicio' }, { label: 'Ajustes' }] },
    noEncontrada: {
      title: 'Página no encontrada',
      crumbs: [{ label: 'Inicio', href: '#/inicio' }, { label: 'Página no encontrada' }]
    }
  };

  function parseLocation() {
    const raw = (global.location.hash || '').replace(/^#/, '') || '/inicio';
    const queryIndex = raw.indexOf('?');
    const path = queryIndex === -1 ? raw : raw.slice(0, queryIndex);
    const query = new URLSearchParams(queryIndex === -1 ? '' : raw.slice(queryIndex + 1));
    const segments = path.replace(/^\/+/, '').split('/').filter(Boolean);
    let name = segments[0] || 'inicio';
    let id = segments[1] ? decodeURIComponent(segments[1]) : null;

    if (!ROUTE_META[name]) {
      if (name === '' || name === 'index') name = 'inicio';
      else return { name: 'noEncontrada', id: null, query };
    }
    if (['clase', 'leccion', 'ejercicio', 'laboratorio'].indexOf(name) !== -1 && !id) {
      return { name: 'noEncontrada', id: null, query };
    }
    if (['inicio', 'nueva', 'labs', 'progreso', 'ajustes'].indexOf(name) !== -1) id = null;
    return { name, id, query };
  }

  function setPage(options) {
    const opts = options || {};
    const crumbsEl = document.getElementById('crumbs');
    const titleEl = document.getElementById('view-title');
    const subtitleEl = document.getElementById('view-subtitle');
    const actionsEl = document.getElementById('view-actions');
    if (!crumbsEl || !titleEl || !subtitleEl || !actionsEl) return;

    crumbsEl.replaceChildren();
    const crumbs = Array.isArray(opts.crumbs) ? opts.crumbs : [];
    crumbs.forEach(function (crumb, index) {
      if (index > 0) {
        crumbsEl.appendChild(elSpan('crumb-sep', '/', true));
      }
      if (crumb.href && index < crumbs.length - 1) {
        const link = document.createElement('a');
        link.className = 'crumb';
        link.href = crumb.href;
        link.textContent = crumb.label;
        crumbsEl.appendChild(link);
      } else {
        const span = document.createElement('span');
        span.className = 'crumb is-current';
        span.textContent = crumb.label;
        if (index === crumbs.length - 1) span.setAttribute('aria-current', 'page');
        crumbsEl.appendChild(span);
      }
    });

    titleEl.textContent = opts.title || 'Código Cero';
    document.title = opts.title ? opts.title + ' · Código Cero' : 'Código Cero';
    subtitleEl.textContent = opts.subtitle || '';
    subtitleEl.hidden = !opts.subtitle;

    actionsEl.replaceChildren();
    (Array.isArray(opts.actions) ? opts.actions : []).forEach(function (action) {
      if (action) actionsEl.appendChild(action);
    });
  }

  function elSpan(className, text, ariaHidden) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    if (ariaHidden) span.setAttribute('aria-hidden', 'true');
    return span;
  }

  function markNav(name) {
    const activeKey =
      name === 'laboratorio' ? 'labs' : ['inicio', 'nueva', 'labs', 'progreso', 'ajustes'].indexOf(name) !== -1 ? name : null;
    document.querySelectorAll('[data-nav]').forEach(function (link) {
      const isActive = link.getAttribute('data-nav') === activeKey;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function renderRoute() {
    const seq = (navSeq += 1);
    const route = parseLocation();
    const meta = ROUTE_META[route.name] || ROUTE_META.noEncontrada;
    const viewEl = document.getElementById('view');
    if (!viewEl) return;

    ui.closeModals();
    if (typeof currentCleanup === 'function') {
      try { currentCleanup(); } catch (error) { /* la vista pudo fallar al limpiar */ }
    }
    currentCleanup = null;

    viewEl.replaceChildren();
    viewEl.scrollTop = 0;
    markNav(route.name);
    setPage({ title: meta.title, subtitle: '', crumbs: meta.crumbs, actions: [] });

    const ctx = {
      params: { id: route.id },
      query: route.query,
      route: route.name,
      root: viewEl,
      alive: function () { return seq === navSeq; },
      setPage: function (options) {
        if (seq === navSeq) setPage(options);
      },
      reload: renderRoute,
      navigate: function (hash) {
        if (global.location.hash === hash) renderRoute();
        else global.location.hash = hash;
      }
    };

    const view = CC.views[route.name] || CC.views.noEncontrada;
    try {
      const cleanup = view(ctx);
      if (typeof cleanup === 'function') currentCleanup = cleanup;
    } catch (error) {
      viewEl.replaceChildren();
      viewEl.appendChild(ui.errorState(error, renderRoute));
    }

    viewEl.focus({ preventScroll: true });
  }

  function renderStatus() {
    const teacherDot = document.getElementById('teacher-dot');
    const teacherTitle = document.getElementById('teacher-title');
    const teacherSub = document.getElementById('teacher-sub');
    const teacherCard = document.getElementById('status-teacher');
    if (teacherDot && teacherTitle && teacherSub) {
      teacherDot.className = 'status-dot';
      if (state.healthError) {
        teacherDot.classList.add('is-off');
        teacherTitle.textContent = 'Servidor sin conexión';
        teacherSub.textContent = 'Comprueba que la app siga abierta';
      } else if (state.health) {
        const ai = state.health.ai || {};
        if (ai.configured) {
          if (ai.reachable === false) {
            teacherDot.classList.add('is-warn');
            teacherTitle.textContent = 'Profesor sin conexión';
            teacherSub.textContent = ai.model ? ai.model + ' no responde' : 'Ollama no responde';
          } else {
            teacherDot.classList.add('is-ok');
            teacherTitle.textContent = 'Profesor listo';
            teacherSub.textContent = ai.model || 'Modelo local';
          }
        } else {
          teacherDot.classList.add('is-idle');
          teacherTitle.textContent = 'Modo lectura';
          teacherSub.textContent = 'Sin profesor configurado';
        }
      } else {
        teacherDot.classList.add('is-idle');
        teacherTitle.textContent = 'Profesor';
        teacherSub.textContent = 'Comprobando…';
      }
      if (teacherCard) {
        teacherCard.title =
          teacherTitle.textContent + ': ' + teacherSub.textContent + '. Abrir Ajustes.';
      }
    }

    const systemDot = document.getElementById('system-dot');
    const systemTitle = document.getElementById('system-title');
    const systemSub = document.getElementById('system-sub');
    const systemCard = document.getElementById('status-system');
    if (!systemDot || !systemTitle || !systemSub) return;

    systemDot.className = 'status-dot';
    if (state.system) {
      const runtimes = state.system.runtimes || {};
      const available = Object.keys(runtimes).filter(function (key) { return runtimes[key]; });
      const cpu = state.system.cpu || {};
      systemDot.classList.add(available.length ? 'is-ok' : 'is-warn');
      systemTitle.textContent = 'Equipo';
      systemSub.textContent =
        (state.system.ram_gb != null ? ui.formatDecimal(state.system.ram_gb, 1) + ' GB' : 'Diagnóstico') +
        (cpu.cores ? ' · ' + cpu.cores + ' núcleos' : '');
      if (systemCard) {
        systemCard.title =
          (state.system.os || 'Sistema') + ' · ' + (cpu.name || 'CPU no detectada') +
          ' · ' + (state.system.gpu || 'GPU no detectada') +
          ' · Runtimes: ' + (available.length ? available.join(', ') : 'ninguno') + '. Abrir Ajustes.';
      }
    } else if (state.systemError) {
      systemDot.classList.add('is-warn');
      systemTitle.textContent = 'Equipo';
      systemSub.textContent = 'Sin diagnóstico';
      if (systemCard) systemCard.title = 'No se pudo leer el diagnóstico. Abrir Ajustes.';
    } else {
      systemDot.classList.add('is-idle');
      systemTitle.textContent = 'Equipo';
      systemSub.textContent = 'Comprobando…';
    }
  }

  function refreshHealth(options) {
    const opts = options || {};
    return api.health().then(
      function (health) {
        state.health = health;
        state.healthError = null;
        if (CC.state) CC.state.health = health;
        renderStatus();
        return health;
      },
      function (error) {
        if (error && error.name === 'AbortError') throw error;
        state.health = null;
        state.healthError = error;
        renderStatus();
        if (opts.silent === false) throw error;
        return null;
      }
    );
  }

  function refreshSystem() {
    return api.system().then(
      function (system) {
        state.system = system;
        state.systemError = null;
        renderStatus();
        return system;
      },
      function (error) {
        state.system = null;
        state.systemError = error;
        renderStatus();
        return null;
      }
    );
  }

  function loadSettings() {
    return api.settings().then(
      function (response) {
        state.settings = response && response.settings ? response.settings : null;
        const settings = state.settings || {};
        if (!ui.readStorage('ui.theme') && settings['ui.theme']) {
          ui.applyTheme(settings['ui.theme'], { persist: false });
        }
        if (!ui.readStorage('ui.font_size') && settings['ui.font_size']) {
          ui.applyFontSize(Number(settings['ui.font_size']), { persist: false });
        }
        return settings;
      },
      function () {
        state.settings = null;
        return null;
      }
    );
  }

  function shortcutRow(keys, label) {
    const row = document.createElement('li');
    row.className = 'shortcut-help-row';
    const keysEl = document.createElement('span');
    keysEl.className = 'shortcut-help-keys';
    keys.forEach(function (key) {
      const kbd = document.createElement('kbd');
      kbd.className = 'kbd';
      kbd.textContent = key;
      keysEl.appendChild(kbd);
    });
    const text = document.createElement('span');
    text.className = 'shortcut-help-label';
    text.textContent = label;
    row.append(keysEl, text);
    return row;
  }

  function openShortcuts() {
    const content = document.createElement('div');
    const intro = document.createElement('p');
    intro.className = 'modal-text';
    intro.textContent = 'Atajos de teclado. Se desactivan mientras escribes en un campo.';
    const list = document.createElement('ul');
    list.className = 'shortcut-help-list';
    [
      { keys: ['g', 'i'], label: 'Ir al inicio' },
      { keys: ['g', 'n'], label: 'Nueva clase' },
      { keys: ['g', 'a'], label: 'Abrir Ajustes' },
      { keys: ['?'], label: 'Mostrar esta ayuda' },
      { keys: ['Tab'], label: 'Insertar 4 espacios en el editor' },
      { keys: ['Ctrl', 'Enter'], label: 'Ejecutar el código del editor' },
      { keys: ['Enter'], label: 'Enviar un mensaje al tutor' },
      { keys: ['Shift', 'Enter'], label: 'Salto de línea en el tutor' },
      { keys: ['Esc'], label: 'Cerrar un diálogo' }
    ].forEach(function (item) {
      list.appendChild(shortcutRow(item.keys, item.label));
    });
    content.append(intro, list);
    ui.modal({
      title: 'Atajos y ayuda',
      eyebrow: 'Código Cero',
      content: content,
      size: 'sm',
      actions: [{ label: 'Entendido', variant: 'primary' }]
    });
  }

  function wireShortcuts() {
    document.addEventListener('keydown', function (event) {
      if (ui.hasModal()) return;
      const target = event.target;
      const typing = target && (
        target.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName || '')
      );
      if (typing) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === '?') {
        event.preventDefault();
        openShortcuts();
        return;
      }
      if (event.key === 'g' || event.key === 'G') {
        pendingG = true;
        global.clearTimeout(gTimer);
        gTimer = global.setTimeout(function () { pendingG = false; }, 900);
        return;
      }
      if (!pendingG) return;
      const destinations = { i: '#/inicio', n: '#/nueva', a: '#/ajustes' };
      const destination = destinations[(event.key || '').toLowerCase()];
      if (!destination) return;
      event.preventDefault();
      pendingG = false;
      global.clearTimeout(gTimer);
      if (global.location.hash === destination) renderRoute();
      else global.location.hash = destination;
    });
  }

  function init() {
    ui.applyTheme(ui.getTheme(), { persist: false });
    ui.applyFontSize(ui.getFontSize(), { persist: false });
    ui.wireThemeToggle();
    renderStatus();
    wireShortcuts();

    const helpButton = document.getElementById('help-toggle');
    if (helpButton) helpButton.addEventListener('click', openShortcuts);

    const skipLink = document.querySelector('.skip-link');
    if (skipLink) {
      skipLink.addEventListener('click', function (event) {
        event.preventDefault();
        const view = document.getElementById('view');
        if (view) view.focus();
      });
    }

    if (!global.location.hash || global.location.hash === '#') {
      global.history.replaceState(null, '', '#/inicio');
    }

    global.addEventListener('hashchange', renderRoute);
    renderRoute();
    loadSettings();
    refreshHealth({ silent: true });
    refreshSystem();
  }

  CC.app = {
    state: state,
    navigate: function (hash) {
      if (global.location.hash === hash) renderRoute();
      else global.location.hash = hash;
    },
    refreshHealth: refreshHealth,
    refreshSystem: refreshSystem,
    renderRoute: renderRoute,
    openShortcuts: openShortcuts
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
