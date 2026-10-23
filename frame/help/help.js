(() => {
  'use strict';
  // V3 — aide de l'application (frame/help/SPEC.md) : écran #help du cadre et panneau « Comment s'en servir » en tête de
  // chaque module.
  //   · source : le manuel assemblé frame/help/pilot.<langue>.md (frame/help/build_help.py, depuis
  //     modules/<id>/help/<langue>.md, dans l'ordre du menu) ; chaque chapitre commence par <!-- chapter: <id> --> ;
  //   · panneau d'un module : la première section (## …) de son chapitre, repliée par défaut, état gardé par module sur
  //     l'appareil (device/help.json) ; lien « Lire tout le chapitre » vers #help?m=<id> ; le module n'écrit aucun code ;
  //   · écran #help : le texte d'abord (le chapitre du module d'où l'on vient), « Sommaire ▾ » replié sur téléphone,
  //     « ↑ Sommaire » en fin de chapitre ; les liens internes deviennent #help?a=<ancre> (le routeur garde la main) ;
  //   · ctx.help d'un module : open(sujet) ouvre son panneau au paragraphe dont le sujet en gras commence ainsi ;
  //     link(id) rend l'adresse de son chapitre ;
  //   · tutoriels (frame/help/tutorial/<id>.<langue>.md, anglais d'abord) : écran #help?t=<id>, captures dans img/ ;
  //     langue absente : l'anglais ; carte d'accueil à la première ouverture (welcome), jusqu'à sa fermeture ou à
  //     l'ouverture d'un tutoriel (device/help.json, welcomed) ; elle mène aussi à l'import d'une configuration
  //     (#settings?import=1).
  // Contexte donné par frame/app.js : { t, lang, own (device/, politique cache), root }.
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const LANGS = ['fr', 'en', 'de', 'es'];
  const T = {
    title: ['Aide', 'Help', 'Hilfe', 'Ayuda'],
    roadmap: ['Feuille de route : ce qui est livré, en cours, prévu', 'Roadmap: what is delivered, in progress, planned',
      'Fahrplan: was geliefert, in Arbeit, geplant ist', 'Hoja de ruta: lo entregado, en curso, previsto'
    ],
    label: ['{h} :', '{h}:', '{h}:', '{h}:'],
    contents: ['Sommaire', 'Contents', 'Inhalt', 'Índice'],
    back: ['↑ Sommaire', '↑ Contents', '↑ Inhalt', '↑ Índice'],
    chapter: ['Lire tout le chapitre', 'Read the whole chapter', 'Ganzes Kapitel lesen', 'Leer todo el capítulo'],
    missing: ['L’aide n’est pas encore disponible sur cet appareil (hors ligne à la première visite ?).',
      'Help is not available on this device yet (offline at the first visit?).',
      'Die Hilfe ist auf diesem Gerät noch nicht verfügbar (beim ersten Besuch offline?).',
      'La ayuda aún no está disponible en este dispositivo (¿sin conexión en la primera visita?).'
    ],
    manual: ['← Le manuel', '← The manual', '← Das Handbuch', '← El manual'],
    welcome: ['Première fois ? Commencez par un tutoriel court :', 'First time here? Start with a short tutorial:',
      'Zum ersten Mal hier? Beginnen Sie mit einem kurzen Tutorial:', '¿Primera vez? Empiece con un tutorial corto:'
    ],
    welcomeLater: ['Tous deux restent dans l’aide (?), en tête du manuel.', 'Both stay in the help (?), at the top of the manual.',
      'Beide bleiben in der Hilfe (?), am Anfang des Handbuchs.', 'Ambos quedan en la ayuda (?), al principio del manual.'
    ],
    close: ['Fermer', 'Close', 'Schließen', 'Cerrar'],
    welcomeImport: ['Une configuration reçue de votre compagnie ? L’importer', 'A configuration from your airline? Import it',
      'Eine Konfiguration von Ihrer Fluggesellschaft? Importieren', '¿Una configuración de su aerolínea? Importarla'
    ],
    start: ['Commencer par…', 'Start with…', 'Beginnen Sie mit…', 'Empiece por…'],
    next: ['Tutoriel suivant : {t} →', 'Next tutorial: {t} →', 'Nächstes Tutorial: {t} →', 'Siguiente tutorial: {t} →'],
    inEnglish: ['(en anglais)', '(in English)', '(auf Englisch)', '(en inglés)']
  };
  // tutoriels, dans l'ordre d'usage (fichiers frame/help/tutorial/<id>.<langue>.md, vérifiés par build_help.py)
  const TUTORIALS = [{
    id: 'prepare-flight',
    title: ['Préparer un vol', 'Prepare a flight', 'Einen Flug vorbereiten', 'Preparar un vuelo']
  }, {
    id: 'write-report',
    title: ['Écrire un compte rendu', 'Write a report', 'Einen Bericht schreiben', 'Escribir un informe']
  }];
  const docs = {}; // langue → promesse du texte du manuel (null s'il est introuvable)
  const tuts = {}; // « id.langue » → promesse du texte d'un tutoriel (null s'il est introuvable)

  /** Texte du manuel dans la langue de l'appli (repli : français) ; null s'il est introuvable. */
  async function manual(c) {
    const get = l => docs[l] ||= fetch(new URL(`frame/help/pilot.${l}.md`, c.root), {
      cache: 'no-cache'
    }).then(r => r.ok ? r.text() : null).catch(() => null);
    const l = LANGS.includes(c.lang()) ? c.lang() : 'fr',
      text = (await get(l)) ?? (l === 'fr' ? null : await get('fr'));
    // typographie française, comme les textes du cadre : espace fine insécable avant : ; ! ? » et après «
    return text && (l === 'fr' || !(await get(l))) ? frTypo(text) : text;
  }
  /** Typographie française : espace fine insécable avant : ; ! ? » et après «. */
  const frTypo = s => s.replace(/ ([:;!?»])/g, ' $1').replace(/« /g, '« ');
  /** Tutoriel id : { text, lang } dans la langue de l'appli, sinon l'anglais (sa langue d'écriture), sinon le
   *  français ; null s'il est introuvable. */
  async function tutorial(c, id) {
    const get = l => tuts[`${id}.${l}`] ||= fetch(new URL(`frame/help/tutorial/${id}.${l}.md`, c.root), {
      cache: 'no-cache'
    }).then(r => r.ok ? r.text() : null).catch(() => null);
    for (const l of [...new Set([LANGS.includes(c.lang()) ? c.lang() : 'fr', 'en', 'fr'])]) {
      const text = await get(l);
      if (text) return {
        text: l === 'fr' ? frTypo(text) : text,
        lang: l
      };
    }
    return null;
  }
  /** Note la carte d'accueil comme vue (device/help.json : welcomed) ; elle ne revient plus, et celle encore posée sous
   *  l'écran d'aide (le module reste dessous) est retirée. */
  async function welcomed(c) {
    for (const n of document.querySelectorAll('[data-welcome]')) n.remove();
    const s = (await c.own.get('device/help.json').catch(() => null)) || {};
    if (s.welcomed) return;
    await c.own.put('device/help.json', {
      ...s,
      welcomed: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).catch(() => {});
  }
  /** Chapitres du manuel : { intro, chapters: { id: texte } } (marqueurs <!-- chapter: id -->). */
  function split(text) {
    const parts = String(text || '').split(/^<!-- chapter: ([\w-]+) -->\s*$/m),
      chapters = {};
    for (let i = 1; i < parts.length; i += 2) chapters[parts[i]] = parts[i + 1];
    return {
      intro: parts[0],
      chapters
    };
  }
  /** Première section (## …) d'un chapitre : { title, body } ; null s'il n'y en a pas. */
  function howTo(chapter) {
    const m = /^## +(.+)$/m.exec(chapter || '');
    if (!m) return null;
    const rest = chapter.slice(m.index + m[0].length),
      end = rest.search(/^#{1,2} /m);
    return {
      title: m[1].trim(),
      body: end < 0 ? rest : rest.slice(0, end)
    };
  }
  /** HTML d'un texte Markdown, liens internes ramenés à l'écran d'aide (#help?a=…) sauf les adresses d'aide déjà
   *  écrites (#help?t=…, #help?m=…), liens extérieurs dans un onglet ; images relatives à base (dossier des tutoriels). */
  function md(text, base) {
    const r = window.DocMarkdown.render(text, {
      link: href => href.startsWith('#help?') ? href : href.startsWith('#') ? `#help?a=${encodeURIComponent(href.slice(1))}` : href,
      image: src => base && !/^[a-z]+:/i.test(src) ? new URL(src, base).href : src
    });
    return r;
  }
  /** Tableaux lisibles à 375 px : chaque cellule porte le titre de sa colonne (affiché en liste sur téléphone). */
  function labelTables(root, t) {
    for (const table of root.querySelectorAll('table')) {
      const heads = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
      for (const tr of table.querySelectorAll('tbody tr'))[...tr.children].forEach((td, i) => heads[i] && td.setAttribute('data-label', t(
        T.label, {
          h: heads[i]
        })));
    }
    // permaliens des titres (« # » du rendu) : ramenés à l'écran d'aide, le routeur garde la main
    for (const a of root.querySelectorAll('a.doc-anchor')) a.setAttribute('href', `#help?a=${encodeURIComponent(a.getAttribute('href').slice(1))}`);
    for (const a of root.querySelectorAll('a[href^="http"]')) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  }

  /** Panneau replié « Comment s'en servir » d'un module (élément à poser avant le module) ; null sans chapitre. */
  async function panel(id, c) {
    const ch = split(await manual(c)).chapters[id],
      sec = howTo(ch);
    if (!sec) return null;
    const state = (await c.own.get('device/help.json').catch(() => null)) || {},
      d = document.createElement('details');
    d.className = 'f-card f-help';
    d.dataset.help = id;
    d.open = !!state.open?.[id];
    d.innerHTML = `<summary>${esc(sec.title)}</summary><div class="f-doc">${md(sec.body).html}</div><p><a href="#help?m=${encodeURIComponent(id)}">${esc(c.t(T.chapter))}</a></p>`;
    labelTables(d, c.t);
    d.addEventListener('toggle', async () => {
      const s = (await c.own.get('device/help.json').catch(() => null)) || {};
      await c.own.put('device/help.json', {
        ...s,
        open: {
          ...(s.open || {}),
          [id]: d.open
        },
        updated_at: new Date().toISOString()
      });
    });
    return d;
  }
  /** ctx.help d'un module : open(sujet) ouvre son panneau (au paragraphe dont le sujet en gras commence par sujet) ;
   *  link(id) rend l'adresse d'un chapitre. */
  function forModule(id, view) {
    return Object.freeze({
      open(subject = '') {
        const d = view.querySelector(`[data-help="${CSS.escape(id)}"]`);
        if (!d) return false;
        d.open = true;
        const s = String(subject).toLowerCase(),
          p = s && [...d.querySelectorAll('p')].find(x => x.querySelector('strong')?.textContent.toLowerCase().startsWith(s));
        (p || d).scrollIntoView({
          block: 'start',
          behavior: 'smooth'
        });
        return true;
      },
      link: (m = id) => `#help?m=${encodeURIComponent(m)}`
    });
  }

  /** Liste des tutoriels (liens #help?t=<id>), « (en anglais) » quand la langue de l'appli manque. */
  async function tutorialList(c) {
    const items = await Promise.all(TUTORIALS.map(async x => {
      const got = await tutorial(c, x.id);
      return got ? `<li><a href="#help?t=${encodeURIComponent(x.id)}">${esc(c.t(x.title))}</a>${got.lang !== c.lang() ? ` <span class="f-muted">${esc(c.t(T.inEnglish))}</span>` : ''}</li>` : '';
    }));
    return items.join('');
  }
  /** Carte d'accueil de la première ouverture : les tutoriels ; null une fois vue (fermée, ou un tutoriel ouvert). */
  async function welcome(c) {
    const s = (await c.own.get('device/help.json').catch(() => null)) || {};
    if (s.welcomed) return null;
    const list = await tutorialList(c);
    if (!list) return null;
    const d = document.createElement('div');
    d.className = 'f-card f-welcome';
    d.dataset.welcome = '';
    d.innerHTML = `<div class="f-row"><b>${esc(c.t(T.welcome))}</b><button type="button" data-x aria-label="${esc(c.t(T.close))}">✕</button></div><ul>${list}</ul><p class="f-muted">${esc(c.t(T.welcomeLater))}</p><p><a href="#settings?import=1" data-import>${esc(c.t(T.welcomeImport))}</a></p>`;
    d.querySelector('[data-x]').onclick = () => {
      d.remove();
      welcomed(c);
    };
    // importer une configuration vaut ouverture : la carte ne revient plus
    d.querySelector('[data-import]').onclick = () => welcomed(c);
    return d;
  }
  /** Écran d'un tutoriel (#help?t=<id>) : « ← Le manuel », le texte et ses captures, puis le tutoriel suivant ; la
   *  carte d'accueil ne revient plus. */
  async function tutorialScreen(view, c, id, q) {
    const i = TUTORIALS.findIndex(x => x.id === id),
      got = i < 0 ? null : await tutorial(c, id);
    if (!got) {
      view.innerHTML = `<h1>${esc(c.t(T.title))}</h1><p class="f-card">${esc(c.t(T.missing))}</p>`;
      return;
    }
    welcomed(c);
    const r = md(got.text, new URL('frame/help/tutorial/', c.root).href),
      next = TUTORIALS[i + 1],
      doc = document.createElement('article');
    doc.className = 'f-doc f-tut';
    doc.dataset.tutorial = id;
    if (got.lang !== c.lang()) doc.lang = got.lang;
    doc.innerHTML = r.html;
    const back = `<a href="#help">${esc(c.t(T.manual))}</a>`;
    view.innerHTML = `<p class="f-back">${back}</p>`;
    view.append(doc);
    view.insertAdjacentHTML('beforeend', `<p class="f-back">${next ? `<a href="#help?t=${encodeURIComponent(next.id)}">${esc(c.t(T.next, { t: c.t(next.title) }))}</a> · ` : ''}${back}</p>`);
    labelTables(doc, c.t);
    // permaliens des titres : restent sur ce tutoriel
    for (const a of doc.querySelectorAll('a.doc-anchor')) a.setAttribute('href', a.getAttribute('href').replace('#help?', `#help?t=${encodeURIComponent(id)}&`));
    const target = q.a ? doc.querySelector(`[id="${CSS.escape(q.a)}"]`) : null;
    setTimeout(() => (target || view).scrollIntoView({
      block: 'start'
    }), 0);
  }

  /** Écran d'aide : le manuel entier, texte d'abord, ouvert au chapitre q.m ou à l'ancre q.a ; sommaire replié ;
   *  « Commencer par… » (les tutoriels) en tête ; q.t : un tutoriel. */
  async function screen(view, c, q = {}) {
    if (q.t) return tutorialScreen(view, c, q.t, q);
    const text = await manual(c);
    if (!text) {
      view.innerHTML = `<h1>${esc(c.t(T.title))}</h1><p class="f-card">${esc(c.t(T.missing))}</p>`;
      return;
    }
    // une seule passe de rendu : ancres uniques dans tout le manuel ; un chapitre = son titre « # » (un seul par
    // chapitre, vérifié par build_help.py), dans l'ordre des marqueurs <!-- chapter: <id> --> ; les titres « # » de
    // l'introduction viennent avant
    const {
      intro: introText,
      chapters
    } = split(text);
    const r = md(text),
      heads = r.headings.filter(h => h.level <= 2),
      ids = Object.keys(chapters),
      introH1 = (introText.match(/^# /gm) || []).length,
      chapterOf = Object.fromEntries(r.headings.filter(h => h.level === 1).slice(introH1).map((h, i) => [h.id, ids[i]]));
    const toc = `<details class="f-card f-toc" data-toc ${innerWidth > 760 ? 'open' : ''}><summary>${esc(c.t(T.contents))} ▾</summary><ul>${heads.map(h => `<li class="f-toc${h.level}"><a href="#help?a=${encodeURIComponent(h.id)}">${esc(h.text)}</a></li>`).join('')}</ul></details>`;
    const back = `<p class="f-back"><a href="#help?a=top">${esc(c.t(T.back))}</a></p>`;
    const tmp = document.createElement('div');
    tmp.innerHTML = r.html;
    const intro = document.createElement('div'),
      sections = [];
    intro.className = 'f-doc';
    intro.dataset.doc = '';
    for (const n of [...tmp.childNodes]) {
      const m = n.nodeName === 'H1' && chapterOf[n.id];
      if (m) {
        const sec = document.createElement('section');
        sec.className = 'f-doc';
        sec.dataset.chapter = m;
        sections.push(sec);
      }
      (sections.at(-1) || intro).append(n);
    }
    for (const sec of sections) sec.insertAdjacentHTML('beforeend', back);
    view.replaceChildren(intro);
    intro.insertAdjacentHTML('afterbegin', `<p class="f-rm-link"><a href="#roadmap">${esc(c.t(T.roadmap))}</a></p>`);
    // « Commencer par… » : les tutoriels, après le titre du manuel
    const list = await tutorialList(c);
    if (list)(intro.querySelector('h1 ~ p:not(.f-rm-link)') || intro.querySelector('h1') || intro.firstChild).insertAdjacentHTML(
      'afterend',
      `<div class="f-card f-start" data-start><b>${esc(c.t(T.start))}</b><ul>${list}</ul></div>`);
    view.insertAdjacentHTML('beforeend', toc);
    view.append(...sections);
    labelTables(view, c.t);
    // texte d'abord : le chapitre demandé (ou l'ancre) en tête de l'écran ; « ↑ Sommaire » ouvre le sommaire
    const target = q.a === 'top' ? view.querySelector('[data-toc]') : q.a ? view.querySelector(`[id="${CSS.escape(q.a)}"]`) : q.m ? view.querySelector(
      `[data-chapter="${CSS.escape(q.m)}"]`) : null;
    if (q.a === 'top') target.open = true;
    // après la mise en page (pas requestAnimationFrame : arrêté dans un onglet en arrière-plan)
    if (target) setTimeout(() => target.scrollIntoView({
      block: 'start'
    }), 0);
  }

  window.SogHelp = {
    panel,
    forModule,
    screen,
    welcome,
    split,
    howTo,
    T
  };
})();
