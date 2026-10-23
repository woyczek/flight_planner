// V3 frame/lib (propriétaire : help) — rendu Markdown de l'aide, recopié tel quel de la V2 (apps/aide/markdown.js) le
// 23/10/2026 : l'écran d'aide du cadre (frame/help/help.js) le charge avec le cadre, gardé hors ligne par frame/sw.js.
(() => {
  'use strict';
  // Markdown → HTML pour la page Aide (apps/aide/aide.html) : ce qu'emploient les documents de docs/ — titres (ancres
  // stables), paragraphes, listes imbriquées (puces, numéros), tableaux (GitHub), blocs de code (dont mermaid, montré
  // tel quel), citations, filets, gras, italique, code, liens, images ; HTML limité (br, kbd, sup, sub, details,
  // summary, a id) ; commentaires HTML gardés à part (<!-- page: … --> : chapitre d'une page de la suite).
  // API : window.DocMarkdown.render(texte, { link(href) → href, image(src) → src }) → { html, headings, pages }
  //   headings : [{ level, id, text }] ; pages : { 'apps/…html': id du titre qui précède le commentaire }.
  if (window.DocMarkdown) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  } [c]));
  /** Ancre d'un titre, comme GitHub et GitLab : minuscules, lettres accentuées gardées, ponctuation retirée, espaces →
   *  tirets (« Fiche équipage » → fiche-équipage, « Reporting d'une famille » → reporting-dune-famille). */
  const slug = text => String(text).toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-');
  const ALLOWED = /^<\/?(br|kbd|sup|sub|details|summary)\s*\/?>$|^<a id="[\w-]+"><\/a>$/i;

  /** Éléments en ligne : code, images, liens, gras, italique, HTML autorisé. */
  function inline(text, opt) {
    const keep = [];
    const hold = h => `\u0000${keep.push(h) - 1}\u0000`;
    let s = String(text)
      .replace(/`([^`]+)`/g, (_, c) => hold(`<code>${esc(c)}</code>`))
      .replace(/<a id="[\w-]+"><\/a>|<\/?[a-z]+\s*\/?>/gi, m => ALLOWED.test(m) ? hold(m) : m)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, src) => hold(`<img src="${esc(opt.image ? opt.image(src) : src)}" alt="${esc(alt)}" loading="lazy">`))
      .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => {
        const h = opt.link ? opt.link(href) : href;
        const ext = /^https?:/i.test(h);
        return hold(`<a href="${esc(h)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${inline(label, opt)}</a>`);
      })
      .replace(/<(https?:\/\/[^>\s]+)>/g, (_, u) => hold(`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`));
    s = esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^\w*])\*([^*\s][^*]*)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i]);
  }

  /** Cellules d'une ligne de tableau (barres échappées « \| » gardées). */
  const cells = line => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));

  function render(md, opt = {}) {
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    const out = [],
      headings = [],
      pages = {},
      used = new Map();
    let i = 0,
      lastId = '';
    const para = [];
    const flush = () => {
      if (para.length) out.push(`<p>${inline(para.join(' '), opt)}</p>`);
      para.length = 0;
    };
    /** Liste à partir de la ligne i (indentation de base ind) ; rend le HTML et avance i. */
    const list = ind => {
      const ordered = /^\s*\d+[.)]\s/.test(lines[i]);
      const items = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i]);
        if (!m || m[1].length < ind) break;
        if (m[1].length > ind) { // sous-liste du dernier élément
          if (items.length) items[items.length - 1] += list(m[1].length);
          else i++;
          continue;
        }
        let text = m[3];
        i++;
        // suite de l'élément : lignes indentées sans puce
        while (i < lines.length && lines[i].trim() && !/^\s*([-*+]|\d+[.)])\s/.test(lines[i]) && /^\s+/.test(lines[i])) text += ' ' +
          lines[i++].trim();
        items.push(inline(text, opt));
        if (i < lines.length && !lines[i].trim() && /^\s*([-*+]|\d+[.)])\s/.test(lines[i + 1] || '') && (/^(\s*)/.exec(lines[i + 1])[1]
            .length >= ind)) i++; // ligne vide entre éléments
      }
      const tag = ordered ? 'ol' : 'ul';
      return `<${tag}>${items.map(x => `<li>${x}</li>`).join('')}</${tag}>`;
    };
    while (i < lines.length) {
      const line = lines[i];
      // commentaire HTML (une ou plusieurs lignes) : page de la suite rattachée au dernier titre
      if (/^\s*<!--/.test(line)) {
        flush();
        let c = line;
        while (!/-->/.test(c) && i + 1 < lines.length) c += '\n' + lines[++i];
        for (const m of c.matchAll(/page:\s*([\w./-]+\.html)/g)) pages[m[1]] = lastId;
        i++;
        continue;
      }
      // bloc de code
      const fence = /^\s*(```|~~~)\s*([\w-]*)/.exec(line);
      if (fence) {
        flush();
        const body = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence[1])) body.push(lines[i++]);
        i++;
        out.push(`<pre class="doc-code${fence[2] ? ` lang-${esc(fence[2])}` : ''}"><code>${esc(body.join('\n'))}</code></pre>`);
        continue;
      }
      // titre
      const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
      if (h) {
        flush();
        const level = h[1].length,
          text = h[2];
        let id = slug(text) || 'section';
        const n = used.get(id) || 0;
        used.set(id, n + 1);
        if (n) id += `-${n}`;
        lastId = id;
        headings.push({
          level,
          id,
          text: text.replace(/`/g, '')
        });
        out.push(`<h${level} id="${esc(id)}">${inline(text, opt)}<a class="doc-anchor" href="#${esc(id)}" aria-hidden="true">#</a></h${level}>`);
        i++;
        continue;
      }
      // filet
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
        flush();
        out.push('<hr>');
        i++;
        continue;
      }
      // tableau : ligne d'en-tête puis ligne de séparation
      if (line.includes('|') && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1] || '')) {
        flush();
        const head = cells(line),
          align = cells(lines[i + 1]).map(c => c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : '');
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
        const td = (tag, c, k) => `<${tag}${align[k] ? ` style="text-align:${align[k]}"` : ''}>${inline(c, opt)}</${tag}>`;
        out.push(`<div class="doc-table"><table><thead><tr>${head.map((c, k) => td('th', c, k)).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, k) => td('td', c, k)).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }
      // citation
      if (/^\s*>/.test(line)) {
        flush();
        const body = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ''));
        out.push(`<blockquote>${render(body.join('\n'), opt).html}</blockquote>`);
        continue;
      }
      // liste
      if (/^(\s*)([-*+]|\d+[.)])\s+/.test(line)) {
        flush();
        out.push(list(/^(\s*)/.exec(line)[1].length));
        continue;
      }
      if (!line.trim()) {
        flush();
        i++;
        continue;
      }
      para.push(line.trim().replace(/\s{2,}$/, '<br>'));
      i++;
    }
    flush();
    return {
      html: out.join('\n'),
      headings,
      pages
    };
  }
  window.DocMarkdown = {
    render,
    slug
  };
})();
