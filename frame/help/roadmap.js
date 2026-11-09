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
      if (typeof v.milestone === 'string' && stones.includes(v.milestone)) e.milestone = v.milestone;
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
      return stones.find(m => m.id === it.milestone || (it.id && Array.isArray(m.items) && m.items.includes(it.id)));
    };
    const rankOf = it => entOf(it)?.rank ?? Infinity;
    /** Les éléments d'une voie que l'onglet `kind` montre avec les choix en cours (un jalon choisi passe avant « masquer les livrées »). */
    const shown = (l, kind) => (l.items || []).filter(i => ORDER.includes(i.state) && kindOf(i) === kind && (!ui.ms || stoneOf(i)
      ?.id === ui.ms) && (!ui.hide || ui.ms || i.state !== 'done'));
    const lanesOf = () => (d.lanes || []).filter(l => !ui.app || l.app === ui.app);
    const count = kind => lanesOf().reduce((n, l) => n + shown(l, kind).length, 0);
    const current = (stones.find(m => m.state === 'doing') || stones.find(m => m.state === 'planned') || {}).id;
    const byRank = (a, b) => {
      const x = rankOf(a),
        y = rankOf(b);
      return x === y ? 0 : x < y ? -1 : 1;
    };
    const card = it => {
      const m = stoneOf(it),
        dates = [it.since && `${it.since}`, it.delivered && `→ ${it.delivered}`].filter(Boolean).join(' '),
        ranked = it.id && ID.test(it.id);
      return `<li class="f-rm-item" data-state="${esc(it.state)}"${ranked ? ` data-id="${esc(it.id)}"` : ''}${dates ? ` title="${esc(dates)}"` : ''}>${it.id ? `<span class="f-rm-id">${esc(it.id)}</span> ` : ''}${esc(t(row(it)))}${m ? ` <small class="f-rm-ms">${esc(t(row(m.label || m.id)))}</small>` : ''}${ranked && ui.unsent.has(it.id) ? ` <small class="f-rm-unsent" data-unsent>${esc(t(T.unsent))}</small>` : ''}</li>`;
    };
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
    /** `id` posé avant ou après `target` dans l'ordre de priorité : tous les rangs sont réécrits 1…n (500 au plus). */
    const reorder = (id, target, after) => {
      const ids = flat().filter(k => k !== id);
      const at = ids.indexOf(target);
      if (at < 0) return;
      ids.splice(at + (after ? 1 : 0), 0, id);
      const next = {};
      ids.slice(0, MAX_ITEMS).forEach((k, n) => {
        const it = (d.lanes || []).flatMap(l => l.items || []).find(i => i.id === k);
        next[k] = {
          ...(it ? entOf(it) : {}),
          rank: n + 1
        };
      });
      return commit(next, [id]);
    };
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
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      for (const el of view.querySelectorAll('[data-drop],[data-armed],[data-drag]')) {
        el.removeAttribute('data-drop');
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
    /** Où tomberait la carte sous le pointeur : { el, kind: 'before' | 'after' | 'milestone' } ou null. */
    const aim = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const ms = el?.closest?.('button[data-ms]');
      if (ms && view.contains(ms)) return {
        el: ms,
        kind: 'milestone'
      };
      const li = el?.closest?.('li.f-rm-item[data-id]');
      if (!li || li === g.li || li.parentElement !== g.li.parentElement) return null;
      const r = li.getBoundingClientRect();
      return {
        el: li,
        kind: y > r.top + r.height / 2 ? 'after' : 'before'
      };
    };

    function move(e) {
      if (!g || e.pointerId !== g.pid) return;
      const dx = e.clientX - g.x,
        dy = e.clientY - g.y;
      if (!g.drag) {
        if (Math.hypot(dx, dy) <= SLOP) return;
        if (!g.armed) return clear(); // le doigt a bougé avant l'appui long : c'est un défilement
        g.drag = true;
        scroller = scrollParent();
        g.li.dataset.drag = '';
        view.dataset.dragging = '';
      }
      g.li.style.transform = `translate(${dx}px, ${dy}px)`;
      for (const el of view.querySelectorAll('[data-drop]')) el.removeAttribute('data-drop');
      g.aim = aim(e.clientX, e.clientY);
      if (g.aim) g.aim.el.dataset.drop = g.aim.kind;
      // près du bord haut ou bas de l'écran qui défile (la page, ou le conteneur du cadre), il défile de lui-même
      const box = scroller?.getBoundingClientRect() || {
        top: 0,
        bottom: window.innerHeight
      };
      if (e.clientY < box.top + 60)(scroller || window).scrollBy(0, -16);
      else if (e.clientY > box.bottom - 60)(scroller || window).scrollBy(0, 16);
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
        else if (a) reorder(id, a.el.dataset.id, a.kind === 'after');
      } else if (armed && type !== 'mouse') copy(id);
    }

    function cancel(e) {
      if (g && e.pointerId === g.pid) clear();
    }
    view.onpointerdown = e => {
      const li = e.target.closest?.('li.f-rm-item[data-id]');
      if (!li || !view.contains(li) || e.target.closest('a,button,input') || (e.pointerType === 'mouse' && e.button !== 0)) return;
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
