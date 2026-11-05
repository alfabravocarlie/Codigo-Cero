/* Código Cero — renderizador de Markdown sin dependencias.
 * Escapa siempre el HTML de entrada antes de transformarlo. */
(function (global) {
  'use strict';

  var CC = global.CC = global.CC || {};

  var ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  var COPY_ICON =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="9" y="9" width="11" height="11" rx="2"/>' +
    '<path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';

  var INLINE_SOURCE = [
    '(?<code>`[^`\\n]+`)',
    '(?<strong>\\*\\*(?=\\S)[\\s\\S]*?\\S\\*\\*|__(?=\\S)[\\s\\S]*?\\S__)',
    '(?<em>(?<![*\\w])\\*(?=\\S)[^*\\n]*?\\S\\*(?!\\*)|(?<![\\w])_(?=\\S)[^_\\n]*?\\S_(?![\\w]))',
    '(?<link>\\[(?<label>[^\\]\\n]+)\\]\\((?<href>[^)\\s]+)\\))',
    '(?<del>~~(?=\\S)[\\s\\S]*?\\S~~)'
  ].join('|');

  var BLOCK_START = /^(?:#{1,6}\s|```|>\s?|\s*(?:[-*+]|\d+[.)])\s+|\s*(?:-{3,}|\*{3,}|_{3,})\s*$|\s*\|)/;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ESCAPES[ch];
    });
  }

  function isSafeUrl(url) {
    return /^https?:\/\/[^\s]+$/i.test(url);
  }

  function inline(raw, depth) {
    var text = String(raw == null ? '' : raw);
    if (depth > 4) return escapeHtml(text);

    var re = new RegExp(INLINE_SOURCE, 'g');
    var out = '';
    var last = 0;
    var match;

    while ((match = re.exec(text)) !== null) {
      out += escapeHtml(text.slice(last, match.index));
      var groups = match.groups || {};
      if (groups.code) {
        out += '<code>' + escapeHtml(groups.code.slice(1, -1)) + '</code>';
      } else if (groups.strong) {
        out += '<strong>' + inline(groups.strong.slice(2, -2), depth + 1) + '</strong>';
      } else if (groups.em) {
        out += '<em>' + inline(groups.em.slice(1, -1), depth + 1) + '</em>';
      } else if (groups.link) {
        var label = inline(groups.label, depth + 1);
        if (isSafeUrl(groups.href)) {
          out +=
            '<a href="' + escapeHtml(groups.href) + '" target="_blank" rel="noopener noreferrer">' +
            label + '<span class="external-mark" aria-hidden="true">\u2197</span></a>';
        } else {
          out += label;
        }
      } else if (groups.del) {
        out += '<del>' + inline(groups.del.slice(2, -2), depth + 1) + '</del>';
      }
      last = re.lastIndex;
    }

    out += escapeHtml(text.slice(last));
    return out;
  }

  function codeBlock(code, lang) {
    var safeLang = String(lang || '').replace(/[^\w+#.-]/g, '');
    var label = safeLang ? escapeHtml(safeLang) : 'texto';
    var cls = safeLang ? ' class="language-' + escapeHtml(safeLang) + '"' : '';
    return (
      '<div class="code-block" data-lang="' + escapeHtml(safeLang || 'text') + '">' +
      '<div class="code-head"><span class="code-lang">' + label + '</span>' +
      '<button type="button" class="code-copy" data-copy-code aria-label="Copiar bloque de código">' +
      COPY_ICON + '<span>Copiar</span></button></div>' +
      '<pre><code' + cls + '>' + escapeHtml(code) + '</code></pre></div>'
    );
  }

  function splitRow(line) {
    var trimmed = String(line).trim().replace(/^\|/, '').replace(/\|$/, '');
    return trimmed.split(/(?<!\\)\|/).map(function (cell) {
      return cell.trim().replace(/\\\|/g, '|');
    });
  }

  function parseAligns(line) {
    return splitRow(line).map(function (cell) {
      var left = cell.startsWith(':');
      var right = cell.endsWith(':');
      if (left && right) return 'center';
      if (right) return 'right';
      if (left) return 'left';
      return '';
    });
  }

  function isTableStart(lines, index) {
    if (index + 1 >= lines.length) return false;
    if (String(lines[index]).indexOf('|') === -1) return false;
    var sep = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1]);
    if (!sep) return false;
    var head = splitRow(lines[index]);
    var cols = splitRow(lines[index + 1]);
    return head.length === cols.length && head.length > 0;
  }

  function renderTable(lines, start) {
    var header = splitRow(lines[start]);
    var aligns = parseAligns(lines[start + 1]);
    var rows = [];
    var i = start + 2;
    while (i < lines.length && String(lines[i]).indexOf('|') !== -1 && !/^\s*$/.test(lines[i])) {
      rows.push(splitRow(lines[i]));
      i += 1;
    }

    function cell(tag, text, col) {
      var align = aligns[col] ? ' style="text-align:' + aligns[col] + '"' : '';
      return '<' + tag + align + '>' + inline(text) + '</' + tag + '>';
    }

    var html = '<div class="table-wrap"><table><thead><tr>';
    for (var c = 0; c < header.length; c += 1) html += cell('th', header[c], c);
    html += '</tr></thead><tbody>';
    for (var r = 0; r < rows.length; r += 1) {
      html += '<tr>';
      for (var c2 = 0; c2 < header.length; c2 += 1) {
        html += cell('td', rows[r][c2] == null ? '' : rows[r][c2], c2);
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    return { html: html, next: i };
  }

  function listInfo(line) {
    var match = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (!match) return null;
    return {
      indent: match[1].length,
      ordered: /\d/.test(match[2]),
      number: parseInt(match[2], 10),
      text: match[3]
    };
  }

  function indentOf(line) {
    var match = /^\s*/.exec(line);
    return match ? match[0].length : 0;
  }

  function renderList(lines, start) {
    var first = listInfo(lines[start]);
    var base = first.indent;
    var ordered = first.ordered;
    var items = [];
    var i = start;

    while (i < lines.length) {
      var info = listInfo(lines[i]);
      if (!info || info.indent < base) break;
      if (info.indent > base) break;

      var item = { lines: [info.text] };
      items.push(item);
      i += 1;

      while (i < lines.length) {
        if (/^\s*$/.test(lines[i])) {
          var nextLine = lines[i + 1];
          if (nextLine === undefined) break;
          var nextInfo = listInfo(nextLine);
          if (nextInfo && nextInfo.indent <= base) break;
          if (/^\s*$/.test(nextLine)) { i += 1; continue; }
          if (indentOf(nextLine) > base) {
            item.lines.push('');
            i += 1;
            continue;
          }
          break;
        }

        var current = listInfo(lines[i]);
        if (current && current.indent <= base) break;

        var indent = indentOf(lines[i]);
        if (indent > base) {
          var strip = Math.min(indent, base + 2);
          item.lines.push(lines[i].slice(strip));
          i += 1;
          continue;
        }

        if (!current) {
          item.lines.push(lines[i]);
          i += 1;
          continue;
        }
        break;
      }
    }

    var tag = ordered ? 'ol' : 'ul';
    var attrs = '';
    if (ordered && first.number && first.number !== 1) attrs = ' start="' + first.number + '"';
    var html = '<' + tag + attrs + '>';
    for (var k = 0; k < items.length; k += 1) {
      var content = renderBlocks(items[k].lines);
      content = content.replace(/^<p>([\s\S]*?)<\/p>/, '$1');
      html += '<li>' + content + '</li>';
    }
    html += '</' + tag + '>';
    return { html: html, next: i };
  }

  function renderBlocks(lines) {
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (/^\s*$/.test(line)) { i += 1; continue; }

      var fence = /^```([\w+#.-]*)\s*$/.exec(line);
      if (fence) {
        var code = [];
        i += 1;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) {
          code.push(lines[i]);
          i += 1;
        }
        if (i < lines.length) i += 1;
        out.push(codeBlock(code.join('\n'), fence[1]));
        continue;
      }

      var heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        var level = heading[1].length;
        out.push('<h' + level + '>' + inline(heading[2].trim()) + '</h' + level + '>');
        i += 1;
        continue;
      }

      if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        out.push('<hr>');
        i += 1;
        continue;
      }

      if (/^\s*>/.test(line)) {
        var quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ''));
          i += 1;
        }
        out.push('<blockquote>' + renderBlocks(quote) + '</blockquote>');
        continue;
      }

      if (isTableStart(lines, i)) {
        var table = renderTable(lines, i);
        out.push(table.html);
        i = table.next;
        continue;
      }

      if (listInfo(line)) {
        var list = renderList(lines, i);
        out.push(list.html);
        i = list.next;
        continue;
      }

      var paragraph = [line];
      i += 1;
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !BLOCK_START.test(lines[i])) {
        paragraph.push(lines[i]);
        i += 1;
      }
      out.push('<p>' + inline(paragraph.join('\n')) + '</p>');
    }

    return out.join('');
  }

  function render(markdown) {
    var source = String(markdown == null ? '' : markdown).replace(/\r\n?/g, '\n');
    if (!source.trim()) return '';
    return renderBlocks(source.split('\n'));
  }

  function bind(root) {
    if (!root || root.getAttribute('data-cc-md-bound') === '1') return;
    root.setAttribute('data-cc-md-bound', '1');
    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-copy-code]');
      if (!button || !root.contains(button)) return;
      var block = button.closest('.code-block');
      var code = block ? block.querySelector('pre code') : null;
      if (!code) return;
      var label = button.querySelector('span');
      var restore = function () {
        if (label) label.textContent = 'Copiar';
        button.classList.remove('is-copied');
      };
      if (CC.ui && typeof CC.ui.copy === 'function') {
        CC.ui.copy(code.textContent, 'Código copiado');
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(code.textContent).catch(function () {});
      }
      if (label) label.textContent = 'Copiado';
      button.classList.add('is-copied');
      global.setTimeout(restore, 1600);
    });
  }

  CC.markdown = {
    render: render,
    escape: escapeHtml,
    bind: bind
  };
})(window);
