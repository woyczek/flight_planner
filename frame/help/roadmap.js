(() => {
  'use strict';
  // V3 — feuille de route de l'application (écran #roadmap du cadre ; frame/help/SPEC.md § 5). Source : frame/help/roadmap.json,
  // tenu par la session ergonomie : schéma sog-roadmap/1 (note, états, applications, voies et leurs éléments) ou schéma 2
  // (`schema` sog-roadmap/2, ou sog-roadmap/1 avec `version: 2` — la forme de tools/roadmap_build.py : le même, plus `kind` feature|bug par
  // élément, `milestones` pour la frise, `generated`, un identifiant et un jalon par élément).
  //   · schéma 1 : l'écran d'avant, inchangé — un tableau, une ligne par voie, quatre colonnes d'état, éléments en cartes courtes ;
  //     sur téléphone (≤ 760 px) une voie = une carte, éléments groupés par état (états vides omis) ;
  //   · schéma 2 : en plus, de haut en bas, la frise des jalons (si le fichier en a), deux onglets Fonctionnalités | Bogues
  //     (le compte entre parenthèses), le filtre par application (Toutes, puis les `apps` du fichier dans leur ordre), la case
  //     « Masquer les livrées » (cochée par défaut, mémorisée par appareil dans device/roadmap.json), puis le kanban ;
  //   · priorités (SOG-0066) : une carte à identifiant SOG-nnnn se copie (clic droit, appui long) et se glisse — dans sa colonne = son rang, sur la
  //     frise = son jalon — ; le lanceur l'écrit (roadmap/priorities → organisation/PRIORITES.json), sinon l'appareil la garde, « non envoyé » ;
  //   · couleur par état avec les seuls jetons du cadre ; hors ligne : le fichier est dans la liste du service worker.
  // Contexte donné par frame/app.js : { t, lang, own, root, notify, launcher }. Le fichier est une entrée du dépôt de code : tout est échappé.
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const ORDER = ['done', 'doing', 'planned', 'later'];
  const STORE = 'device/roadmap.json';
  const T = {
    title: ['Feuille de route', 'Roadmap', 'Fahrplan', 'Hoja de ruta'],
    updated: ['Mise à jour : {d}', 'Updated: {d}', 'Aktualisiert: {d}', 'Actualizado: {d}'],
    apps: ['Applications', 'Applications', 'Anwendungen', 'Aplicaciones'],
    lane: ['Voie', 'Lane', 'Bereich', 'Ámbito'],
    help: ['Aide', 'Help', 'Hilfe', 'Ayuda'],
    feature: ['Fonctionnalités', 'Features', 'Funktionen', 'Funciones'],
    bug: ['Bogues', 'Bugs', 'Fehler', 'Errores'],
    all: ['Toutes', 'All', 'Alle', 'Todas'],
    hide: ['Masquer les livrées', 'Hide delivered', 'Gelieferte ausblenden', 'Ocultar las entregadas'],
    doneOne: ['{n} livrée', '{n} delivered', '{n} geliefert', '{n} entregada'],
    doneMany: ['{n} livrées', '{n} delivered', '{n} geliefert', '{n} entregadas'],
    copied: ['Copié', 'Copied', 'Kopiert', 'Copiado'],
    unsent: ['non envoyé', 'not sent', 'nicht gesendet', 'no enviado'],
    noOrg: ['Pas de dossier « organisation » sur ce poste : l’ordre reste sur cet appareil.',
      'No “organisation” folder on this computer: the order stays on this device.',
      'Auf diesem Rechner gibt es keinen Ordner „organisation“: Die Reihenfolge bleibt auf diesem Gerät.',
      'No hay carpeta «organisation» en este equipo: el orden se queda en este dispositivo.'
    ],
    noWrite: ['Le lanceur n’a pas pu écrire les priorités : l’ordre reste sur cet appareil.',
      'The launcher could not write the priorities: the order stays on this device.',
      'Der Launcher konnte die Prioritäten nicht schreiben: Die Reihenfolge bleibt auf diesem Gerät.',
      'El lanzador no pudo escribir las prioridades: el orden se queda en este dispositivo.'
    ],
    // la vue « Priorités » (SOG-0160) : trois colonnes, les cartes à plat par rang
    vPrio: ['Priorités', 'Priorities', 'Prioritäten', 'Prioridades'],
    vThemes: ['Par thème', 'By theme', 'Nach Thema', 'Por tema'],
    colTest: ['En test', 'In test', 'Im Test', 'En prueba'],
    colBacklog: ['Backlog', 'Backlog', 'Backlog', 'Backlog'],
    colDone: ['Livré', 'Delivered', 'Geliefert', 'Entregado'],
    top: ['En tête', 'To the top', 'Ganz nach oben', 'Al principio'],
    up: ['Monter', 'Move up', 'Nach oben', 'Subir'],
    down: ['Descendre', 'Move down', 'Nach unten', 'Bajar'],
    sendTo: ['Envoyer vers…', 'Send to…', 'Senden an…', 'Enviar a…'],
    time: ['Jalons', 'Milestones', 'Meilensteine', 'Hitos'],
    current: ['jalon courant', 'current milestone', 'aktueller Meilenstein', 'hito actual'],
    nothing: ['Rien à afficher avec ces choix.', 'Nothing to show with these choices.',
      'Mit diesen Auswahlen gibt es nichts anzuzeigen.', 'No hay nada que mostrar con estas opciones.'
    ],
    missing: ['La feuille de route n’est pas encore disponible sur cet appareil (hors ligne à la première visite ?).',
      'The roadmap is not available on this device yet (offline at the first visit?).',
      'Der Fahrplan ist auf diesem Gerät noch nicht verfügbar (beim ersten Besuch offline?).',
      'La hoja de ruta aún no está disponible en este dispositivo (¿sin conexión en la primera visita?).'
    ]
  };
  /** Ligne [fr, en, de, es] d'un texte du fichier ({ fr, en, de, es }) ; une langue absente reprend l'anglais, puis le français. */
  const row = o => {
    if (typeof o === 'string') return o;
    const en = o?.en || o?.fr || '';
    return [o?.fr || en, en, o?.de || en, o?.es || en];
  };
  let docP = null;
  /** Feuille de route (JSON) ; null si elle est introuvable. */
  const load = c => docP ||= fetch(new URL('frame/help/roadmap.json', c.root), {
    cache: 'no-cache'
  }).then(r => r.ok ? r.json() : null).catch(() => null).then(d => (d || (docP = null), d));

  const ID = /^SOG-\d{4}$/;
  const MAX_ITEMS = 500,
    MAX_RANK = 99999;
  /** Les priorités lues d'ailleurs (le fichier du lanceur, le magasin de l'appareil) : seules les entrées aux règles — un identifiant SOG-nnnn, un jalon connu, un rang entier 1…99999 — et 500 au plus. */
  const cleanPri = (m, stones) => {
    const out = {};
    if (!m || typeof m !== 'object' || Array.isArray(m)) return out;
    let n = 0;
    for (const k of Object.keys(m)) {
      const v = m[k];
      if (!ID.test(k) || !v || typeof v !== 'object' || n >= MAX_ITEMS) continue;
      const e = {};
      if (typeof v.milestone === 'string' && (v.milestone === '' || stones.includes(v.milestone))) e.milestone = v
        .milestone; // '' : sans jalon (colonne Backlog)
      if (Number.isInteger(v.rank) && v.rank >= 1 && v.rank <= MAX_RANK) e.rank = v.rank;
      if (e.milestone === undefined && e.rank === undefined) continue;
      out[k] = e;
      n++;
    }
    return out;
  };
  /** Le magasin de l'appareil (device/roadmap.json) : { hideDone, pri (priorités pas encore envoyées), unsent (leurs identifiants) } ; masquer les livrées par défaut. */
  const readStore = async (c, stones) => {
    let s = null;
    try {
      s = await c.own?.get(STORE);
    } catch {
      s = null;
    }
    const pri = cleanPri(s?.pri, stones);
    return {
      hide: typeof s?.hideDone === 'boolean' ? s.hideDone : true,
      view: s?.view === 'priorities' ? 'priorities' :
      'themes', // la vue par défaut : par thème ; « Priorités » est un mode que l'utilisateur choisit, retenu sur l'appareil (SOG-0160)
      col: typeof s?.col === 'string' && /^[A-Za-z0-9._-]{1,40}$/.test(s.col) ? s.col :
      '', // la colonne que le téléphone montre (vérifiée à l'affichage : un jalon a pu fermer)
      pri,
      // les voies repliées ou dépliées à la main (identifiant de voie → vrai si repliée) : 200 au plus, des booléens seulement
      fold: Object.fromEntries(Object.entries(s?.fold && typeof s.fold === 'object' && !Array.isArray(s.fold) ? s.fold : {}).filter(([
        k, v
      ]) => k.length <= 80 && typeof v === 'boolean').slice(0, 200)),
      unsent: (Array.isArray(s?.unsent) ? s.unsent : []).filter(k => typeof k === 'string' && Object.hasOwn(pri, k))
    };
  };
  /** Mémorise une part du magasin de l'appareil (les autres parts sont gardées) ; sans effet si le magasin manque : le choix vaut pour cet affichage. */
  const saveStore = async (c, part) => {
    try {
      const s = (await c.own?.get(STORE).catch(() => null)) || {};
      await c.own?.put(STORE, {
        ...s,
        ...part
      });
    } catch {
      /* le choix vaut pour cet affichage seulement */
    }
  };

  /** Schéma 1 : l'écran d'avant (tableau de voies × états), inchangé. */
  function screenV1(view, c, d) {
    const {
      t
    } = c;
    const st = s => t(row(d.states?.[s] || s)),
      card = it => `<li class="f-rm-item" data-state="${esc(it.state)}">${esc(t(row(it)))}</li>`;
    const head = `<div class="f-rm-head" aria-hidden="true"><span></span>${ORDER.map(s => `<span data-state="${s}">${esc(st(s))}</span>`).join('')}</div>`;
    const lanes = d.lanes.map(l => {
      const app = (d.apps || []).find(a => a.id === l.app);
      return `<section class="f-rm-lane"><h2>${esc(t(row(l.label)))}${app ? ` <span class="f-muted">${esc(t(row(app.label)))}</span>` : ''}</h2>${ORDER.map(s => {
        const items = (l.items || []).filter(i => i.state === s);
        return `<div class="f-rm-col" data-state="${s}" ${items.length ? '' : 'data-empty'}><h3>${esc(st(s))}</h3><ul>${items.map(card).join('')}</ul></div>`;
      }).join('')}</section>`;
    }).join('');
    const apps = (d.apps || []).map(a => `<li class="f-rm-item" data-state="${esc(a.state)}"><b>${esc(t(row(a.label)))}</b> — ${esc(st(a.state))}</li>`).join('');
    view.innerHTML = `<h1>${esc(t(T.title))}</h1>
      ${d.note ? `<p class="f-card f-rm-note">${esc(t(row(d.note)))}</p>` : ''}
      <p class="f-muted">${esc(t(T.updated, { d: d.updated || '?' }))} · <a href="#help">${esc(t(T.help))}</a></p>
      ${apps ? `<h2>${esc(t(T.apps))}</h2><ul class="f-rm-apps">${apps}</ul>` : ''}
      <div class="f-rm">${head}${lanes}</div>`;
  }

  /** Schéma 2 : frise des jalons, onglets, filtre par application, case « Masquer les livrées », kanban ; les priorités de l'utilisateur (glisser une carte). */
  async function screenV2(view, c, d) {
    const {
      t
    } = c;
    const st = s => t(row(d.states?.[s] || s));
    const apps = Array.isArray(d.apps) ? d.apps : [];
    const stones = Array.isArray(d.milestones) ? d.milestones.filter(m => m && typeof m.id === 'string') : [];
    const stoneIds = stones.map(m => m.id);
    const saved = await readStore(c, stoneIds);
    const ui = {
      kind: 'feature',
      app: '',
      ms: '',
      hide: saved.hide,
      view: saved.view,
      col: saved.col, // le téléphone montre une colonne à la fois
      fold: saved.fold,
      file: {},
      // les priorités écrites par le lanceur (organisation/PRIORITES.json)
      local: saved.pri,
      // celles de cet appareil, pas encore envoyées
      unsent: new Set(saved.unsent)
    };
    const kindOf = it => it.kind === 'bug' ? 'bug' : 'feature';
    /** Les priorités en vigueur d'un élément : l'entrée de l'appareil, sinon celle du fichier du lanceur, sinon rien (le fichier généré les porte déjà quand il est régénéré). */
    const entOf = it => it.id && ID.test(it.id) ? ui.local[it.id] || ui.file[it.id] : undefined;
    const stoneOf = it => {
      const e = entOf(it);
      if (e?.milestone) return stones.find(m => m.id === e.milestone);
      if (e?.milestone === '') return undefined; // l'utilisateur l'a mise sans jalon (Backlog)
      return stones.find(m => m.id === it.milestone || (it.id && Array.isArray(m.items) && m.items.includes(it.id)));
    };
    const rankOf = it => entOf(it)?.rank ?? Infinity;
    /** Les éléments d'une voie que l'onglet `kind` montre avec les choix en cours (un jalon choisi passe avant « masquer les livrées »). */
    const shown = (l, kind) => (l.items || []).filter(i => ORDER.includes(i.state) && kindOf(i) === kind && (!ui.ms || stoneOf(i)
      ?.id === ui.ms) && (!ui.hide || ui.ms || i.state !== 'done' || (ui.view === 'priorities' && i.test ===
      true))); // vue Priorités : « masquer les livrées » masque Livré, jamais En test (SOG-0256) ; par thème : comme avant
    const lanesOf = () => (d.lanes || []).filter(l => !ui.app || l.app === ui.app);
    const count = kind => lanesOf().reduce((n, l) => n + shown(l, kind).length, 0);
    const current = (stones.find(m => m.state === 'doing') || stones.find(m => m.state === 'planned') || {}).id;
    // les colonnes des priorités (SOG-0256), de gauche à droite : « Livré », « En test » (livré, son verdict attendu : l'élément porte `test: true`), UNE PAR JALON OUVERT dans l'ordre de la frise (le nom de la colonne est celui du jalon),
    // puis « Backlog » (sans jalon). Livré et En test ne se remplissent pas à la main : on n'y glisse rien, on n'en sort rien.
    const FIXED = ['done', 'test'],
      openStones = stones.filter(m => m.state !== 'done'),
      COLS = [...openStones.map(m => m.id), 'backlog']; // les colonnes où l'on dépose
    const colName = k => k === 'done' ? t(T.colDone) : k === 'test' ? t(T.colTest) : k === 'backlog' ? t(T.colBacklog) : t(row(stones
      .find(m => m.id === k)?.label || k));
    /** La colonne d'un élément : livré → « Livré » (ou « En test » s'il attend son verdict) ; sinon son jalon s'il est ouvert (celui du fichier ou celui que l'utilisateur lui a donné), sinon « Backlog ». */
    const colOf = it => {
      if (it.state === 'done') return it.test === true ? 'test' : 'done';
      const m = stoneOf(it);
      return m && openStones.includes(m) ? m.id : 'backlog';
    };
    const itemById = id => (d.lanes || []).flatMap(l => l.items || []).find(i => i.id === id);
    const byRank = (a, b) => {
      const x = rankOf(a),
        y = rankOf(b);
      return x === y ? 0 : x < y ? -1 : 1;
    };
    const card = (it, lane) => {
      const m = stoneOf(it),
        dates = [it.since && `${it.since}`, it.delivered && `→ ${it.delivered}`].filter(Boolean).join(' '),
        ranked = it.id && ID.test(it.id);
      return `<li class="f-rm-item" data-state="${esc(it.state)}"${ranked ? ` data-id="${esc(it.id)}"` : ''}${dates ? ` title="${esc(dates)}"` : ''}>${it.id ? `<span class="f-rm-id">${esc(it.id)}</span> ` : ''}${esc(t(row(it)))}${m ? ` <small class="f-rm-ms">${esc(t(row(m.label || m.id)))}</small>` : ''}${ranked && ui.unsent.has(it.id) ? ` <small class="f-rm-unsent" data-unsent>${esc(t(T.unsent))}</small>` : ''}${lane ? ` <small class="f-rm-theme" data-theme>${esc(t(row(lane.label)))}</small>` : ''}${lane && ranked && it.state !== 'done' ? actions(it) : ''}</li>`;
    };
    /** Les gestes qui remplacent le glisser au téléphone : monter, descendre, envoyer vers une autre colonne. */
    const actions = it => `<span class="f-rm-act"><button type="button" data-top title="${esc(t(T.top))}"><span aria-hidden="true">⤒</span><span class="f-rm-lab">${esc(t(T.top))}</span></button><button type="button" data-up title="${esc(t(T.up))}"><span aria-hidden="true">▲</span><span class="f-rm-lab">${esc(t(T.up))}</span></button><button type="button" data-down title="${esc(t(T.down))}"><span aria-hidden="true">▼</span><span class="f-rm-lab">${esc(t(T.down))}</span></button><select data-send aria-label="${esc(t(T.sendTo))}"><option value="">${esc(t(T.sendTo))}</option>${COLS.filter(k => k !== colOf(it)).map(k => `<option value="${k}">${esc(colName(k))}</option>`).join('')}</select></span>`;
    const frieze = () => !stones.length ? '' : `<ol class="f-rm-time" aria-label="${esc(t(T.time))}">${stones.map(m => `<li><button type="button" class="f-rm-btn" data-ms="${esc(m.id)}" data-state="${ORDER.includes(m.state) ? esc(m.state) : 'planned'}" aria-pressed="${ui.ms === m.id}"${m.id === current ? ` data-current aria-current="step" title="${esc(t(T.current))}"` : ''}><b>${esc(t(row(m.label || m.id)))}</b>${m.date ? ` <span class="f-muted">${esc(m.date)}</span>` : ''}</button></li>`).join('')}</ol>`;
    /** Une voie est repliée : par le choix de l'appareil (au dernier toucher), sinon d'office quand elle n'a aucune carte non livrée dans la vue courante (onglet, filtre, jalon). */
    const folds = (l, own) => Object.hasOwn(ui.fold, l.id) ? ui.fold[l.id] : own.every(i => i.state === 'done');
    const lanes = () => {
      const html = lanesOf().map(l => {
        const own = shown(l, ui.kind),
          done = (l.items || []).filter(i => i.state === 'done' && kindOf(i) === ui.kind && (!ui.ms || stoneOf(i)?.id === ui.ms))
          .length,
          hidden = ui.hide && !ui.ms && done > 0;
        if (!own.length && !hidden) return '';
        const app = apps.find(a => a.id === l.app);
        const folded = folds(l, own);
        return `<section class="f-rm-lane" data-lane="${esc(l.id)}"${folded ? ' data-folded' : ''}><h2><button type="button" class="f-rm-fold" data-fold="${esc(l.id)}" aria-expanded="${!folded}"><span aria-hidden="true">${folded ? '▸' : '▾'}</span> ${esc(t(row(l.label)))}${app ? ` <span class="f-muted">${esc(t(row(app.label)))}</span>` : ''} <span class="f-muted" data-lane-count>(${own.length})</span>${hidden ? ` <span class="f-muted f-rm-done" data-done-count>${esc(t(done === 1 ? T.doneOne : T.doneMany, { n: done }))}</span>` : ''}</button></h2>${ORDER.map(s => {
          const items = own.filter(i => i.state === s).sort(byRank);
          return `<div class="f-rm-col" data-state="${s}" ${items.length ? '' : 'data-empty'}><h3>${esc(st(s))}</h3><ul>${items.map(i => card(i)).join('')}</ul></div>`;
        }).join('')}</section>`;
      }).join('');
      return html || `<p class="f-muted" data-nothing>${esc(t(T.nothing))}</p>`;
    };
    const head = `<div class="f-rm-head" aria-hidden="true"><span></span>${ORDER.map(s => `<span data-state="${s}">${esc(st(s))}</span>`).join('')}</div>`;
    /** La vue « Priorités » : les cartes à plat, par rang, dans les colonnes Livré (si on ne le masque pas), En test, une par jalon ouvert, Backlog ; le thème n'est qu'une étiquette de la carte. */
    /** La colonne que le téléphone montre : le choix de l'appareil s'il existe encore, sinon le jalon en cours, sinon la première colonne où l'on dépose. */
    const shownCol = cols => cols.includes(ui.col) ? ui.col : COLS.includes(current) ? current : COLS[0];
    const prio = () => {
      const list = lanesOf().flatMap(l => shown(l, ui.kind).map(i => [i, l])).map((x, n) => [...x, n]).sort((a, b) => byRank(a[0], b[
        0]) || a[2] - b[2]);
      const cols = [...(ui.hide && !ui.ms ? [] : ['done']), 'test', ...COLS], // « masquer les livrées » masque Livré, jamais En test
        now = shownCol(cols);
      return `<div class="f-rm-bar f-rm-colbar" role="tablist" data-colbar>${cols.map(k => `<button type="button" class="f-rm-btn" data-col-pick="${esc(k)}" aria-pressed="${now === k}">${esc(colName(k))} (${list.filter(x => colOf(x[0]) === k).length})</button>`).join('')}</div>` +
        `<div class="f-rm-prio" data-priorities style="--cols:${cols.length}">${cols.map(k => {
          const mine = list.filter(x => colOf(x[0]) === k);
          return `<div class="f-rm-pcol" data-col="${esc(k)}"${FIXED.includes(k) ? ' data-fixed' : ''}${now === k ? ' data-active' : ''}><h3>${esc(colName(k))} <span class="f-muted" data-col-count>(${mine.length})</span></h3><ul>${mine.map(x => card(x[0], x[1])).join('')}</ul></div>`;
        }).join('')}</div>`;
    };
    const draw = focus => {
      view.innerHTML = `<h1>${esc(t(T.title))}</h1>
        ${d.note ? `<p class="f-card f-rm-note">${esc(t(row(d.note)))}</p>` : ''}
        <p class="f-muted">${esc(t(T.updated, { d: d.updated || '?' }))} · <a href="#help">${esc(t(T.help))}</a></p>
        ${frieze()}
        <div class="f-rm-bar" role="tablist" data-views>${['priorities', 'themes'].map(v => `<button type="button" class="f-rm-btn" data-view="${v}" aria-pressed="${ui.view === v}">${esc(t(v === 'priorities' ? T.vPrio : T.vThemes))}</button>`).join('')}</div>
        <div class="f-rm-bar" role="tablist">${['feature', 'bug'].map(k => `<button type="button" role="tab" class="f-rm-btn" data-kind="${k}" aria-selected="${ui.kind === k}">${esc(t(T[k]))} (${count(k)})</button>`).join('')}</div>
        <div class="f-rm-bar" data-apps>${[{ id: '' }, ...apps].map(a => `<button type="button" class="f-rm-btn" data-app="${esc(a.id)}" aria-pressed="${ui.app === a.id}">${esc(a.id ? t(row(a.label)) : t(T.all))}</button>`).join('')}
          <label class="f-rm-hide"><input type="checkbox" data-hide ${ui.hide ? 'checked' : ''}> ${esc(t(T.hide))}</label></div>
        ${ui.view === 'themes' ? `<div class="f-rm" data-kanban>${head}${lanes()}</div>` : `<div data-kanban>${prio()}</div>`}`;
      if (focus) view.querySelector(focus)?.focus();
    };

    // ---- les priorités : écrites par le lanceur (roadmap/priorities), sinon gardées sur l'appareil, « non envoyé »
    const launcher = () => {
      try {
        return c.launcher?.() || null;
      } catch {
        return null;
      }
    };
    /** Appel du verbe roadmap/priorities du lanceur : son résultat, ou null (pas de lanceur, lanceur sans ce verbe, travail en échec). */
    const callPri = async args => {
      const L = launcher();
      if (!L) return null;
      const r = await L.job('regen/job', {
        set: 'roadmap',
        verb: 'priorities',
        args
      }).catch(() => null);
      return r?.ok && r.result && typeof r.result === 'object' ? r.result : null;
    };
    let sending = Promise.resolve(); // les envois se suivent : jamais deux à la fois
    /** Envoie les priorités de l'appareil avec celles du fichier ; vrai si le lanceur les a écrites (les « non envoyé » disparaissent), faux sinon (avec la raison dite). */
    const send = quiet => sending = sending.then(async () => {
      await pulling; // ce que le fichier porte déjà est lu avant d'écrire : un envoi ne l'écrase pas
      const mine = {
          ...ui.local
        },
        all = {
          ...ui.file,
          ...mine
        };
      const r = await callPri({
        action: 'set',
        items: Object.fromEntries(Object.entries(all).slice(0, MAX_ITEMS))
      });
      if (r?.ok) {
        // ce qui est parti n'est plus en attente ; un geste fait pendant l'envoi (une autre entrée) l'est encore
        ui.file = cleanPri(all, stoneIds);
        for (const k of Object.keys(mine)) {
          if (!ui.local[k] || JSON.stringify(ui.local[k]) === JSON.stringify(mine[k])) delete ui.local[k];
          if (!ui.local[k]) ui.unsent.delete(k);
        }
        await saveStore(c, {
          pri: ui.local,
          unsent: [...ui.unsent]
        });
        return true;
      }
      if (!quiet && launcher()) c.notify?.(t(r?.reason === 'no-organisation' ? T.noOrg : T.noWrite), 'warn');
      return false;
    });
    /** Lit organisation/PRIORITES.json par le lanceur au chargement (superposé au fichier généré) ; l'écran ne se redessine pas sous un glissement en cours. */
    let late = false,
      pulling = Promise.resolve();
    pulling = (async () => {
      const r = await callPri({
        action: 'get'
      });
      if (!r?.ok) return;
      ui.file = cleanPri(r.items, stoneIds);
      if (g) late = true;
      else draw();
    })();
    // ce que cet appareil gardait d'une séance sans lanceur part dès que la lecture est faite
    pulling.then(() => Object.keys(ui.local).length ? send(true).then(ok => ok && !g && draw()) : null);
    /** Garde un geste : l'entrée de chaque identifiant touché passe dans les priorités de l'appareil, puis on tente l'envoi. */
    const commit = async (next, touched) => {
      for (const [k, v] of Object.entries(next)) ui.local[k] = v;
      for (const k of touched) ui.unsent.add(k);
      await saveStore(c, {
        pri: ui.local,
        unsent: [...ui.unsent]
      });
      draw();
      if (await send(false)) draw();
    };
    /** Les identifiants du fichier dans l'ordre de priorité en vigueur (le rang, puis l'ordre du fichier). */
    const flat = () => (d.lanes || []).flatMap(l => l.items || []).filter(i => i.id && ID.test(i.id)).map((i, n) => [i, n]).sort((a,
      b) => byRank(a[0], b[0]) || a[1] - b[1]).map(x => x[0].id);
    /** `id` placé dans l'ordre de priorité : avant ou après `target`, ou, sans cible, en fin de la colonne `col` ; passé dans une autre colonne, il prend le jalon de cette colonne (un jalon qui manque : rien ne se passe). Tous les rangs sont
     *  réécrits 1…n (500 au plus), en un seul geste. */
    const place = (id, target, after, col) => {
      const me = itemById(id);
      if (!me) return;
      const ids = flat().filter(k => k !== id);
      const own = ids.filter(k => col && colOf(itemById(k)) === col);
      const at = target ? ids.indexOf(target) + (after ? 1 : 0) : own.length ? ids.indexOf(own[0]) : ids.length;
      if (target && ids.indexOf(target) < 0) return;
      const into = !!col && col !== colOf(me);
      if (into && !COLS.includes(col)) return; // Livré et En test ne reçoivent rien
      const ms = into ? col === 'backlog' ? '' : col : undefined; // « Backlog » : sans jalon
      ids.splice(at, 0, id);
      const next = {};
      ids.slice(0, MAX_ITEMS).forEach((k, n) => {
        const it = itemById(k);
        next[k] = {
          ...(it ? entOf(it) : {}),
          ...(k === id && ms !== undefined ? {
            milestone: ms
          } : {}),
          rank: n + 1
        };
      });
      return commit(next, [id]);
    };
    const reorder = (id, target, after) => place(id, target, after, null);
    /** `id` rattaché au jalon `ms`. */
    const reschedule = (id, ms) => {
      const it = (d.lanes || []).flatMap(l => l.items || []).find(i => i.id === id);
      if (!it || stoneOf(it)?.id === ms) return;
      return commit({
        [id]: {
          ...entOf(it),
          milestone: ms
        }
      }, [id]);
    };
    /** Copie « SOG-0046 — titre » dans le presse-papiers, puis le dit. */
    const copy = async id => {
      const it = (d.lanes || []).flatMap(l => l.items || []).find(i => i.id === id);
      const text = `${id} — ${t(row(it || {}))}`.trim();
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.append(ta);
        ta.select();
        try {
          ok = document.execCommand('copy');
        } catch {
          ok = false;
        }
        ta.remove();
      }
      if (ok) c.notify?.(t(T.copied), 'ok');
    };

    // ---- le geste : souris (glisser après 6 px), toucher (appui long, puis glisser ; relâché sans bouger = copie) ; clic droit = copie
    const LONG = 450,
      SLOP = 6;
    let g = null,
      scroller = null; // l'élément qui défile pendant le glissement (null : la page)
    /** L'ancêtre de l'écran qui défile (overflow auto ou scroll et plus haut que sa fenêtre), sinon null : la page. */
    const scrollParent = () => {
      for (let el = view; el && el !== document.documentElement; el = el.parentElement) {
        const o = getComputedStyle(el).overflowY;
        if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight) return el;
      }
      return null;
    };
    const clear = () => {
      if (!g) return;
      clearTimeout(g.timer);
      clearInterval(g.tick);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      for (const el of view.querySelectorAll('[data-drop],[data-dropcol],[data-armed],[data-drag]')) {
        el.removeAttribute('data-drop');
        el.removeAttribute('data-dropcol');
        el.removeAttribute('data-armed');
        el.removeAttribute('data-drag');
        el.style.transform = '';
      }
      delete view.dataset.dragging;
      g = null;
      if (late) {
        late = false;
        draw();
      }
    };
    /** La colonne où tomberait la carte : celle dont l'étendue horizontale contient le pointeur, sinon la plus proche, À N'IMPORTE QUELLE HAUTEUR (SOG-0257 : un déplacement latéral de 30 px, ou le pointeur dans l'espace
     *  entre deux colonnes, ou au-dessus de la carte la plus haute, suffit) ; une colonne qu'on ne remplit pas à la main (Livré) n'en est pas une ; null hors de la zone des colonnes. */
    const colAt = (x, y) => {
      const zone = view.querySelector('[data-priorities]')?.getBoundingClientRect();
      if (!zone || y < zone.top - 40 || y > zone.bottom + 40) return null;
      let best = null,
        gap = 1e9;
      for (const col of view.querySelectorAll('.f-rm-pcol[data-col]')) {
        if (!col.getClientRects().length) continue;
        const r = col.getBoundingClientRect(),
          d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
        if (d < gap) {
          gap = d;
          best = col;
        }
      }
      return best && gap <= 80 && !best.hasAttribute('data-fixed') ? best :
        null; // la plus proche : si c'est Livré ou En test, rien ne tombe (et pas dans sa voisine)
    };
    /** Où tomberait la carte sous le pointeur : { el, kind: 'before' | 'after' | 'milestone' | 'column', col } ou null. Sur une carte d'une colonne : avant ou après elle (une place précise) ; ailleurs dans la colonne (hors carte) : EN TÊTE. */
    const aim = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const ms = el?.closest?.('button[data-ms]');
      if (ms && view.contains(ms)) return {
        el: ms,
        kind: 'milestone'
      };
      const col = colAt(x, y);
      if (!col) return null;
      const li = el?.closest?.('li.f-rm-item[data-id]');
      if (li && li !== g.li && col.contains(li)) {
        const r = li.getBoundingClientRect();
        return {
          el: li,
          kind: y > r.top + r.height / 2 ? 'after' : 'before',
          col
        };
      }
      return {
        el: col,
        kind: 'column',
        col
      };
    };
    /** La première carte d'une colonne (hors la carte qu'on déplace) : la cible d'un dépôt « en tête ». */
    const headOf = (col, except) => [...col.querySelectorAll('li.f-rm-item[data-id]')].find(li => li.dataset.id !== except)?.dataset
      .id || null;
    /** Recalcule la cible sous le dernier point connu du pointeur (aussi quand la page défile sous lui) : la colonne entière s'allume, la carte visée garde son trait. */
    const retarget = () => {
      for (const el of view.querySelectorAll('[data-drop],[data-dropcol]')) {
        el.removeAttribute('data-drop');
        el.removeAttribute('data-dropcol');
      }
      g.aim = aim(g.cx, g.cy);
      if (!g.aim) return;
      if (g.aim.kind === 'milestone') g.aim.el.dataset.drop = 'milestone';
      else {
        g.aim.col.dataset.dropcol = '';
        if (g.aim.kind !== 'column') g.aim.el.dataset.drop = g.aim.kind;
      }
    };
    /** Défile tant que le pointeur reste près du bord haut ou bas de la fenêtre (même immobile) : plus il s'en approche, plus c'est vite. */
    const autoScroll = () => {
      if (!g?.drag) return;
      const box = scroller?.getBoundingClientRect() || {
        top: 0,
        bottom: window.innerHeight
      };
      const edge = 90,
        up = box.top + edge - g.cy,
        down = g.cy - (box.bottom - edge),
        dy = up > 0 ? -Math.min(28, 4 + up / 3) : down > 0 ? Math.min(28, 4 + down / 3) : 0;
      if (!dy) return;
      (scroller || window).scrollBy(0, dy);
      retarget();
    };

    function move(e) {
      if (!g || e.pointerId !== g.pid) return;
      const dx = e.clientX - g.x,
        dy = e.clientY - g.y;
      if (!g.drag) {
        if (Math.hypot(dx, dy) <= SLOP) return;
        if (!g.armed) return clear(); // le doigt a bougé avant l'appui long : c'est un défilement
        if (ui.view !== 'priorities' || g.li.closest('.f-rm-pcol[data-fixed]'))
          return clear(); // « Par thème » se lit sans glisser ; une carte livrée ou en test ne bouge pas
        g.drag = true;
        scroller = scrollParent();
        g.tick = setInterval(autoScroll, 30);
        g.li.dataset.drag = '';
        view.dataset.dragging = '';
      }
      g.li.style.transform = `translate(${dx}px, ${dy}px)`;
      g.cx = e.clientX;
      g.cy = e.clientY;
      retarget();
    }

    function up(e) {
      if (!g || e.pointerId !== g.pid) return;
      const {
        id,
        drag,
        armed,
        type,
        aim: a
      } = g;
      clear();
      if (drag) {
        if (a?.kind === 'milestone') reschedule(id, a.el.dataset.ms);
        else if (a?.kind === 'column') place(id, headOf(a.col, id), false, a.col.dataset
          .col); // lâchée sur la colonne : EN TÊTE (SOG-0257 ; une colonne vide : sa seule carte)
        else if (a) place(id, a.el.dataset.id, a.kind === 'after', a.col.dataset.col);
      } else if (armed && type !== 'mouse') copy(id);
    }

    function cancel(e) {
      if (g && e.pointerId === g.pid) clear();
    }
    view.onpointerdown = e => {
      const li = e.target.closest?.('li.f-rm-item[data-id]');
      if (!li || !view.contains(li) || e.target.closest('a,button,input,select') || (e.pointerType === 'mouse' && e.button !== 0))
        return;
      clear();
      g = {
        li,
        id: li.dataset.id,
        pid: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        type: e.pointerType,
        armed: e.pointerType === 'mouse',
        drag: false,
        aim: null
      };
      if (!g.armed) g.timer = setTimeout(() => {
        if (!g) return;
        g.armed = true;
        li.dataset.armed = '';
        navigator.vibrate?.(15);
      }, LONG);
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', cancel);
    };
    // un doigt qui glisse une carte ne fait pas défiler la page
    view.addEventListener('touchmove', e => {
      if (g?.drag && e.cancelable) e.preventDefault();
    }, {
      passive: false
    });
    view.oncontextmenu = e => {
      const li = e.target.closest?.('li.f-rm-item[data-id]');
      if (!li || !view.contains(li)) return;
      e.preventDefault(); // l'appui long d'un doigt ouvre ce menu : le geste de la carte s'en charge
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') copy(li.dataset.id);
    };
    view.onclick = e => {
      const vw = e.target.closest?.('button[data-view]');
      if (vw && view.contains(vw)) {
        ui.view = vw.dataset.view === 'themes' ? 'themes' : 'priorities';
        saveStore(c, {
          view: ui.view
        });
        return draw(`[data-view="${ui.view}"]`);
      }
      const cp = e.target.closest?.('button[data-col-pick]');
      if (cp && view.contains(cp)) {
        ui.col = /^[A-Za-z0-9._-]{1,40}$/.test(cp.dataset.colPick) ? cp.dataset.colPick : '';
        saveStore(c, {
          col: ui.col
        });
        return draw(`[data-col-pick="${ui.col}"]`);
      }
      const tp = e.target.closest?.('button[data-top]');
      if (tp && view.contains(tp)) { // « En tête » : sans glisser, la carte passe devant toute sa colonne
        const li = tp.closest('li.f-rm-item[data-id]'),
          first = li && headOf(li.closest('.f-rm-pcol[data-col]'), li.dataset.id);
        if (first && li.previousElementSibling) place(li.dataset.id, first, false, null);
        return;
      }
      const mv = e.target.closest?.('button[data-up],button[data-down]');
      if (mv && view.contains(mv)) {
        const li = mv.closest('li.f-rm-item[data-id]'),
          down = mv.hasAttribute('data-down'),
          nb = down ? li?.nextElementSibling : li?.previousElementSibling;
        if (li && nb?.dataset?.id) place(li.dataset.id, nb.dataset.id, down, null);
        return;
      }
      const f = e.target.closest?.('button[data-fold]');
      if (f && view.contains(f)) {
        const sec = f.closest('[data-lane]');
        ui.fold[f.dataset.fold] = !sec?.hasAttribute('data-folded');
        saveStore(c, {
          fold: ui.fold
        });
        return draw(`[data-fold="${CSS.escape(f.dataset.fold)}"]`);
      }
      const b = e.target.closest?.('button[data-kind],button[data-app],button[data-ms]');
      if (!b || !view.contains(b)) return;
      if (b.dataset.kind) ui.kind = b.dataset.kind === 'bug' ? 'bug' : 'feature';
      else if (b.dataset.ms !== undefined) ui.ms = ui.ms === b.dataset.ms ? '' : b.dataset.ms;
      else ui.app = b.dataset.app;
      const sel = b.dataset.kind ? `[data-kind="${ui.kind}"]` : b.dataset.ms !== undefined ? `[data-ms="${CSS.escape(b.dataset.ms)}"]` : `[data-app="${CSS.escape(ui.app)}"]`;
      draw(sel);
    };
    view.onchange = e => {
      if (e.target.matches?.('select[data-send]')) {
        const li = e.target.closest('li.f-rm-item[data-id]'),
          col = e.target.value;
        if (li && COLS.includes(col)) place(li.dataset.id, null, false, col);
        return;
      }
      if (!e.target.matches?.('input[data-hide]')) return;
      ui.hide = e.target.checked;
      saveStore(c, {
        hideDone: ui.hide
      });
      draw('input[data-hide]');
    };
    draw();
  }

  /** Dessine l'écran de la feuille de route dans view. */
  async function screen(view, c) {
    const {
      t
    } = c;
    const d = await load(c);
    if (!d?.lanes) {
      view.innerHTML = `<h1>${esc(t(T.title))}</h1><p class="f-card">${esc(t(T.missing))}</p>`;
      return;
    }
    if (d.schema === 'sog-roadmap/2' || d.version >= 2) return screenV2(view, c, d);
    screenV1(view, c, d);
  }

  window.SogRoadmap = {
    screen,
    T
  };
})();
