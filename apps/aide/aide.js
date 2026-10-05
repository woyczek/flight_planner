(() => {
  'use strict';
  // Page Aide (apps/aide/aide.html) : index documentaire (docs/README.md, colonne de gauche), document affiché
  // (docs/<FICHIER>.md, rendu par markdown.js), sommaire du document, recherche dans les deux manuels.
  //   ?doc=MANUEL_UTILISATEUR.md#ancre : document et chapitre ;
  //   ?from=apps/pilot/mes_missions.html : chapitre de cette page (entrée « Aide » de la barre latérale) — cherché dans
  //   le manuel utilisateur puis le manuel administrateur (commentaires <!-- page: … --> après le titre du chapitre).
  const DOCS = new URL('../../docs/', location.href),
    MANUALS = ['MANUEL_UTILISATEUR.md', 'MANUEL_ADMINISTRATEUR.md'],
    INDEX = 'README.md';
  const $ = s => document.querySelector(s),
    body = $('.doc-body'),
    esc = s => String(s).replace(/[&<>"]/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    } [c]));
  // hauteur de l'en-tête collé en haut (selon le design) : marge de défilement des titres visés (aide.html)
  const headerOffset = () => document.documentElement.style.setProperty('--repo-header-h', `${document.querySelector('.repo-header')?.offsetHeight || 84}px`);
  headerOffset();
  window.addEventListener('resize', headerOffset);
  window.addEventListener('repository-design-change', () => setTimeout(headerOffset, 100));
  const cache = new Map();
  /** Texte d'un document de docs/ (gardé pour la recherche) ; null s'il est absent. */
  async function text(name) {
    if (!cache.has(name)) cache.set(name, fetch(new URL(name, DOCS), {
      cache: 'no-cache'
    }).then(r => r.ok ? r.text() : null).catch(() => null));
    return cache.get(name);
  }
  /** Adresse dans l'aide d'un lien écrit dans un document (autre .md : ouvert ici ; le reste : relatif à docs/). */
  const link = (href, from) => {
    if (/^(https?:|mailto:|#)/i.test(href)) return href;
    const u = new URL(href, new URL(from, DOCS));
    const rel = u.href.startsWith(DOCS.href) ? u.href.slice(DOCS.href.length) : '';
    if (rel && /\.md$/i.test(u.pathname)) return `?doc=${encodeURIComponent(rel.split('#')[0])}${u.hash}`;
    return u.href;
  };
  const render = (md, name) => window.DocMarkdown.render(md, {
    link: h => link(h, name),
    image: s => new URL(s, new URL(name, DOCS)).href
  });

  // ---- index documentaire : liens de docs/README.md, par section
  async function drawIndex(current) {
    const md = await text(INDEX),
      host = $('.doc-index');
    if (!md) {
      host.innerHTML = '<p class="doc-empty">Index documentaire introuvable (docs/README.md).</p>';
      return;
    }
    const groups = [];
    let g = null;
    for (const line of md.split(/\r?\n/)) {
      const h = /^##\s+(.*)$/.exec(line);
      if (h) groups.push(g = {
        title: h[1],
        items: []
      });
      for (const m of line.matchAll(/\[([^\]]+)\]\(([^)\s]+\.md)(#[^)\s]*)?\)/g))
        if (g && !g.items.some(x => x.file === m[2])) g.items.push({
          label: m[1],
          file: m[2]
        });
    }
    host.innerHTML = [{
      title: 'Accueil',
      items: [{
        label: 'Index documentaire',
        file: INDEX
      }]
    }, ...groups].filter(x => x.items.length).map(x => `<h3>${esc(x.title)}</h3><ul>${x.items.map(i => `<li><a href="?doc=${encodeURIComponent(i.file)}"${i.file === current ? ' class="on"' : ''}>${esc(i.label)}</a></li>`).join('')}</ul>`).join('');
  }

  // ---- document
  let shown = '';
  async function show(name, hash = '') {
    const md = await text(name);
    if (md == null) {
      body.innerHTML = `<p class="doc-empty">Document introuvable : docs/${esc(name)}. La documentation se lit depuis la suite servie par le lanceur.</p>`;
      return;
    }
    if (shown !== name) {
      const r = render(md, name);
      body.innerHTML = r.html;
      shown = name;
      document.title = `Aide — ${r.headings[0]?.text || name}`;
      const toc = r.headings.filter(h => h.level === 2 || h.level === 3);
      $('.doc-toc-title').hidden = !toc.length;
      $('.doc-toc').innerHTML = toc.map(h => `<li class="l${h.level}"><a href="#${esc(h.id)}">${esc(h.text.replace(/\*\*/g, ''))}</a></li>`).join('');
      await drawIndex(name);
    }
    const target = hash && document.getElementById(decodeURIComponent(hash.replace(/^#/, '')));
    if (target) {
      target.scrollIntoView({
        block: 'start'
      });
      target.classList.remove('doc-target');
      void target.offsetWidth;
      target.classList.add('doc-target');
    } else window.scrollTo(0, 0);
    document.querySelectorAll('.doc-toc a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === hash));
  }
  /** Chapitre d'une page de la suite : { doc, id } (manuel utilisateur d'abord), null sinon. */
  async function chapterOf(page) {
    for (const m of MANUALS) {
      const md = await text(m);
      if (!md) continue;
      const id = render(md, m).pages[page];
      if (id !== undefined) return {
        doc: m,
        id
      };
    }
    return null;
  }
  /** Ouvre ce que demande l'adresse. */
  async function route() {
    const q = new URLSearchParams(location.search);
    const from = q.get('from');
    if (from && !q.get('doc')) {
      const c = await chapterOf(from.replace(/^\/+/, '').split(/[?#]/)[0]);
      if (c) {
        history.replaceState(null, '', `?doc=${encodeURIComponent(c.doc)}#${c.id}`);
        return show(c.doc, `#${c.id}`);
      }
      history.replaceState(null, '', `?doc=${encodeURIComponent(MANUALS[0])}`);
      return show(MANUALS[0]);
    }
    return show(q.get('doc') || INDEX, location.hash);
  }

  // ---- navigation interne (sans recharger la page)
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || a.target) return;
    const href = a.getAttribute('href');
    if (href.startsWith('#')) {
      e.preventDefault();
      history.pushState(null, '', href);
      show(shown, href);
    } else if (href.startsWith('?doc=')) {
      e.preventDefault();
      history.pushState(null, '', href);
      route();
    }
  });
  window.addEventListener('popstate', route);

  // ---- recherche dans les manuels (titres et texte des chapitres)
  const hits = $('.doc-hits');
  let timer = 0;
  $('.doc-search').addEventListener('input', e => {
    clearTimeout(timer);
    const q = e.target.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    timer = setTimeout(async () => {
      if (q.length < 3) {
        hits.hidden = true;
        hits.innerHTML = '';
        return;
      }
      const found = [];
      for (const m of [...MANUALS, 'TUTORIAL.md', 'MANUEL_EXPLOITATION.md']) {
        const md = await text(m);
        if (!md) continue;
        const heads = render(md, m).headings.slice();
        // découpe par titre : chaque section cherchée dans son texte, rattachée à son titre (même texte, dans l'ordre)
        const parts = md.split(/\r?\n(?=#{1,4}\s)/);
        parts.forEach(part => {
          const t = /^#{1,4}\s+(.*?)\s*#*\s*$/.exec(part.split(/\r?\n/)[0])?.[1];
          const k = t == null ? -1 : heads.findIndex(x => x.text === t.replace(/`/g, ''));
          if (k < 0) return;
          const h = heads.splice(0, k + 1).pop();
          const flat = part.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
          if (flat.includes(q)) found.push({
            doc: m,
            id: h.id,
            text: h.text,
            title: h.level <= 2
          });
        });
      }
      hits.hidden = false;
      hits.innerHTML = found.length ? found.slice(0, 40).map(f => `<li><a href="?doc=${encodeURIComponent(f.doc)}#${esc(f.id)}">${esc(f.text)}<small>${esc(f.doc.replace(/\.md$/, '').replace(/_/g, ' ').toLowerCase())}</small></a></li>`).join('') : '<li class="doc-empty">Aucun résultat.</li>';
    }, 200);
  });

  route();
})();
