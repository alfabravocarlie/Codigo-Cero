/* Código Cero — vistas de la aplicación. */
(function (global) {
  'use strict';

  const CC = global.CC = global.CC || {};
  const ui = CC.ui;
  const api = CC.api;
  const md = CC.markdown;
  const el = ui.el;

  const HOME_CRUMB = { label: 'Inicio', href: '#/inicio' };

  const TOOL_ICONS = {
    node: 'code',
    dotnet: 'hash',
    gcc: 'terminal',
    java: 'cpu',
    git: 'layers',
    ollama: 'sparkles'
  };

  const TOOL_SHORT_LABELS = {
    node: 'Node.js',
    dotnet: '.NET',
    gcc: 'GCC',
    java: 'Java',
    git: 'Git',
    ollama: 'Ollama'
  };

  function rememberTools(payload) {
    if (payload && Array.isArray(payload.tools) && CC.state) CC.state.tools = payload;
    return payload;
  }

  function toolForTrack(track) {
    const payload = CC.state && CC.state.tools;
    if (!track || !track.track || !payload || !Array.isArray(payload.tools)) return null;
    return (
      payload.tools.find(function (tool) {
        if (!Array.isArray(tool.tracks)) return false;
        return (
          tool.tracks.indexOf(track.track) !== -1 ||
          (track.language && tool.tracks.indexOf(track.language) !== -1)
        );
      }) || null
    );
  }

  function missingToolForTrack(track) {
    if (!track || track.available !== false) return null;
    const tool = toolForTrack(track);
    return tool && tool.installed === false ? tool : null;
  }

  function toolShortName(tool) {
    if (!tool) return 'la herramienta';
    return TOOL_SHORT_LABELS[tool.id] || tool.name || 'la herramienta';
  }

  function shortToolVersion(tool) {
    const match = String((tool && tool.version) || '').match(/\d+(?:\.\d+)+/);
    return match ? match[0] : '';
  }

  function trackRequirementBanner(track, tool) {
    const label = ui.trackMeta(track.track).label;
    const shortName = toolShortName(tool);
    return el(
      'div',
      { class: 'banner banner-warn requirement-banner' },
      el('span', { class: 'banner-icon', html: ui.icon('alert', 18) }),
      el(
        'div',
        { class: 'banner-copy' },
        el('p', {
          class: 'banner-title',
          text: 'Para ejecutar los ejercicios de ' + label + ' necesitas ' + shortName
        }),
        el('p', {
          class: 'banner-text',
          text:
            'Puedes seguir la clase en modo guiado: las lecciones y las explicaciones funcionan igual. ' +
            'Instala la herramienta cuando quieras ejecutar y corregir el código.'
        })
      ),
      actionLink('Instalar', 'download', '#/ajustes?tab=entorno', 'primary', 'btn-sm')
    );
  }

  const LEVELS = [
    { id: 'principiante', title: 'Principiante', text: 'Empiezo desde cero o casi. Sin prisa.' },
    { id: 'intermedio', title: 'Intermedio', text: 'Ya escribo código y entiendo lo básico.' },
    { id: 'avanzado', title: 'Avanzado', text: 'Quiero profundizar y practicar patrones.' }
  ];

  const GOALS = [
    { id: 'Mi primer proyecto', label: 'Crear mi primer proyecto', icon: 'sparkles' },
    { id: 'Conseguir trabajo', label: 'Prepararme para trabajar', icon: 'target' },
    { id: 'Automatizar tareas', label: 'Automatizar tareas', icon: 'zap' },
    { id: 'Por curiosidad', label: 'Aprender por curiosidad', icon: 'lightbulb' },
    { id: 'custom', label: 'Otro objetivo', icon: 'pencil' }
  ];

  const PACES = [
    { id: '20 minutos al día', title: '20 minutos al día', text: 'Un paso corto, todos los días.' },
    { id: '1 hora al día', title: '1 hora al día', text: 'Ritmo constante para avanzar rápido.' },
    { id: 'Solo los fines de semana', title: 'Fines de semana', text: 'Sesiones más largas, sin prisa.' },
    { id: 'A mi ritmo', title: 'A mi ritmo', text: 'Cuando pueda, sin presión.' }
  ];

  /* ------------------------------------------------------------------ */
  /* Utilidades compartidas                                              */
  /* ------------------------------------------------------------------ */

  function actionLink(label, iconName, href, variant, extraClass) {
    const link = el('a', { class: 'btn btn-' + (variant || 'ghost') + (extraClass ? ' ' + extraClass : ''), href: href });
    if (iconName) link.appendChild(el('span', { class: 'btn-icon', html: ui.icon(iconName, 16) }));
    link.appendChild(el('span', { text: label }));
    return link;
  }

  function actionButton(label, iconName, onClick, variant, extraClass) {
    const button = el('button', {
      type: 'button',
      class: 'btn btn-' + (variant || 'ghost') + (extraClass ? ' ' + extraClass : ''),
      onClick: onClick
    });
    if (iconName) button.appendChild(el('span', { class: 'btn-icon', html: ui.icon(iconName, 16) }));
    button.appendChild(el('span', { text: label }));
    return button;
  }

  function iconButton(iconName, label, onClick, extraClass) {
    const button = el('button', {
      type: 'button',
      class: 'icon-btn' + (extraClass ? ' ' + extraClass : ''),
      'aria-label': label,
      title: label,
      onClick: onClick
    });
    button.appendChild(el('span', { html: ui.icon(iconName, 17) }));
    return button;
  }

  function sectionHead(title, text, right) {
    return el(
      'div',
      { class: 'section-head' },
      el(
        'div',
        { class: 'section-heading' },
        el('h2', { class: 'section-title', text: title }),
        text ? el('p', { class: 'section-sub', text: text }) : null
      ),
      right || null
    );
  }

  function panelHead(iconName, title, text) {
    return el(
      'div',
      { class: 'panel-head' },
      el('span', { class: 'panel-head-icon', html: ui.icon(iconName, 19) }),
      el(
        'div',
        { class: 'panel-heading' },
        el('h2', { class: 'panel-title', text: title }),
        text ? el('p', { class: 'panel-sub', text: text }) : null
      )
    );
  }

  function metaItem(iconName, text) {
    return el(
      'span',
      { class: 'meta-item' },
      el('span', { class: 'meta-icon', html: ui.icon(iconName, 14) }),
      el('span', { text: text })
    );
  }

  function detailSkeleton() {
    return el(
      'div',
      { class: 'view-inner skeleton-page' },
      el(
        'div',
        { class: 'sk-detail-grid' },
        el(
          'div',
          { class: 'sk-detail-col' },
          ui.skeleton('sk-panel'),
          ui.skeleton('sk-section'),
          ui.skeleton('sk-panel')
        ),
        ui.skeleton('sk-aside')
      )
    );
  }

  function pageError(ctx, error) {
    const box = el('div', { class: 'view-inner' });
    box.appendChild(ui.errorState(error, ctx.reload));
    ctx.root.replaceChildren(box);
  }

  function emptyAction(label, iconName, href, variant) {
    return { label: label, icon: iconName, href: href, variant: variant || 'primary' };
  }

  function scrollToId(id) {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function linkButton(label, href, variant) {
    return el('a', { class: 'btn btn-' + (variant || 'ghost'), href: href, text: label });
  }

  function formatGb(value) {
    const number = Number(value);
    if (!isFinite(number)) return '—';
    return ui.formatDecimal(number, 1) + ' GB';
  }

  function courseTotals(detail) {
    let total = 0;
    let done = 0;
    const modules = detail && Array.isArray(detail.modules) ? detail.modules : [];
    modules.forEach(function (module) {
      const lessons = Array.isArray(module.lessons) ? module.lessons : [];
      lessons.forEach(function (lesson) {
        total += 1;
        if (lesson.status === 'done') done += 1;
      });
    });
    return { total: total, done: done };
  }

  function findLesson(detail, lessonId) {
    const modules = detail && Array.isArray(detail.modules) ? detail.modules : [];
    for (let i = 0; i < modules.length; i += 1) {
      const lessons = Array.isArray(modules[i].lessons) ? modules[i].lessons : [];
      for (let j = 0; j < lessons.length; j += 1) {
        if (lessons[j].id === lessonId) return lessons[j];
      }
    }
    return null;
  }

  function nextLesson(detail) {
    if (!detail) return null;
    if (detail.next_lesson != null) {
      const found = findLesson(detail, detail.next_lesson);
      if (found) return found;
    }
    const modules = Array.isArray(detail.modules) ? detail.modules : [];
    for (let i = 0; i < modules.length; i += 1) {
      const lessons = Array.isArray(modules[i].lessons) ? modules[i].lessons : [];
      for (let j = 0; j < lessons.length; j += 1) {
        if (lessons[j].status !== 'done') return lessons[j];
      }
    }
    return null;
  }

  function firstLesson(detail) {
    const modules = detail && Array.isArray(detail.modules) ? detail.modules : [];
    for (let i = 0; i < modules.length; i += 1) {
      const lessons = Array.isArray(modules[i].lessons) ? modules[i].lessons : [];
      if (lessons.length) return lessons[0];
    }
    return null;
  }

  function teacherInfo(health) {
    const ai = health && health.ai ? health.ai : null;
    if (!ai) {
      return {
        kind: 'unknown',
        title: 'Profesor',
        detail: 'No se pudo comprobar el estado'
      };
    }
    if (!ai.configured) {
      return {
        kind: 'idle',
        title: 'Modo lectura',
        detail: 'Sin profesor configurado'
      };
    }
    if (ai.reachable === false) {
      return {
        kind: 'offline',
        title: 'Profesor sin conexión',
        detail: (ai.model || 'Ollama') + ' no responde'
      };
    }
    return {
      kind: 'online',
      title: 'Profesor listo',
      detail: (ai.model || 'Modelo local') + (ai.provider ? ' · ' + ui.capitalize(ai.provider) : '')
    };
  }

  function teacherDot(kind) {
    const map = { online: 'is-ok', offline: 'is-warn', idle: 'is-idle', unknown: 'is-warn' };
    return el('span', { class: 'status-dot ' + (map[kind] || 'is-idle'), 'aria-hidden': 'true' });
  }

  function isTeacherReady(health) {
    return Boolean(health && health.ai && health.ai.configured && health.ai.reachable !== false);
  }

  /* ------------------------------------------------------------------ */
  /* Inicio                                                              */
  /* ------------------------------------------------------------------ */

  function homeView(ctx) {
    ctx.setPage({
      title: 'Inicio',
      subtitle: 'Tu progreso y lo siguiente que toca.',
      crumbs: [{ label: 'Inicio' }],
      actions: [actionLink('Nueva clase', 'plus', '#/nueva', 'ghost')]
    });

    const box = el('div', { class: 'view-inner' });
    ctx.root.replaceChildren(box);
    box.appendChild(ui.pageSkeleton());

    (async function load() {
      const results = await Promise.allSettled([api.courses(), api.stats(), api.health(), api.tools()]);
      if (!ctx.alive()) return;

      const coursesResult = results[0];
      const statsResult = results[1];
      const healthResult = results[2];
      const toolsResult = results[3];

      if (coursesResult.status === 'rejected') {
        pageError(ctx, coursesResult.reason);
        return;
      }

      const payload = coursesResult.value || {};
      const courses = Array.isArray(payload.courses) ? payload.courses : [];
      const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
      const stats = statsResult.status === 'fulfilled' ? statsResult.value : null;
      const health = healthResult.status === 'fulfilled' ? healthResult.value : CC.state.health;
      if (toolsResult.status === 'fulfilled') rememberTools(toolsResult.value);

      const active = courses.filter(function (course) { return course.status === 'active'; });
      const primary = active[0] || courses[0] || null;
      let detail = null;
      if (primary) {
        try {
          detail = await api.course(primary.id);
        } catch (error) {
          detail = null;
        }
      }
      if (!ctx.alive()) return;

      const fragment = document.createDocumentFragment();
      fragment.appendChild(heroSection(primary, detail, stats));
      fragment.appendChild(statsSection(stats, statsResult.status === 'rejected', ctx));

      const notice = teacherNotice(health);
      if (notice) fragment.appendChild(notice);

      if (primary) {
        fragment.appendChild(courseFocusSection(primary, detail, courses));
      } else {
        fragment.appendChild(firstStepsSection());
      }

      fragment.appendChild(tracksSection(tracks, courses));
      fragment.appendChild(
        el(
          'div',
          { class: 'home-bottom' },
          teacherCard(health),
          shortcutsCard()
        )
      );

      box.replaceChildren(fragment);
    })().catch(function (error) {
      if (ctx.alive()) pageError(ctx, error);
    });
  }

  function heroSection(primary, detail, stats) {
    const hero = el('section', { class: 'hero' });
    const copy = el('div', { class: 'hero-copy' });
    copy.appendChild(
      el(
        'p',
        { class: 'eyebrow' },
        el('span', { class: 'eyebrow-dot', 'aria-hidden': 'true' }),
        ui.formatLongDate(new Date())
      )
    );

    if (primary) {
      const next = nextLesson(detail);
      const totals = courseTotals(detail);
      const total = primary.lessons_total || totals.total;
      const done = primary.lessons_done != null ? primary.lessons_done : totals.done;
      const ratio = typeof primary.progress === 'number' ? primary.progress : total ? done / total : 0;
      const complete = total > 0 && done >= total;

      copy.appendChild(
        el('h2', {
          class: 'hero-title',
          text: complete ? 'Has terminado «' + primary.title + '»' : 'Retoma donde lo dejaste'
        })
      );
      copy.appendChild(
        el('p', {
          class: 'hero-lede',
          text: complete
            ? 'Puedes repasar las lecciones o empezar un itinerario nuevo. El siguiente reto es tuyo.'
            : next
              ? 'Tu siguiente paso es «' + next.title + '». Te llevará ' + ui.formatMinutes(next.minutes || 10) + '.'
              : 'Tu clase «' + primary.title + '» está lista para seguir avanzando.'
        })
      );

      const actions = el('div', { class: 'hero-actions' });
      if (next) {
        actions.appendChild(actionLink('Continuar lección', 'play', '#/leccion/' + next.id, 'primary'));
      } else if (complete) {
        actions.appendChild(actionLink('Repasar el curso', 'book', '#/clase/' + primary.id, 'primary'));
      } else {
        actions.appendChild(actionLink('Abrir la clase', 'book', '#/clase/' + primary.id, 'primary'));
      }
      actions.appendChild(actionLink('Nueva clase', 'plus', '#/nueva', 'ghost'));
      copy.appendChild(actions);
      copy.appendChild(heroMeta(stats));

      const panel = el('div', { class: 'hero-panel' });
      panel.appendChild(
        ui.ring(ratio, 118, { stroke: 9, label: 'Progreso de ' + (primary.title || 'tu curso') })
      );
      panel.appendChild(el('p', { class: 'hero-panel-label', text: 'Progreso del curso' }));
      panel.appendChild(
        el('p', {
          class: 'hero-panel-meta',
          text: done + ' de ' + total + ' ' + ui.plural(total, 'lección', 'lecciones')
        })
      );
      panel.appendChild(
        el('span', { class: 'hero-panel-tag' }, ui.badge(ui.statusLabel(primary.status || 'active'), 'info'))
      );

      hero.append(copy, panel);
      return hero;
    }

    copy.appendChild(el('h2', { class: 'hero-title', text: 'Aprender a programar, desde cero' }));
    copy.appendChild(
      el('p', {
        class: 'hero-lede',
        text:
          'Elige un itinerario, crea tu clase y avanza con lecciones cortas, ejercicios corregidos ' +
          'y un tutor que vive en tu equipo.'
      })
    );
    const actions = el('div', { class: 'hero-actions' });
    actions.appendChild(actionLink('Crear mi primera clase', 'sparkles', '#/nueva', 'primary'));
    actions.appendChild(
      actionButton('Ver itinerarios', 'layers', function () { scrollToId('itinerarios'); }, 'ghost')
    );
    copy.appendChild(actions);
    copy.appendChild(heroMeta(stats));

    hero.append(copy, routeIllustration());
    return hero;
  }

  function heroMeta(stats) {
    if (!stats) {
      return el('p', { class: 'hero-meta-empty', text: 'Todavía no hay estadísticas que mostrar.' });
    }
    const meta = el('div', { class: 'hero-meta' });
    meta.appendChild(
      el(
        'span',
        { class: 'hero-chip' },
        el('span', { class: 'hero-chip-icon', html: ui.icon('flame', 15) }),
        el('strong', { text: ui.formatNumber(stats.streak || 0) }),
        ' ' + (Number(stats.streak) === 1 ? 'día de racha' : 'días de racha')
      )
    );
    meta.appendChild(
      el(
        'span',
        { class: 'hero-chip' },
        el('span', { class: 'hero-chip-icon', html: ui.icon('trophy', 15) }),
        el('strong', { text: ui.formatNumber(stats.xp || 0) }),
        ' XP'
      )
    );
    return meta;
  }

  function routeIllustration() {
    const wrap = el('div', { class: 'hero-illustration', 'aria-hidden': 'true' });
    wrap.innerHTML =
      '<svg viewBox="0 0 230 210" role="presentation">' +
      '<defs><linearGradient id="homeRoute" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#6ee7b7"/><stop offset="1" stop-color="#7c9cff"/>' +
      '</linearGradient></defs>' +
      '<path class="route-path" d="M44 172 C 30 132, 74 128, 96 98 S 154 58, 176 32" ' +
      'fill="none" stroke="url(#homeRoute)" stroke-width="2.4" stroke-dasharray="7 9" stroke-linecap="round"/>' +
      '<circle class="route-halo" cx="44" cy="172" r="24"/>' +
      '<circle class="route-halo" cx="96" cy="98" r="24"/>' +
      '<circle class="route-halo" cx="176" cy="32" r="24"/>' +
      '<circle class="route-node" cx="44" cy="172" r="15"/>' +
      '<circle class="route-node" cx="96" cy="98" r="15"/>' +
      '<circle class="route-node" cx="176" cy="32" r="15"/>' +
      '<text class="route-num" x="44" y="177">1</text>' +
      '<text class="route-num" x="96" y="103">2</text>' +
      '<text class="route-num" x="176" y="37">3</text>' +
      '</svg>';
    return wrap;
  }

  function statsSection(stats, failed, ctx) {
    const section = el('section', { class: 'stats-row', 'aria-label': 'Tus estadísticas' });
    const items = [
      {
        icon: 'trophy',
        tone: 'mint',
        value: stats ? ui.formatNumber(stats.xp || 0) : '—',
        label: 'XP acumulada',
        hint: 'Puntos por práctica'
      },
      {
        icon: 'flame',
        tone: 'amber',
        value: stats ? ui.formatNumber(stats.streak || 0) : '—',
        label: 'Racha',
        hint: stats && Number(stats.streak) === 1 ? '1 día seguido' : 'días seguidos'
      },
      {
        icon: 'book',
        tone: 'blue',
        value: stats ? ui.formatNumber(stats.lessons_done || 0) : '—',
        label: 'Lecciones',
        hint: 'completadas'
      },
      {
        icon: 'target',
        tone: 'violet',
        value: stats ? ui.formatNumber(stats.exercises_done || 0) : '—',
        label: 'Ejercicios',
        hint: 'resueltos'
      }
    ];

    items.forEach(function (item) {
      section.appendChild(
        el(
          'article',
          { class: 'stat-card' },
          el('span', { class: 'stat-icon tone-' + item.tone, html: ui.icon(item.icon, 18) }),
          el(
            'div',
            { class: 'stat-copy' },
            el('p', { class: 'stat-value', text: item.value }),
            el('p', { class: 'stat-label', text: item.label }),
            el('p', { class: 'stat-hint', text: item.hint })
          )
        )
      );
    });

    if (failed) {
      const warning = el(
        'div',
        { class: 'inline-warning stats-warning' },
        el('span', { class: 'inline-warning-icon', html: ui.icon('alert', 14) }),
        el('span', { text: 'No se pudieron cargar tus estadísticas.' }),
        el('button', {
          type: 'button',
          class: 'link-button',
          text: 'Reintentar',
          onClick: ctx.reload
        })
      );
      const wrap = el('div', { class: 'stats-wrap' });
      wrap.append(section, warning);
      return wrap;
    }

    return section;
  }

  function teacherNotice(health) {
    if (!health || !health.ai || health.ai.configured) return null;
    const node = el('div', { class: 'notice notice-read' });
    node.append(
      el('span', { class: 'notice-icon', html: ui.icon('info', 19) }),
      el(
        'div',
        { class: 'notice-copy' },
        el('p', { class: 'notice-title', text: 'Estás en modo lectura' }),
        el('p', {
          class: 'notice-text',
          text:
            'Las lecciones y los ejercicios funcionan sin profesor. El tutor, las pistas redactadas ' +
            'y la generación de contenido necesitan un modelo local.'
        })
      ),
      linkButton('Abrir Ajustes', '#/ajustes', 'ghost')
    );
    return node;
  }

  function courseFocusSection(primary, detail, courses) {
    const next = nextLesson(detail);
    const totals = courseTotals(detail);
    const total = primary.lessons_total || totals.total;
    const done = primary.lessons_done != null ? primary.lessons_done : totals.done;
    const ratio = typeof primary.progress === 'number' ? primary.progress : total ? done / total : 0;

    const card = el('article', { class: 'course-focus card' });
    const head = el(
      'div',
      { class: 'course-focus-head' },
      ui.trackChip(primary.track, ui.trackMeta(primary.track).label),
      ui.badge(ui.levelLabel(primary.level), 'neutral'),
      el('h3', { class: 'course-focus-title', text: primary.title }),
      el('span', { class: 'course-focus-head-right' }, linkButton('Abrir clase', '#/clase/' + primary.id, 'ghost'))
    );

    const progressRow = el(
      'div',
      { class: 'course-focus-progress' },
      ui.progressBar(ratio, { large: true, label: 'Progreso de ' + primary.title }),
      el('span', {
        class: 'course-focus-pct',
        text: done + ' de ' + total + ' · ' + ui.pct(ratio) + '%'
      })
    );

    const nextRow = el('div', { class: 'course-focus-next' });
    if (next) {
      nextRow.append(
        el('span', { class: 'course-focus-next-icon', html: ui.icon('play', 16) }),
        el(
          'div',
          { class: 'course-focus-next-copy' },
          el('p', { class: 'course-focus-next-label', text: 'Siguiente lección' }),
          el('p', { class: 'course-focus-next-title', text: next.title })
        ),
        el('span', { class: 'course-focus-next-time', text: ui.formatMinutes(next.minutes || 10) }),
        actionLink('Continuar', 'arrowRight', '#/leccion/' + next.id, 'primary', 'btn-sm')
      );
    } else {
      nextRow.append(
        el('span', { class: 'course-focus-next-icon', html: ui.icon('circleCheck', 16) }),
        el(
          'div',
          { class: 'course-focus-next-copy' },
          el('p', { class: 'course-focus-next-label', text: 'Curso completado' }),
          el('p', { class: 'course-focus-next-title', text: 'Puedes repasar cualquier lección.' })
        ),
        actionLink('Ver la clase', 'book', '#/clase/' + primary.id, 'ghost', 'btn-sm')
      );
    }

    card.append(head, progressRow, nextRow);

    const others = courses.filter(function (course) {
      return course.id !== primary.id && course.status !== 'archived';
    });
    const section = el('section', { class: 'section' });
    section.appendChild(sectionHead('Tu curso', 'El plan que estás siguiendo ahora mismo.'));
    section.appendChild(card);

    if (others.length) {
      const list = el('div', { class: 'course-mini-list' });
      others.slice(0, 3).forEach(function (course) {
        const link = el('a', { class: 'course-mini', href: '#/clase/' + course.id });
        link.append(
          ui.trackChip(course.track),
          el('span', { class: 'course-mini-title', text: course.title }),
          ui.progressBar(course.progress || 0, { label: 'Progreso de ' + course.title }),
          el('span', { class: 'course-mini-pct', text: ui.pct(course.progress) + '%' })
        );
        list.appendChild(link);
      });
      section.appendChild(list);
    }

    return section;
  }

  function firstStepsSection() {
    const steps = [
      {
        title: 'Elige un itinerario',
        text: 'Python, Web, JavaScript, SQL o C#. Todos empiezan desde cero.'
      },
      {
        title: 'Crea tu clase',
        text: 'Cuatro pasos y tendrás un plan con módulos, lecciones y laboratorios.'
      },
      {
        title: 'Aprende y practica',
        text: 'Lee, pregunta al tutor y comprueba tus ejercicios con tests reales.'
      }
    ];

    const card = el('article', { class: 'card first-steps' });
    const head = el(
      'div',
      { class: 'first-steps-head' },
      panelHead('sparkles', 'Primeros pasos', 'No hace falta configurar nada para empezar.')
    );
    const list = el('ol', { class: 'step-list' });
    steps.forEach(function (step, index) {
      list.appendChild(
        el(
          'li',
          { class: 'step-item' },
          el('span', { class: 'step-num', text: String(index + 1) }),
          el(
            'div',
            { class: 'step-copy' },
            el('p', { class: 'step-title', text: step.title }),
            el('p', { class: 'step-text', text: step.text })
          )
        )
      );
    });
    const actions = el(
      'div',
      { class: 'first-steps-actions' },
      actionLink('Crear mi clase', 'sparkles', '#/nueva', 'primary'),
      actionButton('Ver itinerarios', 'layers', function () { scrollToId('itinerarios'); }, 'ghost')
    );
    card.append(head, list, actions);

    const section = el('section', { class: 'section' });
    section.appendChild(sectionHead('Tu primera clase', 'Tres pasos y estás dentro.'));
    section.appendChild(card);
    return section;
  }

  function tracksSection(tracks, courses) {
    const section = el('section', { class: 'section', id: 'itinerarios' });
    section.appendChild(
      sectionHead(
        'Itinerarios',
        'Cinco caminos con ejercicios corregidos. Elige el que te llame.',
        actionLink('Nueva clase', 'plus', '#/nueva', 'ghost', 'btn-sm')
      )
    );

    if (!tracks.length) {
      section.appendChild(
        ui.emptyState({
          icon: 'layers',
          title: 'Todavía no hay itinerarios disponibles',
          text: 'Cuando el contenido esté instalado, aquí verás los caminos para empezar.',
          action: emptyAction('Crear una clase a medida', 'sparkles', '#/nueva')
        })
      );
      return section;
    }

    const grid = el('div', { class: 'tracks-grid' });
    tracks.forEach(function (track) {
      const existing = courses.find(function (course) {
        return course.track === track.track && course.status !== 'archived';
      });
      grid.appendChild(trackCard(track, existing));
    });
    section.appendChild(grid);
    return section;
  }

  function trackCard(track, course) {
    const meta = ui.trackMeta(track.track);
    const available = track.available !== false;
    const missingTool = missingToolForTrack(track);
    const missingName = missingTool ? toolShortName(missingTool) : '';
    const node = el('a', {
      class:
        'track-card tone-' +
        meta.tone +
        (!available ? ' is-unavailable' : '') +
        (missingTool ? ' is-requirement' : '')
    });
    node.href = course ? '#/clase/' + course.id : '#/nueva?track=' + encodeURIComponent(track.track);

    const top = el(
      'div',
      { class: 'track-card-top' },
      el('span', { class: 'track-icon', html: ui.icon(meta.icon, 20) }),
      el(
        'div',
        { class: 'track-badges' },
        course ? ui.badge('En curso', 'info') : null,
        missingTool
          ? ui.badge('Falta ' + missingName, 'warn')
          : !available
            ? ui.badge('En preparación', 'warn')
            : null
      )
    );
    const title = el('h3', { class: 'track-title', text: track.title || meta.label });
    const description = el('p', {
      class: 'track-desc',
      text: track.description || 'Un itinerario para aprender paso a paso.'
    });
    const metaRow = el(
      'div',
      { class: 'track-meta' },
      metaItem('book', (track.lessons || 0) + ' ' + ui.plural(track.lessons || 0, 'lección', 'lecciones')),
      metaItem('flask', (track.labs || 0) + ' ' + ui.plural(track.labs || 0, 'laboratorio', 'laboratorios'))
    );
    const foot = el(
      'div',
      { class: 'track-foot' },
      el('span', { class: 'track-level', text: ui.levelLabel(track.level || 'principiante') }),
      el(
        'span',
        { class: 'track-cta' },
        course ? 'Continuar' : missingTool ? 'Requiere ' + missingName : available ? 'Empezar' : 'Próximamente',
        el('span', { class: 'track-arrow', html: ui.icon('arrowRight', 15) })
      )
    );

    node.append(top, title, description, metaRow, foot);
    return node;
  }

  function teacherCard(health) {
    const info = teacherInfo(health);
    const card = el('article', { class: 'card teacher-card' });
    const head = el(
      'div',
      { class: 'teacher-head' },
      el(
        'div',
        { class: 'teacher-title-wrap' },
        el('span', { class: 'teacher-icon', html: ui.icon('sparkles', 18) }),
        el('h2', { class: 'teacher-title', text: 'Profesor' })
      ),
      el('span', { class: 'status-inline' }, teacherDot(info.kind), info.title)
    );

    card.appendChild(head);
    card.appendChild(el('p', { class: 'teacher-detail', text: info.detail }));

    if (info.kind === 'idle') {
      card.appendChild(
        el('p', {
          class: 'teacher-text',
          text:
            'Añade un modelo local para conversar con el tutor, pedir pistas y generar lecciones. ' +
            'Sin él, todo el contenido curado sigue disponible.'
        })
      );
      card.appendChild(actionLink('Configurar profesor', 'settings', '#/ajustes', 'primary', 'btn-sm'));
    } else if (info.kind === 'offline') {
      card.appendChild(
        el('p', {
          class: 'teacher-text',
          text: 'Ollama está configurado pero no responde. Abre Ajustes para probar la conexión.'
        })
      );
      card.appendChild(actionLink('Revisar conexión', 'refresh', '#/ajustes', 'ghost', 'btn-sm'));
    } else if (info.kind === 'online') {
      card.appendChild(
        el('p', {
          class: 'teacher-text',
          text: 'Responde en tu equipo. Nada de tu progreso ni de tus preguntas sale de aquí.'
        })
      );
      card.appendChild(actionLink('Gestionar profesor', 'settings', '#/ajustes', 'ghost', 'btn-sm'));
    } else {
      card.appendChild(
        el('p', {
          class: 'teacher-text',
          text: 'No se pudo consultar el estado del profesor. Abre Ajustes para reintentar.'
        })
      );
      card.appendChild(actionLink('Abrir Ajustes', 'settings', '#/ajustes', 'ghost', 'btn-sm'));
    }

    return card;
  }

  function shortcutsCard() {
    const card = el('article', { class: 'card shortcuts-card' });
    card.appendChild(
      el(
        'div',
        { class: 'shortcuts-head' },
        el('span', { class: 'shortcuts-icon', html: ui.icon('keyboard', 18) }),
        el('h2', { class: 'shortcuts-title', text: 'Atajos' })
      )
    );
    const list = el('ul', { class: 'shortcut-list' });
    [
      { keys: ['g', 'i'], label: 'Ir al inicio' },
      { keys: ['g', 'n'], label: 'Nueva clase' },
      { keys: ['g', 'a'], label: 'Ajustes' },
      { keys: ['?'], label: 'Ver toda la ayuda' }
    ].forEach(function (item) {
      const row = el('li', { class: 'shortcut-row' });
      const keys = el('span', { class: 'shortcut-keys' });
      item.keys.forEach(function (key) {
        keys.appendChild(el('kbd', { class: 'kbd', text: key }));
      });
      row.append(keys, el('span', { class: 'shortcut-label', text: item.label }));
      list.appendChild(row);
    });
    card.appendChild(list);
    card.appendChild(
      actionButton('Ver todos los atajos', 'help', function () {
        if (CC.app && CC.app.openShortcuts) CC.app.openShortcuts();
      }, 'ghost', 'btn-sm')
    );
    return card;
  }

  /* ------------------------------------------------------------------ */
  /* Nueva clase (asistente)                                             */
  /* ------------------------------------------------------------------ */

  function newView(ctx) {
    ctx.setPage({
      title: 'Nueva clase',
      subtitle: 'Diseña un plan a tu medida en cuatro pasos.',
      crumbs: [HOME_CRUMB, { label: 'Nueva clase' }],
      actions: []
    });

    const box = el('div', { class: 'view-inner wizard-page' });
    ctx.root.replaceChildren(box);
    box.appendChild(ui.pageSkeleton());

    const requested = ctx.query.get('track');
    const state = {
      step: 0,
      track: requested || '',
      topic: '',
      level: 'principiante',
      goal: '',
      goalCustom: '',
      pace: '',
      title: '',
      generate: false,
      tracks: [],
      tracksError: null,
      loadingTracks: true,
      health: CC.state.health,
      busy: false,
      error: ''
    };

    let stepError = null;
    let panel = null;
    let submitButton = null;

    (async function load() {
      const results = await Promise.allSettled([api.courses(), api.health(), api.tools()]);
      if (!ctx.alive()) return;
      const coursesResult = results[0];
      const healthResult = results[1];
      const toolsResult = results[2];
      if (coursesResult.status === 'fulfilled') {
        const payload = coursesResult.value || {};
        state.tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
      } else {
        state.tracksError = coursesResult.reason;
      }
      if (healthResult.status === 'fulfilled') state.health = healthResult.value;
      if (toolsResult.status === 'fulfilled') rememberTools(toolsResult.value);
      state.loadingTracks = false;

      if (state.track && state.track !== 'custom' &&
          !state.tracks.some(function (track) { return track.track === state.track; })) {
        state.track = '';
      }
      renderWizard();
    })().catch(function (error) {
      if (!ctx.alive()) return;
      state.loadingTracks = false;
      state.tracksError = error;
      renderWizard();
    });

    function teacherReady() {
      return isTeacherReady(state.health);
    }

    function teacherLabel() {
      const ai = state.health && state.health.ai;
      if (!ai || !ai.configured) return 'Modo lectura';
      if (ai.reachable === false) return 'Sin conexión';
      return ai.model || 'Modelo local';
    }

    function renderWizard() {
      if (!ctx.alive()) return;
      const steps = ['Itinerario', 'Nivel', 'Objetivo', 'Profesor'];
      const step = state.step;

      const root = el('div', { class: 'wizard' });
      const stepper = el('ol', { class: 'wizard-steps', 'aria-label': 'Progreso del asistente' });
      steps.forEach(function (label, index) {
        const stateClass =
          index < step ? 'is-done' : index === step ? 'is-current' : '';
        const item = el(
          'li',
          { class: 'wizard-step ' + stateClass, 'aria-current': index === step ? 'step' : null },
          el(
            'span',
            { class: 'wizard-step-dot' },
            index < step
              ? el('span', { html: ui.icon('check', 14) })
              : el('span', { class: 'wizard-step-num', text: String(index + 1) })
          ),
          el('span', { class: 'wizard-step-label', text: label })
        );
        stepper.appendChild(item);
      });

      panel = el('div', { class: 'card wizard-panel' });
      const stepInfo = {
        title: ['¿Qué quieres aprender?', '¿De dónde partes?', '¿Para qué y a qué ritmo?', 'Profesor y resumen'][step],
        lead: [
          'Elige un itinerario con contenido preparado o cuéntanos tu propio tema.',
          'Así ajustamos la profundidad de las explicaciones y los ejercicios.',
          'Un objetivo claro y un ritmo realista hacen que no lo dejes a medias.',
          'Revisa el plan. Puedes dejar que la IA diseñe la ruta o usar el contenido curado.'
        ][step]
      };

      const head = el(
        'div',
        { class: 'wizard-panel-head' },
        el('p', { class: 'wizard-kicker', text: 'Paso ' + (step + 1) + ' de 4' }),
        el('h2', { class: 'wizard-title', text: stepInfo.title }),
        el('p', { class: 'wizard-lead', text: stepInfo.lead })
      );

      const body = el('div', { class: 'wizard-panel-body' }, stepContent());
      if (state.error) {
        stepError = el(
          'div',
          { class: 'wizard-error', role: 'alert', tabindex: '-1' },
          el('span', { class: 'wizard-error-icon', html: ui.icon('alert', 16) }),
          el('span', { text: state.error })
        );
        body.appendChild(stepError);
      } else {
        stepError = null;
      }

      const footer = el('div', { class: 'wizard-panel-foot' });
      const back = actionButton('Atrás', 'arrowLeft', function () {
        if (state.step > 0) {
          state.step -= 1;
          state.error = '';
          renderWizard();
        }
      }, 'ghost');
      back.disabled = step === 0;
      const label =
        step === 3
          ? state.generate ? 'Diseñar con la IA' : 'Crear clase'
          : 'Continuar';
      submitButton = el(
        'button',
        { type: 'submit', class: 'btn btn-primary', disabled: state.busy },
        el('span', { class: 'btn-icon', html: ui.icon(step === 3 ? 'sparkles' : 'arrowRight', 16) }),
        el('span', { text: state.busy ? 'Creando la clase…' : label })
      );
      footer.append(back, el('span', { class: 'wizard-foot-hint', text: 'Se guarda en tu equipo.' }), submitButton);

      const form = el('form', { class: 'wizard-form', novalidate: true }, head, body, footer);
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        advance();
      });
      panel.appendChild(form);
      root.append(stepper, panel);
      box.replaceChildren(root);
    }

    function optionCard(options) {
      const disabled = Boolean(options.disabled);
      const label = el('label', {
        class:
          'option-card' +
          (options.checked ? ' is-selected' : '') +
          (disabled ? ' is-disabled' : '') +
          (options.requirement ? ' is-requirement' : '')
      });
      const input = el('input', {
        type: 'radio',
        name: options.name,
        value: options.value,
        checked: options.checked,
        disabled: disabled,
        onChange: options.onChange
      });
      label.appendChild(input);

      if (options.icon) {
        label.appendChild(
          el('span', { class: 'option-icon tone-' + (options.tone || 'blue'), html: ui.icon(options.icon, 18) })
        );
      }

      const copy = el(
        'span',
        { class: 'option-copy' },
        el('span', { class: 'option-title', text: options.title }),
        options.badge ? el('span', { class: 'option-badge' }, options.badge) : null,
        options.text ? el('span', { class: 'option-text', text: options.text }) : null,
        options.meta ? el('span', { class: 'option-meta', text: options.meta }) : null
      );
      label.appendChild(copy);
      label.appendChild(
        el('span', {
          class: 'option-check',
          'aria-hidden': 'true',
          html: ui.icon('check', 13)
        })
      );
      return label;
    }

    function stepContent() {
      const wrap = el('div', { class: 'wizard-step-content' });

      if (state.step === 0) {
        if (state.loadingTracks) {
          wrap.appendChild(
            el(
              'div',
              { class: 'option-grid' },
              ui.skeleton('sk-option'),
              ui.skeleton('sk-option'),
              ui.skeleton('sk-option'),
              ui.skeleton('sk-option')
            )
          );
          return wrap;
        }

        if (state.tracksError) {
          wrap.appendChild(
            ui.errorState(state.tracksError, function () {
              state.loadingTracks = true;
              state.tracksError = null;
              renderWizard();
              api.courses().then(function (payload) {
                state.tracks = payload && Array.isArray(payload.tracks) ? payload.tracks : [];
                state.loadingTracks = false;
                if (ctx.alive()) renderWizard();
              }, function (error) {
                state.loadingTracks = false;
                state.tracksError = error;
                if (ctx.alive()) renderWizard();
              });
            }, { title: 'No se pudieron cargar los itinerarios' })
          );
        } else if (state.tracks.length) {
          const grid = el('div', { class: 'option-grid' });
          state.tracks.forEach(function (track) {
            const meta = ui.trackMeta(track.track);
            const missingTool = missingToolForTrack(track);
            grid.appendChild(
              optionCard({
                name: 'track',
                value: track.track,
                checked: state.track === track.track,
                icon: meta.icon,
                tone: meta.tone,
                title: track.title || meta.label,
                text: track.description || '',
                meta:
                  (track.lessons || 0) + ' lecciones · ' + (track.labs || 0) + ' ' +
                  ui.plural(track.labs || 0, 'laboratorio', 'laboratorios') +
                  (missingTool ? ' · Requiere ' + toolShortName(missingTool) : ''),
                badge: missingTool ? ui.badge('Falta ' + toolShortName(missingTool), 'warn') : null,
                requirement: Boolean(missingTool),
                onChange: function () {
                  state.track = track.track;
                  state.error = '';
                  renderWizard();
                }
              })
            );
          });
          wrap.appendChild(grid);

          const selectedTrack = state.tracks.find(function (track) {
            return track.track === state.track;
          });
          const selectedMissingTool = missingToolForTrack(selectedTrack);
          if (selectedMissingTool) wrap.appendChild(trackRequirementBanner(selectedTrack, selectedMissingTool));
        } else {
          wrap.appendChild(
            el('p', {
              class: 'field-hint',
              text: 'No hay itinerarios con contenido instalado. Puedes crear uno a medida.'
            })
          );
        }

        wrap.appendChild(
          optionCard({
            name: 'track',
            value: 'custom',
            checked: state.track === 'custom',
            icon: 'pencil',
            tone: 'violet',
            title: 'Otra cosa',
            text: 'Escribe el tema que quieres aprender y la IA construirá la ruta.',
            meta: 'Necesita profesor para generar el plan',
            onChange: function () {
              state.track = 'custom';
              state.error = '';
              renderWizard();
            }
          })
        );

        if (state.track === 'custom') {
          const field = el(
            'div',
            { class: 'field field-inline' },
            el('label', { class: 'field-label', for: 'wizard-topic', text: '¿Qué quieres aprender?' }),
            el('input', {
              class: 'input',
              id: 'wizard-topic',
              type: 'text',
              maxlength: '120',
              placeholder: 'Por ejemplo: desarrollo de videojuegos con Godot',
              value: state.topic,
              autocomplete: 'off',
              onInput: function (event) { state.topic = event.target.value; }
            }),
            el('p', { class: 'field-hint', text: 'Concreto y en una frase es suficiente.' })
          );
          wrap.appendChild(field);
        }
        return wrap;
      }

      if (state.step === 1) {
        const grid = el('div', { class: 'option-grid option-grid-3' });
        LEVELS.forEach(function (level) {
          grid.appendChild(
            optionCard({
              name: 'level',
              value: level.id,
              checked: state.level === level.id,
              icon: level.id === 'principiante' ? 'sparkles' : level.id === 'intermedio' ? 'layers' : 'graduation',
              tone: level.id === 'avanzado' ? 'violet' : level.id === 'intermedio' ? 'blue' : 'mint',
              title: level.title,
              text: level.text,
              onChange: function () {
                state.level = level.id;
                state.error = '';
              }
            })
          );
        });
        wrap.appendChild(grid);
        wrap.appendChild(
          el('p', {
            class: 'field-hint',
            text: 'Puedes cambiarlo después: las lecciones se adaptan a tu ritmo.'
          })
        );
        return wrap;
      }

      if (state.step === 2) {
        wrap.appendChild(el('h3', { class: 'wizard-subtitle', text: 'Tu objetivo' }));
        const goals = el('div', { class: 'choice-grid' });
        GOALS.forEach(function (goal) {
          const selected = goal.id === 'custom' ? state.goal === 'custom' : state.goal === goal.id;
          const button = el(
            'button',
            {
              type: 'button',
              class: 'choice-card' + (selected ? ' is-selected' : ''),
              'aria-pressed': selected ? 'true' : 'false',
              onClick: function () {
                state.goal = goal.id;
                state.error = '';
                renderWizard();
              }
            },
            el('span', { class: 'choice-icon', html: ui.icon(goal.icon, 16) }),
            el('span', { text: goal.label })
          );
          goals.appendChild(button);
        });
        wrap.appendChild(goals);

        if (state.goal === 'custom') {
          wrap.appendChild(
            el(
              'div',
              { class: 'field field-inline' },
              el('label', { class: 'field-label', for: 'wizard-goal', text: 'Cuéntanos tu objetivo' }),
              el('input', {
                class: 'input',
                id: 'wizard-goal',
                type: 'text',
                maxlength: '160',
                placeholder: 'Por ejemplo: crear una web para mi negocio',
                value: state.goalCustom,
                autocomplete: 'off',
                onInput: function (event) { state.goalCustom = event.target.value; }
              })
            )
          );
        }

        wrap.appendChild(el('h3', { class: 'wizard-subtitle wizard-subtitle-spaced', text: 'Tu ritmo' }));
        const paces = el('div', { class: 'option-grid option-grid-2' });
        PACES.forEach(function (pace) {
          paces.appendChild(
            optionCard({
              name: 'pace',
              value: pace.id,
              checked: state.pace === pace.id,
              title: pace.title,
              text: pace.text,
              onChange: function () {
                state.pace = pace.id;
                state.error = '';
              }
            })
          );
        });
        wrap.appendChild(paces);
        return wrap;
      }

      const ai = state.health && state.health.ai;
      const ready = teacherReady();
      const status = el(
        'div',
        { class: 'wizard-teacher ' + (ready ? 'is-ready' : 'is-off') },
        el('span', { class: 'wizard-teacher-icon', html: ui.icon(ready ? 'circleCheck' : 'lock', 18) }),
        el(
          'div',
          { class: 'wizard-teacher-copy' },
          el('p', { class: 'wizard-teacher-title', text: ready ? 'Profesor listo' : 'Sin profesor' }),
          el('p', {
            class: 'wizard-teacher-text',
            text: ready
              ? teacherLabel() + ' responderá y redactará el contenido.'
              : 'Puedes crear la clase con el contenido curado. La IA es opcional.'
          })
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-ghost btn-sm',
            onClick: function () {
              api.health().then(function (health) {
                state.health = health;
                if (ctx.alive()) renderWizard();
                ui.toast(teacherReady() ? 'Profesor conectado' : 'No hay profesor disponible.', {
                  variant: teacherReady() ? 'success' : 'warn'
                });
              }, function (error) {
                state.health = null;
                if (ctx.alive()) renderWizard();
                ui.toast(error.message || 'No se pudo comprobar el profesor.', { variant: 'error' });
              });
            }
          },
          el('span', { class: 'btn-icon', html: ui.icon('refresh', 14) }),
          'Comprobar'
        )
      );
      wrap.appendChild(status);

      const checkRow = el('label', { class: 'check-row' });
      const generateInput = el('input', {
        type: 'checkbox',
        checked: state.generate,
        disabled: !ready,
        onChange: function (event) { state.generate = event.target.checked; }
      });
      checkRow.append(
        generateInput,
        el(
          'span',
          { class: 'check-copy' },
          el('span', { class: 'check-title', text: 'Dejar que la IA diseñe la ruta' }),
          el('span', {
            class: 'check-text',
            text: ready
              ? 'Propondrá módulos y lecciones según tu nivel, objetivo y ritmo.'
              : 'Necesitas un profesor para usar esta opción. El contenido curado funciona igual.'
          })
        )
      );
      wrap.appendChild(checkRow);

      if (!ready) {
        wrap.appendChild(
          el(
            'p',
            { class: 'field-hint' },
            'Configura el profesor en ',
            el('a', { href: '#/ajustes', class: 'inline-link', text: 'Ajustes' }),
            '.'
          )
        );
      }

      const titleField = el(
        'div',
        { class: 'field field-inline' },
        el('label', { class: 'field-label', for: 'wizard-title', text: 'Título de la clase (opcional)' }),
        el('input', {
          class: 'input',
          id: 'wizard-title',
          type: 'text',
          maxlength: '120',
          placeholder: defaultTitle(),
          value: state.title,
          autocomplete: 'off',
          onInput: function (event) { state.title = event.target.value; }
        })
      );
      wrap.appendChild(titleField);

      const summary = el('div', { class: 'summary' });
      summary.appendChild(el('h3', { class: 'wizard-subtitle', text: 'Resumen' }));
      const list = el('dl', { class: 'summary-list' });
      const rows = [
        {
          label: 'Itinerario',
          value: itineraryLabel(),
          step: 0
        },
        { label: 'Nivel', value: ui.levelLabel(state.level), step: 1 },
        { label: 'Objetivo', value: goalLabel(), step: 2 },
        { label: 'Ritmo', value: state.pace || 'Sin definir', step: 2 },
        {
          label: 'Diseño',
          value: state.generate && ready ? 'Ruta diseñada por la IA' : 'Contenido curado',
          step: 3
        }
      ];
      rows.forEach(function (row) {
        const item = el('div', { class: 'summary-row' });
        item.append(
          el('dt', { class: 'summary-label', text: row.label }),
          el('dd', { class: 'summary-value', text: row.value })
        );
        if (row.step !== 3) {
          item.appendChild(
            el('button', {
              type: 'button',
              class: 'link-button summary-edit',
              text: 'Editar',
              onClick: function () {
                state.step = row.step;
                state.error = '';
                renderWizard();
              }
            })
          );
        }
        list.appendChild(item);
      });
      summary.appendChild(list);
      wrap.appendChild(summary);

      if (state.generate && !ready) {
        wrap.appendChild(
          el(
            'div',
            { class: 'banner banner-warn' },
            el('span', { class: 'banner-icon', html: ui.icon('alert', 18) }),
            el(
              'div',
              { class: 'banner-copy' },
              el('p', { class: 'banner-title', text: 'La IA no está disponible' }),
              el('p', {
                class: 'banner-text',
                text: 'Desmarca la opción o configura un profesor para continuar.'
              })
            )
          )
        );
      }

      return wrap;
    }

    function defaultTitle() {
      const track = state.tracks.find(function (item) { return item.track === state.track; });
      if (track) return 'Mi curso de ' + (track.title || ui.trackMeta(track.track).label);
      return 'Mi curso a medida';
    }

    function itineraryLabel() {
      if (state.track === 'custom') {
        return state.topic.trim() ? 'A medida: ' + state.topic.trim() : 'A medida';
      }
      const track = state.tracks.find(function (item) { return item.track === state.track; });
      return track ? track.title || ui.trackMeta(track.track).label : 'Sin elegir';
    }

    function goalLabel() {
      if (state.goal === 'custom') return state.goalCustom.trim() || 'Otro objetivo';
      return state.goal || 'Sin definir';
    }

    function validate() {
      if (state.step === 0) {
        if (!state.track) return 'Elige un itinerario para continuar.';
        if (state.track === 'custom' && state.topic.trim().length < 3) {
          return 'Escribe el tema que quieres aprender (al menos 3 caracteres).';
        }
      }
      if (state.step === 1 && !state.level) {
        return 'Elige tu punto de partida.';
      }
      if (state.step === 2) {
        if (!state.goal) return 'Elige un objetivo.';
        if (state.goal === 'custom' && !state.goalCustom.trim()) {
          return 'Escribe tu objetivo en una frase.';
        }
        if (!state.pace) return 'Elige un ritmo de estudio.';
      }
      if (state.step === 3) {
        if (state.track === 'custom' && state.topic.trim().length < 3) {
          return 'El tema del curso no puede estar vacío.';
        }
        if (state.generate && !teacherReady()) {
          return 'Para diseñar la ruta con IA necesitas un profesor configurado.';
        }
      }
      return '';
    }

    function showError(message) {
      state.error = message;
      renderWizard();
      if (stepError) {
        stepError.focus();
        stepError.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }

    function advance() {
      if (state.busy) return;
      const message = validate();
      if (message) {
        showError(message);
        return;
      }
      state.error = '';
      if (state.step < 3) {
        state.step += 1;
        renderWizard();
        return;
      }
      create();
    }

    function create() {
      state.busy = true;
      if (submitButton) ui.busy(submitButton, true, 'Creando la clase…');
      const payload = {
        track: state.track === 'custom' ? 'custom' : state.track,
        level: state.level,
        goal: state.goal === 'custom' ? state.goalCustom.trim() : state.goal,
        pace: state.pace,
        generate: Boolean(state.generate),
        title: state.title.trim(),
        topic: state.track === 'custom' ? state.topic.trim() : ''
      };

      api.createCourse(payload).then(
        function (response) {
          if (!ctx.alive()) return;
          const course = response && response.course;
          if (!course || course.id == null) {
            throw new Error('La clase se creó, pero la respuesta no incluyó su identificador.');
          }
          ui.toast(
            response.generated
              ? 'La IA ha diseñado tu ruta. Abriendo la clase…'
              : 'Tu clase está lista. Abriendo la clase…',
            { variant: 'success' }
          );
          ctx.navigate('#/clase/' + course.id);
        },
        function (error) {
          state.busy = false;
          if (submitButton) ui.busy(submitButton, false);
          if (!ctx.alive()) return;
          let message = error.message || 'No se pudo crear la clase.';
          if (error.status === 503) {
            message =
              'Se pidió generar con IA, pero no hay profesor disponible. Configúralo en Ajustes ' +
              'o desmarca la opción de diseño automático.';
          }
          showError(message);
        }
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /* Clase                                                               */
  /* ------------------------------------------------------------------ */

  function courseView(ctx) {
    const id = ctx.params.id;
    ctx.setPage({
      title: 'Clase',
      subtitle: 'Cargando la ruta…',
      crumbs: [HOME_CRUMB, { label: 'Clase' }],
      actions: []
    });

    const box = el('div', { class: 'view-inner' });
    ctx.root.replaceChildren(box);
    box.appendChild(detailSkeleton());

    api.course(id).then(
      function (data) {
        if (!ctx.alive()) return;
        box.replaceChildren(renderCourse(data, ctx));
      },
      function (error) {
        if (!ctx.alive()) return;
        pageError(ctx, error);
      }
    );
  }

  function renderCourse(data, ctx) {
    const course = data.course || {};
    const modules = Array.isArray(data.modules) ? data.modules : [];
    const labs = Array.isArray(data.labs) ? data.labs : [];
    const totals = courseTotals(data);
    const ratio = totals.total ? totals.done / totals.total : 0;
    const next = nextLesson(data);
    const fallback = firstLesson(data);
    const target = next || fallback;

    const optionsButton = iconButton('more', 'Opciones del curso', function () {
      openCourseOptions(course, ctx);
    });

    const actions = [];
    if (target) {
      actions.push(
        actionLink(
          next ? 'Continuar' : 'Repasar',
          next ? 'play' : 'book',
          '#/leccion/' + target.id,
          'primary'
        )
      );
    }
    actions.push(optionsButton);

    ctx.setPage({
      title: course.title || 'Clase',
      subtitle:
        ui.trackMeta(course.track).label + ' · ' + ui.levelLabel(course.level || 'principiante') +
        ' · ' + totals.done + ' de ' + totals.total + ' lecciones',
      crumbs: [HOME_CRUMB, { label: course.title || 'Clase' }],
      actions: actions
    });

    const wrap = el('div', { class: 'view-inner' });

    const overview = el('section', { class: 'card course-overview' });
    const overviewMain = el('div', { class: 'course-overview-main' });
    const badges = el(
      'div',
      { class: 'course-badges' },
      ui.trackChip(course.track),
      ui.badge(ui.levelLabel(course.level || 'principiante'), 'neutral'),
      ui.badge(ui.statusLabel(course.status || 'active'), ui.statusVariant(course.status))
    );
    const lede = el('p', {
      class: 'course-lede',
      text:
        totals.total + ' ' + ui.plural(totals.total, 'lección', 'lecciones') + ' en ' +
        modules.length + ' ' + ui.plural(modules.length, 'módulo', 'módulos') +
        (labs.length ? ' y ' + labs.length + ' ' + ui.plural(labs.length, 'laboratorio', 'laboratorios') : '') +
        '. ' + (totals.done === totals.total && totals.total
          ? 'Has completado todo el recorrido.'
          : 'Avanzas al ' + ui.pct(ratio) + ' %.')
    });

    const metricRow = el('div', { class: 'course-metrics' });
    [
      { icon: 'book', value: String(totals.total), label: 'Lecciones' },
      { icon: 'layers', value: String(modules.length), label: 'Módulos' },
      { icon: 'flask', value: String(labs.length), label: 'Laboratorios' },
      { icon: 'clock', value: ui.formatMinutes(totalMinutes(data)), label: 'Duración estimada' }
    ].forEach(function (metric) {
      metricRow.appendChild(
        el(
          'div',
          { class: 'course-metric' },
          el('span', { class: 'course-metric-icon', html: ui.icon(metric.icon, 15) }),
          el(
            'div',
            { class: 'course-metric-copy' },
            el('p', { class: 'course-metric-value', text: metric.value }),
            el('p', { class: 'course-metric-label', text: metric.label })
          )
        )
      );
    });

    const progress = el(
      'div',
      { class: 'course-progress' },
      el(
        'div',
        { class: 'course-progress-head' },
        el('span', { text: 'Progreso del curso' }),
        el('span', { class: 'course-progress-value', text: ui.pct(ratio) + '%' })
      ),
      ui.progressBar(ratio, { large: true, label: 'Progreso del curso' })
    );

    const nextRow = el('div', { class: 'course-next' });
    if (next) {
      nextRow.append(
        el('span', { class: 'course-next-icon', html: ui.icon('play', 15) }),
        el(
          'div',
          { class: 'course-next-copy' },
          el('p', { class: 'course-next-label', text: 'Siguiente lección' }),
          el('p', { class: 'course-next-title', text: next.title })
        ),
        actionLink('Continuar', 'arrowRight', '#/leccion/' + next.id, 'primary', 'btn-sm')
      );
    } else if (target) {
      nextRow.append(
        el('span', { class: 'course-next-icon', html: ui.icon('circleCheck', 15) }),
        el(
          'div',
          { class: 'course-next-copy' },
          el('p', { class: 'course-next-label', text: 'Ruta completada' }),
          el('p', { class: 'course-next-title', text: 'Repasa lo que quieras, cuando quieras.' })
        ),
        actionLink('Repasar', 'book', '#/leccion/' + target.id, 'ghost', 'btn-sm')
      );
    }

    overviewMain.append(badges, lede, metricRow, progress, nextRow);
    const overviewAside = el(
      'div',
      { class: 'course-overview-aside' },
      ui.ring(ratio, 132, { stroke: 10, label: 'Progreso del curso' }),
      el('p', {
        class: 'course-ring-caption',
        text: totals.done + ' de ' + totals.total + ' completadas'
      })
    );
    overview.append(overviewMain, overviewAside);
    wrap.appendChild(overview);

    const modulesSection = el('section', { class: 'section' });
    modulesSection.appendChild(
      sectionHead(
        'Ruta de aprendizaje',
        'Abre cada módulo para ver sus lecciones.',
        modules.length
          ? el('span', { class: 'section-meta', text: totals.done + '/' + totals.total + ' lecciones' })
          : null
      )
    );

    if (!modules.length) {
      modulesSection.appendChild(
        ui.emptyState({
          icon: 'layers',
          title: 'Esta clase todavía no tiene módulos',
          text: 'El plan no llegó con contenido. Puedes crear otra clase o volver al inicio.',
          actions: [
            emptyAction('Crear otra clase', 'plus', '#/nueva'),
            { label: 'Volver al inicio', href: '#/inicio', variant: 'ghost' }
          ]
        })
      );
    } else {
      let openIndex = modules.findIndex(function (module) {
        return (module.lessons || []).some(function (lesson) { return lesson.id === (next && next.id); });
      });
      if (openIndex === -1) openIndex = 0;
      const controllers = [];
      modules.forEach(function (module, index) {
        const controller = moduleAccordion(module, index, index === openIndex, controllers, next);
        controllers.push(controller);
        modulesSection.appendChild(controller.el);
      });
    }
    wrap.appendChild(modulesSection);

    if (labs.length) {
      const labsSection = el('section', { class: 'section' });
      labsSection.appendChild(
        sectionHead('Laboratorios', 'Proyectos guiados para aplicar lo aprendido.')
      );
      const list = el('div', { class: 'lab-list' });
      labs.forEach(function (lab) {
        const steps = Number(lab.steps) || 0;
        const done = Number(lab.done) || 0;
        const link = el('a', { class: 'lab-row', href: '#/laboratorio/' + lab.id });
        link.append(
          el('span', { class: 'lab-row-icon', html: ui.icon('flask', 18) }),
          el(
            'div',
            { class: 'lab-row-copy' },
            el('p', { class: 'lab-row-title', text: lab.title }),
            el('p', { class: 'lab-row-meta', text: done + ' de ' + steps + ' pasos completados' })
          ),
          el('div', { class: 'lab-row-progress' }, ui.progressBar(steps ? done / steps : 0, { label: 'Progreso de ' + lab.title })),
          el('span', { class: 'lab-row-pct', text: ui.pct(steps ? done / steps : 0) + '%' }),
          el('span', { class: 'lab-row-arrow', html: ui.icon('chevronRight', 16) })
        );
        list.appendChild(link);
      });
      labsSection.appendChild(list);
      wrap.appendChild(labsSection);
    }

    return wrap;
  }

  function totalMinutes(detail) {
    let minutes = 0;
    const modules = detail && Array.isArray(detail.modules) ? detail.modules : [];
    modules.forEach(function (module) {
      (module.lessons || []).forEach(function (lesson) {
        minutes += Number(lesson.minutes) || 0;
      });
    });
    return minutes;
  }

  function moduleAccordion(module, index, open, controllers, next) {
    const panelId = ui.nextId('module');
    const lessons = Array.isArray(module.lessons) ? module.lessons : [];
    const done = lessons.filter(function (lesson) { return lesson.status === 'done'; }).length;

    const item = el('article', { class: 'module card' + (open ? ' is-open' : '') });
    const head = el('button', {
      type: 'button',
      class: 'module-head',
      'aria-expanded': open ? 'true' : 'false',
      'aria-controls': panelId
    });
    head.append(
      el('span', { class: 'module-index', text: String(index + 1).padStart(2, '0') }),
      el(
        'span',
        { class: 'module-head-copy' },
        el('span', { class: 'module-title', text: module.title || 'Módulo ' + (index + 1) }),
        module.summary ? el('span', { class: 'module-summary', text: module.summary }) : null
      ),
      el(
        'span',
        { class: 'module-meta' },
        el('span', { class: 'module-count', text: done + ' de ' + lessons.length }),
        el('span', { class: 'module-chevron', html: ui.icon('chevronDown', 16) })
      )
    );

    const list = el('div', { class: 'lesson-list' });
    if (!lessons.length) {
      list.appendChild(el('p', { class: 'field-hint module-empty', text: 'Este módulo aún no tiene lecciones.' }));
    } else {
      lessons.forEach(function (lesson) {
        list.appendChild(lessonRow(lesson, next && lesson.id === next.id));
      });
    }

    const panel = el(
      'div',
      { class: 'module-panel', id: panelId, 'aria-hidden': open ? 'false' : 'true' },
      el('div', { class: 'module-panel-inner' }, list)
    );

    function setOpen(value) {
      item.classList.toggle('is-open', value);
      head.setAttribute('aria-expanded', value ? 'true' : 'false');
      panel.setAttribute('aria-hidden', value ? 'false' : 'true');
    }

    head.addEventListener('click', function () {
      const isOpen = item.classList.contains('is-open');
      controllers.forEach(function (controller) { controller.setOpen(false); });
      setOpen(!isOpen);
    });

    item.append(head, panel);
    return { el: item, setOpen: setOpen };
  }

  function lessonRow(lesson, isNext) {
    const status = lesson.status === 'done' ? 'done' : isNext ? 'next' : 'pending';
    const link = el('a', {
      class: 'lesson-row status-' + status + (isNext ? ' is-next' : ''),
      href: '#/leccion/' + lesson.id
    });

    const iconName = status === 'done' ? 'circleCheck' : status === 'next' ? 'play' : 'circle';
    link.appendChild(
      el('span', { class: 'lesson-state', 'aria-hidden': 'true', html: ui.icon(iconName, 18) })
    );

    const copy = el('span', { class: 'lesson-copy' });
    const titleRow = el('span', { class: 'lesson-title-row' });
    titleRow.appendChild(el('span', { class: 'lesson-title', text: lesson.title }));
    if (isNext) titleRow.appendChild(ui.badge('Siguiente', 'info'));
    if (lesson.has_content === false) titleRow.appendChild(ui.badge('Por generar', 'neutral'));
    if (lesson.status === 'done') titleRow.appendChild(ui.badge('Completada', 'ok'));
    copy.appendChild(titleRow);
    if (lesson.summary) copy.appendChild(el('span', { class: 'lesson-summary', text: lesson.summary }));

    const right = el(
      'span',
      { class: 'lesson-side' },
      el('span', { class: 'lesson-minutes' }, el('span', { html: ui.icon('clock', 13) }), (lesson.minutes || 10) + ' min'),
      el('span', { class: 'lesson-chevron', html: ui.icon('chevronRight', 15) })
    );

    link.append(copy, right);
    return link;
  }

  function openCourseOptions(course, ctx) {
    const content = el('div', { class: 'stack' });
    content.appendChild(
      el('p', {
        class: 'modal-text',
        text: 'Puedes archivar la clase para quitarla del inicio sin perder el progreso, o eliminarla del todo.'
      })
    );

    const archived = course.status === 'archived';
    const archiveButton = actionButton(
      archived ? 'Reactivar curso' : 'Archivar curso',
      archived ? 'refresh' : 'layers',
      function () {
        ui.busy(archiveButton, true, archived ? 'Reactivando…' : 'Archivando…');
        api.updateCourse(course.id, { status: archived ? 'active' : 'archived' }).then(
          function () {
            dialog.close();
            ui.toast(archived ? 'Curso reactivado' : 'Curso archivado', { variant: 'success' });
            ctx.reload();
          },
          function (error) {
            ui.busy(archiveButton, false);
            ui.toast(error.message || 'No se pudo actualizar el curso.', { variant: 'error' });
          }
        );
      },
      'ghost',
      'btn-block'
    );

    const deleteButton = actionButton(
      'Eliminar curso',
      'trash',
      function () {
        ui.confirm({
          title: 'Eliminar «' + (course.title || 'este curso') + '»',
          message:
            'Se borrarán sus lecciones, intentos y conversaciones guardadas. Esta acción no se puede deshacer.',
          confirmLabel: 'Eliminar curso',
          danger: true
        }).then(function (confirmed) {
          if (!confirmed) return;
          ui.busy(deleteButton, true, 'Eliminando…');
          api.deleteCourse(course.id).then(
            function () {
              dialog.close();
              ui.toast('Curso eliminado', { variant: 'success' });
              ctx.navigate('#/inicio');
            },
            function (error) {
              ui.busy(deleteButton, false);
              ui.toast(error.message || 'No se pudo eliminar el curso.', { variant: 'error' });
            }
          );
        });
      },
      'danger',
      'btn-block'
    );

    content.append(
      el('div', { class: 'modal-actions-col' }, archiveButton),
      el('div', { class: 'danger-zone' }, deleteButton)
    );

    const dialog = ui.modal({
      title: 'Opciones del curso',
      description: 'Tu progreso se guarda en este equipo.',
      content: content,
      actions: [{ label: 'Cerrar', variant: 'ghost' }]
    });
  }

  /* ------------------------------------------------------------------ */
  /* Lección                                                             */
  /* ------------------------------------------------------------------ */

  function lessonView(ctx) {
    const id = ctx.params.id;
    ctx.setPage({
      title: 'Lección',
      subtitle: 'Cargando contenido…',
      crumbs: [HOME_CRUMB, { label: 'Lección' }],
      actions: []
    });

    const box = el('div', { class: 'view-inner' });
    ctx.root.replaceChildren(box);
    box.appendChild(detailSkeleton());

    let chat = null;
    let disposed = false;

    (async function load() {
      const results = await Promise.allSettled([api.lesson(id), api.health()]);
      if (!ctx.alive()) return;
      const lessonResult = results[0];
      const healthResult = results[1];
      if (lessonResult.status === 'rejected') {
        box.replaceChildren();
        box.appendChild(ui.errorState(lessonResult.reason, ctx.reload));
        return;
      }

      const data = lessonResult.value || {};
      const health =
        healthResult.status === 'fulfilled' ? healthResult.value : CC.state.health;

      const wrap = el('div', { class: 'view-inner lesson-layout' });
      const main = el('div', { class: 'lesson-main' });
      const aside = el('aside', { class: 'lesson-aside', 'aria-label': 'Tutor de la lección' });

      const lesson = data.lesson || {};
      const course = data.course || {};
      const module = data.module || {};
      const nav = data.nav || { prev: null, next: null };

      let statusBadge = ui.badge(
        ui.lessonStatusLabel(lesson.status || 'pending'),
        ui.statusVariant(lesson.status)
      );

      const completeButton = actionButton(
        lesson.status === 'done' ? 'Completada' : 'Completar lección',
        lesson.status === 'done' ? 'check' : 'circleCheck',
        handleComplete,
        lesson.status === 'done' ? 'ghost' : 'primary'
      );
      completeButton.disabled = lesson.status === 'done';

      const crumbs = [HOME_CRUMB];
      if (course.id != null) {
        crumbs.push({ label: course.title || 'Clase', href: '#/clase/' + course.id });
      }
      if (module.title) crumbs.push({ label: module.title });
      crumbs.push({ label: lesson.title || 'Lección' });

      ctx.setPage({
        title: lesson.title || 'Lección',
        subtitle: course.title || '',
        crumbs: crumbs,
        actions: [completeButton]
      });

      const meta = el('div', { class: 'lesson-meta' });
      if (course.track) meta.appendChild(ui.trackChip(course.track));
      if (module.title) meta.appendChild(ui.badge(module.title, 'neutral'));
      meta.appendChild(metaItem('clock', ui.formatMinutes(lesson.minutes || 10)));
      meta.appendChild(statusBadge);
      if (lesson.has_content === false) meta.appendChild(ui.badge('Por generar', 'neutral'));
      main.appendChild(meta);

      if (Array.isArray(lesson.objectives) && lesson.objectives.length) {
        const objectives = el('section', { class: 'card objectives-card' });
        objectives.appendChild(
          el(
            'div',
            { class: 'objectives-head' },
            el('span', { class: 'objectives-icon', html: ui.icon('target', 17) }),
            el('h2', { class: 'objectives-title', text: 'En esta lección' })
          )
        );
        const list = el('ul', { class: 'objectives-list' });
        lesson.objectives.forEach(function (objective) {
          list.appendChild(
            el(
              'li',
              { class: 'objectives-item' },
              el('span', { class: 'objectives-check', 'aria-hidden': 'true', html: ui.icon('check', 13) }),
              el('span', { text: String(objective) })
            )
          );
        });
        objectives.appendChild(list);
        main.appendChild(objectives);
      }

      const article = el('article', { class: 'card lesson-content' });
      if (lesson.body_md) {
        const prose = el('div', { class: 'prose', html: md.render(lesson.body_md) });
        md.bind(prose);
        article.appendChild(prose);
      } else {
        article.appendChild(lessonEmpty(lesson, health));
      }
      main.appendChild(article);

      if (Array.isArray(lesson.quiz) && lesson.quiz.length) {
        main.appendChild(buildQuiz(lesson.quiz));
      }

      if (Array.isArray(data.exercises) && data.exercises.length) {
        main.appendChild(exercisesCard(data.exercises));
      }

      let nextTarget = nav.next;
      const nextSlot = el('span', { class: 'lesson-nav-slot' });

      function renderNext() {
        if (nextTarget != null) {
          nextSlot.replaceChildren(
            actionLink('Siguiente', 'arrowRight', '#/leccion/' + nextTarget, 'primary')
          );
        } else {
          nextSlot.replaceChildren(
            actionLink('Volver al curso', 'book', '#/clase/' + course.id, 'primary')
          );
        }
      }
      renderNext();

      const navBar = el('nav', { class: 'lesson-nav', 'aria-label': 'Navegación entre lecciones' });
      if (nav.prev != null) {
        navBar.appendChild(actionLink('Anterior', 'arrowLeft', '#/leccion/' + nav.prev, 'ghost'));
      } else {
        const disabled = actionButton('Anterior', 'arrowLeft', function () {}, 'ghost');
        disabled.disabled = true;
        navBar.appendChild(disabled);
      }
      navBar.appendChild(
        el('a', { class: 'lesson-nav-center', href: '#/clase/' + course.id, text: 'Volver al curso' })
      );
      navBar.appendChild(nextSlot);
      main.appendChild(navBar);

      const chatSlot = el('div', { class: 'tutor-slot' });
      aside.appendChild(chatSlot);

      const progressNote = el('p', { class: 'lesson-progress-note', hidden: true });

      wrap.append(main, aside);
      box.replaceChildren(wrap);

      if (CC.chat) {
        chat = CC.chat.mount(chatSlot, {
          lessonId: lesson.id,
          courseId: course.id,
          health: health,
          resolveHealth: function () {
            return CC.app && CC.app.refreshHealth
              ? CC.app.refreshHealth({ silent: true })
              : api.health();
          }
        });
        if (disposed) chat.destroy();
      }

      function handleComplete() {
        if (lesson.status === 'done' || completeButton.disabled) return;
        ui.busy(completeButton, true, 'Guardando…');
        api.completeLesson(lesson.id).then(
          function (response) {
            lesson.status = 'done';
            const xp = response && response.xp != null ? response.xp : 0;
            statusBadge.textContent = '';
            statusBadge.append(
              el('span', { class: 'badge-dot', 'aria-hidden': 'true' }),
              'Completada'
            );
            statusBadge.className = 'badge badge-ok';

            completeButton.classList.remove('btn-primary');
            completeButton.classList.add('btn-ghost');
            completeButton.disabled = true;
            completeButton.removeAttribute('aria-busy');
            completeButton.innerHTML =
              '<span class="btn-icon">' + ui.icon('check', 16) + '</span><span>Completada</span>';

            if (response && response.next != null) {
              nextTarget = response.next;
              renderNext();
            }
            if (response && typeof response.course_progress === 'number') {
              progressNote.hidden = false;
              progressNote.textContent =
                'Curso al ' + ui.pct(response.course_progress) + ' %. Sigue cuando quieras.';
              main.insertBefore(progressNote, article);
            }
            ui.toast('Lección completada · +' + xp + ' XP', { variant: 'success' });
          },
          function (error) {
            ui.busy(completeButton, false);
            ui.toast(error.message || 'No se pudo completar la lección.', { variant: 'error' });
          }
        );
      }

      /* El chat se monta después de insertar el layout para medir bien su altura. */
    })().catch(function (error) {
      if (ctx.alive()) {
        box.replaceChildren();
        box.appendChild(ui.errorState(error, ctx.reload));
      }
    });

    return function cleanup() {
      disposed = true;
      if (chat) {
        chat.destroy();
        chat = null;
      }
    };
  }

  function lessonEmpty(lesson, health) {
    const ready = isTeacherReady(health);
    const card = el('div', { class: 'lesson-empty' });
    card.appendChild(
      el(
        'div',
        { class: 'lesson-empty-art', 'aria-hidden': 'true' },
        el('span', { html: ui.icon(ready ? 'sparkles' : 'lock', 24) })
      )
    );
    card.appendChild(el('h2', { class: 'lesson-empty-title', text: 'Esta lección aún no tiene contenido' }));
    card.appendChild(
      el('p', {
        class: 'lesson-empty-text',
        text: ready
          ? 'Puedes generarlo ahora con el profesor. Se guardará para no tener que repetirlo.'
          : 'Las lecciones generadas con IA necesitan un profesor local. Mientras tanto, puedes repasar el resto de la ruta.'
      })
    );
    if (ready) {
      const generate = actionButton(
        'Generar con el profesor',
        'sparkles',
        function () {
          ui.busy(generate, true, 'Generando…');
          api.generateLesson(lesson.id).then(
            function () {
              ui.toast('Contenido generado', { variant: 'success' });
              ctx.reload();
            },
            function (error) {
              ui.busy(generate, false);
              ui.toast(error.message || 'No se pudo generar el contenido.', { variant: 'error' });
            }
          );
        },
        'primary'
      );
      card.appendChild(generate);
      card.appendChild(
        el('p', {
          class: 'field-hint',
          text: 'El modelo puede tardar un poco en equipos modestos. La página seguirá respondiendo.'
        })
      );
    } else {
      card.appendChild(actionLink('Configurar profesor', 'settings', '#/ajustes', 'primary'));
    }
    return card;
  }

  function buildQuiz(quiz) {
    const card = el('section', { class: 'card quiz-card' });
    card.appendChild(
      el(
        'div',
        { class: 'quiz-head' },
        el(
          'div',
          {},
          el('h2', { class: 'quiz-head-title', text: 'Comprueba lo aprendido' }),
          el('p', { class: 'quiz-head-sub', text: 'Práctica rápida, sin nota: estos aciertos no afectan a tu progreso.' })
        ),
        el('span', { class: 'quiz-head-icon', html: ui.icon('lightbulb', 18) })
      )
    );

    const answered = quiz.map(function () { return null; });
    const summary = el('p', { class: 'quiz-summary' });

    function updateSummary() {
      const answeredCount = answered.filter(function (value) { return value !== null; }).length;
      const correct = answered.reduce(function (total, value, index) {
        return total + (value !== null && value === Number(quiz[index].answer_index) ? 1 : 0);
      }, 0);
      if (!answeredCount) {
        summary.textContent = quiz.length + ' ' + ui.plural(quiz.length, 'pregunta', 'preguntas') + ' · elige una opción para empezar';
      } else {
        summary.textContent =
          correct + ' de ' + quiz.length + ' correctas · ' + answeredCount + ' respondidas';
      }
    }

    quiz.forEach(function (question, questionIndex) {
      const block = el('div', { class: 'quiz-question' });
      const titleId = ui.nextId('quiz-q');
      block.appendChild(
        el('p', {
          class: 'quiz-count',
          text: 'Pregunta ' + (questionIndex + 1) + ' de ' + quiz.length
        })
      );
      block.appendChild(el('h3', { class: 'quiz-title', id: titleId, text: question.question }));

      const options = el(
        'div',
        { class: 'quiz-options', role: 'group', 'aria-labelledby': titleId }
      );
      const optionButtons = [];
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

      (question.options || []).forEach(function (option, optionIndex) {
        const button = el('button', {
          type: 'button',
          class: 'quiz-option'
        });
        button.append(
          el('span', { class: 'quiz-letter', text: letters[optionIndex] || String(optionIndex + 1) }),
          el('span', { class: 'quiz-option-text', text: String(option) }),
          el('span', { class: 'quiz-option-mark', 'aria-hidden': 'true' })
        );
        button.addEventListener('click', function () {
          if (answered[questionIndex] !== null) return;
          answer(questionIndex, optionIndex);
        });
        options.appendChild(button);
        optionButtons.push(button);
      });
      block.appendChild(options);

      const feedback = el('div', { class: 'quiz-feedback', hidden: true });
      block.appendChild(feedback);

      function answer(questionNumber, optionIndex) {
        answered[questionNumber] = optionIndex;
        const correctIndex = Number(question.answer_index);
        optionButtons.forEach(function (button, index) {
          button.disabled = true;
          if (index === correctIndex) button.classList.add('is-correct');
          if (index === optionIndex && optionIndex !== correctIndex) button.classList.add('is-wrong');
          if (index !== correctIndex && index !== optionIndex) button.classList.add('is-muted');
        });

        const wasCorrect = optionIndex === correctIndex;
        feedback.hidden = false;
        feedback.className = 'quiz-feedback ' + (wasCorrect ? 'is-correct' : 'is-wrong');
        feedback.replaceChildren();
        feedback.append(
          el('span', {
            class: 'quiz-feedback-icon',
            html: ui.icon(wasCorrect ? 'circleCheck' : 'circleX', 17)
          }),
          el(
            'div',
            { class: 'quiz-feedback-copy' },
            el('p', {
              class: 'quiz-feedback-title',
              text: wasCorrect ? 'Respuesta correcta' : 'No es esa opción'
            }),
            !wasCorrect && correctIndex >= 0
              ? el('p', {
                  class: 'quiz-feedback-answer',
                  text:
                    'La correcta es ' + (letters[correctIndex] || String(correctIndex + 1)) + ': ' +
                    String((question.options || [])[correctIndex] || '')
                })
              : null,
            question.explanation
              ? el('p', { class: 'quiz-feedback-text', text: String(question.explanation) })
              : null
          )
        );
        const retry = el('button', {
          type: 'button',
          class: 'link-button quiz-retry',
          text: 'Reintentar pregunta',
          onClick: function () {
            answered[questionNumber] = null;
            feedback.hidden = true;
            optionButtons.forEach(function (button) {
              button.disabled = false;
              button.classList.remove('is-correct', 'is-wrong', 'is-muted');
            });
            updateSummary();
          }
        });
        feedback.appendChild(retry);
        updateSummary();
      }

      card.appendChild(block);
    });

    updateSummary();
    card.appendChild(summary);
    return card;
  }

  function exercisesCard(exercises) {
    const card = el('section', { class: 'card exercises-card' });
    card.appendChild(
      el(
        'div',
        { class: 'exercises-head' },
        el(
          'div',
          {},
          el('h2', { class: 'exercises-title', text: 'Practica lo aprendido' }),
          el('p', { class: 'exercises-sub', text: 'Los tests deciden si el ejercicio está bien resuelto.' })
        ),
        el('span', { class: 'exercises-icon', html: ui.icon('terminal', 18) })
      )
    );

    const list = el('div', { class: 'exercise-list' });
    exercises.forEach(function (exercise) {
      const link = el('a', { class: 'exercise-row', href: '#/ejercicio/' + exercise.id });
      link.append(
        el('span', {
          class: 'exercise-state ' + (exercise.passed ? 'is-pass' : ''),
          html: ui.icon(exercise.passed ? 'circleCheck' : 'terminal', 17)
        }),
        el(
          'span',
          { class: 'exercise-copy' },
          el('span', { class: 'exercise-title', text: exercise.title }),
          el('span', {
            class: 'exercise-meta',
            text:
              ui.kindLabel(exercise.kind) +
              (exercise.attempts ? ' · ' + exercise.attempts + ' ' + ui.plural(exercise.attempts, 'intento', 'intentos') : '')
          })
        ),
        exercise.passed ? ui.badge('Resuelto', 'ok') : ui.badge('Pendiente', 'neutral'),
        el('span', { class: 'exercise-arrow', html: ui.icon('chevronRight', 15) })
      );
      list.appendChild(link);
    });
    card.appendChild(list);
    return card;
  }

  /* ------------------------------------------------------------------ */
  /* Ejercicio                                                           */
  /* ------------------------------------------------------------------ */

  function exerciseView(ctx) {
    const id = ctx.params.id;
    ctx.setPage({
      title: 'Ejercicio',
      subtitle: 'Cargando el enunciado…',
      crumbs: [HOME_CRUMB, { label: 'Ejercicio' }],
      actions: []
    });

    const box = el('div', { class: 'view-inner' });
    ctx.root.replaceChildren(box);
    box.appendChild(detailSkeleton());

    api.exercise(id).then(
      function (data) {
        if (!ctx.alive()) return;
        box.replaceChildren(renderExercise(data, ctx));
      },
      function (error) {
        if (!ctx.alive()) return;
        pageError(ctx, error);
      }
    );
  }

  function renderExercise(data, ctx) {
    const exercise = data.exercise || {};
    const lesson = data.lesson || {};
    const checklistKind = exercise.kind === 'checklist';
    let attempts = Array.isArray(data.attempts) ? data.attempts.slice() : [];
    let solved = Boolean(data.solved);

    const starter = String(exercise.starter_code || '');
    const draftKey = 'cc.draft.exercise.' + exercise.id;
    const storedDraft = ui.readStorage(draftKey);
    let initialCode = storedDraft !== null && storedDraft !== '' ? storedDraft : starter;
    const checklist = Array.isArray(exercise.checklist) ? exercise.checklist : [];
    const checklistState = checklist.map(function () { return false; });

    const actions = [];
    if (lesson.id != null) {
      actions.push(actionLink('Volver a la lección', 'arrowLeft', '#/leccion/' + lesson.id, 'ghost'));
    }

    ctx.setPage({
      title: exercise.title || 'Ejercicio',
      subtitle: lesson.title ? 'Ejercicio de «' + lesson.title + '»' : ui.kindLabel(exercise.kind),
      crumbs: lesson.id != null
        ? [HOME_CRUMB, { label: lesson.title || 'Lección', href: '#/leccion/' + lesson.id }, { label: 'Ejercicio' }]
        : [HOME_CRUMB, { label: 'Ejercicio' }],
      actions: actions
    });

    const wrap = el('div', { class: 'view-inner exercise-page' });
    const grid = el('div', { class: 'exercise-grid' });
    const main = el('div', { class: 'exercise-main' });
    const aside = el('aside', { class: 'exercise-aside', 'aria-label': 'Ayuda del ejercicio' });

    const solvedBadge = ui.badge(solved ? 'Resuelto' : 'Sin resolver', solved ? 'ok' : 'neutral');
    const solvedNote = el(
      'div',
      { class: 'inline-success', hidden: !solved },
      el('span', { class: 'inline-success-icon', html: ui.icon('circleCheck', 16) }),
      el('span', { text: 'Ya has superado este ejercicio. Puedes repetirlo para practicar.' })
    );

    const promptCard = el('section', { class: 'card prompt-card' });
    const promptHead = el(
      'div',
      { class: 'prompt-head' },
      el(
        'div',
        { class: 'prompt-badges' },
        ui.badge(ui.kindLabel(exercise.kind), 'info'),
        exercise.language ? ui.trackChip(exercise.language) : null,
        solvedBadge
      ),
      el('span', { class: 'prompt-head-icon', html: ui.icon('file', 18) })
    );
    const promptProse = el('div', { class: 'prose prompt-prose', html: md.render(exercise.prompt_md || '') });
    md.bind(promptProse);
    promptCard.append(promptHead, promptProse);

    if (Array.isArray(exercise.hints) && exercise.hints.length) {
      promptCard.appendChild(
        el(
          'p',
          { class: 'field-hint prompt-hint' },
          'Hay ' + exercise.hints.length + ' ' + ui.plural(exercise.hints.length, 'pista', 'pistas') +
          ' disponibles en el panel lateral.'
        )
      );
    }
    promptCard.appendChild(solvedNote);
    main.appendChild(promptCard);

    let editor = null;
    let runButton = null;
    let resetButton = null;
    let checkButton = null;
    let checklistProgress = null;
    let checkSlot = null;
    let consoleSlot = null;

    function persistDraft(value) {
      ui.writeStorage(draftKey, value);
    }
    const saveDraft = ui.debounce(persistDraft, 260);

    function currentCode() {
      return editor ? editor.getValue() : '';
    }

    function setOtherActionsDisabled(disabled, except) {
      [runButton, checkButton, resetButton].forEach(function (button) {
        if (button && button !== except) button.disabled = disabled;
      });
    }

    function showConsole(result) {
      consoleSlot.replaceChildren(runConsoleCard(result));
      consoleSlot.hidden = false;
    }

    function showConsoleError(error) {
      consoleSlot.replaceChildren(
        ui.errorState(error, null, { title: 'No se pudo ejecutar el código' })
      );
      consoleSlot.hidden = false;
    }

    function renderResults(result) {
      const passed = Boolean(result.passed);
      const xp = Number(result.xp) || 0;
      const card = el('section', { class: 'card results-card' });
      card.appendChild(
        el(
          'div',
          { class: 'results-head' },
          el(
            'div',
            { class: 'results-title-wrap' },
            el('span', { class: 'results-icon', html: ui.icon('gauge', 17) }),
            el('h2', { class: 'results-title', text: 'Resultado' })
          ),
          ui.badge(passed ? 'Superado' : 'Todavía no', passed ? 'ok' : 'error')
        )
      );

      const banner = el(
        'div',
        { class: 'result-banner ' + (passed ? 'is-ok' : 'is-fail') },
        el('span', { class: 'result-banner-icon', html: ui.icon(passed ? 'trophy' : 'alert', 20) }),
        el(
          'div',
          { class: 'result-banner-copy' },
          el('p', {
            class: 'result-banner-title',
            text: passed ? 'Ejercicio superado' : 'Todavía no pasa'
          }),
          el('p', {
            class: 'result-banner-text',
            text: passed
              ? '+' + xp + ' XP. Puedes revisar la solución o repetirlo cuando quieras.'
              : 'Compara lo esperado con lo obtenido. Si te atascas, pide una pista en el panel lateral.'
          })
        )
      );
      card.appendChild(banner);

      const results = Array.isArray(result.results) ? result.results : [];
      if (results.length) {
        const list = el('div', { class: 'test-list' });
        results.forEach(function (item) { list.appendChild(testResultRow(item)); });
        card.appendChild(list);
      }

      if (typeof result.output === 'string' && result.output.trim()) {
        const details = el('details', { class: 'result-output' });
        details.append(
          el('summary', { text: 'Ver la salida completa' }),
          el('pre', { class: 'result-output-pre', text: result.output })
        );
        card.appendChild(details);
      }

      if (!passed && Array.isArray(exercise.hints) && exercise.hints.length) {
        card.appendChild(
          el('p', {
            class: 'field-hint',
            text: 'Pista disponible en el panel lateral. Los tests no se relajan: busca la salida exacta.'
          })
        );
      }

      return card;
    }

    function pushAttempt(passed) {
      attempts.unshift({
        id: 'local-' + Date.now(),
        passed: passed,
        created_at: new Date().toISOString()
      });
      renderAttempts();
    }

    function markSolved(passed) {
      if (!passed) return;
      solved = true;
      solvedBadge.textContent = '';
      solvedBadge.append(el('span', { class: 'badge-dot', 'aria-hidden': 'true' }), 'Resuelto');
      solvedBadge.className = 'badge badge-ok';
      solvedNote.hidden = false;
    }

    function updateChecklistProgress() {
      if (!checklistProgress) return;
      const marked = checklistState.filter(Boolean).length;
      checklistProgress.textContent =
        marked + ' de ' + checklist.length + ' ' +
        ui.plural(checklist.length, 'elemento marcado', 'elementos marcados');
    }

    function applyCheckResult(result) {
      const passed = Boolean(result.passed);
      markSolved(passed);
      pushAttempt(passed);
      checkSlot.replaceChildren(renderResults(result));
      checkSlot.hidden = false;
      if (passed) {
        ui.toast('Ejercicio superado · +' + (Number(result.xp) || 0) + ' XP', { variant: 'success' });
      } else {
        ui.toast('Todavía no pasa. Revisa el resultado.', { variant: 'warn' });
      }
      ui.scrollIntoViewIfNeeded(checkSlot);
    }

    function checkError(error) {
      checkSlot.replaceChildren(
        ui.errorState(error, null, { title: 'No se pudo comprobar el ejercicio' })
      );
      checkSlot.hidden = false;
    }

    function check() {
      if (checklistKind) {
        runChecklist();
        return;
      }
      if (!editor) return;
      if (checkButton.disabled) return;
      setOtherActionsDisabled(true, checkButton);
      ui.busy(checkButton, true, 'Comprobando…');
      api.checkExercise(exercise.id, { code: editor.getValue() }).then(
        function (result) {
          applyCheckResult(result || {});
        },
        function (error) {
          checkError(error);
          ui.toast(error.message || 'No se pudo comprobar el ejercicio.', { variant: 'error' });
        }
      ).then(function () {
        ui.busy(checkButton, false);
        setOtherActionsDisabled(false, null);
      });
    }

    function runCode() {
      if (!editor || runButton.disabled) return;
      setOtherActionsDisabled(true, runButton);
      ui.busy(runButton, true, 'Ejecutando…');
      api.run({
        language: exercise.language || 'python',
        code: editor.getValue(),
        stdin: ''
      }).then(
        function (result) {
          showConsole(result || {});
        },
        function (error) {
          showConsoleError(error);
          ui.toast(error.message || 'No se pudo ejecutar el código.', { variant: 'error' });
        }
      ).then(function () {
        ui.busy(runButton, false);
        setOtherActionsDisabled(false, null);
      });
    }

    function runChecklist() {
      if (checkButton.disabled) return;
      ui.busy(checkButton, true, 'Comprobando…');
      api.checkExercise(exercise.id, { checks: checklistState.slice() }).then(
        function (result) {
          applyCheckResult(result || {});
        },
        function (error) {
          checkError(error);
          ui.toast(error.message || 'No se pudo comprobar la lista.', { variant: 'error' });
        }
      ).then(function () {
        ui.busy(checkButton, false);
      });
    }

    if (checklistKind) {
      const card = el('section', { class: 'card checklist-card' });
      card.appendChild(
        el(
          'div',
          { class: 'checklist-head' },
          el(
            'div',
            {},
            el('h2', { class: 'checklist-title', text: 'Lista de verificación' }),
            el('p', {
              class: 'checklist-sub',
              text: 'Marca lo que hayas completado. Se comprueba al enviar la lista.'
            })
          ),
          el('span', { class: 'checklist-icon', html: ui.icon('clipboard', 18) })
        )
      );

      if (!checklist.length) {
        card.appendChild(
          el('p', {
            class: 'field-hint',
            text: 'Esta lista no tiene elementos definidos todavía.'
          })
        );
      } else {
        const list = el('ul', { class: 'checklist' });
        checklist.forEach(function (item, index) {
          const text = typeof item === 'string' ? item : String(item && item.text ? item.text : item);
          const label = el('label', { class: 'checklist-item' });
          label.append(
            el('input', {
              type: 'checkbox',
              onChange: function (event) {
                checklistState[index] = event.target.checked;
                updateChecklistProgress();
              }
            }),
            el('span', { class: 'checklist-text', text: text })
          );
          list.appendChild(el('li', {}, label));
        });
        card.appendChild(list);
      }

      checklistProgress = el('p', { class: 'checklist-progress' });
      const foot = el('div', { class: 'checklist-foot' }, checklistProgress);
      checkButton = actionButton('Comprobar lista', 'check', check, 'primary');
      checkButton.disabled = !checklist.length;
      foot.appendChild(checkButton);
      card.appendChild(foot);
      main.appendChild(card);
      updateChecklistProgress();
    } else {
      const editorCard = el('section', { class: 'card editor-card' });
      const editorTabs = ui.tabBar(
        [
          { id: 'code', label: 'Tu solución', icon: 'code' },
          { id: 'starter', label: 'Código inicial', icon: 'file' }
        ],
        { label: 'Vistas del código', initial: 'code', onChange: switchPane }
      );

      resetButton = actionButton('Restablecer', 'rotate', resetCode, 'ghost', 'btn-sm');
      const copyButton = actionButton('Copiar', 'copy', function () {
        ui.copy(currentCode(), 'Código copiado');
      }, 'ghost', 'btn-sm');
      runButton = actionButton('Ejecutar', 'play', runCode, 'ghost', 'btn-sm');
      checkButton = actionButton('Comprobar', 'check', check, 'primary', 'btn-sm');

      const toolbar = el(
        'div',
        { class: 'editor-toolbar' },
        el(
          'div',
          { class: 'editor-toolbar-left' },
          el('span', { class: 'editor-language', text: exercise.language || 'código' })
        ),
        el('div', { class: 'editor-toolbar-actions' }, resetButton, copyButton, runButton, checkButton)
      );

      editor = CC.editor.create({
        value: initialCode,
        language: exercise.language || 'código',
        minHeight: 340,
        ariaLabel: 'Editor de código del ejercicio',
        onChange: function (value) {
          saveDraft(value);
        },
        onRun: runCode
      });

      const starterBody = el('div', { class: 'starter-body' });
      if (starter) {
        starterBody.appendChild(
          el('pre', { class: 'starter-code', text: starter })
        );
        const starterActions = el(
          'div',
          { class: 'starter-actions' },
          actionButton('Usar como base', 'rotate', function () {
            editor.setValue(starter, { silent: true });
            persistDraft(starter);
            switchPane('code');
            ui.toast('Código inicial restaurado', { variant: 'success' });
          }, 'primary', 'btn-sm'),
          actionButton('Copiar', 'copy', function () {
            ui.copy(starter, 'Código inicial copiado');
          }, 'ghost', 'btn-sm')
        );
        starterBody.appendChild(starterActions);
      } else {
        starterBody.appendChild(
          el('p', { class: 'field-hint', text: 'Este ejercicio no incluye código inicial.' })
        );
      }

      const codePane = el('div', { class: 'editor-pane' }, editor.el);
      const starterPane = el('div', { class: 'starter-pane', hidden: true }, starterBody);
      editorCard.append(
        el('div', { class: 'editor-card-head' }, editorTabs.el, toolbar),
        codePane,
        starterPane
      );
      main.appendChild(editorCard);

      consoleSlot = el('div', { class: 'console-slot', hidden: true });
      checkSlot = el('div', { class: 'check-slot', hidden: true });
      main.appendChild(consoleSlot);
      main.appendChild(checkSlot);

      function switchPane(id) {
        codePane.hidden = id !== 'code';
        starterPane.hidden = id !== 'starter';
        if (id === 'code') editor.focus();
      }
    }

    if (checklistKind) {
      checkSlot = el('div', { class: 'check-slot', hidden: true });
      main.appendChild(checkSlot);
    }

    function resetCode() {
      if (!editor) return;
      if (currentCode() === starter) {
        ui.toast('Ya estás usando el código inicial.', { variant: 'info' });
        return;
      }
      ui.confirm({
        title: 'Restablecer el código',
        message: 'Se perderán los cambios que no hayas guardado en tu solución.',
        confirmLabel: 'Restablecer',
        danger: true
      }).then(function (confirmed) {
        if (!confirmed) return;
        editor.setValue(starter, { silent: true });
        ui.removeStorage(draftKey);
        ui.toast('Código restablecido', { variant: 'success' });
      });
    }

    /* Panel de pistas */
    const hintsCard = el('section', { class: 'card hints-card' });
    const hintsCount = el('span', { class: 'hints-count', text: '0 / 3' });
    const hintButton = actionButton('Pedir una pista', 'lightbulb', requestHint, 'ghost', 'btn-sm');
    const hintsList = el('div', { class: 'hints-list' });
    let hintLevel = 0;

    hintsCard.append(
      el(
        'div',
        { class: 'hints-head' },
        el(
          'div',
          { class: 'hints-title-wrap' },
          el('span', { class: 'hints-icon', html: ui.icon('lightbulb', 17) }),
          el('h2', { class: 'hints-title', text: 'Pistas' })
        ),
        hintsCount
      ),
      el('p', {
        class: 'hints-sub',
        text: 'Tres niveles, de una orientación suave a una ayuda más directa.'
      }),
      hintsList,
      hintButton
    );

    function updateHintButton() {
      hintsCount.textContent = hintLevel + ' / 3';
      if (hintLevel >= 3) {
        hintButton.disabled = true;
        hintButton.innerHTML =
          '<span class="btn-icon">' + ui.icon('check', 15) + '</span><span>Has visto todas las pistas</span>';
      } else {
        hintButton.disabled = false;
        hintButton.innerHTML =
          '<span class="btn-icon">' + ui.icon('lightbulb', 15) + '</span><span>' +
          (hintLevel ? 'Siguiente pista' : 'Pedir una pista') + '</span>';
      }
    }

    function addHint(level, text) {
      const item = el('div', { class: 'hint-item' });
      const prose = el('div', { class: 'prose hint-prose', html: md.render(String(text)) });
      md.bind(prose);
      item.append(
        el('span', { class: 'hint-label', text: 'Pista ' + level }),
        prose
      );
      hintsList.appendChild(item);
      hintLevel = Math.max(hintLevel, level);
      updateHintButton();
    }

    function requestHint() {
      if (hintLevel >= 3) return;
      const level = hintLevel + 1;
      hintButton.disabled = true;
      ui.busy(hintButton, true, 'Buscando pista…');
      api.hint(exercise.id, level).then(
        function (response) {
          const text = response && response.text ? String(response.text) : '';
          if (!text.trim()) throw new Error('El profesor no ha devuelto ninguna pista.');
          addHint(level, text);
        },
        function (error) {
          const stored = Array.isArray(exercise.hints) ? exercise.hints[level - 1] : null;
          if (stored) {
            addHint(level, String(stored));
            ui.toast('Mostrando la pista guardada: el profesor no está disponible.', { variant: 'warn' });
          } else {
            ui.toast(error.message || 'No se pudo obtener la pista.', { variant: 'error' });
          }
        }
      ).then(function () {
        ui.busy(hintButton, false);
        updateHintButton();
      });
    }

    updateHintButton();

    /* Intentos */
    const attemptsCard = el('section', { class: 'card attempts-card' });
    const attemptsList = el('div', { class: 'attempts-list' });
    attemptsCard.append(
      el(
        'div',
        { class: 'attempts-head' },
        el(
          'div',
          { class: 'attempts-title-wrap' },
          el('span', { class: 'attempts-icon', html: ui.icon('clock', 17) }),
          el('h2', { class: 'attempts-title', text: 'Intentos' })
        ),
        el('span', { class: 'attempts-count', text: String(attempts.length) })
      ),
      attemptsList
    );

    function renderAttempts() {
      attemptsList.replaceChildren();
      const count = attemptsCard.querySelector('.attempts-count');
      if (count) count.textContent = String(attempts.length);
      if (!attempts.length) {
        attemptsList.appendChild(
          el('p', { class: 'field-hint', text: 'Todavía no has comprobado este ejercicio.' })
        );
        return;
      }
      attempts.slice(0, 12).forEach(function (attempt) {
        const row = el('div', { class: 'attempt-row' });
        row.append(
          el('span', {
            class: 'attempt-state ' + (attempt.passed ? 'is-pass' : 'is-fail'),
            html: ui.icon(attempt.passed ? 'circleCheck' : 'circleX', 15)
          }),
          el(
            'span',
            { class: 'attempt-copy' },
            el('span', { class: 'attempt-label', text: attempt.passed ? 'Aprobado' : 'Con errores' }),
            el('span', {
              class: 'attempt-date',
              text: attempt.created_at ? ui.formatDateTime(attempt.created_at) : 'Ahora mismo'
            })
          )
        );
        attemptsList.appendChild(row);
      });
      if (attempts.length > 12) {
        attemptsList.appendChild(
          el('p', { class: 'field-hint', text: 'Mostrando los 12 intentos más recientes.' })
        );
      }
    }

    renderAttempts();
    aside.append(hintsCard, attemptsCard);
    grid.append(main, aside);
    wrap.appendChild(grid);
    return wrap;
  }

  /* ------------------------------------------------------------------ */
  /* Componentes de resultados y salida                                  */
  /* ------------------------------------------------------------------ */

  function testValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  function testResultRow(result) {
    const passed = Boolean(result.passed);
    const row = el('div', { class: 'test-row ' + (passed ? 'is-pass' : 'is-fail') });
    const head = el(
      'div',
      { class: 'test-head' },
      el('span', {
        class: 'test-state',
        html: ui.icon(passed ? 'circleCheck' : 'circleX', 17)
      }),
      el('span', { class: 'test-name', text: result.name || 'Comprobación' }),
      ui.badge(passed ? 'Correcto' : 'Revisar', passed ? 'ok' : 'error')
    );
    row.appendChild(head);

    const expected = testValue(result.expected);
    const actual = testValue(result.actual);
    if (expected !== null || actual !== null) {
      if (passed) {
        row.appendChild(
          el(
            'p',
            { class: 'test-io-line' },
            el('span', { class: 'test-io-label', text: 'Esperado' }),
            el('code', { class: 'test-io-value', text: expected === null ? '—' : expected }),
            el('span', { class: 'test-io-sep', text: '·' }),
            el('span', { class: 'test-io-label', text: 'Obtenido' }),
            el('code', { class: 'test-io-value', text: actual === null ? '—' : actual })
          )
        );
      } else {
        const grid = el('div', { class: 'test-diff' });
        grid.append(
          el(
            'div',
            { class: 'test-diff-box' },
            el('p', { class: 'test-diff-label', text: 'Esperado' }),
            el('pre', { class: 'test-diff-value', text: expected === null ? '—' : expected })
          ),
          el(
            'div',
            { class: 'test-diff-box' },
            el('p', { class: 'test-diff-label', text: 'Obtenido' }),
            el('pre', { class: 'test-diff-value', text: actual === null ? '—' : actual })
          )
        );
        row.appendChild(grid);
      }
    }
    if (result.message) {
      row.appendChild(el('p', { class: 'test-message', text: String(result.message) }));
    }
    return row;
  }

  function runConsoleCard(result) {
    const card = el('section', { class: 'card console-card' });
    const exitCode = Number(result.exit_code);
    const badges = el('div', { class: 'console-badges' });
    if (result.timed_out) badges.appendChild(ui.badge('Tiempo agotado', 'warn'));
    if (isFinite(exitCode) && result.exit_code != null) {
      badges.appendChild(
        ui.badge(exitCode === 0 ? 'Salida correcta' : 'Código ' + exitCode, exitCode === 0 ? 'ok' : 'error')
      );
    }
    if (result.duration_ms != null) {
      badges.appendChild(ui.badge(ui.formatNumber(result.duration_ms) + ' ms', 'neutral'));
    }

    const stdout = String(result.stdout || '');
    const stderr = String(result.stderr || '');
    const body = el('div', { class: 'console-body' });
    if (!stdout && !stderr) {
      body.appendChild(
        el('p', { class: 'console-empty', text: 'El programa no escribió nada en la salida.' })
      );
    } else {
      if (stdout) body.appendChild(el('pre', { class: 'console-output', text: stdout }));
      if (stderr) {
        body.appendChild(
          el(
            'div',
            { class: 'console-stderr' },
            el('p', { class: 'console-label', text: 'Errores' }),
            el('pre', { class: 'console-output is-error', text: stderr })
          )
        );
      }
    }

    card.append(
      el(
        'div',
        { class: 'console-head' },
        el(
          'div',
          { class: 'console-title-wrap' },
          el('span', { class: 'console-icon', html: ui.icon('terminal', 16) }),
          el('h2', { class: 'console-title', text: 'Salida' })
        ),
        badges
      ),
      body
    );
    return card;
  }

  /* ------------------------------------------------------------------ */
  /* Laboratorios                                                        */
  /* ------------------------------------------------------------------ */

  function labsView(ctx) {
    ctx.setPage({
      title: 'Laboratorios',
      subtitle: 'Proyectos guiados con pasos y comprobaciones.',
      crumbs: [HOME_CRUMB, { label: 'Laboratorios' }],
      actions: [actionLink('Nueva clase', 'plus', '#/nueva', 'ghost')]
    });

    const box = el('div', { class: 'view-inner' });
    ctx.root.replaceChildren(box);
    box.appendChild(ui.pageSkeleton());

    api.labs().then(
      function (data) {
        if (!ctx.alive()) return;
        const labs = data && Array.isArray(data.labs) ? data.labs : [];
        const wrap = el('div', { class: 'view-inner' });
        if (!labs.length) {
          wrap.appendChild(
            ui.emptyState({
              icon: 'flask',
              title: 'Todavía no hay laboratorios',
              text:
                'Los laboratorios llegan con las clases que incluyen proyectos guiados. Crea una ' +
                'clase para empezar a construir algo real.',
              actions: [
                emptyAction('Crear una clase', 'sparkles', '#/nueva'),
                { label: 'Volver al inicio', href: '#/inicio', variant: 'ghost' }
              ]
            })
          );
          box.replaceChildren(wrap);
          return;
        }

        wrap.appendChild(
          sectionHead(
            'Proyectos guiados',
            'Cada laboratorio se divide en pasos con su propia comprobación.',
            el('span', { class: 'section-meta', text: labs.length + ' ' + ui.plural(labs.length, 'laboratorio', 'laboratorios') })
          )
        );

        const grid = el('div', { class: 'labs-grid' });
        labs.forEach(function (lab) {
          const steps = Number(lab.steps) || 0;
          const done = Number(lab.done) || 0;
          const ratio = steps ? done / steps : 0;
          const card = el('a', { class: 'lab-card card', href: '#/laboratorio/' + lab.id });
          card.append(
            el(
              'div',
              { class: 'lab-card-top' },
              ui.trackChip(lab.track),
              ui.badge(steps + ' ' + ui.plural(steps, 'paso', 'pasos'), 'neutral')
            ),
            el('h2', { class: 'lab-card-title', text: lab.title }),
            el(
              'div',
              { class: 'lab-card-progress' },
              ui.progressBar(ratio, { label: 'Progreso de ' + lab.title }),
              el('span', { class: 'lab-card-pct', text: ui.pct(ratio) + '%' })
            ),
            el(
              'div',
              { class: 'lab-card-foot' },
              el('span', { class: 'lab-card-meta', text: done + ' de ' + steps + ' pasos completados' }),
              el(
                'span',
                { class: 'lab-card-cta' },
                done ? 'Continuar' : 'Empezar',
                el('span', { class: 'lab-card-arrow', html: ui.icon('arrowRight', 15) })
              )
            )
          );
          grid.appendChild(card);
        });
        wrap.appendChild(grid);
        box.replaceChildren(wrap);
      },
      function (error) {
        if (!ctx.alive()) return;
        pageError(ctx, error);
      }
    );
  }

  function labView(ctx) {
    const id = ctx.params.id;
    ctx.setPage({
      title: 'Laboratorio',
      subtitle: 'Cargando los pasos…',
      crumbs: [HOME_CRUMB, { label: 'Laboratorios', href: '#/labs' }, { label: 'Laboratorio' }],
      actions: [actionLink('Volver a laboratorios', 'arrowLeft', '#/labs', 'ghost')]
    });

    const box = el('div', { class: 'view-inner' });
    ctx.root.replaceChildren(box);
    box.appendChild(detailSkeleton());

    api.lab(id).then(
      function (data) {
        if (!ctx.alive()) return;
        box.replaceChildren(renderLab(data, ctx));
      },
      function (error) {
        if (!ctx.alive()) return;
        pageError(ctx, error);
      }
    );
  }

  function renderLab(data, ctx) {
    const lab = data.lab || {};
    const steps = Array.isArray(data.steps) ? data.steps : [];
    const language = lab.track || 'python';
    const wrap = el('div', { class: 'view-inner lab-page' });

    if (!steps.length) {
      wrap.appendChild(
        ui.emptyState({
          icon: 'flask',
          title: 'Este laboratorio no tiene pasos',
          text: 'Todavía no se ha definido el recorrido. Puedes volver a la lista de laboratorios.',
          action: emptyAction('Ver laboratorios', 'flask', '#/labs')
        })
      );
      return wrap;
    }

    let selected = steps.findIndex(function (step) { return !step.done; });
    if (selected === -1) selected = 0;
    const drafts = steps.map(function (step) { return String(step.starter_code || ''); });
    let checking = false;
    let running = false;

    function doneCount() {
      return steps.filter(function (step) { return step.done; }).length;
    }

    ctx.setPage({
      title: lab.title || 'Laboratorio',
      subtitle: doneCount() + ' de ' + steps.length + ' pasos completados',
      crumbs: [HOME_CRUMB, { label: 'Laboratorios', href: '#/labs' }, { label: lab.title || 'Laboratorio' }],
      actions: [actionLink('Volver a laboratorios', 'arrowLeft', '#/labs', 'ghost')]
    });

    const overview = el('section', { class: 'card lab-overview' });
    const overviewCopy = el('div', { class: 'lab-overview-copy' });
    overviewCopy.appendChild(
      el(
        'div',
        { class: 'lab-overview-badges' },
        ui.trackChip(lab.track),
        ui.badge(steps.length + ' ' + ui.plural(steps.length, 'paso', 'pasos'), 'neutral')
      )
    );
    if (lab.brief_md) {
      const prose = el('div', { class: 'prose lab-brief', html: md.render(lab.brief_md) });
      md.bind(prose);
      overviewCopy.appendChild(prose);
    } else {
      overviewCopy.appendChild(
        el('p', {
          class: 'lab-brief-text',
          text: 'Avanza paso a paso. Cuando tu código pase la comprobación, el paso quedará completado.'
        })
      );
    }

    const progressSlot = el('div', { class: 'lab-overview-progress' });
    const progressText = el('span', { class: 'lab-progress-text' });
    const progressBarSlot = el('div', { class: 'lab-progress-bar' });
    progressSlot.append(
      el(
        'div',
        { class: 'lab-progress-head' },
        el('span', { class: 'lab-progress-label', text: 'Progreso del laboratorio' }),
        progressText
      ),
      progressBarSlot
    );
    overviewCopy.appendChild(progressSlot);

    const ringWrap = el('div', { class: 'lab-overview-ring' });
    const ringSlot = el('div', { class: 'lab-ring-slot' });
    ringWrap.append(ringSlot, el('p', { class: 'lab-ring-caption', text: 'Pasos superados' }));
    overview.append(overviewCopy, ringWrap);
    wrap.appendChild(overview);

    const layout = el('div', { class: 'lab-layout' });
    const stepsCard = el('aside', { class: 'card lab-steps', 'aria-label': 'Pasos del laboratorio' });
    const stepsHead = el(
      'div',
      { class: 'lab-steps-head' },
      el('span', { class: 'lab-steps-icon', html: ui.icon('list', 16) }),
      el('h2', { class: 'lab-steps-title', text: 'Pasos' })
    );
    const stepper = el('ol', { class: 'lab-step-list' });
    const stepButtons = [];
    steps.forEach(function (step, index) {
      const button = el('button', {
        type: 'button',
        class: 'lab-step',
        onClick: function () { selectStep(index); }
      });
      button.append(
        el('span', { class: 'lab-step-index' }),
        el(
          'span',
          { class: 'lab-step-copy' },
          el('span', { class: 'lab-step-title', text: step.title || 'Paso ' + (index + 1) }),
          el('span', { class: 'lab-step-status' })
        )
      );
      stepButtons.push(button);
      stepper.appendChild(button);
    });
    stepsCard.append(stepsHead, stepper);

    const work = el('div', { class: 'lab-work' });
    const stepHead = el('div', { class: 'lab-step-head' });
    const instructionsSlot = el('div', { class: 'lab-instructions-slot' });
    const consoleSlot = el('div', { class: 'console-slot', hidden: true });
    const resultsSlot = el('div', { class: 'check-slot', hidden: true });

    let editor = null;
    let runButton = null;
    let checkButton = null;

    function updateProgress() {
      const ratio = doneCount() / steps.length;
      progressText.textContent = doneCount() + ' de ' + steps.length;
      progressBarSlot.replaceChildren(
        ui.progressBar(ratio, { large: true, label: 'Progreso del laboratorio' })
      );
      ringSlot.replaceChildren(
        ui.ring(ratio, 96, { stroke: 8, label: 'Pasos superados del laboratorio' })
      );
    }

    function syncStepper() {
      steps.forEach(function (step, index) {
        const button = stepButtons[index];
        button.classList.toggle('is-current', index === selected);
        button.classList.toggle('is-done', Boolean(step.done));
        if (index === selected) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');

        const indexEl = button.querySelector('.lab-step-index');
        if (indexEl) {
          indexEl.innerHTML = step.done ? ui.icon('check', 14) : String(index + 1);
        }
        const status = button.querySelector('.lab-step-status');
        if (status) {
          status.textContent = step.done
            ? 'Completado'
            : index === selected
              ? 'En curso'
              : 'Pendiente';
        }
      });
    }

    function renderStep() {
      const step = steps[selected];
      stepHead.replaceChildren(
        el(
          'div',
          { class: 'lab-step-head-copy' },
          el('p', { class: 'lab-step-kicker', text: 'Paso ' + (selected + 1) + ' de ' + steps.length }),
          el('h2', { class: 'lab-step-title-lg', text: step.title || 'Paso ' + (selected + 1) })
        ),
        el(
          'div',
          { class: 'lab-step-head-side' },
          step.done ? ui.badge('Completado', 'ok') : ui.badge(ui.kindLabel(step.kind), 'neutral')
        )
      );

      const instructions = el('section', { class: 'card lab-instructions' });
      instructions.appendChild(
        el(
          'div',
          { class: 'lab-instructions-head' },
          el('span', { class: 'lab-instructions-icon', html: ui.icon('file', 16) }),
          el('h3', { class: 'lab-instructions-title', text: 'Instrucciones' })
        )
      );
      if (step.instructions_md) {
        const prose = el('div', { class: 'prose', html: md.render(step.instructions_md) });
        md.bind(prose);
        instructions.appendChild(prose);
      } else {
        instructions.appendChild(
          el('p', { class: 'field-hint', text: 'Este paso no trae instrucciones escritas.' })
        );
      }
      instructionsSlot.replaceChildren(instructions);

      const languageLabel = editorCard.querySelector('.editor-language');
      if (languageLabel) {
        languageLabel.textContent =
          language + ' · ' + (step.title || 'paso ' + (selected + 1));
      }

      syncStepper();
      updateNav();
    }

    const navBar = el('nav', { class: 'lab-nav', 'aria-label': 'Navegación entre pasos' });
    function updateNav() {
      navBar.replaceChildren();
      const prev = actionButton('Paso anterior', 'arrowLeft', function () {
        selectStep(selected - 1);
      }, 'ghost');
      prev.disabled = selected === 0;
      const next = actionButton('Paso siguiente', 'arrowRight', function () {
        selectStep(selected + 1);
      }, 'ghost');
      next.disabled = selected === steps.length - 1;
      navBar.append(
        prev,
        el('span', { class: 'lab-nav-center', text: selected + 1 + ' / ' + steps.length }),
        next
      );
    }

    const editorCard = el('section', { class: 'card editor-card lab-editor-card' });
    runButton = actionButton('Ejecutar', 'play', run, 'ghost', 'btn-sm');
    checkButton = actionButton('Comprobar paso', 'check', checkpoint, 'primary', 'btn-sm');
    editor = CC.editor.create({
      value: drafts[selected],
      language: language,
      minHeight: 300,
      ariaLabel: 'Editor de código del laboratorio',
      onChange: function (value) { drafts[selected] = value; },
      onRun: run
    });
    editorCard.append(
      el(
        'div',
        { class: 'editor-card-head lab-editor-head' },
        el('span', { class: 'editor-language', text: language + ' · ' + (steps[selected].title || 'paso ' + (selected + 1)) }),
        el('div', { class: 'editor-toolbar-actions' }, runButton, checkButton)
      ),
      editor.el
    );

    work.append(stepHead, instructionsSlot, editorCard, consoleSlot, resultsSlot, navBar);
    layout.append(stepsCard, work);
    wrap.appendChild(layout);

    function selectStep(index) {
      if (checking || running) return;
      if (index < 0 || index >= steps.length || index === selected) return;
      drafts[selected] = editor.getValue();
      selected = index;
      editor.setValue(drafts[selected], { silent: true });
      consoleSlot.hidden = true;
      consoleSlot.replaceChildren();
      resultsSlot.hidden = true;
      resultsSlot.replaceChildren();
      renderStep();
      work.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    function setActionsDisabled(disabled) {
      if (runButton) runButton.disabled = disabled;
      if (checkButton) checkButton.disabled = disabled;
      stepButtons.forEach(function (button) { button.disabled = disabled; });
    }

    function run() {
      if (running) return;
      running = true;
      setActionsDisabled(true);
      ui.busy(runButton, true, 'Ejecutando…');
      api.run({ language: language, code: editor.getValue(), stdin: '' }).then(
        function (result) {
          consoleSlot.replaceChildren(runConsoleCard(result || {}));
          consoleSlot.hidden = false;
        },
        function (error) {
          consoleSlot.replaceChildren(
            ui.errorState(error, null, { title: 'No se pudo ejecutar el código' })
          );
          consoleSlot.hidden = false;
          ui.toast(error.message || 'No se pudo ejecutar el código.', { variant: 'error' });
        }
      ).then(function () {
        running = false;
        ui.busy(runButton, false);
        setActionsDisabled(false);
      });
    }

    function checkpoint() {
      if (checking) return;
      checking = true;
      setActionsDisabled(true);
      ui.busy(checkButton, true, 'Comprobando…');
      const stepIndex = selected;
      const code = editor.getValue();
      api.labCheckpoint(lab.id, { step: stepIndex, code: code }).then(
        function (result) {
          showCheckpoint(result || {}, stepIndex);
        },
        function (error) {
          resultsSlot.replaceChildren(
            ui.errorState(error, null, { title: 'No se pudo comprobar el paso' })
          );
          resultsSlot.hidden = false;
          ui.toast(error.message || 'No se pudo comprobar el paso.', { variant: 'error' });
        }
      ).then(function () {
        checking = false;
        ui.busy(checkButton, false);
        setActionsDisabled(false);
      });
    }

    function showCheckpoint(result, stepIndex) {
      const passed = Boolean(result.passed);
      const xp = Number(result.xp) || 0;
      const card = el('section', { class: 'card results-card' });
      card.appendChild(
        el(
          'div',
          { class: 'results-head' },
          el(
            'div',
            { class: 'results-title-wrap' },
            el('span', { class: 'results-icon', html: ui.icon('gauge', 17) }),
            el('h2', { class: 'results-title', text: 'Comprobación del paso' })
          ),
          ui.badge(passed ? 'Superado' : 'Todavía no', passed ? 'ok' : 'error')
        )
      );

      card.appendChild(
        el(
          'div',
          { class: 'result-banner ' + (passed ? 'is-ok' : 'is-fail') },
          el('span', { class: 'result-banner-icon', html: ui.icon(passed ? 'trophy' : 'alert', 20) }),
          el(
            'div',
            { class: 'result-banner-copy' },
            el('p', {
              class: 'result-banner-title',
              text: passed ? 'Paso completado' : 'El paso aún no pasa'
            }),
            el('p', {
              class: 'result-banner-text',
              text:
                result.message ||
                (passed
                  ? '+' + xp + ' XP. Cuando quieras, sigue con el siguiente paso.'
                  : 'Revisa las instrucciones y la salida esperada de cada comprobación.')
            })
          )
        )
      );

      const rows = Array.isArray(result.results) ? result.results : [];
      if (rows.length) {
        const list = el('div', { class: 'test-list' });
        rows.forEach(function (row) { list.appendChild(testResultRow(row)); });
        card.appendChild(list);
      }

      if (passed) {
        steps[stepIndex].done = true;
        updateProgress();
        syncStepper();
        if (stepIndex < steps.length - 1) {
          card.appendChild(
            actionButton('Ir al siguiente paso', 'arrowRight', function () {
              selectStep(stepIndex + 1);
            }, 'primary')
          );
        } else {
          card.appendChild(
            el('p', {
              class: 'field-hint',
              text: 'Has completado el último paso. Puedes repasar el laboratorio cuando quieras.'
            })
          );
        }
        ui.toast('Paso completado · +' + xp + ' XP', { variant: 'success' });
      } else {
        ui.toast('Todavía no pasa. Revisa el resultado.', { variant: 'warn' });
      }

      resultsSlot.replaceChildren(card);
      resultsSlot.hidden = false;
      ctx.setPage({
        title: lab.title || 'Laboratorio',
        subtitle: doneCount() + ' de ' + steps.length + ' pasos completados',
        crumbs: [HOME_CRUMB, { label: 'Laboratorios', href: '#/labs' }, { label: lab.title || 'Laboratorio' }],
        actions: [actionLink('Volver a laboratorios', 'arrowLeft', '#/labs', 'ghost')]
      });
      ui.scrollIntoViewIfNeeded(card);
    }

    renderStep();
    updateProgress();
    updateNav();
    syncStepper();
    return wrap;
  }

  /* ------------------------------------------------------------------ */
  /* Progreso                                                            */
  /* ------------------------------------------------------------------ */

  function progressView(ctx) {
    ctx.setPage({
      title: 'Progreso',
      subtitle: 'Lo que llevas construido, en números.',
      crumbs: [HOME_CRUMB, { label: 'Progreso' }],
      actions: []
    });

    const box = el('div', { class: 'view-inner' });
    ctx.root.replaceChildren(box);
    box.appendChild(ui.pageSkeleton());

    (async function load() {
      const results = await Promise.allSettled([api.stats(), api.courses()]);
      if (!ctx.alive()) return;
      if (results[0].status === 'rejected' && results[1].status === 'rejected') {
        pageError(ctx, results[0].reason);
        return;
      }
      const stats = results[0].status === 'fulfilled' ? results[0].value : null;
      const coursesPayload = results[1].status === 'fulfilled' ? results[1].value : null;
      const courses = coursesPayload && Array.isArray(coursesPayload.courses)
        ? coursesPayload.courses
        : [];

      const wrap = el('div', { class: 'view-inner' });
      wrap.appendChild(progressMetrics(stats));

      if (results[0].status === 'rejected') {
        wrap.appendChild(
          el(
            'div',
            { class: 'inline-warning' },
            el('span', { class: 'inline-warning-icon', html: ui.icon('alert', 14) }),
            el('span', { text: 'No se pudieron cargar tus estadísticas.' }),
            el('button', { type: 'button', class: 'link-button', text: 'Reintentar', onClick: ctx.reload })
          )
        );
      }

      const chartCard = el('section', { class: 'card chart-card' });
      const week = stats && Array.isArray(stats.week) ? stats.week : [];
      const weekTotal = week.reduce(function (total, day) { return total + (Number(day.xp) || 0); }, 0);
      chartCard.append(
        el(
          'div',
          { class: 'chart-head' },
          el(
            'div',
            {},
            el('h2', { class: 'chart-title', text: 'Actividad de la semana' }),
            el('p', { class: 'chart-sub', text: 'XP ganada cada día con lecciones, ejercicios y laboratorios.' })
          ),
          ui.badge(ui.formatNumber(weekTotal) + ' XP', 'info')
        ),
        weeklyChart(week)
      );
      wrap.appendChild(el('section', { class: 'section' }, chartCard));

      const lower = el('div', { class: 'progress-grid' });
      lower.appendChild(trackProgressCard(stats));
      lower.appendChild(coursesProgressCard(courses));
      wrap.appendChild(lower);
      box.replaceChildren(wrap);
    })().catch(function (error) {
      if (ctx.alive()) pageError(ctx, error);
    });
  }

  function progressMetrics(stats) {
    const items = [
      { icon: 'trophy', tone: 'mint', value: stats ? ui.formatNumber(stats.xp || 0) : '—', label: 'XP acumulada' },
      { icon: 'flame', tone: 'amber', value: stats ? ui.formatNumber(stats.streak || 0) : '—', label: 'Racha de días' },
      { icon: 'book', tone: 'blue', value: stats ? ui.formatNumber(stats.lessons_done || 0) : '—', label: 'Lecciones' },
      { icon: 'target', tone: 'violet', value: stats ? ui.formatNumber(stats.exercises_done || 0) : '—', label: 'Ejercicios' },
      { icon: 'flask', tone: 'rose', value: stats ? ui.formatNumber(stats.labs_done || 0) : '—', label: 'Laboratorios' }
    ];
    const row = el('section', { class: 'stats-row stats-row-5', 'aria-label': 'Métricas de progreso' });
    items.forEach(function (item) {
      row.appendChild(
        el(
          'article',
          { class: 'stat-card' },
          el('span', { class: 'stat-icon tone-' + item.tone, html: ui.icon(item.icon, 18) }),
          el(
            'div',
            { class: 'stat-copy' },
            el('p', { class: 'stat-value', text: item.value }),
            el('p', { class: 'stat-label', text: item.label })
          )
        )
      );
    });
    return row;
  }

  function weeklyChart(week) {
    const items = (Array.isArray(week) ? week : []).slice(-7).map(function (day) {
      return { date: String(day.date || ''), xp: Number(day.xp) || 0 };
    });

    if (!items.length) {
      return el(
        'div',
        { class: 'chart-empty' },
        ui.emptyState({
          compact: true,
          icon: 'chart',
          title: 'Sin actividad esta semana',
          text: 'Completa una lección o un ejercicio para ver aquí tus primeros puntos.'
        })
      );
    }

    const width = 640;
    const height = 240;
    const pad = { top: 20, right: 12, bottom: 38, left: 40 };
    const max = Math.max(10, ...items.map(function (item) { return item.xp; }));
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = height - pad.top - pad.bottom;
    const slot = innerWidth / items.length;
    const barWidth = Math.min(44, slot * 0.52);
    const gradientId = ui.nextId('chart');

    let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" class="chart-svg" role="img" ' +
      'aria-label="XP ganada por día en la última semana">' +
      '<defs><linearGradient id="' + gradientId + '" x1="0" y1="1" x2="0" y2="0">' +
      '<stop offset="0" stop-color="#7c9cff"/><stop offset="1" stop-color="#6ee7b7"/>' +
      '</linearGradient></defs>';

    [0, 0.5, 1].forEach(function (fraction) {
      const y = pad.top + innerHeight * (1 - fraction);
      const value = Math.round(max * fraction);
      svg += '<line class="chart-grid" x1="' + pad.left + '" y1="' + y + '" x2="' +
        (width - pad.right) + '" y2="' + y + '"/>';
      svg += '<text class="chart-axis" x="' + (pad.left - 9) + '" y="' + (y + 4) +
        '" text-anchor="end">' + ui.escapeHtml(ui.formatNumber(value)) + '</text>';
    });

    items.forEach(function (item, index) {
      const ratio = item.xp / max;
      const barHeight = Math.max(item.xp > 0 ? 4 : 2, innerHeight * ratio);
      const x = pad.left + slot * index + (slot - barWidth) / 2;
      const y = pad.top + innerHeight - barHeight;
      svg += '<g class="chart-bar-group">';
      svg += '<rect class="chart-bar-bg" x="' + x + '" y="' + (pad.top + innerHeight - 2) +
        '" width="' + barWidth + '" height="2" rx="1"/>';
      svg += '<rect class="chart-bar" x="' + x + '" y="' + y + '" width="' + barWidth +
        '" height="' + barHeight + '" rx="6" fill="url(#' + gradientId + ')">' +
        '<title>' + ui.escapeHtml(ui.formatWeekday(item.date) + ' ' + ui.formatDayNumber(item.date) +
        ' · ' + ui.formatNumber(item.xp) + ' XP') + '</title></rect>';
      if (item.xp > 0) {
        svg += '<text class="chart-value" x="' + (x + barWidth / 2) + '" y="' + (y - 7) +
          '" text-anchor="middle">' + ui.escapeHtml(ui.formatNumber(item.xp)) + '</text>';
      }
      svg += '<text class="chart-day" x="' + (x + barWidth / 2) + '" y="' + (height - 16) +
        '" text-anchor="middle">' + ui.escapeHtml(ui.formatWeekday(item.date)) + '</text>';
      svg += '<text class="chart-date" x="' + (x + barWidth / 2) + '" y="' + (height - 3) +
        '" text-anchor="middle">' + ui.escapeHtml(ui.formatDayNumber(item.date)) + '</text>';
      svg += '</g>';
    });
    svg += '</svg>';

    const chart = el('div', { class: 'chart' });
    chart.innerHTML = svg;
    const summary = items
      .map(function (item) {
        return ui.formatWeekday(item.date) + ': ' + item.xp + ' XP';
      })
      .join('; ');
    return el(
      'div',
      {},
      chart,
      el('p', { class: 'sr-only', text: 'Actividad semanal. ' + summary + '.' })
    );
  }

  function trackProgressCard(stats) {
    const card = el('section', { class: 'card progress-card' });
    card.appendChild(
      el(
        'div',
        { class: 'progress-card-head' },
        el(
          'div',
          { class: 'progress-card-title-wrap' },
          el('span', { class: 'progress-card-icon', html: ui.icon('layers', 17) }),
          el('h2', { class: 'progress-card-title', text: 'Avance por itinerario' })
        )
      )
    );

    const tracks = stats && Array.isArray(stats.by_track) ? stats.by_track : [];
    if (!tracks.length) {
      card.appendChild(
        el('p', {
          class: 'field-hint',
          text: 'Aún no hay progreso por itinerario. Empieza una lección y aparecerá aquí.'
        })
      );
      return card;
    }

    const list = el('div', { class: 'track-progress-list' });
    tracks.forEach(function (item) {
      const meta = ui.trackMeta(item.track);
      const total = Number(item.lessons_total) || 0;
      const done = Number(item.lessons_done) || 0;
      const ratio = total ? done / total : 0;
      const row = el('div', { class: 'track-progress-row' });
      row.append(
        el('span', { class: 'track-progress-icon tone-' + meta.tone, html: ui.icon(meta.icon, 16) }),
        el(
          'div',
          { class: 'track-progress-copy' },
          el('p', { class: 'track-progress-name', text: meta.label }),
          el('p', { class: 'track-progress-meta', text: done + ' de ' + total + ' lecciones' })
        ),
        el('div', { class: 'track-progress-bar' }, ui.progressBar(ratio, { label: 'Avance en ' + meta.label })),
        el('span', { class: 'track-progress-pct', text: ui.pct(ratio) + '%' })
      );
      list.appendChild(row);
    });
    card.appendChild(list);
    return card;
  }

  function coursesProgressCard(courses) {
    const card = el('section', { class: 'card progress-card' });
    card.appendChild(
      el(
        'div',
        { class: 'progress-card-head' },
        el(
          'div',
          { class: 'progress-card-title-wrap' },
          el('span', { class: 'progress-card-icon', html: ui.icon('book', 17) }),
          el('h2', { class: 'progress-card-title', text: 'Tus clases' })
        ),
        actionLink('Nueva', 'plus', '#/nueva', 'ghost', 'btn-sm')
      )
    );

    if (!courses.length) {
      card.appendChild(
        el('p', {
          class: 'field-hint',
          text: 'Todavía no tienes clases. Crea la primera para empezar a medir tu avance.'
        })
      );
      return card;
    }

    const list = el('div', { class: 'course-progress-list' });
    courses.slice(0, 6).forEach(function (course) {
      const link = el('a', { class: 'course-progress-row', href: '#/clase/' + course.id });
      link.append(
        el(
          'div',
          { class: 'course-progress-copy' },
          el('span', { class: 'course-progress-name', text: course.title }),
          el('span', { class: 'course-progress-meta' }, ui.badge(ui.statusLabel(course.status), ui.statusVariant(course.status)))
        ),
        el('div', { class: 'course-progress-bar' }, ui.progressBar(course.progress || 0, { label: 'Progreso de ' + course.title })),
        el('span', { class: 'course-progress-pct', text: ui.pct(course.progress) + '%' }),
        el('span', { class: 'course-progress-arrow', html: ui.icon('chevronRight', 15) })
      );
      list.appendChild(link);
    });
    card.appendChild(list);
    return card;
  }

  /* ------------------------------------------------------------------ */
  /* Ajustes                                                             */
  /* ------------------------------------------------------------------ */

  const DEFAULT_SETTINGS = {
    'exec.timeout_ms': 5000,
    'exec.max_output_kb': 64,
    'ai.num_ctx': 4096,
    'ui.font_size': 15
  };

  const SETTINGS_TABS = [
    { id: 'profesor', label: 'Profesor', icon: 'sparkles' },
    { id: 'entorno', label: 'Entorno', icon: 'cpu' },
    { id: 'ejecucion', label: 'Ejecución', icon: 'terminal' },
    { id: 'apariencia', label: 'Apariencia', icon: 'sun' },
    { id: 'datos', label: 'Datos', icon: 'shield' },
    { id: 'diagnostico', label: 'Diagnóstico', icon: 'monitor' }
  ];

  function settingsView(ctx) {
    const requestedTab =
      ctx.query && typeof ctx.query.get === 'function' ? ctx.query.get('tab') : '';
    const initialTab = SETTINGS_TABS.some(function (item) {
      return item.id === requestedTab;
    })
      ? requestedTab
      : 'profesor';

    ctx.setPage({
      title: 'Ajustes',
      subtitle: 'Profesor, entorno, ejecución, apariencia y datos.',
      crumbs: [HOME_CRUMB, { label: 'Ajustes' }],
      actions: []
    });

    const box = el('div', { class: 'view-inner' });
    ctx.root.replaceChildren(box);
    box.appendChild(ui.pageSkeleton());

    const state = {
      tab: initialTab,
      loading: true,
      settings: null,
      settingsError: null,
      health: null,
      models: null,
      modelsError: null,
      courses: null,
      coursesError: null,
      system: null,
      systemError: null,
      systemLoading: false,
      importing: null,
      tools: null,
      toolsError: null,
      toolsLoading: false,
      installing: null
    };

    let tabs = null;
    let panel = null;
    let settingsPage = null;

    function setting(key, fallback) {
      const source = state.settings || {};
      if (source[key] !== undefined && source[key] !== null) return source[key];
      if (fallback !== undefined) return fallback;
      return DEFAULT_SETTINGS[key];
    }

    function persist(patch) {
      return api.saveSettings(patch).then(function (response) {
        if (response && response.settings) state.settings = response.settings;
        else state.settings = Object.assign({}, state.settings || {}, patch);
        state.settingsError = null;
        return response;
      });
    }

    function refreshData() {
      const healthPromise = CC.app && CC.app.refreshHealth
        ? CC.app.refreshHealth({ silent: true })
        : api.health();
      return Promise.allSettled([api.models(), healthPromise]).then(function (results) {
        if (results[0].status === 'fulfilled') {
          state.models = results[0].value;
          state.modelsError = null;
        }
        if (results[1].status === 'fulfilled') {
          state.health = results[1].value;
        }
        renderPanel();
      });
    }

    function loadSettingsOnly() {
      api.settings().then(
        function (response) {
          state.settings = response && response.settings ? response.settings : {};
          state.settingsError = null;
          renderPanel();
        },
        function (error) {
          state.settingsError = error;
          renderPanel();
        }
      );
    }

    function loadCourses() {
      api.courses().then(
        function (response) {
          state.courses = response && Array.isArray(response.courses) ? response.courses : [];
          state.coursesError = null;
          renderPanel();
        },
        function (error) {
          state.coursesError = error;
          renderPanel();
        }
      );
    }

    (async function load() {
      const healthPromise = CC.app && CC.app.refreshHealth
        ? CC.app.refreshHealth({ silent: true })
        : api.health();
      const results = await Promise.allSettled([
        api.settings(),
        healthPromise,
        api.models(),
        api.courses()
      ]);
      if (!ctx.alive()) return;

      if (results[0].status === 'fulfilled') {
        const payload = results[0].value || {};
        state.settings = payload.settings || {};
      } else {
        state.settingsError = results[0].reason;
      }
      state.health = results[1].status === 'fulfilled' ? results[1].value : null;

      if (results[2].status === 'fulfilled') state.models = results[2].value;
      else state.modelsError = results[2].reason;

      if (results[3].status === 'fulfilled') {
        const payload = results[3].value || {};
        state.courses = Array.isArray(payload.courses) ? payload.courses : [];
      } else {
        state.coursesError = results[3].reason;
      }

      state.loading = false;
      renderShell();
    })().catch(function (error) {
      if (ctx.alive()) pageError(ctx, error);
    });

    function renderShell() {
      settingsPage = el('div', { class: 'settings-page' });
      const shell = el('div', { class: 'settings-shell' });
      const nav = el('aside', { class: 'settings-nav', 'aria-label': 'Secciones de ajustes' });

      tabs = ui.tabBar(SETTINGS_TABS, {
        vertical: true,
        initial: state.tab,
        label: 'Secciones de ajustes',
        onChange: function (id) {
          state.tab = id;
          renderPanel();
          if (id === 'diagnostico') ensureSystem();
          if (id === 'datos' && state.courses === null && !state.coursesError) loadCourses();
        }
      });
      nav.appendChild(tabs.el);

      const version = state.health && state.health.app ? state.health.app : null;
      nav.appendChild(
        el(
          'div',
          { class: 'settings-nav-foot' },
          el('span', { class: 'settings-version', text: (version && version.name ? version.name : 'Código Cero') }),
          el('span', { class: 'settings-version-num', text: version && version.version ? 'v' + version.version : 'local' }),
          el('p', { class: 'settings-version-note', text: 'Todo se guarda en este equipo.' })
        )
      );

      panel = el('section', { class: 'settings-panel', 'aria-label': 'Contenido de ajustes' });
      shell.append(nav, panel);
      settingsPage.appendChild(shell);
      box.replaceChildren(settingsPage);
      renderPanel();
    }

    function renderPanel() {
      if (!panel) return;
      panel.replaceChildren();
      if (state.settingsError) {
        panel.appendChild(
          el(
            'div',
            { class: 'inline-warning settings-warning' },
            el('span', { class: 'inline-warning-icon', html: ui.icon('alert', 15) }),
            el('span', {
              text: 'No se pudieron cargar los ajustes guardados. Se están usando los valores por defecto.'
            }),
            el('button', {
              type: 'button',
              class: 'link-button',
              text: 'Reintentar',
              onClick: loadSettingsOnly
            })
          )
        );
      }
      panel.appendChild(settingsPanelFor(state.tab));
    }

    function settingsPanelFor(tab) {
      if (tab === 'profesor') return professorPanel();
      if (tab === 'entorno') return environmentPanel();
      if (tab === 'ejecucion') return executionPanel();
      if (tab === 'apariencia') return appearancePanel();
      if (tab === 'datos') return dataPanel();
      return diagnosticsPanel();
    }

    /* Entorno ------------------------------------------------------- */

    function fetchTools(force) {
      if (state.toolsLoading) return;
      state.toolsLoading = true;
      const pending = force ? api.checkTools() : api.tools();
      pending.then(
        function (payload) {
          state.tools = payload && Array.isArray(payload.tools) ? payload : null;
          if (state.tools) {
            rememberTools(state.tools);
          }
          state.toolsError = null;
          state.toolsLoading = false;
          if (state.tab === 'entorno' && panel) renderPanel();
        },
        function (error) {
          state.toolsError = error;
          state.toolsLoading = false;
          if (state.tab === 'entorno' && panel) renderPanel();
        }
      );
    }

    function ensureTools() {
      if (state.tools || state.toolsLoading || state.toolsError) return;
      fetchTools(false);
    }

    function recheckTools() {
      if (state.toolsLoading) return;
      state.toolsError = null;
      fetchTools(true);
      if (state.tab === 'entorno' && panel) renderPanel();
    }

    function environmentPanel() {
      const fragment = document.createDocumentFragment();
      const refreshButton = actionButton('Volver a comprobar', 'refresh', function () {
        recheckTools();
      }, 'ghost', 'btn-sm');
      const installRunning = Boolean(
        state.installing && state.installing.status === 'running'
      );
      refreshButton.disabled = state.toolsLoading || installRunning;
      if (state.toolsLoading) ui.busy(refreshButton, true, 'Comprobando…');

      fragment.appendChild(
        el(
          'div',
          { class: 'panel-head-row' },
          panelHead(
            'cpu',
            'Prepara tu equipo',
            'La app detecta lo que falta en tu equipo y te ayuda a instalarlo.'
          ),
          refreshButton
        )
      );

      if (!state.tools && !state.toolsError && !state.toolsLoading) ensureTools();

      if (state.toolsError && !state.tools) {
        fragment.appendChild(
          ui.errorState(
            state.toolsError,
            function () {
              recheckTools();
            },
            { title: 'No se pudieron detectar las herramientas' }
          )
        );
        return fragment;
      }

      if (!state.tools) {
        const grid = el('div', { class: 'env-grid', 'aria-hidden': 'true' });
        [1, 2, 3, 4].forEach(function () {
          grid.appendChild(ui.skeleton('sk-env'));
        });
        fragment.appendChild(grid);
        return fragment;
      }

      const winget = Boolean(state.tools.winget);
      fragment.appendChild(
        el(
          'div',
          { class: 'env-winget' },
          el(
            'div',
            { class: 'env-winget-state' },
            el('span', { class: 'env-winget-icon', html: ui.icon(winget ? 'circleCheck' : 'alert', 17) }),
            ui.badge(
              winget ? 'winget disponible' : 'winget no disponible: usa la descarga manual',
              winget ? 'ok' : 'warn'
            ),
            el('span', { class: 'env-os', text: state.tools.os || 'Windows' })
          ),
          el('p', {
            class: 'env-winget-text',
            text: winget
              ? 'Puedes instalar las herramientas desde aquí. Windows puede pedir permisos de administrador.'
              : 'Instala cada herramienta con su descarga oficial. Windows puede pedir permisos de administrador.'
          })
        )
      );

      if (state.toolsError) {
        fragment.appendChild(
          el(
            'div',
            { class: 'inline-warning settings-warning' },
            el('span', { class: 'inline-warning-icon', html: ui.icon('alert', 15) }),
            el('span', {
              text: 'No se pudo actualizar la detección. Se muestran los últimos datos conocidos.'
            }),
            el('button', {
              type: 'button',
              class: 'link-button',
              text: 'Reintentar',
              onClick: function () {
                recheckTools();
              }
            })
          )
        );
      }

      if (state.toolsLoading) {
        fragment.appendChild(el('p', { class: 'env-checking' }, ui.spinner('Comprobando herramientas…')));
      }

      if (!state.tools.tools.length) {
        fragment.appendChild(
          ui.emptyState({
            icon: 'cpu',
            title: 'No hay herramientas que detectar',
            text: 'La lista de herramientas está vacía. Vuelve a comprobarla en unos segundos.',
            action: {
              label: 'Volver a comprobar',
              icon: 'refresh',
              variant: 'ghost',
              onClick: function () {
                recheckTools();
              }
            }
          })
        );
        return fragment;
      }

      fragment.appendChild(
        el('p', {
          class: 'env-admin-note',
          text:
            'Aviso: Windows puede pedir permisos de administrador. Acepta el aviso del sistema para ' +
            'completar la instalación.'
        })
      );

      const grid = el('div', { class: 'env-grid' });
      state.tools.tools.forEach(function (tool) {
        grid.appendChild(environmentCard(tool));
      });
      fragment.appendChild(grid);
      return fragment;
    }

    function environmentCard(tool) {
      const installed = tool.installed === true;
      const installing = state.installing && state.installing.id === tool.id ? state.installing : null;
      const running = Boolean(installing && installing.status === 'running');
      const anyRunning = Boolean(state.installing && state.installing.status === 'running');
      const busy = running || state.toolsLoading;
      const version = shortToolVersion(tool);
      const tone = tool.tracks && tool.tracks.length ? ui.trackMeta(tool.tracks[0]).tone : 'blue';

      const card = el('article', {
        class:
          'card tone-' +
          tone +
          ' env-card' +
          (installed ? ' is-installed' : '') +
          (running ? ' is-installing' : '')
      });

      const metaParts = [];
      if (tool.size) metaParts.push(tool.size);
      if (version) metaParts.push('versión ' + version);
      if (tool.detail) metaParts.push(tool.detail);

      const head = el(
        'div',
        { class: 'env-head' },
        el('span', {
          class: 'env-icon',
          html: ui.icon(TOOL_ICONS[tool.id] || 'cpu', 20)
        }),
        el(
          'div',
          { class: 'env-title-wrap' },
          el('h3', { class: 'env-name', text: tool.name }),
          metaParts.length
            ? el('p', {
                class: 'env-meta',
                text: metaParts.join(' · '),
                title: tool.version || null
              })
            : null
        ),
        el(
          'div',
          { class: 'env-badges' },
          installed
            ? ui.badge(version ? 'Instalado v' + version : 'Instalado', 'ok')
            : ui.badge('No instalado', 'warn')
        )
      );
      card.appendChild(head);

      card.appendChild(
        el('p', { class: 'env-why', text: tool.why || 'Una herramienta que amplía lo que puedes hacer.' })
      );

      const tracks = el('div', {
        class: 'env-tracks',
        role: 'group',
        'aria-label': 'Itinerarios que la necesitan'
      });
      (tool.tracks || []).forEach(function (track) {
        tracks.appendChild(ui.trackChip(track));
      });
      if (!tracks.childNodes.length) {
        tracks.appendChild(el('span', { class: 'env-link-note', text: 'No la necesita ningún itinerario' }));
      }
      card.appendChild(tracks);

      const stepsId = 'env-steps-' + tool.id;
      const steps = el('ol', { class: 'env-steps', id: stepsId, hidden: true });
      (tool.steps || []).forEach(function (step) {
        steps.appendChild(el('li', { text: step }));
      });

      const actions = el('div', { class: 'env-actions' });

      if (installed) {
        const checkButton = actionButton('Comprobar de nuevo', 'refresh', function () {
          recheckTools();
        }, 'ghost', 'btn-sm');
        checkButton.setAttribute('aria-label', 'Comprobar de nuevo ' + tool.name);
        checkButton.disabled = busy;
        actions.appendChild(checkButton);
      } else {
        if (state.tools.winget) {
          const installButton = actionButton(
            running ? 'Instalando…' : 'Instalar con winget',
            'download',
            function () {
              startInstall(tool);
            },
            'primary',
            'btn-sm'
          );
          installButton.setAttribute(
            'aria-label',
            running ? 'Instalación de ' + tool.name + ' en curso' : 'Instalar ' + tool.name + ' con winget'
          );
          if (running) {
            installButton.disabled = true;
            installButton.setAttribute('aria-busy', 'true');
            installButton.replaceChildren(
              el('span', { class: 'spinner', 'aria-hidden': 'true' }),
              el('span', { text: 'Instalando…' })
            );
          } else {
            installButton.disabled = busy || anyRunning;
          }
          actions.appendChild(installButton);
        }

        const downloadButton = actionButton('Descargar', 'download', function () {
          openToolLink(tool, 'download');
        }, 'ghost', 'btn-sm');
        downloadButton.setAttribute('aria-label', 'Descargar ' + tool.name);
        downloadButton.disabled = busy;

        const stepsButton = actionButton('Ver pasos', 'list', function () {
          const opened = steps.hidden;
          steps.hidden = !opened;
          stepsButton.setAttribute('aria-expanded', opened ? 'true' : 'false');
        }, 'ghost', 'btn-sm');
        stepsButton.setAttribute('aria-label', 'Ver pasos de instalación de ' + tool.name);
        stepsButton.setAttribute('aria-expanded', 'false');
        stepsButton.setAttribute('aria-controls', stepsId);
        stepsButton.disabled = busy;

        const checkButton = actionButton('Volver a comprobar', 'refresh', function () {
          recheckTools();
        }, 'ghost', 'btn-sm');
        checkButton.setAttribute('aria-label', 'Volver a comprobar ' + tool.name);
        checkButton.disabled = busy;

        actions.append(downloadButton, stepsButton, checkButton);
      }
      card.appendChild(actions);
      card.appendChild(steps);

      if (installing) {
        const statusText =
          installing.status === 'running'
            ? 'Instalando con winget…'
            : installing.status === 'done'
              ? 'Instalación completada'
              : 'La instalación no terminó bien';
        const installBox = el(
          'div',
          { class: 'env-install' },
          el(
            'div',
            { class: 'env-install-head' },
            installing.status === 'running'
              ? ui.spinner(statusText)
              : ui.badge(statusText, installing.status === 'done' ? 'ok' : 'error'),
            el('span', {
              class: 'env-install-hint',
              text: 'Windows puede pedir permisos de administrador.'
            })
          ),
          el('pre', {
            class: 'env-log',
            id: 'env-log-' + tool.id,
            tabindex: '0',
            'aria-label': 'Registro de instalación de ' + tool.name,
            text:
              installing.log ||
              (installing.status === 'running' ? 'Iniciando winget…' : 'Sin salida de winget.')
          })
        );
        card.appendChild(installBox);
      }

      return card;
    }

    function openToolLink(tool, target) {
      api.openTool(tool.id, target).then(
        function () {
          ui.toast('Abriendo la descarga de ' + tool.name + ' en el navegador…', { variant: 'info' });
        },
        function (error) {
          ui.toast(error.message || 'No se pudo abrir el navegador.', { variant: 'error' });
        }
      );
    }

    function stopInstallTimer() {
      if (state.installing && state.installing.timer) {
        global.clearInterval(state.installing.timer);
        state.installing.timer = 0;
      }
    }

    function updateInstallLog(toolId) {
      const log = document.getElementById('env-log-' + toolId);
      if (!log || !state.installing || state.installing.id !== toolId) return;
      log.textContent = state.installing.log || 'Iniciando winget…';
      log.scrollTop = log.scrollHeight;
    }

    function finishInstall(tool) {
      stopInstallTimer();
      const installing = state.installing;
      if (!installing) return;
      if (installing.status === 'installed') installing.status = 'done';
      const ok = installing.status === 'done';
      state.toolsLoading = true;
      if (state.tab === 'entorno' && panel) renderPanel();
      ui.toast(
        ok
          ? tool.name + ' se ha instalado. Revisa que la detección la muestre como disponible.'
          : 'No se pudo instalar ' + tool.name + '. Revisa el registro y prueba la descarga manual.',
        { variant: ok ? 'success' : 'error' }
      );

      api.checkTools().then(
        function (payload) {
          if (!ctx.alive()) return;
          state.tools = payload && Array.isArray(payload.tools) ? payload : state.tools;
          if (state.tools) rememberTools(state.tools);
          state.toolsError = null;
          state.toolsLoading = false;
          if (state.tab === 'entorno' && panel) renderPanel();
        },
        function (error) {
          if (!ctx.alive()) return;
          state.toolsError = error;
          state.toolsLoading = false;
          if (state.tab === 'entorno' && panel) renderPanel();
          ui.toast(error.message || 'No se pudo comprobar la herramienta después de instalar.', {
            variant: 'warn'
          });
        }
      );
    }

    function startInstall(tool) {
      if (state.toolsLoading) return;
      if (!state.tools || !state.tools.winget) {
        ui.toast('winget no está disponible en este equipo. Usa la descarga manual.', {
          variant: 'warn'
        });
        return;
      }
      if (state.installing && state.installing.status === 'running') {
        ui.toast('Ya hay una instalación en curso. Espera a que termine.', { variant: 'warn' });
        return;
      }

      state.installing = {
        id: tool.id,
        name: tool.name,
        status: 'running',
        log: '',
        timer: 0
      };
      if (state.tab === 'entorno' && panel) renderPanel();

      api.installTool(tool.id).then(
        function (response) {
          if (!ctx.alive()) return;
          if (!state.installing || state.installing.id !== tool.id) return;
          if (response && response.log) state.installing.log = response.log;
          if (response && response.started === false) {
            state.installing.status =
              response.status === 'installed' ? 'done' : 'error';
            if (!state.installing.log) {
              state.installing.log =
                response.status === 'installed'
                  ? 'La herramienta ya estaba instalada.'
                  : 'No se pudo iniciar la instalación.';
            }
            finishInstall(tool);
            return;
          }
          updateInstallLog(tool.id);
          startInstallTimer(tool);
        },
        function (error) {
          if (!ctx.alive()) return;
          if (!state.installing || state.installing.id !== tool.id) return;
          state.installing.status = 'error';
          state.installing.log = error.message || 'No se pudo iniciar la instalación.';
          if (state.tab === 'entorno' && panel) renderPanel();
          ui.toast(error.message || 'No se pudo iniciar la instalación.', { variant: 'error' });
        }
      );
    }

    function startInstallTimer(tool) {
      if (!state.installing || state.installing.id !== tool.id) return;
      stopInstallTimer();
      state.installing.timer = global.setInterval(function () {
        if (!state.installing || state.installing.id !== tool.id) {
          stopInstallTimer();
          return;
        }
        api.toolInstall(tool.id).then(
          function (status) {
            if (!state.installing || state.installing.id !== tool.id) {
              stopInstallTimer();
              return;
            }
            if (status && typeof status.log === 'string') state.installing.log = status.log;
            let next = (status && status.status) || 'running';
            if (next === 'idle') {
              next = 'error';
              state.installing.log =
                (state.installing.log ? state.installing.log + '\n' : '') +
                'No se encontró una instalación en curso. Vuelve a intentarlo.';
            }
            state.installing.status = next;
            updateInstallLog(tool.id);
            if (next === 'done' || next === 'error' || next === 'installed') {
              finishInstall(tool);
            }
          },
          function (error) {
            stopInstallTimer();
            if (!state.installing || state.installing.id !== tool.id) return;
            state.installing.status = 'error';
            state.installing.log =
              (state.installing.log ? state.installing.log + '\n' : '') +
              (error.message || 'No se pudo consultar el estado de la instalación.');
            if (state.tab === 'entorno' && panel) renderPanel();
            ui.toast('Se perdió la conexión mientras se instalaba.', { variant: 'error' });
          }
        );
      }, 1500);
    }

    /* Profesor ------------------------------------------------------- */

    function professorPanel() {
      const fragment = document.createDocumentFragment();
      fragment.appendChild(
        panelHead('sparkles', 'Profesor', 'Un modelo local que explica, redacta y acompaña. Opcional.')
      );
      fragment.appendChild(professorStatusCard());
      fragment.appendChild(modelsFolderCard());
      fragment.appendChild(modelsListCard());
      fragment.appendChild(activeModelCard());
      return fragment;
    }

    function ollamaStatus() {
      const source = (state.models && state.models.ollama) || (state.health && state.health.ollama) || null;
      return {
        installed: source ? source.installed !== false : null,
        running: source ? source.running !== false : null,
        known: Boolean(source)
      };
    }

    function professorStatusCard() {
      const ai = state.health && state.health.ai ? state.health.ai : null;
      const configured = Boolean(ai && ai.configured);
      const reachable = !ai || ai.reachable !== false;
      const kind = !configured ? 'idle' : reachable ? 'online' : 'offline';
      const info = teacherInfo(state.health);
      const ollama = ollamaStatus();

      const card = el('section', { class: 'card settings-block professor-status' });
      const head = el(
        'div',
        { class: 'settings-block-head' },
        el(
          'div',
          { class: 'settings-block-title-wrap' },
          teacherDot(kind === 'online' ? 'online' : kind === 'idle' ? 'idle' : 'offline'),
          el(
            'div',
            {},
            el('h3', { class: 'settings-block-title', text: info.title }),
            el('p', { class: 'settings-block-sub', text: info.detail })
          )
        )
      );
      const probe = actionButton('Probar conexión', 'refresh', function () {
        ui.busy(probe, true, 'Comprobando…');
        const request = CC.app && CC.app.refreshHealth
          ? CC.app.refreshHealth({ silent: true })
          : api.health();
        request.then(
          function (health) {
            state.health = health;
            if (health) {
              const stateInfo = teacherInfo(health);
              ui.toast(
                stateInfo.kind === 'online' ? 'El profesor responde.' : 'El servidor responde, pero el profesor no está listo.',
                { variant: stateInfo.kind === 'online' ? 'success' : 'warn' }
              );
            } else {
              ui.toast('No se pudo conectar con el servidor local.', { variant: 'error' });
            }
            renderPanel();
          },
          function (error) {
            ui.toast(error.message || 'No se pudo comprobar el profesor.', { variant: 'error' });
          }
        ).then(function () {
          ui.busy(probe, false);
        });
      }, 'ghost', 'btn-sm');
      head.appendChild(probe);
      card.appendChild(head);

      const badges = el('div', { class: 'status-badges' });
      if (ollama.known) {
        badges.appendChild(
          ui.badge(
            ollama.installed ? 'Ollama instalado' : 'Ollama no instalado',
            ollama.installed ? 'ok' : 'error'
          )
        );
        badges.appendChild(
          ui.badge(
            ollama.running ? 'Servicio en marcha' : 'Servicio detenido',
            ollama.running ? 'ok' : 'warn'
          )
        );
      }
      if (configured && ai.model) {
        badges.appendChild(ui.badge(ai.model, 'info'));
      }
      if (configured && ai.provider) {
        badges.appendChild(ui.badge(ui.capitalize(ai.provider), 'neutral'));
      }
      card.appendChild(badges);

      if (!configured) {
        const steps = el('ol', { class: 'mini-steps' });
        [
          'Copia un archivo .gguf en la carpeta models\\ del proyecto.',
          'Pulsa «Escanear carpeta» aquí abajo.',
          'Importa el archivo a Ollama y elígelo como profesor.'
        ].forEach(function (text) {
          steps.appendChild(el('li', { text: text }));
        });
        card.appendChild(
          el(
            'div',
            { class: 'professor-guide' },
            el('p', {
              class: 'professor-guide-title',
              text: 'Sin profesor también se aprende: lecciones y ejercicios funcionan.'
            }),
            steps
          )
        );
        if (ollama.known && !ollama.installed) {
          card.appendChild(
            el(
              'div',
              { class: 'banner banner-warn' },
              el('span', { class: 'banner-icon', html: ui.icon('info', 18) }),
              el(
                'div',
                { class: 'banner-copy' },
                el('p', { class: 'banner-title', text: 'Ollama no está instalado' }),
                el('p', {
                  class: 'banner-text',
                  text:
                    'Para importar modelos necesitas Ollama en este equipo. Instálalo, arráncalo y vuelve ' +
                    'a probar la conexión.'
                })
              )
            )
          );
        }
      } else if (!reachable) {
        card.appendChild(
          el(
            'div',
            { class: 'banner banner-warn' },
            el('span', { class: 'banner-icon', html: ui.icon('alert', 18) }),
            el(
              'div',
              { class: 'banner-copy' },
              el('p', { class: 'banner-title', text: 'El servicio no responde' }),
              el('p', {
                class: 'banner-text',
                text:
                  'Comprueba que Ollama esté abierto. El resto de la app sigue funcionando sin él.'
              })
            )
          )
        );
      } else {
        card.appendChild(
          el('p', {
            class: 'settings-note',
            text: 'El modelo corre en tu equipo. Tus conversaciones y tu progreso no salen de aquí.'
          })
        );
      }

      return card;
    }

    function modelsFolderCard() {
      const card = el('section', { class: 'card settings-block' });
      const scanButton = actionButton('Escanear carpeta', 'scan', function () {
        ui.busy(scanButton, true, 'Escaneando…');
        api.scanModels().then(
          function (response) {
            state.models = response;
            state.modelsError = null;
            const count = response && Array.isArray(response.files) ? response.files.length : 0;
            ui.toast(
              'Carpeta escaneada: ' + count + ' ' + ui.plural(count, 'archivo', 'archivos') + '.',
              { variant: 'success' }
            );
            renderPanel();
          },
          function (error) {
            ui.toast(error.message || 'No se pudo escanear la carpeta.', { variant: 'error' });
          }
        ).then(function () {
          ui.busy(scanButton, false);
        });
      }, 'ghost', 'btn-sm');
      scanButton.disabled = Boolean(state.importing);

      card.appendChild(
        el(
          'div',
          { class: 'settings-block-head' },
          el(
            'div',
            { class: 'settings-block-title-wrap' },
            el('span', { class: 'settings-block-icon', html: ui.icon('folder', 18) }),
            el(
              'div',
              {},
              el('h3', { class: 'settings-block-title', text: 'Carpeta de modelos' }),
              el('p', { class: 'settings-block-sub', text: 'Archivos GGUF que hay en models\\ listos para importar.' })
            )
          ),
          scanButton
        )
      );

      if (state.modelsError) {
        card.appendChild(
          ui.errorState(state.modelsError, function () {
            refreshData();
          }, { title: 'No se pudo leer la carpeta de modelos' })
        );
        return card;
      }

      const files = state.models && Array.isArray(state.models.files) ? state.models.files : [];
      if (!files.length) {
        card.appendChild(
          ui.emptyState({
            compact: true,
            icon: 'folder',
            title: 'No hay archivos GGUF en models\\',
            text: 'Descarga un modelo pequeño (por ejemplo, Qwen2.5-Coder-3B en Q4_K_M), cópialo en la carpeta y vuelve a escanear.'
          })
        );
        return card;
      }

      const list = el('ul', { class: 'model-file-list' });
      files.forEach(function (file) {
        const row = el('li', { class: 'model-file' });
        row.append(
          el('span', { class: 'model-file-icon', html: ui.icon('file', 17) }),
          el(
            'div',
            { class: 'model-file-copy' },
            el('p', { class: 'model-file-name', text: file.file }),
            el('p', { class: 'model-file-meta', text: formatGb(file.size_gb) })
          )
        );

        if (file.imported_as) {
          row.appendChild(ui.badge('Importado como ' + file.imported_as, 'ok'));
        } else if (state.importing === file.file) {
          row.appendChild(el('span', { class: 'model-file-busy' }, ui.spinner('Importando…')));
        } else {
          const importButton = actionButton('Importar', 'upload', function () {
            importFile(file.file);
          }, 'ghost', 'btn-sm');
          importButton.disabled = Boolean(state.importing);
          row.appendChild(importButton);
        }

        list.appendChild(row);
      });
      card.appendChild(list);
      card.appendChild(
        el('p', {
          class: 'settings-note',
          text: 'La primera importación puede tardar varios minutos según el tamaño del archivo.'
        })
      );
      return card;
    }

    function importFile(file) {
      state.importing = file;
      renderPanel();
      api.importModel(file).then(
        function (response) {
          state.importing = null;
          refreshData().then(function () { openImportSuccess(response, file); });
        },
        function (error) {
          state.importing = null;
          renderPanel();
          openImportError(error, file);
        }
      );
    }

    function logDetails(log) {
      const details = el('details', { class: 'log-details' });
      details.append(
        el('summary', { text: 'Ver registro de Ollama' }),
        el('pre', { class: 'log-pre', text: String(log) })
      );
      return details;
    }

    function openImportSuccess(response, file) {
      const model = response && response.model ? response.model : null;
      const name = model && model.name ? model.name : '';
      const content = el('div', { class: 'stack' });
      content.appendChild(
        el('p', {
          class: 'modal-text',
          text:
            '«' + file + '» se ha importado a Ollama' +
            (name ? ' como «' + name + '».' : '.') +
            ' Ya puedes usarlo como profesor.'
        })
      );
      if (response && response.log) content.appendChild(logDetails(response.log));

      const actions = [{ label: 'Cerrar', variant: 'ghost' }];
      if (name) {
        actions.push({
          label: 'Usar como profesor',
          variant: 'primary',
          onClick: function () {
            return applyModel(name, (model && model.provider) || 'ollama');
          }
        });
      }
      ui.modal({ title: 'Modelo importado', eyebrow: 'Profesor', content: content, actions: actions });
    }

    function openImportError(error, file) {
      const content = el('div', { class: 'stack' });
      content.appendChild(
        el('p', {
          class: 'modal-text',
          text:
            'No se pudo importar «' + file + '». ' +
            (error.status === 503
              ? 'Ollama no está instalado o no está en marcha.'
              : error.status === 409
                ? 'Ese archivo ya estaba importado.'
                : 'Revisa el registro para ver el detalle.')
        })
      );
      if (error.payload && error.payload.log) content.appendChild(logDetails(error.payload.log));
      ui.modal({
        title: 'No se pudo importar',
        description: error.message,
        content: content,
        actions: [{ label: 'Cerrar', variant: 'ghost' }]
      });
    }

    function modelsListCard() {
      const card = el('section', { class: 'card settings-block' });
      card.appendChild(
        el(
          'div',
          { class: 'settings-block-head' },
          el(
            'div',
            { class: 'settings-block-title-wrap' },
            el('span', { class: 'settings-block-icon', html: ui.icon('server', 18) }),
            el(
              'div',
              {},
              el('h3', { class: 'settings-block-title', text: 'Modelos en Ollama' }),
              el('p', {
                class: 'settings-block-sub',
                text: 'Elige cuál responde. Código Cero nunca elige uno por ti.'
              })
            )
          )
        )
      );

      const models = state.models && Array.isArray(state.models.models) ? state.models.models : [];
      const active = state.models && state.models.active ? state.models.active : null;

      if (!models.length) {
        card.appendChild(
          el('p', {
            class: 'field-hint',
            text: 'No hay modelos disponibles. Importa un archivo GGUF desde la carpeta de modelos.'
          })
        );
        return card;
      }

      const list = el('ul', { class: 'model-list' });
      models.forEach(function (model) {
        const isActive = Boolean(active && active.name === model.name);
        const row = el('li', { class: 'model-row' + (isActive ? ' is-active' : '') });
        const copy = el(
          'div',
          { class: 'model-row-copy' },
          el(
            'div',
            { class: 'model-row-title' },
            el('span', { class: 'model-name', text: model.name }),
            isActive ? ui.badge('Activo', 'ok') : null
          ),
          el(
            'p',
            { class: 'model-meta' },
            [
              model.family ? ui.capitalize(model.family) : null,
              model.size_gb != null ? formatGb(model.size_gb) : null,
              model.source ? 'Origen: ' + model.source : null
            ].filter(Boolean).join(' · ')
          )
        );
        row.appendChild(copy);

        const actions = el('div', { class: 'model-row-actions' });
        if (!isActive) {
          const useButton = actionButton('Usar', 'check', function () {
            ui.busy(useButton, true, 'Aplicando…');
            applyModel(model.name, model.provider || 'ollama').catch(function () {
              ui.busy(useButton, false);
            });
          }, 'ghost', 'btn-sm');
          actions.appendChild(useButton);
        }
        if (typeof model.name === 'string' && model.name.indexOf('cc-') === 0) {
          actions.appendChild(
            iconButton('trash', 'Eliminar ' + model.name, function () {
              removeModel(model);
            }, 'icon-btn-sm is-danger')
          );
        }
        row.appendChild(actions);
        list.appendChild(row);
      });
      card.appendChild(list);
      return card;
    }

    function applyModel(name, provider, numCtx) {
      const context = Number(numCtx) || Number(setting('ai.num_ctx', 4096)) || 4096;
      return api.selectModel({ name: name, provider: provider || 'ollama', num_ctx: context }).then(
        function () {
          ui.toast('Ahora el profesor es «' + name + '».', { variant: 'success' });
          return refreshData();
        },
        function (error) {
          ui.toast(error.message || 'No se pudo activar el modelo.', { variant: 'error' });
          throw error;
        }
      );
    }

    function removeModel(model) {
      ui.confirm({
        title: 'Eliminar «' + model.name + '»',
        message:
          'Se quitará de Ollama este modelo creado desde Código Cero. El archivo GGUF de la carpeta no se toca.',
        confirmLabel: 'Eliminar modelo',
        danger: true
      }).then(function (confirmed) {
        if (!confirmed) return;
        api.deleteModel(model.name).then(
          function () {
            ui.toast('Modelo eliminado', { variant: 'success' });
            refreshData();
          },
          function (error) {
            ui.toast(error.message || 'No se pudo eliminar el modelo.', { variant: 'error' });
          }
        );
      });
    }

    function activeModelCard() {
      const card = el('section', { class: 'card settings-block' });
      card.appendChild(
        el(
          'div',
          { class: 'settings-block-head' },
          el(
            'div',
            { class: 'settings-block-title-wrap' },
            el('span', { class: 'settings-block-icon', html: ui.icon('sparkles', 18) }),
            el(
              'div',
              {},
              el('h3', { class: 'settings-block-title', text: 'Modelo activo' }),
              el('p', { class: 'settings-block-sub', text: 'Contexto y proveedor con el que se responde.' })
            )
          )
        )
      );

      const active = state.models && state.models.active ? state.models.active : null;
      if (!active) {
        card.appendChild(
          el('p', {
            class: 'field-hint',
            text: 'Ningún modelo activo. Elige uno de la lista para empezar a conversar.'
          })
        );
        return card;
      }

      const details = el('dl', { class: 'detail-list' });
      [
        { label: 'Modelo', value: active.name || '—' },
        { label: 'Proveedor', value: active.provider ? ui.capitalize(active.provider) : 'Ollama' },
        { label: 'Contexto actual', value: active.num_ctx ? ui.formatNumber(active.num_ctx) + ' tokens' : '—' }
      ].forEach(function (item) {
        const row = el('div', { class: 'detail-row' });
        row.append(
          el('dt', { class: 'detail-label', text: item.label }),
          el('dd', { class: 'detail-value', text: item.value })
        );
        details.appendChild(row);
      });
      card.appendChild(details);

      const control = el('div', { class: 'context-control' });
      const select = el('select', {
        class: 'select select-sm',
        id: 'settings-num-ctx',
        'aria-label': 'Tamaño del contexto'
      });
      [2048, 4096, 8192].forEach(function (value) {
        const option = el('option', { value: String(value), text: value + ' tokens' });
        if (Number(active.num_ctx) === value) option.selected = true;
        select.appendChild(option);
      });
      const apply = actionButton('Aplicar contexto', 'refresh', function () {
        ui.busy(apply, true, 'Aplicando…');
        applyModel(active.name, active.provider || 'ollama', Number(select.value)).catch(function () {
          ui.busy(apply, false);
        });
      }, 'ghost', 'btn-sm');
      control.append(
        el('label', { class: 'field-label', for: 'settings-num-ctx', text: 'Contexto (num_ctx)' }),
        el('div', { class: 'context-control-row' }, select, apply)
      );
      card.appendChild(control);
      card.appendChild(
        el('p', {
          class: 'settings-note',
          text: '4096 tokens es un buen equilibrio en equipos modestos. Un contexto mayor usa más memoria.'
        })
      );
      return card;
    }

    /* Ejecución ------------------------------------------------------ */

    function executionPanel() {
      const fragment = document.createDocumentFragment();
      fragment.appendChild(
        panelHead('terminal', 'Ejecución', 'Cuánto tiempo puede correr un programa antes de detenerse.')
      );

      const card = el('section', { class: 'card settings-block' });
      card.appendChild(
        el(
          'div',
          { class: 'settings-block-head' },
          el(
            'div',
            { class: 'settings-block-title-wrap' },
            el('span', { class: 'settings-block-icon', html: ui.icon('clock', 18) }),
            el(
              'div',
              {},
              el('h3', { class: 'settings-block-title', text: 'Tiempo máximo por ejecución' }),
              el('p', {
                class: 'settings-block-sub',
                text: 'Entre 1 y 30 segundos. Al agotarse, el programa se detiene y se avisa.'
              })
            )
          )
        )
      );

      const saved = Math.round((Number(setting('exec.timeout_ms', 5000)) || 5000) / 1000);
      const field = el('div', { class: 'field field-narrow' });
      const label = el('label', { class: 'field-label', for: 'settings-timeout', text: 'Segundos' });
      const input = el('input', {
        class: 'input',
        id: 'settings-timeout',
        type: 'number',
        min: '1',
        max: '30',
        step: '1',
        value: String(saved),
        inputmode: 'numeric'
      });
      const hint = el('p', {
        class: 'field-hint',
        text: 'Los ejercicios normales terminan en menos de un segundo. 5 segundos es suficiente.'
      });
      const presets = el('div', { class: 'preset-row' });
      [3, 5, 10, 20].forEach(function (seconds) {
        presets.appendChild(
          el('button', {
            type: 'button',
            class: 'preset' + (seconds === saved ? ' is-current' : ''),
            text: seconds + ' s',
            onClick: function () {
              input.value = String(seconds);
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          })
        );
      });
      field.append(label, input, presets, hint);

      const status = el('p', { class: 'settings-save-status' });
      const save = actionButton('Guardar', 'check', function () {
        const value = Math.round(Number(input.value) * 1000);
        if (!isFinite(value) || value < 1000 || value > 30000) {
          status.textContent = 'Escribe un valor entre 1 y 30 segundos.';
          status.className = 'settings-save-status is-error';
          input.focus();
          return;
        }
        ui.busy(save, true, 'Guardando…');
        persist({ 'exec.timeout_ms': value }).then(
          function () {
            status.textContent = 'Guardado.';
            status.className = 'settings-save-status is-ok';
            ui.toast('Tiempo de ejecución actualizado', { variant: 'success' });
            renderPanel();
          },
          function (error) {
            ui.busy(save, false);
            status.textContent = error.message || 'No se pudo guardar.';
            status.className = 'settings-save-status is-error';
          }
        );
      }, 'primary', 'btn-sm');

      input.addEventListener('input', function () {
        presetReset();
        status.textContent = '';
        status.className = 'settings-save-status';
      });

      function presetReset() {
        Array.prototype.forEach.call(presets.children, function (button) {
          button.classList.toggle('is-current', button.textContent === input.value + ' s');
        });
      }

      const foot = el('div', { class: 'settings-block-foot' }, status, save);
      card.append(field, foot);
      fragment.appendChild(card);

      const limits = el('section', { class: 'card settings-block settings-block-soft' });
      limits.appendChild(
        el(
          'div',
          { class: 'setting-note-row' },
          el('span', { class: 'setting-note-icon', html: ui.icon('shield', 17) }),
          el(
            'div',
            {},
            el('p', { class: 'setting-note-title', text: 'Límites de seguridad' }),
            el('p', {
              class: 'setting-note-text',
              text:
                'Cada programa corre en un proceso aparte, con salida máxima de ' +
                ui.formatNumber(setting('exec.max_output_kb', 64)) + ' KB. Tu código nunca se ' +
                'ejecuta dentro del servidor.'
            })
          )
        )
      );
      fragment.appendChild(limits);
      return fragment;
    }

    /* Apariencia ----------------------------------------------------- */

    function appearancePanel() {
      const fragment = document.createDocumentFragment();
      fragment.appendChild(
        panelHead('sun', 'Apariencia', 'Tema y tamaño del texto. Se guarda en este equipo.')
      );

      const theme = ui.getTheme();
      const note = el('p', { class: 'settings-save-note', text: 'Se guarda en este equipo.' });
      const card = el('section', { class: 'card settings-block' });
      card.appendChild(el('h3', { class: 'settings-block-title', text: 'Tema' }));
      card.appendChild(
        el('p', {
          class: 'settings-block-sub',
          text: 'El oscuro es el predeterminado; el claro ayuda con mucha luz ambiental.'
        })
      );

      const grid = el('div', { class: 'theme-grid' });
      [{
        id: 'dark',
        title: 'Oscuro',
        text: 'Superficies profundas y acento menta.'
      }, {
        id: 'light',
        title: 'Claro',
        text: 'Fondo suave y contraste alto.'
      }].forEach(function (option) {
        const label = el('label', {
          class: 'theme-card' + (theme === option.id ? ' is-selected' : ''),
          dataset: { themeValue: option.id }
        });
        label.appendChild(
          el('input', {
            type: 'radio',
            name: 'settings-theme',
            value: option.id,
            checked: theme === option.id,
            onChange: function () { chooseTheme(option.id, grid, note); }
          })
        );
        label.appendChild(
          el(
            'span',
            { class: 'theme-preview preview-' + option.id, 'aria-hidden': 'true' },
            el('span', { class: 'tp-side' }),
            el(
              'span',
              { class: 'tp-main' },
              el('span', { class: 'tp-line tp-line-lg' }),
              el('span', { class: 'tp-line' }),
              el('span', { class: 'tp-card' }),
              el('span', { class: 'tp-accent' })
            )
          )
        );
        label.appendChild(
          el(
            'span',
            { class: 'theme-copy' },
            el('span', { class: 'theme-title', text: option.title }),
            el('span', { class: 'theme-text', text: option.text })
          )
        );
        grid.appendChild(label);
      });
      card.appendChild(grid);
      card.appendChild(note);
      fragment.appendChild(card);

      const fontCard = el('section', { class: 'card settings-block' });
      fontCard.appendChild(el('h3', { class: 'settings-block-title', text: 'Tamaño del texto' }));
      fontCard.appendChild(
        el('p', {
          class: 'settings-block-sub',
          text: 'Afecta al texto de lectura de las lecciones y de los paneles.'
        })
      );

      const size = ui.getFontSize();
      const fontPreview = el(
        'p',
        { class: 'font-preview', style: { fontSize: size + 'px' } },
        'Aa · Así se verá el texto de las lecciones.'
      );
      const fontControl = el('div', { class: 'font-control' });
      const fontOutput = el('output', { class: 'font-output', for: 'settings-font', text: size + ' px' });
      const range = el('input', {
        class: 'range',
        id: 'settings-font',
        type: 'range',
        min: '13',
        max: '18',
        step: '1',
        value: String(size),
        'aria-label': 'Tamaño del texto'
      });
      const fontNote = el('p', { class: 'settings-save-note', text: 'Se guarda en este equipo.' });
      const saveFont = ui.debounce(function () {
        persist({ 'ui.font_size': ui.getFontSize() }).then(
          function () {},
          function () {
            fontNote.textContent = 'Se aplicó aquí, pero no se pudo guardar en la app.';
            fontNote.classList.add('is-warn');
          }
        );
      }, 700);

      range.addEventListener('input', function () {
        const value = ui.applyFontSize(Number(range.value));
        fontOutput.textContent = value + ' px';
        fontPreview.style.fontSize = value + 'px';
        fontNote.textContent = 'Se guarda en este equipo.';
        fontNote.classList.remove('is-warn');
        saveFont();
      });
      fontControl.append(
        el('span', { class: 'font-sample', text: 'A' }),
        range,
        el('span', { class: 'font-sample font-sample-lg', text: 'A' }),
        fontOutput
      );
      fontCard.append(fontPreview, fontControl, fontNote);
      fragment.appendChild(fontCard);
      return fragment;
    }

    function chooseTheme(value, grid, note) {
      ui.applyTheme(value);
      Array.prototype.forEach.call(grid.children, function (card) {
        card.classList.toggle('is-selected', card.dataset.themeValue === value);
      });
      note.textContent = 'Se guarda en este equipo.';
      note.classList.remove('is-warn');
      persist({ 'ui.theme': value }).then(
        function () {},
        function () {
          note.textContent = 'Se aplicó aquí, pero no se pudo guardar en la app.';
          note.classList.add('is-warn');
        }
      );
    }

    /* Datos ---------------------------------------------------------- */

    function dataPanel() {
      const fragment = document.createDocumentFragment();
      fragment.appendChild(
        panelHead('shield', 'Datos', 'Copia de seguridad y control del progreso guardado.')
      );

      const exportCard = el('section', { class: 'card settings-block' });
      exportCard.appendChild(
        el(
          'div',
          { class: 'settings-block-head' },
          el(
            'div',
            { class: 'settings-block-title-wrap' },
            el('span', { class: 'settings-block-icon', html: ui.icon('download', 18) }),
            el(
              'div',
              {},
              el('h3', { class: 'settings-block-title', text: 'Exportar todo' }),
              el('p', {
                class: 'settings-block-sub',
                text: 'Cursos, lecciones, intentos, conversaciones y ajustes en un solo archivo JSON.'
              })
            )
          )
        )
      );
      const exportButton = actionButton('Descargar copia', 'download', function () {
        ui.busy(exportButton, true, 'Preparando…');
        api.exportAll().then(
          function (name) {
            ui.toast('Copia de seguridad descargada: ' + name, { variant: 'success' });
          },
          function (error) {
            ui.toast(error.message || 'No se pudo exportar.', { variant: 'error' });
          }
        ).then(function () {
          ui.busy(exportButton, false);
        });
      }, 'primary', 'btn-sm');
      exportCard.appendChild(exportButton);
      exportCard.appendChild(
        el('p', {
          class: 'settings-note',
          text: 'Guarda el archivo donde quieras. La app no envía nada a internet.'
        })
      );
      fragment.appendChild(exportCard);

      const coursesCard = el('section', { class: 'card settings-block' });
      coursesCard.appendChild(
        el(
          'div',
          { class: 'settings-block-head' },
          el(
            'div',
            { class: 'settings-block-title-wrap' },
            el('span', { class: 'settings-block-icon', html: ui.icon('trash', 18) }),
            el(
              'div',
              {},
              el('h3', { class: 'settings-block-title', text: 'Borrar progreso' }),
              el('p', {
                class: 'settings-block-sub',
                text: 'El progreso se guarda por curso. Al eliminar uno se borran sus lecciones, intentos y conversaciones.'
              })
            )
          )
        )
      );

      if (state.coursesError) {
        coursesCard.appendChild(
          ui.errorState(state.coursesError, loadCourses, {
            title: 'No se pudieron cargar tus clases'
          })
        );
        fragment.appendChild(coursesCard);
        return fragment;
      }

      if (!state.courses) {
        coursesCard.appendChild(ui.skeleton('sk-row'));
        fragment.appendChild(coursesCard);
        return fragment;
      }

      if (!state.courses.length) {
        coursesCard.appendChild(
          el('p', { class: 'field-hint', text: 'No hay clases guardadas. Nada que borrar.' })
        );
        fragment.appendChild(coursesCard);
        return fragment;
      }

      const list = el('ul', { class: 'danger-list' });
      state.courses.forEach(function (course) {
        const row = el('li', { class: 'danger-row' });
        row.append(
          el(
            'div',
            { class: 'danger-row-copy' },
            el('p', { class: 'danger-row-title', text: course.title }),
            el('p', {
              class: 'danger-row-meta',
              text:
                ui.statusLabel(course.status) + ' · ' + ui.pct(course.progress) + '% · ' +
                (course.lessons_done || 0) + ' de ' + (course.lessons_total || 0) + ' lecciones'
            })
          ),
          actionButton('Eliminar', 'trash', function () {
            ui.confirm({
              title: 'Borrar «' + course.title + '»',
              message:
                'Se eliminarán el curso y todo su progreso: lecciones completadas, intentos y ' +
                'conversaciones. No se puede deshacer.',
              confirmLabel: 'Borrar progreso',
              danger: true
            }).then(function (confirmed) {
              if (!confirmed) return;
              api.deleteCourse(course.id).then(
                function () {
                  state.courses = state.courses.filter(function (item) {
                    return item.id !== course.id;
                  });
                  ui.toast('Progreso del curso eliminado', { variant: 'success' });
                  renderPanel();
                },
                function (error) {
                  ui.toast(error.message || 'No se pudo borrar el curso.', { variant: 'error' });
                }
              );
            });
          }, 'danger', 'btn-sm')
        );
        list.appendChild(row);
      });
      coursesCard.appendChild(list);
      coursesCard.appendChild(
        el('p', {
          class: 'settings-note',
          text: 'Para conservar el contenido sin perder el progreso, archiva el curso en lugar de eliminarlo.'
        })
      );
      fragment.appendChild(coursesCard);
      return fragment;
    }

    /* Diagnóstico ---------------------------------------------------- */

    function ensureSystem() {
      if (state.system || state.systemLoading) return;
      state.systemLoading = true;
      api.system().then(
        function (system) {
          state.system = system;
          state.systemError = null;
          state.systemLoading = false;
          if (state.tab === 'diagnostico') renderPanel();
        },
        function (error) {
          state.systemError = error;
          state.systemLoading = false;
          if (state.tab === 'diagnostico') renderPanel();
        }
      );
    }

    function diagnosticsPanel() {
      const fragment = document.createDocumentFragment();
      const refreshButton = actionButton('Actualizar', 'refresh', function () {
        state.system = null;
        state.systemError = null;
        state.systemLoading = false;
        ensureSystem();
        renderPanel();
      }, 'ghost', 'btn-sm');
      fragment.appendChild(
        el(
          'div',
          { class: 'panel-head-row' },
          panelHead('monitor', 'Diagnóstico', 'Lo que la app detecta en este equipo.'),
          refreshButton
        )
      );

      if (state.systemError) {
        fragment.appendChild(
          ui.errorState(state.systemError, function () {
            state.system = null;
            state.systemError = null;
            state.systemLoading = false;
            ensureSystem();
          }, { title: 'No se pudo leer el diagnóstico' })
        );
        return fragment;
      }

      if (!state.system) {
        ensureSystem();
        const grid = el('div', { class: 'system-grid' });
        [1, 2, 3, 4].forEach(function () {
          grid.appendChild(ui.skeleton('sk-system'));
        });
        fragment.appendChild(grid);
        return fragment;
      }

      const system = state.system;
      const cpu = system.cpu || {};
      const grid = el('div', { class: 'system-grid' });
      [
        { icon: 'monitor', label: 'Sistema operativo', value: system.os || 'No detectado' },
        {
          icon: 'cpu',
          label: 'Procesador',
          value: cpu.name || 'No detectado',
          hint: cpu.cores ? cpu.cores + ' núcleos lógicos' : ''
        },
        {
          icon: 'memory',
          label: 'Memoria RAM',
          value: system.ram_gb != null ? formatGb(system.ram_gb) : 'No detectada',
          hint: 'Memoria total del equipo'
        },
        {
          icon: 'layers',
          label: 'Gráficos',
          value: system.gpu || 'No detectados',
          hint: 'La IA funciona también sin GPU dedicada'
        }
      ].forEach(function (item) {
        const card = el('article', { class: 'system-card' });
        card.append(
          el('span', { class: 'system-icon', html: ui.icon(item.icon, 18) }),
          el(
            'div',
            { class: 'system-copy' },
            el('p', { class: 'system-label', text: item.label }),
            el('p', { class: 'system-value', text: item.value }),
            item.hint ? el('p', { class: 'system-hint', text: item.hint }) : null
          )
        );
        grid.appendChild(card);
      });
      fragment.appendChild(grid);

      const runtimesCard = el('section', { class: 'card settings-block' });
      runtimesCard.appendChild(
        el(
          'div',
          { class: 'settings-block-head' },
          el(
            'div',
            { class: 'settings-block-title-wrap' },
            el('span', { class: 'settings-block-icon', html: ui.icon('code', 18) }),
            el(
              'div',
              {},
              el('h3', { class: 'settings-block-title', text: 'Runtimes detectados' }),
              el('p', {
                class: 'settings-block-sub',
                text: 'Determinan qué itinerarios pueden ejecutar código de verdad.'
              })
            )
          )
        )
      );
      const runtimes = system.runtimes || {};
      const runtimeGrid = el('div', { class: 'runtime-grid' });
      ['python', 'node', 'dotnet', 'sqlite', 'gcc', 'java'].forEach(function (key) {
        const available = Boolean(runtimes[key]);
        runtimeGrid.appendChild(
          el(
            'div',
            { class: 'runtime-row' },
            el('span', { class: 'runtime-name', text: ui.runtimeLabel(key) }),
            ui.badge(available ? 'Disponible' : 'No detectado', available ? 'ok' : 'warn')
          )
        );
      });
      runtimesCard.appendChild(runtimeGrid);
      runtimesCard.appendChild(
        el('p', {
          class: 'settings-note',
          text:
            'Los runtimes se detectan al arrancar. Si instalas una herramienta, compruébala en la ' +
            'pestaña Entorno y pulsa «Actualizar» aquí para refrescar esta lista.'
        })
      );
      fragment.appendChild(runtimesCard);

      const recommended = el('section', { class: 'card settings-block recommended-card' });
      recommended.appendChild(
        el(
          'div',
          { class: 'recommended-main' },
          el('span', { class: 'recommended-icon', html: ui.icon('sparkles', 20) }),
          el(
            'div',
            {},
            el('p', { class: 'recommended-label', text: 'Modelo recomendado para este equipo' }),
            el('p', {
              class: 'recommended-value',
              text: system.recommended_model || 'No disponible'
            }),
            el('p', {
              class: 'recommended-text',
              text:
                'Un modelo pequeño en cuantización Q4_K_M mantiene el equipo ágil. Puedes usar otro ' +
                'desde la pestaña Profesor.'
            })
          )
        )
      );
      recommended.appendChild(
        actionButton('Ver modelos', 'arrowRight', function () {
          if (tabs) tabs.select('profesor');
        }, 'ghost', 'btn-sm')
      );
      fragment.appendChild(recommended);
      return fragment;
    }

    return function cleanup() {
      stopInstallTimer();
      if (tabs) tabs = null;
      panel = null;
    };
  }

  /* ------------------------------------------------------------------ */
  /* 404                                                                 */
  /* ------------------------------------------------------------------ */

  function notFoundView(ctx) {
    ctx.setPage({
      title: 'Página no encontrada',
      subtitle: '',
      crumbs: [HOME_CRUMB, { label: 'Página no encontrada' }],
      actions: []
    });

    const wrap = el('div', { class: 'view-inner not-found-page' });
    const card = el('div', { class: 'not-found' });
    card.append(
      el('p', { class: 'not-found-code', text: '404' }),
      el('h2', { class: 'not-found-title', text: 'Te has salido del mapa' }),
      el('p', {
        class: 'not-found-text',
        text: 'La página que buscas no existe o ha cambiado de dirección. Nada se ha perdido.'
      }),
      el(
        'div',
        { class: 'not-found-actions' },
        actionLink('Volver al inicio', 'home', '#/inicio', 'primary'),
        actionLink('Crear una clase', 'sparkles', '#/nueva', 'ghost')
      )
    );
    wrap.appendChild(card);
    ctx.root.replaceChildren(wrap);
  }

  CC.views = {
    inicio: homeView,
    nueva: newView,
    clase: courseView,
    leccion: lessonView,
    ejercicio: exerciseView,
    laboratorio: labView,
    labs: labsView,
    progreso: progressView,
    ajustes: settingsView,
    noEncontrada: notFoundView
  };
})(window);
