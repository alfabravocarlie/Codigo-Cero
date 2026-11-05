/* Código Cero — editor de código con números de línea. */
(function (global) {
  'use strict';

  var CC = global.CC = global.CC || {};
  var ui = CC.ui;

  function create(options) {
    var opts = options || {};
    var language = opts.language ? String(opts.language) : 'texto';
    var readOnly = opts.readOnly === true;
    var height = Math.max(220, Number(opts.minHeight) || 340);
    var onChange = typeof opts.onChange === 'function' ? opts.onChange : null;
    var onRun = typeof opts.onRun === 'function' ? opts.onRun : null;
    var editorId = ui.nextId('editor');
    var lineCount = -1;

    var textarea = ui.el('textarea', {
      class: 'editor-input',
      id: editorId,
      spellcheck: 'false',
      wrap: 'off',
      autocapitalize: 'off',
      autocomplete: 'off',
      autocorrect: 'off',
      'aria-label': opts.ariaLabel || 'Editor de código',
      readonly: readOnly,
      placeholder: opts.placeholder || ''
    });
    textarea.value = String(opts.value == null ? '' : opts.value);

    var gutterLines = ui.el('div', { class: 'editor-gutter-lines' });
    var gutter = ui.el('div', { class: 'editor-gutter', 'aria-hidden': 'true' }, gutterLines);

    var position = ui.el('span', { class: 'editor-position', text: 'Ln 1, Col 1' });
    var hint = ui.el('span', {
      class: 'editor-hint',
      text: readOnly
        ? 'Vista de solo lectura'
        : 'Tab inserta 4 espacios · Ctrl+Enter ejecuta'
    });

    var footer = ui.el('div', { class: 'editor-foot' }, hint, position);
    var shell = ui.el('div', {
      class: 'editor-shell',
      style: { height: height + 'px' }
    }, gutter, textarea);

    var head = null;
    if (opts.showHead !== false) {
      var copyButton = ui.el('button', {
        type: 'button',
        class: 'editor-copy',
        'aria-label': 'Copiar código',
        onClick: function () { ui.copy(textarea.value, 'Código copiado'); }
      });
      copyButton.innerHTML = ui.icon('copy', 14) + '<span>Copiar</span>';
      head = ui.el(
        'div',
        { class: 'editor-head' },
        ui.el('span', { class: 'editor-lang', text: language }),
        copyButton
      );
    }

    var root = ui.el('div', { class: 'editor' + (readOnly ? ' is-readonly' : '') }, head, shell, footer);

    function buildGutter(count) {
      if (count === lineCount) return;
      lineCount = count;
      var fragment = document.createDocumentFragment();
      for (var i = 1; i <= count; i += 1) {
        fragment.appendChild(ui.el('span', { class: 'editor-line', text: String(i) }));
      }
      gutterLines.replaceChildren(fragment);
    }

    function syncScroll() {
      gutter.scrollTop = textarea.scrollTop;
    }

    function updatePosition() {
      var caret = textarea.selectionStart || 0;
      var before = textarea.value.slice(0, caret);
      var rows = before.split('\n');
      position.textContent = 'Ln ' + rows.length + ', Col ' + (rows[rows.length - 1].length + 1);
    }

    function refresh(notify) {
      buildGutter(textarea.value.split('\n').length);
      syncScroll();
      updatePosition();
      if (notify && onChange && !readOnly) onChange(textarea.value);
    }

    function insertText(text) {
      textarea.focus();
      var ok = false;
      try {
        ok = document.execCommand('insertText', false, text);
      } catch (error) {
        ok = false;
      }
      if (!ok) {
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        textarea.setRangeText(text, start, end, 'end');
      }
      refresh(true);
    }

    function indentSelection() {
      var start = textarea.selectionStart;
      var end = textarea.selectionEnd;
      var lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
      var lineEnd = textarea.value.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = textarea.value.length;
      var block = textarea.value.slice(lineStart, lineEnd);
      var lines = block.split('\n');
      if (lines.length === 1) {
        insertText('    ');
        return;
      }
      var shifted = function (pos) {
        return pos + 4 * block.slice(0, pos).split('\n').length;
      };
      var newBlock = lines.map(function (line) { return '    ' + line; }).join('\n');
      var nextStart = lineStart + shifted(start - lineStart);
      var nextEnd = lineStart + shifted(end - lineStart);
      textarea.setRangeText(newBlock, lineStart, lineEnd, 'end');
      textarea.setSelectionRange(nextStart, nextEnd);
      refresh(true);
    }

    function outdentSelection() {
      var start = textarea.selectionStart;
      var end = textarea.selectionEnd;
      var lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
      var lineEnd = textarea.value.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = textarea.value.length;
      var block = textarea.value.slice(lineStart, lineEnd);
      var lines = block.split('\n');
      var removedBefore = function (pos) {
        var consumed = 0;
        var removed = 0;
        for (var i = 0; i < lines.length; i += 1) {
          if (consumed >= pos) break;
          var take = Math.min(4, (/^ */.exec(lines[i]) || [''])[0].length);
          var within = pos - consumed;
          removed += Math.min(take, within);
          consumed += lines[i].length + 1;
        }
        return removed;
      };
      var newBlock = lines
        .map(function (line) { return line.replace(/^ {1,4}/, ''); })
        .join('\n');
      var nextStart = Math.max(lineStart, start - removedBefore(start - lineStart));
      var nextEnd = Math.max(nextStart, end - removedBefore(end - lineStart));
      textarea.setRangeText(newBlock, lineStart, lineEnd, 'end');
      textarea.setSelectionRange(nextStart, nextEnd);
      refresh(true);
    }

    function onKeydown(event) {
      if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        if (readOnly) return;
        if (event.shiftKey) outdentSelection();
        else indentSelection();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!readOnly && onRun) onRun(textarea.value);
      }
    }

    function onInput() {
      refresh(true);
    }

    textarea.addEventListener('input', onInput);
    textarea.addEventListener('scroll', syncScroll);
    textarea.addEventListener('keydown', onKeydown);
    textarea.addEventListener('keyup', updatePosition);
    textarea.addEventListener('click', updatePosition);
    textarea.addEventListener('select', updatePosition);
    textarea.addEventListener('focus', updatePosition);

    refresh(false);

    return {
      el: root,
      textarea: textarea,
      getValue: function () { return textarea.value; },
      setValue: function (value, setOptions) {
        var setOpts = setOptions || {};
        textarea.value = String(value == null ? '' : value);
        refresh(false);
        if (setOpts.silent !== true && onChange && !readOnly) onChange(textarea.value);
      },
      focus: function () { textarea.focus(); },
      setLanguage: function (nextLanguage) {
        language = nextLanguage ? String(nextLanguage) : 'texto';
        var label = root.querySelector('.editor-lang');
        if (label) label.textContent = language;
      },
      destroy: function () {
        textarea.removeEventListener('input', onInput);
        textarea.removeEventListener('scroll', syncScroll);
        textarea.removeEventListener('keydown', onKeydown);
        root.remove();
      }
    };
  }

  CC.editor = { create: create };
})(window);
