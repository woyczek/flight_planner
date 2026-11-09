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
  //   · couleur par état avec les seuls jetons du cadre ; hors ligne : le fichier est dans la liste du service worker.
  // Contexte donné par frame/app.js : { t, lang, own, root }. Le fichier est une entrée du dépôt de code : tout est échappé.
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

  /** Choix mémorisé de cet appareil (device/roadmap.json : { hideDone }) ; masquer les livrées par défaut. */
  const readHide = async c => {
    try {
      const s = await c.own?.get(STORE);
      return typeof s?.hideDone === 'boolean' ? s.hideDone : true;
    } catch {
      return true;
    }
  };
  /** Mémorise le choix « Masquer les livrées » (sans effet si le magasin de l'appareil manque). */
  const saveHide = async (c, hideDone) => {
    try {
      const s = (await c.own?.get(STORE).catch(() => null)) || {};
      await c.own?.put(STORE, {
        ...s,
        hideDone
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

  /** Schéma 2 : frise des jalons, onglets, filtre par application, case « Masquer les livrées », kanban. */
  async function screenV2(view, c, d) {
    const {
      t
    } = c;
    const st = s => t(row(d.states?.[s] || s));
    const apps = Array.isArray(d.apps) ? d.apps : [];
    const stones = Array.isArray(d.milestones) ? d.milestones.filter(m => m && typeof m.id === 'string') : [];
    const ui = {
      kind: 'feature',
      app: '',
      ms: '',
      hide: await readHide(c)
    };
    const kindOf = it => it.kind === 'bug' ? 'bug' : 'feature';
    const stoneOf = it => stones.find(m => m.id === it.milestone || (it.id && Array.isArray(m.items) && m.items.includes(it.id)));
    /** Les éléments d'une voie que l'onglet `kind` montre avec les choix en cours (un jalon choisi passe avant « masquer les livrées »). */
    const shown = (l, kind) => (l.items || []).filter(i => ORDER.includes(i.state) && kindOf(i) === kind && (!ui.ms || stoneOf(i)
      ?.id === ui.ms) && (!ui.hide || ui.ms || i.state !== 'done'));
    const lanesOf = () => (d.lanes || []).filter(l => !ui.app || l.app === ui.app);
    const count = kind => lanesOf().reduce((n, l) => n + shown(l, kind).length, 0);
    const current = (stones.find(m => m.state === 'doing') || stones.find(m => m.state === 'planned') || {}).id;
    const card = it => {
      const m = stoneOf(it),
        dates = [it.since && `${it.since}`, it.delivered && `→ ${it.delivered}`].filter(Boolean).join(' ');
      return `<li class="f-rm-item" data-state="${esc(it.state)}"${dates ? ` title="${esc(dates)}"` : ''}>${it.id ? `<small class="f-rm-id">${esc(it.id)}</small> ` : ''}${esc(t(row(it)))}${m ? ` <small class="f-rm-ms">${esc(t(row(m.label || m.id)))}</small>` : ''}</li>`;
    };
    const frieze = () => !stones.length ? '' : `<ol class="f-rm-time" aria-label="${esc(t(T.time))}">${stones.map(m => `<li><button type="button" class="f-rm-btn" data-ms="${esc(m.id)}" data-state="${ORDER.includes(m.state) ? esc(m.state) : 'planned'}" aria-pressed="${ui.ms === m.id}"${m.id === current ? ` data-current aria-current="step" title="${esc(t(T.current))}"` : ''}><b>${esc(t(row(m.label || m.id)))}</b>${m.date ? ` <span class="f-muted">${esc(m.date)}</span>` : ''}</button></li>`).join('')}</ol>`;
    const lanes = () => {
      const html = lanesOf().map(l => {
        const own = shown(l, ui.kind),
          done = (l.items || []).filter(i => i.state === 'done' && kindOf(i) === ui.kind && (!ui.ms || stoneOf(i)?.id === ui.ms))
          .length,
          hidden = ui.hide && !ui.ms && done > 0;
        if (!own.length && !hidden) return '';
        const app = apps.find(a => a.id === l.app);
        return `<section class="f-rm-lane" data-lane="${esc(l.id)}"><h2>${esc(t(row(l.label)))}${app ? ` <span class="f-muted">${esc(t(row(app.label)))}</span>` : ''}${hidden ? ` <span class="f-muted f-rm-done" data-done-count>${esc(t(done === 1 ? T.doneOne : T.doneMany, { n: done }))}</span>` : ''}</h2>${ORDER.map(s => {
          const items = own.filter(i => i.state === s);
          return `<div class="f-rm-col" data-state="${s}" ${items.length ? '' : 'data-empty'}><h3>${esc(st(s))}</h3><ul>${items.map(card).join('')}</ul></div>`;
        }).join('')}</section>`;
      }).join('');
      return html || `<p class="f-muted" data-nothing>${esc(t(T.nothing))}</p>`;
    };
    const head = `<div class="f-rm-head" aria-hidden="true"><span></span>${ORDER.map(s => `<span data-state="${s}">${esc(st(s))}</span>`).join('')}</div>`;
    const draw = focus => {
      view.innerHTML = `<h1>${esc(t(T.title))}</h1>
        ${d.note ? `<p class="f-card f-rm-note">${esc(t(row(d.note)))}</p>` : ''}
        <p class="f-muted">${esc(t(T.updated, { d: d.updated || '?' }))} · <a href="#help">${esc(t(T.help))}</a></p>
        ${frieze()}
        <div class="f-rm-bar" role="tablist">${['feature', 'bug'].map(k => `<button type="button" role="tab" class="f-rm-btn" data-kind="${k}" aria-selected="${ui.kind === k}">${esc(t(T[k]))} (${count(k)})</button>`).join('')}</div>
        <div class="f-rm-bar" data-apps>${[{ id: '' }, ...apps].map(a => `<button type="button" class="f-rm-btn" data-app="${esc(a.id)}" aria-pressed="${ui.app === a.id}">${esc(a.id ? t(row(a.label)) : t(T.all))}</button>`).join('')}
          <label class="f-rm-hide"><input type="checkbox" data-hide ${ui.hide ? 'checked' : ''}> ${esc(t(T.hide))}</label></div>
        <div class="f-rm" data-kanban>${head}${lanes()}</div>`;
      if (focus) view.querySelector(focus)?.focus();
    };
    view.onclick = e => {
      const b = e.target.closest?.('button[data-kind],button[data-app],button[data-ms]');
      if (!b || !view.contains(b)) return;
      if (b.dataset.kind) ui.kind = b.dataset.kind === 'bug' ? 'bug' : 'feature';
      else if (b.dataset.ms !== undefined) ui.ms = ui.ms === b.dataset.ms ? '' : b.dataset.ms;
      else ui.app = b.dataset.app;
      const sel = b.dataset.kind ? `[data-kind="${ui.kind}"]` : b.dataset.ms !== undefined ? `[data-ms="${CSS.escape(b.dataset.ms)}"]` : `[data-app="${CSS.escape(ui.app)}"]`;
      draw(sel);
    };
    view.onchange = e => {
      if (!e.target.matches?.('input[data-hide]')) return;
      ui.hide = e.target.checked;
      saveHide(c, ui.hide);
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
