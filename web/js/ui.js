/* Código Cero — utilidades de interfaz: iconos, componentes y tema. */
(function (global) {
  'use strict';

  var CC = global.CC = global.CC || {};
  var document = global.document;

  var ICONS = {
    home: '<path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5.5h4V21h3.5a1 1 0 0 0 1-1V9.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    sparkles:
      '<path d="M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6L12 3.5Z"/>' +
      '<path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z"/>',
    book:
      '<path d="M12 6.2C10.6 5 8.5 4.5 4 4.5v13.2c4.2 0 6.5.5 8 1.8 1.5-1.3 3.8-1.8 8-1.8V4.5c-4.5 0-6.6.5-8 1.7Z"/>' +
      '<path d="M12 6.2v13.3"/>',
    flask:
      '<path d="M9.5 3h5"/><path d="M10.5 3v5.3L5.3 18a2 2 0 0 0 1.7 3h10a2 2 0 0 0 1.7-3l-5.2-9.7V3"/>' +
      '<path d="M8 14h8"/>',
    chart: '<path d="M3 21h18"/><path d="M6.5 21v-8M12 21V5M17.5 21v-5"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.7 7.7 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-2.6-1.5L14.1 2h-4.2l-.4 2.6a7.6 7.6 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.7 7.7 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.6h4.2l.4-2.6a7.6 7.6 0 0 0 2.6-1.5l2.3 1 2-3.4-2-1.5Z"/>',
    sun:
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20.5 14.8A8.7 8.7 0 0 1 9.2 3.5a8.7 8.7 0 1 0 11.3 11.3Z"/>',
    help:
      '<circle cx="12" cy="12" r="9"/><path d="M9.3 9a2.8 2.8 0 0 1 5.4 1c0 1.8-2.7 2.2-2.7 4"/>' +
      '<path d="M12 17h.01"/>',
    keyboard:
      '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronRight: '<path d="m9 6 6 6-6 6"/>',
    chevronLeft: '<path d="m15 6-6 6 6 6"/>',
    arrowRight: '<path d="M4 12h16"/><path d="m13 5 7 7-7 7"/>',
    arrowLeft: '<path d="M20 12H4"/><path d="m11 19-7-7 7-7"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    circleCheck: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
    circleX: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3 1.8"/>',
    flame:
      '<path d="M12 22c3.9 0 7-2.8 7-6.6 0-3.2-2.3-5.5-3.7-7.4C14.1 6.5 13 4.5 13 2c-2.2 2.1-4.4 4.8-4.4 7.5 0 1.3.5 2.5 1.2 3.4-.9.3-2-.4-2.6-1.3-.7 1.4-1.2 2.8-1.2 4 0 3.7 3.1 6.4 6 6.4Z"/>',
    trophy:
      '<path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z"/><path d="M8 5.5H5v2a3 3 0 0 0 3 3"/>' +
      '<path d="M16 5.5h3v2a3 3 0 0 1-3 3"/><path d="M12 12.5V16"/><path d="M8.5 21h7"/>' +
      '<path d="M9.5 21v-2.5a2.5 2.5 0 0 1 5 0V21"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    list: '<path d="M8.5 6h12M8.5 12h12M8.5 18h12"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    play: '<path d="M7 4.8v14.4L20 12 7 4.8Z"/>',
    terminal: '<path d="m4 7 5 5-5 5"/><path d="M11.5 17H20"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    refresh:
      '<path d="M20 11a8 8 0 0 0-14.2-3.8L4 9"/><path d="M4 4v5h5"/>' +
      '<path d="M4 13a8 8 0 0 0 14.2 3.8L20 15"/><path d="M20 20v-5h-5"/>',
    trash:
      '<path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>' +
      '<path d="M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>',
    folder:
      '<path d="M3 7.5A2 2 0 0 1 5 5.5h4l2 3h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11Z"/>',
    scan:
      '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/>' +
      '<path d="M4 12h16"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    alert:
      '<path d="M10.3 4.4 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0Z"/>' +
      '<path d="M12 9v4.5"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    cpu:
      '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 4v3M14 4v3M10 17v3M14 17v3"/>' +
      '<path d="M4 10h3M4 14h3M17 10h3M17 14h3"/>',
    memory:
      '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 7V4M12 7V4M17 7V4M7 20v-3M12 20v-3M17 20v-3"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    database:
      '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/>' +
      '<path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    code: '<path d="m8 6-6 6 6 6"/><path d="m16 6 6 6-6 6"/>',
    hash: '<path d="M10 3 8 21M16 3l-2 18M4 9h16M3 15h16"/>',
    layout:
      '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M6.5 6.5h.01M9.5 6.5h.01"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    graduation:
      '<path d="M2 9.5 12 4l10 5.5-10 5.5L2 9.5Z"/>' +
      '<path d="M6 12v4.5c0 1.7 2.7 3 6 3s6-1.3 6-3V12"/><path d="M22 10v5"/>',
    send: '<path d="M21 3 10.5 13.5"/><path d="M21 3l-6.5 18-4-8.5L2 8.5 21 3Z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    lightbulb:
      '<path d="M9.5 18h5"/><path d="M10.5 21h3"/>' +
      '<path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 2v.1h5.2v-.1c0-.8.3-1.5.9-2A6 6 0 0 0 12 3Z"/>',
    file:
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/>' +
      '<path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    download: '<path d="M12 4v11"/><path d="m7 12 5 5 5-5"/><path d="M4 20h16"/>',
    upload: '<path d="M12 20V9"/><path d="m7 12 5-5 5 5"/><path d="M4 4h16"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    server:
      '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/>' +
      '<path d="M7 7.5h.01M7 16.5h.01"/>',
    pencil: '<path d="M4 20h4L20 8l-4-4L4 16v4Z"/><path d="m14 6 4 4"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 14 3.5-3.5"/><circle cx="12" cy="14" r="1"/>',
    type: '<path d="M4 6V4h16v2"/><path d="M12 4v16"/><path d="M9 20h6"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-4"/>',
    clipboard:
      '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/>' +
      '<path d="m9 12 2 2 4-4"/><path d="M9 17h6"/>',
    circle: '<circle cx="12" cy="12" r="8.5"/>'
  };

  var TRACK_META = {
    python: { label: 'Python', tone: 'blue', icon: 'code' },
    web: { label: 'Web', tone: 'amber', icon: 'layout' },
    javascript: { label: 'JavaScript', tone: 'violet', icon: 'zap' },
    sql: { label: 'SQL', tone: 'mint', icon: 'database' },
    csharp: { label: 'C#', tone: 'rose', icon: 'hash' },
    cpp: { label: 'C++', tone: 'violet', icon: 'code' },
    custom: { label: 'A medida', tone: 'violet', icon: 'sparkles' }
  };

  var COURSE_STATUS = {
    active: 'En curso',
    archived: 'Archivado',
    completed: 'Completado',
    paused: 'En pausa'
  };

  var LESSON_STATUS = { pending: 'Pendiente', done: 'Completada', in_progress: 'En curso' };

  var LEVEL_LABELS = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' };

  var KIND_LABELS = {
    stdout: 'Salida de consola',
    sql: 'Consulta SQL',
    checklist: 'Lista de verificación'
  };

  var RUNTIME_LABELS = {
    python: 'Python',
    node: 'Node.js',
    dotnet: '.NET',
    sqlite: 'SQLite',
    gcc: 'GCC (C++)',
    java: 'JDK de Java'
  };

  var uidSeq = 0;
  var modalStack = [];

  function nextId(prefix) {
    uidSeq += 1;
    return (prefix || 'cc') + '-' + uidSeq;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function appendChildren(node, children) {
    children.forEach(function (child) {
      if (child === null || child === undefined || child === false || child === true) return;
      if (Array.isArray(child)) {
        appendChildren(node, child);
      } else if (child instanceof global.Node) {
        node.appendChild(child);
      } else {
        node.appendChild(document.createTextNode(String(child)));
      }
    });
  }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    var options = props || {};

    Object.keys(options).forEach(function (key) {
      var value = options[key];
      if (value === null || value === undefined || value === false) return;

      if (key === 'class' || key === 'className') {
        node.className = value;
      } else if (key === 'text') {
        node.textContent = value;
      } else if (key === 'html') {
        node.innerHTML = value;
      } else if (key === 'dataset') {
        Object.keys(value).forEach(function (dataKey) { node.dataset[dataKey] = value[dataKey]; });
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(node.style, value);
      } else if (key === 'attrs') {
        Object.keys(value).forEach(function (attr) {
          var attrValue = value[attr];
          if (attrValue === null || attrValue === undefined || attrValue === false) return;
          node.setAttribute(attr, attrValue === true ? '' : String(attrValue));
        });
      } else if (key.indexOf('on') === 0 && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) {
        node.setAttribute(key, '');
      } else {
        node.setAttribute(key, String(value));
      }
    });

    var items = [];
    for (var i = 2; i < arguments.length; i += 1) items.push(arguments[i]);
    appendChildren(node, items);
    return node;
  }

  function icon(name, size, className) {
    var paths = ICONS[name] || ICONS.info;
    var px = size || 18;
    return (
      '<svg class="icon ' + (className || '') + '" width="' + px + '" height="' + px +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      paths + '</svg>'
    );
  }

  function iconNode(name, size, className) {
    return el('span', { class: 'icon-wrap', html: icon(name, size, className) });
  }

  function spinner(label) {
    return el(
      'span',
      { class: 'busy-inline' },
      el('span', { class: 'spinner', 'aria-hidden': 'true' }),
      label ? el('span', { text: label }) : null
    );
  }

  function readStorage(key) {
    try {
      return global.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      global.localStorage.setItem(key, String(value));
    } catch (error) {
      /* El almacenamiento local puede estar desactivado; no es crítico. */
    }
  }

  function removeStorage(key) {
    try {
      global.localStorage.removeItem(key);
    } catch (error) {
      /* nada que hacer */
    }
  }

  function debounce(fn, wait) {
    var timer = 0;
    return function () {
      var args = arguments;
      var context = this;
      global.clearTimeout(timer);
      timer = global.setTimeout(function () { fn.apply(context, args); }, wait || 200);
    };
  }

  function formatNumber(value) {
    var number = Number(value);
    if (!isFinite(number)) number = 0;
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(number);
  }

  function formatDecimal(value, digits) {
    var number = Number(value);
    if (!isFinite(number)) return '0';
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: digits == null ? 1 : digits,
      maximumFractionDigits: digits == null ? 1 : digits
    }).format(number);
  }

  function formatMinutes(value) {
    var minutes = Math.max(0, Number(value) || 0);
    if (minutes < 60) return minutes + ' min';
    var hours = Math.floor(minutes / 60);
    var rest = minutes % 60;
    return rest ? hours + ' h ' + rest + ' min' : hours + ' h';
  }

  function parseDate(value) {
    if (!value) return null;
    var date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value, options) {
    var date = parseDate(value);
    if (!date) return '';
    var config = options || { day: 'numeric', month: 'short', year: 'numeric' };
    return new Intl.DateTimeFormat('es-ES', config).format(date);
  }

  function formatDateTime(value) {
    var date = parseDate(value);
    if (!date) return '';
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function formatLongDate(value) {
    var date = parseDate(value) || new Date();
    var text = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long'
    }).format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function dayFromKey(key) {
    var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(key || ''));
    if (!match) return parseDate(key);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function formatWeekday(key) {
    var date = dayFromKey(key);
    if (!date) return '';
    return new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date).replace('.', '');
  }

  function formatDayNumber(key) {
    var date = dayFromKey(key);
    if (!date) return '';
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric' }).format(date);
  }

  function pct(value) {
    var number = Number(value);
    if (!isFinite(number)) number = 0;
    return Math.max(0, Math.min(100, Math.round(number * 100)));
  }

  function plural(count, singular, pluralForm) {
    return Number(count) === 1 ? singular : pluralForm || singular + 's';
  }

  function capitalize(text) {
    var value = String(text == null ? '' : text);
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  }

  function trackMeta(track) {
    return TRACK_META[track] || { label: track ? capitalize(String(track)) : 'General', tone: 'blue', icon: 'book' };
  }

  function trackChip(track, label) {
    var meta = trackMeta(track);
    return el(
      'span',
      { class: 'chip tone-' + meta.tone },
      el('span', { class: 'chip-icon', html: icon(meta.icon, 13) }),
      label || meta.label
    );
  }

  function levelLabel(level) {
    return LEVEL_LABELS[level] || capitalize(level || 'Principiante');
  }

  function statusLabel(status) {
    return COURSE_STATUS[status] || capitalize(status || '');
  }

  function lessonStatusLabel(status) {
    return LESSON_STATUS[status] || capitalize(status || '');
  }

  function kindLabel(kind) {
    return KIND_LABELS[kind] || capitalize(kind || '');
  }

  function runtimeLabel(name) {
    return RUNTIME_LABELS[name] || capitalize(name || '');
  }

  function statusVariant(status) {
    if (status === 'done' || status === 'completed') return 'ok';
    if (status === 'active' || status === 'in_progress') return 'info';
    if (status === 'archived') return 'neutral';
    return 'neutral';
  }

  function badge(text, variant, options) {
    var opts = options || {};
    return el(
      'span',
      { class: 'badge badge-' + (variant || 'neutral') },
      opts.dot === false ? null : el('span', { class: 'badge-dot', 'aria-hidden': 'true' }),
      String(text)
    );
  }

  function progressBar(value, options) {
    var opts = options || {};
    var percent = pct(value);
    var bar = el('div', {
      class: 'progress' + (opts.large ? ' progress-large' : ''),
      role: 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': String(percent),
      'aria-label': opts.label || 'Progreso'
    });
    var fill = el('span', { class: 'progress-fill', style: { width: percent + '%' } });
    bar.appendChild(fill);
    return bar;
  }

  function ring(value, size, options) {
    var opts = options || {};
    var percent = pct(value);
    var dimension = size || 104;
    var stroke = opts.stroke || 8;
    var radius = (dimension - stroke) / 2;
    var center = dimension / 2;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference * (1 - percent / 100);
    var gradientId = nextId('ring');

    var wrapper = el('div', {
      class: 'ring',
      style: { width: dimension + 'px', height: dimension + 'px' },
      role: 'img',
      'aria-label': opts.label || percent + ' por ciento completado'
    });
    wrapper.innerHTML =
      '<svg viewBox="0 0 ' + dimension + ' ' + dimension + '" aria-hidden="true">' +
      '<defs><linearGradient id="' + gradientId + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="var(--accent-2)"/><stop offset="1" stop-color="var(--accent)"/>' +
      '</linearGradient></defs>' +
      '<circle class="ring-track" cx="' + center + '" cy="' + center + '" r="' + radius +
      '" stroke-width="' + stroke + '"/>' +
      '<circle class="ring-fill" cx="' + center + '" cy="' + center + '" r="' + radius +
      '" stroke-width="' + stroke + '" stroke="url(#' + gradientId + ')" ' +
      'stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '" ' +
      'transform="rotate(-90 ' + center + ' ' + center + ')"/></svg>' +
      '<span class="ring-value">' + percent + '<small>%</small></span>';
    return wrapper;
  }

  function emptyState(options) {
    var opts = options || {};
    var node = el('div', { class: 'empty' + (opts.compact ? ' empty-compact' : '') });
    node.append(
      el(
        'div',
        { class: 'empty-art', 'aria-hidden': 'true' },
        el('span', { class: 'empty-halo' }),
        el('span', { class: 'empty-icon', html: icon(opts.icon || 'sparkles', 24) })
      ),
      opts.title ? el('h3', { class: 'empty-title', text: opts.title }) : null,
      opts.text ? el('p', { class: 'empty-text', text: opts.text }) : null
    );
    if (opts.action) node.appendChild(actionNode(opts.action));
    if (opts.actions) {
      var row = el('div', { class: 'empty-actions' });
      opts.actions.forEach(function (action) { row.appendChild(actionNode(action)); });
      node.appendChild(row);
    }
    return node;
  }

  function actionNode(action) {
    var variant = action.variant || 'ghost';
    if (action.href) {
      return el('a', {
        class: 'btn btn-' + variant + (action.small ? ' btn-sm' : ''),
        href: action.href,
        text: action.label,
        target: action.external ? '_blank' : null,
        rel: action.external ? 'noopener noreferrer' : null
      });
    }
    var button = el('button', {
      type: 'button',
      class: 'btn btn-' + variant + (action.small ? ' btn-sm' : ''),
      onClick: action.onClick || function () {}
    });
    if (action.icon) button.appendChild(el('span', { class: 'btn-icon', html: icon(action.icon, 16) }));
    button.appendChild(el('span', { text: action.label }));
    return button;
  }

  function errorState(error, onRetry, options) {
    var opts = options || {};
    var message =
      error && error.message
        ? error.message
        : 'No se pudo cargar esta sección. Inténtalo de nuevo.';
    var node = el('div', { class: 'banner banner-error banner-page', role: 'alert' });
    node.append(
      el('span', { class: 'banner-icon', html: icon('alert', 20) }),
      el(
        'div',
        { class: 'banner-copy' },
        el('p', { class: 'banner-title', text: opts.title || 'Algo no ha salido bien' }),
        el('p', { class: 'banner-text', text: message }),
        error && error.code === 'network'
          ? el('p', {
              class: 'banner-hint',
              text: 'La app funciona en local: comprueba que Código Cero siga abierto en este equipo.'
            })
          : null
      )
    );
    if (onRetry) {
      var retry = el(
        'button',
        { type: 'button', class: 'btn btn-ghost', onClick: onRetry },
        el('span', { class: 'btn-icon', html: icon('refresh', 16) }),
        'Reintentar'
      );
      node.appendChild(retry);
    }
    return node;
  }

  function skeleton(className, style) {
    return el('div', { class: 'skeleton ' + (className || ''), style: style || null });
  }

  function pageSkeleton() {
    return el(
      'div',
      { class: 'view-inner skeleton-page' },
      skeleton('sk-hero'),
      el(
        'div',
        { class: 'sk-stats' },
        skeleton('sk-stat'),
        skeleton('sk-stat'),
        skeleton('sk-stat'),
        skeleton('sk-stat')
      ),
      skeleton('sk-section'),
      el(
        'div',
        { class: 'sk-grid' },
        skeleton('sk-card'),
        skeleton('sk-card'),
        skeleton('sk-card')
      )
    );
  }

  function copy(text, message) {
    var value = String(text == null ? '' : text);
    var done = function () {
      toast(message || 'Copiado al portapapeles', { variant: 'success' });
    };
    var fail = function () {
      toast('No se pudo copiar. Selecciona el texto y usa Ctrl+C.', { variant: 'error' });
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value).then(done, function () {
        return legacyCopy(value) ? done() : fail();
      });
    }
    return Promise.resolve(legacyCopy(value) ? done() : fail());
  }

  function legacyCopy(value) {
    var area = el('textarea', { class: 'copy-helper', 'aria-hidden': 'true', tabindex: '-1' });
    area.value = value;
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }
    area.remove();
    return ok;
  }

  function toast(message, options) {
    var root = document.getElementById('toasts');
    if (!root) return null;
    var opts = typeof options === 'string' ? { variant: options } : options || {};
    var variant = opts.variant || 'info';
    var iconName =
      variant === 'success' ? 'circleCheck' : variant === 'error' ? 'circleX' :
      variant === 'warn' ? 'alert' : 'info';

    while (root.children.length >= 4) root.removeChild(root.firstElementChild);

    var node = el('div', { class: 'toast toast-' + variant, role: 'status' });
    node.append(
      el('span', { class: 'toast-icon', html: icon(iconName, 18) }),
      el(
        'div',
        { class: 'toast-copy' },
        opts.title ? el('p', { class: 'toast-title', text: opts.title }) : null,
        el('p', { class: 'toast-text', text: String(message == null ? '' : message) })
      ),
      el(
        'button',
        {
          type: 'button',
          class: 'toast-close',
          'aria-label': 'Cerrar aviso',
          onClick: function () { dismiss(); }
        },
        el('span', { html: icon('x', 14) })
      )
    );

    var closed = false;
    var timer = 0;

    function dismiss() {
      if (closed) return;
      closed = true;
      global.clearTimeout(timer);
      node.classList.add('is-leaving');
      global.setTimeout(function () { node.remove(); }, 180);
    }

    root.appendChild(node);
    var timeout = opts.timeout == null ? (variant === 'error' ? 6500 : 4200) : opts.timeout;
    if (timeout > 0) timer = global.setTimeout(dismiss, timeout);
    node.addEventListener('mouseenter', function () { global.clearTimeout(timer); });
    node.addEventListener('mouseleave', function () {
      if (!closed) timer = global.setTimeout(dismiss, 1600);
    });
    return { close: dismiss, node: node };
  }

  function focusable(container) {
    return Array.prototype.slice
      .call(
        container.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), ' +
          'select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      .filter(function (node) {
        return node.offsetWidth > 0 || node.offsetHeight > 0 || node === document.activeElement;
      });
  }

  function modal(options) {
    var opts = options || {};
    var root = document.getElementById('modal-root');
    if (!root) return { close: function () {}, el: null };

    var titleId = nextId('modal-title');
    var previousFocus = document.activeElement;
    var backdrop = el('div', { class: 'modal-backdrop' });
    var dialog = el('div', {
      class: 'modal modal-' + (opts.size || 'md'),
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': opts.title ? titleId : null,
      tabindex: '-1'
    });

    var closeButton = opts.closable === false ? null : el(
      'button',
      { type: 'button', class: 'icon-btn modal-close', 'aria-label': 'Cerrar', onClick: function () { close(); } },
      el('span', { html: icon('x', 16) })
    );

    var head = el(
      'div',
      { class: 'modal-head' },
      el(
        'div',
        { class: 'modal-heading' },
        opts.eyebrow ? el('p', { class: 'modal-eyebrow', text: opts.eyebrow }) : null,
        opts.title ? el('h2', { class: 'modal-title', id: titleId, text: opts.title }) : null
      ),
      closeButton
    );

    var body = el('div', { class: 'modal-body' });
    if (opts.description) body.appendChild(el('p', { class: 'modal-text', text: opts.description }));
    if (opts.content) {
      if (Array.isArray(opts.content)) {
        opts.content.forEach(function (item) { if (item) body.appendChild(item); });
      } else if (opts.content instanceof global.Node) {
        body.appendChild(opts.content);
      } else {
        body.appendChild(el('p', { class: 'modal-text', text: String(opts.content) }));
      }
    }

    var foot = null;
    if (opts.actions && opts.actions.length) {
      foot = el('div', { class: 'modal-foot' });
      opts.actions.forEach(function (action) {
        var variant = action.variant || 'ghost';
        var button = el('button', {
          type: 'button',
          class: 'btn btn-' + variant,
          disabled: action.disabled
        });
        if (action.icon) button.appendChild(el('span', { class: 'btn-icon', html: icon(action.icon, 16) }));
        button.appendChild(el('span', { text: action.label }));
        button.addEventListener('click', function () {
          var result = action.onClick ? action.onClick(close) : undefined;
          var finish = function () {
            if (action.keepOpen !== true) close();
          };
          if (result && typeof result.then === 'function') {
            button.disabled = true;
            result.then(finish, function () { button.disabled = false; });
          } else {
            finish();
          }
        });
        foot.appendChild(button);
      });
    }

    dialog.append(head);
    if (body.childNodes.length) dialog.appendChild(body);
    if (foot) dialog.appendChild(foot);
    backdrop.appendChild(dialog);
    root.appendChild(backdrop);

    modalStack.push(close);
    document.body.classList.add('has-modal');

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      var index = modalStack.indexOf(close);
      if (index !== -1) modalStack.splice(index, 1);
      if (!modalStack.length) document.body.classList.remove('has-modal');
      backdrop.classList.add('is-leaving');
      global.setTimeout(function () { backdrop.remove(); }, 140);
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus({ preventScroll: true });
      }
      if (typeof opts.onClose === 'function') opts.onClose();
    }

    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop && opts.closable !== false) close();
    });

    backdrop.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && opts.closable !== false) {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      var items = focusable(dialog);
      if (!items.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    global.setTimeout(function () {
      var items = focusable(dialog);
      if (items.length) items[0].focus();
      else dialog.focus();
    }, 30);

    return { close: close, el: dialog, body: body };
  }

  function confirm(options) {
    var opts = options || {};
    return new Promise(function (resolve) {
      var settled = false;
      function settle(value) {
        if (settled) return;
        settled = true;
        resolve(value);
      }
      var dialog = modal({
        title: opts.title || '¿Seguro?',
        description: opts.message || '',
        size: 'sm',
        content: opts.content || null,
        onClose: function () { settle(false); },
        actions: [
          {
            label: opts.cancelLabel || 'Cancelar',
            variant: 'ghost',
            onClick: function () { settle(false); }
          },
          {
            label: opts.confirmLabel || 'Confirmar',
            variant: opts.danger ? 'danger' : 'primary',
            onClick: function () { settle(true); }
          }
        ]
      });
      if (!dialog.el) settle(false);
    });
  }

  function closeModals() {
    modalStack.slice().reverse().forEach(function (close) {
      try { close(); } catch (error) { /* seguir cerrando */ }
    });
  }

  function hasModal() {
    return modalStack.length > 0;
  }

  function busy(button, isBusy, label) {
    if (!button) return;
    if (isBusy) {
      if (!button.hasAttribute('data-idle-html')) {
        button.setAttribute('data-idle-html', button.innerHTML);
      }
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.innerHTML =
        '<span class="spinner" aria-hidden="true"></span><span>' +
        escapeHtml(label || 'Un momento…') + '</span>';
    } else {
      var idle = button.getAttribute('data-idle-html');
      if (idle !== null) {
        button.innerHTML = idle;
        button.removeAttribute('data-idle-html');
      }
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }

  function tabBar(items, options) {
    var opts = options || {};
    var nav = el('div', {
      class: 'tabs' + (opts.vertical ? ' tabs-vertical' : ''),
      role: 'tablist',
      'aria-orientation': opts.vertical ? 'vertical' : 'horizontal',
      'aria-label': opts.label || 'Secciones'
    });
    var buttons = [];
    var current = null;

    function apply(id, shouldFocus) {
      current = id;
      buttons.forEach(function (entry) {
        var selected = entry.id === id;
        entry.button.setAttribute('aria-selected', selected ? 'true' : 'false');
        entry.button.tabIndex = selected ? 0 : -1;
        entry.button.classList.toggle('is-active', selected);
        if (selected && shouldFocus) entry.button.focus();
      });
      if (typeof opts.onChange === 'function') opts.onChange(id);
    }

    items.forEach(function (item) {
      var button = el('button', {
        type: 'button',
        class: 'tab',
        role: 'tab',
        id: 'tab-' + item.id,
        'aria-selected': 'false',
        tabindex: '-1'
      });
      if (item.icon) button.appendChild(el('span', { class: 'tab-icon', html: icon(item.icon, 15) }));
      button.appendChild(el('span', { text: item.label }));
      button.addEventListener('click', function () { apply(item.id, false); });
      nav.appendChild(button);
      buttons.push({ id: item.id, button: button });
    });

    nav.addEventListener('keydown', function (event) {
      var index = buttons.findIndex(function (entry) { return entry.id === current; });
      if (index === -1) return;
      var next = -1;
      var forward = opts.vertical ? 'ArrowDown' : 'ArrowRight';
      var backward = opts.vertical ? 'ArrowUp' : 'ArrowLeft';
      if (event.key === forward) next = (index + 1) % buttons.length;
      else if (event.key === backward) next = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      if (next === -1) return;
      event.preventDefault();
      apply(buttons[next].id, true);
    });

    var start = opts.initial || (items[0] && items[0].id);
    if (start) {
      buttons.forEach(function (entry) {
        var selected = entry.id === start;
        entry.button.setAttribute('aria-selected', selected ? 'true' : 'false');
        entry.button.tabIndex = selected ? 0 : -1;
        entry.button.classList.toggle('is-active', selected);
      });
      current = start;
    }

    return {
      el: nav,
      current: function () { return current; },
      select: function (id) { apply(id, false); }
    };
  }

  function getTheme() {
    return readStorage('ui.theme') === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme, options) {
    var opts = options || {};
    var value = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', value);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', value === 'light' ? '#f3f6fa' : '#0a0d12');
    if (opts.persist !== false) writeStorage('ui.theme', value);
    syncThemeToggle();
    document.dispatchEvent(new CustomEvent('cc:theme', { detail: { theme: value } }));
    return value;
  }

  function toggleTheme() {
    return applyTheme(getTheme() === 'light' ? 'dark' : 'light');
  }

  function syncThemeToggle() {
    var button = document.getElementById('theme-toggle');
    if (!button) return;
    var theme = getTheme();
    var target = theme === 'light' ? 'oscuro' : 'claro';
    button.innerHTML = icon(theme === 'light' ? 'moon' : 'sun', 17);
    button.setAttribute('aria-label', 'Cambiar al tema ' + target);
    button.title = 'Tema ' + target;
  }

  function getFontSize() {
    var raw = Number(readStorage('ui.font_size'));
    if (!isFinite(raw) || raw < 13 || raw > 18) return 15;
    return raw;
  }

  function applyFontSize(size, options) {
    var opts = options || {};
    var value = Math.max(13, Math.min(18, Number(size) || 15));
    document.documentElement.style.setProperty('--fs', value + 'px');
    document.documentElement.setAttribute('data-font-size', String(value));
    if (opts.persist !== false) writeStorage('ui.font_size', value);
    return value;
  }

  function wireThemeToggle() {
    var button = document.getElementById('theme-toggle');
    if (!button || button.getAttribute('data-wired') === '1') return;
    button.setAttribute('data-wired', '1');
    button.addEventListener('click', function () {
      toggleTheme();
      toast(getTheme() === 'light' ? 'Tema claro activado' : 'Tema oscuro activado', {
        variant: 'info',
        timeout: 2200
      });
    });
    syncThemeToggle();
  }

  function scrollIntoViewIfNeeded(node) {
    if (!node || !node.getBoundingClientRect) return;
    var rect = node.getBoundingClientRect();
    var margin = 90;
    if (rect.top < margin || rect.bottom > global.innerHeight - margin) {
      node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  global.CC.ui = {
    el: el,
    icon: icon,
    iconNode: iconNode,
    spinner: spinner,
    escapeHtml: escapeHtml,
    nextId: nextId,

    badge: badge,
    chip: trackChip,
    trackChip: trackChip,
    progressBar: progressBar,
    ring: ring,
    emptyState: emptyState,
    errorState: errorState,
    skeleton: skeleton,
    pageSkeleton: pageSkeleton,

    toast: toast,
    modal: modal,
    confirm: confirm,
    closeModals: closeModals,
    hasModal: hasModal,
    busy: busy,
    copy: copy,

    tabBar: tabBar,

    trackMeta: trackMeta,
    levelLabel: levelLabel,
    statusLabel: statusLabel,
    lessonStatusLabel: lessonStatusLabel,
    kindLabel: kindLabel,
    runtimeLabel: runtimeLabel,
    statusVariant: statusVariant,
    capitalize: capitalize,
    plural: plural,

    formatNumber: formatNumber,
    formatDecimal: formatDecimal,
    formatMinutes: formatMinutes,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    formatLongDate: formatLongDate,
    formatWeekday: formatWeekday,
    formatDayNumber: formatDayNumber,
    pct: pct,

    debounce: debounce,
    readStorage: readStorage,
    writeStorage: writeStorage,
    removeStorage: removeStorage,
    scrollIntoViewIfNeeded: scrollIntoViewIfNeeded,

    getTheme: getTheme,
    applyTheme: applyTheme,
    toggleTheme: toggleTheme,
    syncThemeToggle: syncThemeToggle,
    getFontSize: getFontSize,
    applyFontSize: applyFontSize,
    wireThemeToggle: wireThemeToggle
  };
})(window);
