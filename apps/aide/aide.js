(() => {
  'use strict';
  // Page Aide (apps/aide/aide.html) : index documentaire (docs/README.md, colonne de gauche), document affiché
  // (docs/<FICHIER>.md, rendu par markdown.js), sommaire du document, recherche dans les deux manuels.
  //   ?doc=MANUEL_UTILISATEUR.md#ancre : document et chapitre ;
  //   ?from=apps/pilot/mes_missions.html : chapitre de cette page (entrée « Aide » de la barre latérale) — cherché dans
  //   le manuel utilisateur puis le manuel administrateur (commentaires <!-- page: … --> après le titre du chapitre).
  // Langue de la suite (en, de, es) : traduction docs/<langue>/<FICHIER>.md si elle existe, sinon le français ; les
  // adresses (?doc=) restent sans langue, la page suit le changement de langue.
  const HERE = document.currentScript?.src || location.href; // adresse de ce script (paquet des documents à côté)
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
  // dans la fenêtre d'aide d'une autre page (cadre de shared/repository_nav.js, openHelp) : pas d'en-tête ; la fenêtre
  // est prévenue de l'adresse lue (bouton « ↗ ») et fermée par Échap
  const FRAMED = document.documentElement.hasAttribute('data-help-frame');
  const tell = msg => FRAMED && window.parent.postMessage(msg, location.origin); // la page de la suite qui encadre l'aide, seulement
  if (FRAMED) document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !e.defaultPrevented) tell({
      repoHelp: 'close'
    });
  });
  const headerOffset = () => document.documentElement.style.setProperty('--repo-header-h', `${FRAMED ? 0 : document.querySelector('.repo-header')?.offsetHeight || 84}px`);
  headerOffset();
  window.addEventListener('resize', headerOffset);
  window.addEventListener('repository-design-change', () => setTimeout(headerOffset, 100));
  const cache = new Map();
  const tr = row => window.RepositoryKit?.t ? window.RepositoryKit.t(row) : row[0];
  // libellés fixes de la page (couche de traduction commune)
  window.RepositoryContentI18n?.([
    ['Aide', 'Help', 'Hilfe', 'Ayuda'],
    ['Manuels, guides et documentation de la suite', 'Manuals, guides and documentation of the suite',
      'Handbücher, Anleitungen und Dokumentation der Suite', 'Manuales, guías y documentación de la suite'
    ],
    ['Rechercher dans les manuels…', 'Search the manuals…', 'In den Handbüchern suchen…', 'Buscar en los manuales…'],
    ['Dans ce document', 'In this document', 'In diesem Dokument', 'En este documento'],
    ['Chargement de la documentation…', 'Loading the documentation…', 'Dokumentation wird geladen…', 'Cargando la documentación…']
  ]);
  /** Texte d'un document de docs/ (gardé pour la recherche) ; null s'il est absent. Un échec n'est pas gardé (serveur
   *  relancé, coupure) : relu à la demande suivante ; sa cause (code HTTP, serveur injoignable) reste dans failed. */
  const failed = new Map();
  // page ouverte en fichier local (file://, sans le lanceur) : le navigateur interdit la lecture des documents
  const LOCAL = location.protocol === 'file:';
  const localText = () => window.RepositoryKit.t([
    'Page ouverte en fichier local (file://) : le navigateur interdit d’y lire les documents. Ouvrir la suite par son lanceur — lancer.cmd (Windows) ou lancer.sh, à la racine de la suite — puis l’Aide depuis la barre latérale.',
    'Page opened as a local file (file://): the browser does not allow reading the documents there. Open the suite through its launcher — lancer.cmd (Windows) or lancer.sh, at the root of the suite — then Help from the sidebar.',
    'Seite als lokale Datei geöffnet (file://): Der Browser erlaubt dort nicht, die Dokumente zu lesen. Die Suite über ihren Starter öffnen — lancer.cmd (Windows) oder lancer.sh im Stammordner der Suite — dann die Hilfe über die Seitenleiste.',
    'Página abierta como archivo local (file://): el navegador no permite leer allí los documentos. Abrir la suite con su lanzador — lancer.cmd (Windows) o lancer.sh, en la raíz de la suite — y luego la Ayuda desde la barra lateral.'
  ]);
  // documents intégrés (apps/aide/docs_bundle.js, refait par tools/bump_versions.py) : lus en fichier local, ou si le
  // lanceur ne répond plus ; servie par le lanceur, la page lit les fichiers eux-mêmes (un document absent, HTTP 404,
  // ne fait pas charger le paquet)
  let bundle = null;
  const loadBundle = () => bundle ||= new Promise(res => {
    if (window.DOC_BUNDLE) return res(window.DOC_BUNDLE);
    const sc = document.createElement('script');
    sc.src = new URL('docs_bundle.js?v=191c9837', HERE).href;
    sc.onload = () => res(window.DOC_BUNDLE || {});
    sc.onerror = () => res({});
    document.head.append(sc);
  });
  const fromBundle = async name => (await loadBundle())[name] ?? null;
  async function text(name) {
    if (!cache.has(name)) {
      const p = LOCAL ? fromBundle(name) : fetch(new URL(name, DOCS), {
        cache: 'no-cache'
      }).then(r => r.ok ? r.text() : (failed.set(name, `HTTP ${r.status}`), null)).catch(async e => (await fromBundle(name)) ?? (failed.set(
        name, e.message || 'réseau'), null));
      cache.set(name, p);
      p.then(v => {
        if (v == null && cache.get(name) === p) cache.delete(name);
        else failed.delete(name);
      });
    }
    return cache.get(name);
  }
  const LANGS = ['en', 'de', 'es'];
  const lang = () => {
    const l = window.RepositoryNav?.getLanguage?.() || 'fr';
    return LANGS.includes(l) ? l : 'fr';
  };
  /** Fichier à lire pour un document : sa traduction dans la langue de la suite si elle existe, sinon le français. */
  // documents nommés par langue (« tutorial/installation.fr.md », « ….en.md ») : celui de la langue de la suite, sinon
  // l'anglais (allemand, espagnol), sinon le français — le menu de langue fait basculer le document affiché
  const LANG_SUFFIX = /\.(fr|en|de|es)\.md$/i;
  async function localized(name) {
    const l = lang();
    if (LANG_SUFFIX.test(name)) {
      for (const c of [l, 'en', 'fr']) {
        const n = name.replace(LANG_SUFFIX, `.${c}.md`);
        if ((await text(n)) != null) return n;
      }
      return name;
    }
    if (l === 'fr' || name.includes('/')) return name;
    return (await text(`${l}/${name}`)) != null ? `${l}/${name}` : name;
  }
  /** Adresse dans l'aide d'un lien écrit dans un document (autre .md : ouvert ici, sans dossier de langue ; le reste :
   *  relatif à docs/). */
  const link = (href, from) => {
    if (/^(https?:|mailto:|#)/i.test(href)) return href;
    const u = new URL(href, new URL(from, DOCS));
    const rel = u.href.startsWith(DOCS.href) ? u.href.slice(DOCS.href.length).replace(/^(en|de|es)\//, '') : '';
    if (rel && /\.md$/i.test(u.pathname)) return `?doc=${encodeURIComponent(rel.split('#')[0])}${u.hash}`;
    return /^https?:$/.test(u.protocol) ? u.href : '#'; // ni javascript:, ni data:, ni blob:
  };
  const render = (md, name) => window.DocMarkdown.render(md, {
    link: h => link(h, name),
    image: s => new URL(s, new URL(name, DOCS)).href
  });

  // ---- index documentaire : liens de docs/README.md, par section
  async function drawIndex(current) {
    const file = await localized(INDEX),
      md = await text(file),
      host = $('.doc-index');
    if (!md && LOCAL) {
      host.innerHTML = '';
      return;
    }
    if (!md) {
      host.innerHTML = `<p class="doc-empty">${esc(window.RepositoryKit.tf(['Index documentaire introuvable (docs/README.md{c}).', 'Documentation index not found (docs/README.md{c}).', 'Dokumentationsverzeichnis nicht gefunden (docs/README.md{c}).', 'Índice de la documentación no encontrado (docs/README.md{c}).'], {
        c: failed.has(file) ? ` — ${failed.get(file)}` : ''
      }))}</p>`;
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
      for (const m of line.matchAll(/\[([^\]]+)\]\(([^)\s]+\.md)(#[^)\s]*)?\)/g)) {
        const doc = decodeURIComponent(link(m[2], file).replace(/^\?doc=/, '')); // relatif à docs/, sans langue
        if (g && !g.items.some(x => x.file === doc)) g.items.push({
          label: m[1],
          file: doc
        });
      }
    }
    host.innerHTML = [{
      title: tr(['Accueil', 'Home', 'Start', 'Inicio']),
      items: [{
        label: tr(['Index documentaire', 'Documentation index', 'Dokumentationsverzeichnis', 'Índice de la documentación']),
        file: INDEX
      }]
    }, ...groups].filter(x => x.items.length).map(x => `<h3>${esc(x.title)}</h3><ul>${x.items.map(i => `<li><a href="?doc=${encodeURIComponent(i.file)}"${i.file === current ? ' class="on"' : ''}>${esc(i.label)}</a></li>`).join('')}</ul>`).join('');
  }

  // ---- document
  let shown = '', // fichier affiché (langue comprise)
    current = INDEX; // document affiché (sans langue)
  async function show(name, hash = '') {
    // un document de docs/ seulement (chemin relatif .md) : ?doc=https://… chargeait le texte d'un autre site, dont
    // les liens s'ouvraient ensuite dans la suite
    if (!/^(?:[\w-]+\/)*[\w.-]+\.md$/i.test(String(name || '')) || /(?:^|\/)\.\.?\//.test(name)) name = INDEX;
    tell({
      repoHelp: 'at',
      href: location.href
    });
    const file = await localized(name),
      md = await text(file);
    if (md == null && LOCAL) {
      body.innerHTML = `<p class="doc-empty">${esc(localText())}</p>`;
      return;
    }
    if (md == null) {
      body.innerHTML = `<p class="doc-empty">${esc(window.RepositoryKit.tf(['Document introuvable : docs/{n}{c}. La documentation se lit depuis la suite servie par le lanceur (tools/launch.py).', 'Document not found: docs/{n}{c}. The documentation is read from the suite served by the launcher (tools/launch.py).', 'Dokument nicht gefunden: docs/{n}{c}. Die Dokumentation wird aus der vom Starter bereitgestellten Suite gelesen (tools/launch.py).', 'Documento no encontrado: docs/{n}{c}. La documentación se lee desde la suite servida por el lanzador (tools/launch.py).'], {
        n: name,
        c: failed.has(file) ? ` (${failed.get(file)})` : ''
      }))}</p>`;
      return;
    }
    if (shown !== file) {
      const r = render(md, file);
      body.innerHTML = r.html;
      shown = file;
      current = name;
      document.title = `${tr(['Aide', 'Help', 'Hilfe', 'Ayuda'])} — ${r.headings[0]?.text || name}`;
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
      const f = await localized(m),
        md = await text(f);
      if (!md) continue;
      const id = render(md, f).pages[page];
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
    // dans la fenêtre d'aide : site extérieur dans un nouvel onglet, page de la suite à la place de la page appelante
    if (FRAMED && !/^(#|\?doc=)/.test(href)) {
      e.preventDefault();
      if (/^https?:/i.test(href) && new URL(href).origin !== location.origin) window.open(href, '_blank', 'noopener');
      else window.top.location.href = a.href;
      return;
    }
    if (href.startsWith('#')) {
      e.preventDefault();
      history.pushState(null, '', href);
      show(current, href);
    } else if (href.startsWith('?doc=')) {
      e.preventDefault();
      history.pushState(null, '', href);
      // lien vers la version d'une autre langue (« English version ») : même effet que le menu de langue de la suite
      const want = LANG_SUFFIX.exec(new URLSearchParams(href.slice(1)).get('doc') || '')?.[1]?.toLowerCase();
      if (want && want !== (window.RepositoryNav?.getLanguage?.() || 'fr') && window.RepositoryNav?.setLanguage) {
        window.RepositoryNav.setLanguage(want); // « repository-language-change » : document relu dans la langue choisie
        return;
      }
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
      for (const m of ['tutorial/installation.fr.md', ...MANUALS, 'MANUEL_EXPLOITATION.md']) {
        const f = await localized(m),
          md = await text(f);
        if (!md) continue;
        const heads = render(md, f).headings.slice();
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
      hits.innerHTML = found.length ? found.slice(0, 40).map(f => `<li><a href="?doc=${encodeURIComponent(f.doc)}#${esc(f.id)}">${esc(f.text)}<small>${esc(f.doc.replace(/\.md$/, '').replace(/_/g, ' ').toLowerCase())}</small></a></li>`).join('') : `<li class="doc-empty">${esc(tr(['Aucun résultat.', 'No results.', 'Keine Ergebnisse.', 'Sin resultados.']))}</li>`;
    }, 200);
  });

  // langue changée : documents relus dans la nouvelle langue
  window.addEventListener('repository-language-change', () => {
    shown = '';
    cache.clear();
    route();
  });
  route();
})();
