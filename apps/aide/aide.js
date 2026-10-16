(() => {
  'use strict';
  // Page Aide (apps/aide/aide.html) : structure fixe (HELP ci-dessous : tutoriels, manuels, exploitation, développeurs),
  // dont sont tirés l'accueil et l'index de gauche ; document affiché (docs/<FICHIER>.md, rendu par markdown.js),
  // sommaire du document, recherche dans les tutoriels et les manuels (documentation développeur en option).
  //   ?doc=MANUEL_UTILISATEUR.md#ancre : document et chapitre ;
  //   ?from=apps/pilot/mes_missions.html : chapitre de cette page (entrée « Aide » de la barre latérale) — cherché dans
  //   le manuel utilisateur puis le manuel administrateur (commentaires <!-- page: … --> après le titre du chapitre).
  // Langue de la suite (en, de, es) : traduction docs/<langue>/<FICHIER>.md si elle existe, sinon le français ; les
  // adresses (?doc=) restent sans langue, la page suit le changement de langue.
  const HERE = document.currentScript?.src || location.href; // adresse de ce script (paquet des documents à côté)
  const DOCS = new URL('../../docs/', location.href),
    MANUALS = ['MANUEL_UTILISATEUR.md', 'MANUEL_PLANIFICATEUR.md', 'MANUEL_ADMINISTRATEUR.md'],
    INDEX = 'README.md'; // ancien index (docs/README.md) : l'accueil de l'aide le remplace
  // ---- structure de l'aide : une source par sujet. Tutoriels d'abord (pas à pas, captures ; absents : non montrés),
  // manuels (un chapitre par page, quatre langues), exploitation, documentation développeur (repliée, hors recherche
  // par défaut, liste tirée de docs/technique/README.md).
  const TUTORIALS = [{
    file: 'tutorial/installation.fr.md',
    title: ['Installer la suite', 'Install the suite', 'Die Suite installieren', 'Instalar la suite'],
    desc: ['Lanceur, données, navigateur, premier réglage : la suite prête en quelques minutes.',
      'Launcher, data, browser, first settings: the suite ready in a few minutes.',
      'Starter, Daten, Browser, erste Einstellungen: die Suite in wenigen Minuten bereit.',
      'Lanzador, datos, navegador, primeros ajustes: la suite lista en pocos minutos.'
    ]
  }, {
    file: 'tutorial/first_report.fr.md',
    title: ['Écrire son premier compte rendu', 'Write your first mission report', 'Den ersten Einsatzbericht schreiben',
      'Escribir su primer informe de misión'
    ],
    desc: ['D’une mission reçue au compte rendu envoyé, champ par champ.',
      'From a received mission to the report sent, field by field.',
      'Von der erhaltenen Mission bis zum gesendeten Bericht, Feld für Feld.',
      'De la misión recibida al informe enviado, campo por campo.'
    ]
  }, {
    file: 'tutorial/mission_end_to_end.fr.md',
    title: ['Préparer une mission de bout en bout', 'Prepare a mission end to end', 'Eine Mission von Anfang bis Ende vorbereiten',
      'Preparar una misión de principio a fin'
    ],
    desc: ['Commande ou squelette, textes, points au studio, cartes, brief PDF.',
      'Order or skeleton, texts, points in the studio, maps, PDF brief.',
      'Bestellung oder Gerüst, Texte, Punkte im Studio, Karten, PDF-Briefing.',
      'Encargo o esqueleto, textos, puntos en el estudio, mapas, brief PDF.'
    ]
  }, {
    file: 'tutorial/fuel_profile.fr.md',
    title: ['Créer une fiche de performances', 'Create a performance sheet', 'Ein Leistungsblatt anlegen',
      'Crear una ficha de rendimiento'
    ],
    desc: ['Fiches de performances : créer la fiche (SimBrief, ChatGPT, classe), la compléter, l’utiliser dans le Carburant.',
      'Performance sheets: create the sheet (SimBrief, ChatGPT, class), complete it, use it in Fuel.',
      'Leistungsblätter: das Blatt anlegen (SimBrief, ChatGPT, Klasse), ergänzen, in Kraftstoff nutzen.',
      'Fichas de rendimiento: crear la ficha (SimBrief, ChatGPT, clase), completarla, usarla en Combustible.'
    ]
  }];
  const HELP = [{
    id: 'tutorials',
    title: ['Tutoriels', 'Tutorials', 'Tutorials', 'Tutoriales'],
    items: TUTORIALS
  }, {
    id: 'manuals',
    title: ['Manuels', 'Manuals', 'Handbücher', 'Manuales'],
    items: [{
      file: 'MANUEL_UTILISATEUR.md',
      chapters: true,
      title: ['Manuel du pilote', 'Pilot manual', 'Pilotenhandbuch', 'Manual del piloto'],
      desc: ['Pilotes : chaque page de la suite, bloc par bloc.', 'Pilots: every page of the suite, block by block.',
        'Piloten: jede Seite der Suite, Block für Block.', 'Pilotos: cada página de la suite, bloque por bloque.'
      ]
    }, {
      file: 'MANUEL_PLANIFICATEUR.md',
      chapters: true,
      title: ['Manuel du planificateur', 'Planner manual', 'Handbuch des Planers', 'Manual del planificador'],
      desc: ['Centre : préparer et suivre les missions (générateur, studio, registre, Planning ODV, tableau).',
        'Centre: prepare and follow the missions (generator, studio, registry, ODV planning, board).',
        'Zentrum: Missionen vorbereiten und verfolgen (Generator, Studio, Register, ODV-Planung, Einsatztafel).',
        'Centro: preparar y seguir las misiones (generador, estudio, registro, planificación ODV, tablero).'
      ]
    }, {
      file: 'MANUEL_ADMINISTRATEUR.md',
      chapters: true,
      title: ['Manuel de l’administrateur', 'Administrator manual', 'Administratorhandbuch', 'Manual del administrador'],
      desc: ['Fonctionnement global : accès au Centre, paramètres, synchronisation, lanceur, données et sauvegardes.',
        'How the suite works: Centre access, settings, synchronisation, launcher, data and backups.',
        'Gesamtbetrieb: Zugang zum Zentrum, Einstellungen, Synchronisierung, Starter, Daten und Sicherungen.',
        'Funcionamiento global: acceso al Centro, ajustes, sincronización, lanzador, datos y copias de seguridad.'
      ]
    }]
  }, {
    id: 'operations',
    title: ['Exploitation', 'Operations', 'Betrieb', 'Operación'],
    items: [{
      file: 'MANUEL_EXPLOITATION.md',
      title: ['Manuel d’exploitation', 'Operations manual', 'Betriebshandbuch', 'Manual de operación'],
      desc: ['Installation, données, sauvegardes, mises à jour, publication d’une version.',
        'Installation, data, backups, updates, publishing a release.',
        'Installation, Daten, Sicherungen, Aktualisierungen, Veröffentlichung.',
        'Instalación, datos, copias de seguridad, actualizaciones, publicación de una versión.'
      ]
    }, {
      file: 'INSTALL.md',
      title: ['Installation (référence)', 'Installation (reference)', 'Installation (Referenz)', 'Instalación (referencia)']
    }, {
      file: 'VERSION.md',
      title: ['Notes de version', 'Release notes', 'Versionshinweise', 'Notas de versión']
    }, {
      file: 'CHANGELOG.md',
      title: ['Journal des modifications', 'Changelog', 'Änderungsprotokoll', 'Registro de cambios']
    }]
  }, {
    id: 'developers',
    title: ['Pour les développeurs', 'For developers', 'Für Entwickler', 'Para desarrolladores'],
    collapsed: true,
    from: 'technique/README.md'
  }];
  const HOME = ''; // accueil de l'aide (produit depuis HELP)
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
    ['Rechercher dans les tutoriels et les manuels…', 'Search the tutorials and manuals…', 'In Tutorials und Handbüchern suchen…',
      'Buscar en los tutoriales y los manuales…'
    ],
    ['Inclure la documentation développeur', 'Include developer documentation', 'Entwicklerdokumentation einbeziehen',
      'Incluir la documentación para desarrolladores'
    ],
    ['Tutoriels, manuels et documentation de la suite', 'Tutorials, manuals and documentation of the suite',
      'Tutorials, Handbücher und Dokumentation der Suite', 'Tutoriales, manuales y documentación de la suite'
    ],
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
    sc.src = new URL('docs_bundle.js?v=0', HERE).href;
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

  /** Documents d'une section de l'aide : [{ file, title, desc, chapters }] — tutoriels présents seulement ;
   *  développeurs : liens de docs/technique/README.md. */
  async function sectionItems(sec) {
    if (sec.from) {
      const md = await text(sec.from);
      if (!md) return [];
      const out = [{
        file: sec.from,
        title: [tr(['Index technique', 'Technical index', 'Technischer Index', 'Índice técnico'])]
      }];
      for (const m of md.matchAll(/\[([^\]]+)\]\(([^)\s#]+\.md)\)/g)) {
        const f = new URL(m[2], new URL(sec.from, DOCS)).href.slice(DOCS.href.length);
        if (f && !out.some(x => x.file === f)) out.push({
          file: f,
          title: [m[1]]
        });
      }
      return out;
    }
    const out = [];
    for (const it of sec.items)
      if (!it.file.startsWith('tutorial/') || (await text(await localized(it.file))) != null) out.push(it);
    return out;
  }
  /** Chapitres (titres de niveau 2) d'un manuel dans la langue de la page : [{ id, text }]. */
  async function chapters(file) {
    const f = await localized(file),
      md = await text(f);
    return md ? render(md, f).headings.filter(h => h.level === 2).map(h => ({
      id: h.id,
      text: h.text.replace(/\*\*/g, '')
    })) : [];
  }
  // ---- index de gauche : sections de l'aide ; manuels avec leurs chapitres (dépliés pour le manuel affiché) ;
  // développeurs repliés
  async function drawIndex(current) {
    const host = $('.doc-index'),
      parts = [`<ul><li><a href="?"${current === HOME ? ' class="on"' : ''}>${esc(tr(['Accueil de l’aide', 'Help home', 'Hilfe-Startseite', 'Inicio de la ayuda']))}</a></li></ul>`];
    for (const sec of HELP) {
      const items = await sectionItems(sec);
      if (!items.length) continue;
      const li = [];
      for (const it of items) {
        const on = it.file === current;
        let sub = '';
        if (it.chapters) {
          const ch = await chapters(it.file);
          if (ch.length) sub = `<details${on ? ' open' : ''}><summary>${esc(tr(['Chapitres', 'Chapters', 'Kapitel', 'Capítulos']))}</summary><ul>${ch.map(c => `<li><a href="?doc=${encodeURIComponent(it.file)}#${esc(c.id)}">${esc(c.text)}</a></li>`).join('')}</ul></details>`;
        }
        li.push(`<li><a href="?doc=${encodeURIComponent(it.file)}"${on ? ' class="on"' : ''}>${esc(tr(it.title))}</a>${sub}</li>`);
      }
      const list = `<ul>${li.join('')}</ul>`;
      parts.push(sec.collapsed ? `<details class="doc-dev"${items.some(i => i.file === current) ? ' open' : ''}><summary><h3>${esc(tr(sec.title))}</h3></summary>${list}</details>` : `<h3>${esc(tr(sec.title))}</h3>${list}`);
    }
    host.innerHTML = parts.join('');
  }
  /** Accueil de l'aide : tutoriels en tête (une phrase chacun), puis manuels et exploitation ; développeurs replié. */
  async function showHome() {
    const card = it => `<li><a href="?doc=${encodeURIComponent(it.file)}"><b>${esc(tr(it.title))}</b></a>${it.desc ? `<br><span>${esc(tr(it.desc))}</span>` : ''}</li>`;
    const html = [`<h1>${esc(tr(['Aide', 'Help', 'Hilfe', 'Ayuda']))}</h1><p>${esc(tr([
      'Commencez par un tutoriel ; les manuels décrivent chaque page, bloc par bloc. Depuis n’importe quelle page, « Aide » de la barre latérale ouvre le chapitre de la page.',
      'Start with a tutorial; the manuals describe every page, block by block. From any page, “Help” in the sidebar opens the page’s chapter.',
      'Beginnen Sie mit einem Tutorial; die Handbücher beschreiben jede Seite, Block für Block. Von jeder Seite aus öffnet „Hilfe“ in der Seitenleiste das Kapitel der Seite.',
      'Empiece por un tutorial; los manuales describen cada página, bloque por bloque. Desde cualquier página, «Ayuda» en la barra lateral abre el capítulo de la página.'
    ]))}</p>`];
    for (const sec of HELP) {
      const items = await sectionItems(sec);
      if (!items.length) continue;
      if (sec.collapsed) html.push(`<details><summary><h2>${esc(tr(sec.title))}</h2></summary><ul>${items.map(card).join('')}</ul></details>`);
      else html.push(`<h2>${esc(tr(sec.title))}</h2><ul class="doc-cards">${items.map(card).join('')}</ul>`);
    }
    body.innerHTML = html.join('');
    shown = '';
    current = HOME;
    document.title = tr(['Aide', 'Help', 'Hilfe', 'Ayuda']);
    $('.doc-toc-title').hidden = true;
    $('.doc-toc').innerHTML = '';
    await drawIndex(HOME);
    window.scrollTo(0, 0);
  }
  /** Titre d'un document de l'aide (structure), sinon son nom. */
  const docTitle = file => {
    for (const sec of HELP)
      for (const it of sec.items || [])
        if (it.file === file) return tr(it.title);
    return file.replace(/\.md$/, '').replace(/_/g, ' ');
  };

  // ---- document
  let shown = '', // fichier affiché (langue comprise)
    current = HOME; // document affiché (sans langue) ; HOME : accueil de l'aide
  async function show(name, hash = '') {
    if (!name || name === INDEX) return showHome();
    // un document de docs/ seulement (chemin relatif .md) : ?doc=https://… chargeait le texte d'un autre site, dont
    // les liens s'ouvraient ensuite dans la suite
    if (!/^(?:[\w-]+\/)*[\w.-]+\.md$/i.test(String(name || '')) || /(?:^|\/)\.\.?\//.test(name)) return showHome();
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
    return show(q.get('doc') || HOME, location.hash);
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
  // case « documentation développeur » : recherche relancée
  $('.doc-dev-search')?.addEventListener('change', () => $('.doc-search').dispatchEvent(new Event('input')));
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
      const scope = [...(await sectionItems(HELP[0])).map(x => x.file), ...MANUALS, 'MANUEL_EXPLOITATION.md', ...($(
          '.doc-dev-search')
        ?.checked ? (await sectionItems(HELP[4])).map(x => x.file) : [])];
      for (const m of scope) {
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
      hits.innerHTML = found.length ? found.slice(0, 40).map(f => `<li><a href="?doc=${encodeURIComponent(f.doc)}#${esc(f.id)}">${esc(f.text)}<small>${esc(docTitle(f.doc))}</small></a></li>`).join('') : `<li class="doc-empty">${esc(tr(['Aucun résultat.', 'No results.', 'Keine Ergebnisse.', 'Sin resultados.']))}</li>`;
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
