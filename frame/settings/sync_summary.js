(() => {
  'use strict';
  // V3 — Réglages, la carte Synchronisation comme synthèse (frame/settings/SPEC.md § 3, point 7 ; l'utilisateur, 1er nov. 2026 : « je ne sais pas
  // quelles fiches appareil sont synchro et lesquelles ne le sont pas, pas plus que les missions »). Aucun écran de plus : la carte existante.
  //   · la TÊTE : une ligne, un compte par sorte (fiches d'appareils, missions, vols, flotte ; « Autres » seulement s'il n'est pas nul) ;
  //   · par sorte, une liste repliée des éléments qui attendent : titre lisible (meta.titleOf du module qui possède la sorte), date, raison
  //     de l'erreur qui retient la file, suppression dite ; avec un lanceur, « modifié ici » (pas encore commité) et « à envoyer » (commits à
  //     pousser) ; sept éléments visibles au plus en tout, « … et n de plus » pour le reste.
  // Les LECTURES (une seule fois, ici) :
  //   · sans lanceur : FrameData.pendingList() → [{ path, module, at, deletion, error }], jamais le texte ;
  //   · avec un lanceur : GET /__setup/sync-status → changed et toPush (noms seuls, 200 au plus) avec changedTotal et toPushTotal ;
  //   · le titre : la valeur de la copie de l'appareil (lecture du cache de l'appareil, jamais le réseau) passée à meta.titleOf(path, value) du module qui possède la
  //     sorte ; nul ou en échec : le chemin.
  // Le MÊME relevé sert aux modules (la marque « non synchronisé » d'une fiche ou d'une mission) : SogSyncSummary.marks(lecteurs).
  // Règle de sécurité (audit 157) : data/ est écrit par n'importe quel pilote. Tout texte lu (titre d'un module, chemin, erreur) passe par esc,
  // un chemin est un texte, jamais un lien ; les nombres sont bornés ; les clés d'une réponse du lanceur sont lues avec Object.hasOwn.
  const {
    ROOT,
    esc,
    T,
    setup
  } = window.SogSettingsKit;
  Object.assign(T, {
    // les sortes d'élément (le préfixe du chemin) : fiches d'appareils, missions, vols, flotte, le reste
    kind: {
      sheets: ['Fiches d’appareils', 'Aircraft sheets', 'Flugzeug-Datenblätter', 'Fichas de aeronaves'],
      missions: ['Missions', 'Missions', 'Missionen', 'Misiones'],
      flights: ['Vols', 'Flights', 'Flüge', 'Vuelos'],
      fleet: ['Flotte', 'Fleet', 'Flotte', 'Flota'],
      other: ['Autres', 'Other', 'Weitere', 'Otros']
    },
    sendAll: ['Tout envoyer', 'Send everything', 'Alles senden', 'Enviar todo'],
    // avec un lanceur : ce que le dépôt de data/ attend
    flagChanged: ['modifié ici', 'changed here', 'hier geändert', 'modificado aquí'],
    flagPush: ['à envoyer', 'to send', 'zu senden', 'para enviar']
  });

  /** Éléments visibles au plus, toutes sortes confondues (sept éléments au plus par écran). */
  const MAX_VISIBLE = 7;
  /** Chemins gardés par réponse du lanceur (il en rend 200 au plus), longueur d'un chemin, d'une erreur et d'un titre, nombre maximal compté. */
  const PATHS = 200,
    PATH_LEN = 300,
    ERR_LEN = 200,
    TITLE_LEN = 120,
    TOTAL_MAX = 1e6,
    PENDING_MAX = 1000;
  /** Les sortes, dans l'ordre de la tête ; « other » ferme la liste. */
  const KINDS = ['sheets', 'missions', 'flights', 'fleet', 'other'];
  /** Les modules dont meta.titleOf peut titrer un chemin : ceux de l'application montrée (ctx.modules) et ceux des autres applications, que le cadre ne donne pas aux Réglages. */
  const TITLE_MODULES = ['aircraft', 'fuel', 'missions'];

  /** La sorte d'un chemin du dépôt : fiches d'appareils (aircraft/sheets/), missions (missions/), vols (pilot/<TRI>/), flotte (airline/fleet.json), sinon « other ». */
  function kindOf(path) {
    const p = String(path ?? '');
    if (p.startsWith('aircraft/sheets/')) return 'sheets';
    if (p.startsWith('missions/')) return 'missions';
    if (/^pilot\/[^/]+\//.test(p)) return 'flights';
    return p === 'airline/fleet.json' ? 'fleet' : 'other';
  }
  /** Un texte borné, sinon ''. */
  const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
  /** Un nombre entier entre 0 et TOTAL_MAX, sinon 0. */
  const bounded = v => Number.isFinite(v) ? Math.min(TOTAL_MAX, Math.max(0, Math.trunc(v))) : 0;
  /** Les éléments de FrameData.pendingList() : [{ path, at, deletion, error }], un chemin une seule fois, les plus récents d'abord comme rendus ; une entrée sans chemin est écartée. */
  function pendingItems(list) {
    const out = [],
      seen = new Set();
    for (const p of (Array.isArray(list) ? list : []).slice(0, PENDING_MAX)) {
      const path = str(p?.path, PATH_LEN);
      if (!path || seen.has(path)) continue;
      seen.add(path);
      out.push({
        path,
        kind: kindOf(path),
        state: 'pending',
        at: str(p.at, 40),
        deletion: p.deletion === true,
        error: str(p.error, ERR_LEN),
        flags: []
      });
    }
    return out;
  }
  /** Réunit les écritures en attente de l'appareil et, avec un lanceur, l'état de data/ (`status` : la réponse de sync-status, ou null) : { items, unlisted } ; un chemin n'est compté qu'une fois
   *  (l'attente de l'appareil d'abord, puis « modifié ici », puis « à envoyer » ; les autres états qu'il a s'ajoutent à ses `flags`) ; unlisted : les chemins que le lanceur a comptés sans les nommer
   *  (changedTotal et toPushTotal au-delà de ses 200 noms). */
  function merge(pending, status) {
    const items = pendingItems(pending),
      by = new Map(items.map(i => [i.path, i])),
      s = status && typeof status === 'object' ? status : {};
    let unlisted = 0;
    for (const [key, state, totalKey] of [
        ['changed', 'changed', 'changedTotal'],
        ['toPush', 'toPush', 'toPushTotal']
      ]) {
      const raw = Object.hasOwn(s, key) && Array.isArray(s[key]) ? s[key] : [],
        names = raw.slice(0, PATHS).map(p => str(p, PATH_LEN)).filter(Boolean);
      unlisted += Math.max(0, (Object.hasOwn(s, totalKey) ? bounded(s[totalKey]) : names.length) - names.length);
      for (const path of names) {
        const had = by.get(path);
        if (had) {
          if (!had.flags.includes(state)) had.flags.push(state);
          continue;
        }
        const it = {
          path,
          kind: kindOf(path),
          state,
          at: '',
          deletion: false,
          error: '',
          flags: []
        };
        by.set(path, it);
        items.push(it);
      }
    }
    return {
      items,
      unlisted
    };
  }
  /** Les comptes par sorte : { sheets, missions, flights, fleet, other } ; les chemins que le lanceur n'a pas nommés vont à « other ». */
  function counts(items, unlisted = 0) {
    const out = Object.fromEntries(KINDS.map(k => [k, 0]));
    for (const i of items) out[i.kind]++;
    out.other += bounded(unlisted);
    return out;
  }
  /** Ce qui se montre : par sorte non vide, ses `shown` premiers éléments, `more` le reste ; `max` éléments au plus en tout (le même budget pour toutes les sortes, dans l'ordre de la tête). */
  function plan(items, max = MAX_VISIBLE) {
    let budget = max;
    const out = [];
    for (const kind of KINDS) {
      const list = items.filter(i => i.kind === kind);
      if (!list.length) continue;
      const shown = list.slice(0, budget);
      budget -= shown.length;
      out.push({
        kind,
        total: list.length,
        shown,
        more: list.length - shown.length
      });
    }
    return out;
  }
  /** Le relevé : { items, unlisted } d'après les deux lecteurs (`pending` : FrameData.pendingList ; `status` : la lecture de sync-status, ou rien sans lanceur) ; une lecture qui échoue compte pour vide. */
  async function read({
    pending,
    status
  }) {
    const [p, s] = await Promise.all([
      Promise.resolve().then(() => pending?.()).catch(() => []),
      Promise.resolve().then(() => status?.()).catch(() => null)
    ]);
    return merge(p, s);
  }
  /** Pour les modules (la marque « non synchronisé » d'une fiche, d'une mission) : le relevé en table chemin → { state, deletion, error, flags }, par les mêmes lecteurs. */
  async function marks(readers) {
    const {
      items
    } = await read(readers || {});
    return new Map(items.map(i => [i.path, {
      state: i.state,
      deletion: i.deletion,
      error: i.error,
      flags: [...i.flags]
    }]));
  }

  const metaCache = new Map(); // identifiant de module → promesse de son meta (ou null)
  /** Le meta d'un module (son module.js, déjà chargé par le cadre pour son niveau), ou null s'il ne se charge pas. */
  function metaOf(id) {
    if (!metaCache.has(id)) metaCache.set(id, import(new URL(`modules/${id}/module.js`, ROOT).href).then(m => m?.meta || null, () => null));
    return metaCache.get(id);
  }
  /** Les meta des modules qui peuvent titrer un chemin : ceux de l'application (`mods`, ctx.modules) et TITLE_MODULES, ceux qui ont un titleOf. */
  async function titlers(mods) {
    const ids = [...new Set([...(Array.isArray(mods) ? mods.map(m => m?.id) : []), ...TITLE_MODULES])].filter(id => typeof id ===
      'string' && /^[a-z0-9_-]+$/.test(id));
    return (await Promise.all(ids.map(metaOf))).filter(m => typeof m?.titleOf === 'function');
  }
  /** La valeur de la copie de l'appareil d'un élément (jamais le réseau) : l'écriture en attente ou le cache ; rien pour une suppression, ni pour un fichier que l'appareil n'a pas. */
  async function valueOf(FD, it) {
    if (it.deletion) return null;
    try {
      if (it.state !== 'pending' && !(await FD.cached(it.path)).some(x => x.path === it.path)) return null;
      return (await FD.adapter({}).read(it.path))?.value ??
        null; // un lecteur sans déclaration : ni lecture ni écriture propres au cadre
    } catch {
      return null;
    }
  }
  /** Le titre lisible d'un élément dans la langue (`t`) : le premier titleOf qui en donne un ; null (le chemin s'affiche) si aucun ne répond, répond mal ou échoue. */
  async function titleOf(metas, FD, it, t) {
    let value;
    try {
      value = await valueOf(FD, it);
    } catch {
      value = null;
    }
    for (const m of metas) {
      try {
        const row = m.titleOf(it.path, value);
        const s = Array.isArray(row) ? str(t(row), TITLE_LEN).trim() : '';
        if (s) return s;
      } catch {
        /* un module qui échoue : le chemin */
      }
    }
    return null;
  }

  const lastRead = new WeakMap(); // vue → { at, p } : la dernière lecture de sync-status (au plus une toutes les 5 s)
  const tokens = new WeakMap(); // vue → numéro du dernier dessin (un dessin lent ne recouvre pas un plus récent)
  /** L'état de data/ d'un poste avec lanceur (GET sync-status, relevé refait), lu au plus une fois toutes les 5 s, jamais pendant une synchronisation et aussitôt à sa fin ; les dessins qui se suivent partagent la lecture en cours
   *  (la même promesse) ; null sans lanceur ou sans réponse. */
  function launcherStatus(env, s) {
    if (!env.L) return Promise.resolve(null);
    const k = lastRead.get(env.view) || {
        at: 0,
        p: null,
        syncing: false
      },
      was = k.syncing; // la fin d'une synchronisation relit tout de suite : la liste ne garde pas ce qui vient de partir
    k.syncing = !!s?.syncing;
    if (!k.p || !k.syncing && (was || Date.now() - k.at > 5000)) {
      k.at = Date.now();
      k.p = setup('sync-status?fresh=1').catch(() => null);
      lastRead.set(env.view, k);
    }
    return k.p;
  }
  /** Le HTML d'un élément qui attend : suppression, titre (ou chemin en texte), date, état du dépôt, raison de l'erreur. Tout passe par esc. */
  function itemHtml(it, title, env) {
    const {
      t,
      c
    } = env;
    const day = new Date().toISOString().slice(0, 10),
      when = at => !at ? '' : String(at).slice(0, 10) === day ? c.time.fmtZ(at) : c.time.fmtDateZ(at),
      states = [it.state, ...it.flags].filter(s => s === 'changed' || s === 'toPush'),
      flags = [...new Set(states)].map(s => t(s === 'changed' ? T.flagChanged : T.flagPush));
    return `<li data-item="${esc(it.state)}" title="${esc(it.path)}">${it.deletion ? `<span aria-label="${esc(t(T.queueDel))}" title="${esc(t(T.queueDel))}">✕</span> ` : ''}${title ? `<span data-title>${esc(title)}</span>` : `<code>${esc(it.path)}</code>`}${when(it.at) ? ` <span class="f-muted" data-at>${esc(when(it.at))}</span>` : ''}${flags.map(f => ` <span class="f-muted" data-flag>${esc(f)}</span>`).join('')}${it.error ? ` <span class="f-warn" data-reason>${esc(it.error)}</span>` : ''}</li>`;
  }
  /** Dessine la tête (un compte par sorte) et les listes repliées de la carte Synchronisation d'après l'état du transport `s` (FD.status) ; la carte se montre si un échange est coché ou si quelque chose attend. */
  async function paint(env, s) {
    const {
      view,
      c,
      t,
      FD,
      mods,
      exchange
    } = env;
    const head = view.querySelector('[data-sync-head]'),
      box = view.querySelector('[data-queue]');
    if (!head || !box) return;
    const token = (tokens.get(view) || 0) + 1;
    tokens.set(view, token);
    const status = await launcherStatus(env, s),
      {
        items,
        unlisted
      } = await read({
        pending: () => FD.pendingList(),
        status: () => status
      });
    if (tokens.get(view) !== token || !view.isConnected) return;
    const n = counts(items, unlisted),
      groups = plan(items),
      metas = groups.some(g => g.shown.length) ? await titlers(mods) : [],
      titled = new Map();
    await Promise.all(groups.flatMap(g => g.shown).map(async it => titled.set(it, await titleOf(metas, FD, it, t))));
    if (tokens.get(view) !== token || !view.isConnected) return;
    const open = new Set([...box.querySelectorAll('details[open][data-kind-list]')].map(d => d.dataset.kindList));
    const card = box.closest('[data-card]');
    if (card) card.hidden = !exchange && !items.length && !unlisted;
    head.innerHTML = `<b>${esc(t(T.pending))}</b> : ${KINDS.filter(k => k !== 'other' || n.other).map(k => `<span data-kind="${k}" data-count="${n[k]}">${esc(t(T.kind[k]))} : ${n[k]}</span>`).join(' · ')}`;
    box.innerHTML = groups.map(g => `<details data-kind-list="${g.kind}"${open.has(g.kind) ? ' open' : ''}><summary>${esc(t(T.kind[g.kind]))} (${g.total})</summary><ul class="f-queue">${g.shown.map(it => itemHtml(it, titled.get(it), env)).join('')}${g.more ? `<li class="f-muted" data-more>${esc(t(T.queueMore, { n: g.more }))}</li>` : ''}</ul></details>`).join('');
  }

  window.SogSyncSummary = Object.freeze({
    KINDS,
    MAX_VISIBLE,
    kindOf,
    merge,
    counts,
    plan,
    read,
    marks,
    paint
  });
  (window.SogSettingsParts ||= {}).syncSummary = {
    paint
  };
})();
