(() => {
  'use strict';
  // V3 aerodb — la base aéronautique pour tous les modules (frame/aerodb/SPEC.md, INTEGRATION.md, DECISIONS.md).
  // Lit les bases publiées dans le dépôt des données par un poste avec lanceur, jamais les fichiers des sources ; ne
  // construit rien, n'écrit rien. Deux formats de la base SIA, le découpé préféré :
  //   · découpé (lot 3) : sia/base/<zone>/<cycle>/<sorte>.json (airspaces, aerodromes, navaids, points, vrp, airways,
  //     obstacles, mora, obstaclemax, cities, meta), sia/base/cities_major.json (grandes villes du monde),
  //     sia/base/index.json (manifeste : cycle, préfixes OACI et tailles par zone) — une sorte n'est lue qu'à sa
  //     première demande ;
  //   · entier (lot A de la V2, lu pendant la transition) : sia/base/<zone>/<cycle>.json, villes sia/base/cities.json.
  // Base des types : AircraftDB/aircraft_db.json et aircraft_perf.json, sinon les .js de la V2 lus comme littéraux.
  // Un module demande une emprise ou un identifiant, jamais une zone ni un fichier : aerodb charge ce qui sert, une fois,
  // et répond par des index en mémoire, case par case d'un degré.
  // Lecture des fichiers : par le lecteur reçu (couche de données du frame : read(chemin, { policy: 'reference', wait })
  // → { value | text, rev, cached, at } | null ; list(préfixe) → chemins | null ; watch(préfixe, fn)), ou, en attendant
  // le frame, par AeroDB.fetchReader() (lanceur : fichiers servis ; mode GitHub : GitHubData).
  // API : window.AeroDB = { create({ reader, zones, now }) → service, fetchReader({ root }), airacCycles(n, date), literal,
  //   declaration() → préfixes lus et écrits par aerodb (à donner à FrameData.adapter) }.
  // Service : status(), state() (loading, ready, noaccess, offline, unpublished, idle : sans lire), refresh(), ready(q),
  //   on('change' | 'state', fn), airspaces(q), aerodromes(q), navaids(q), points(q), airways(q), vrp(q),
  //   obstacles(q), mora(lat, lon), moraCells(q), aar(), nat(), aarTracks(), natTracks(), vfrRoutes(oaci), vfrIndex(), procedures(oaci, q), procedureIndex(), coverage(oaci), coverageByState(), procedureFromOfp(ofp), rememberOfp(ofp), cities(q),
  //   find(texte, n), coords(ident),
  //   coordsAll(ident), aircraft() → registre des aéronefs (types : frame/aerodb/aircraft.js ; fiches, flotte, référence,
  //   recherche unique : registry.js ; logique des fiches : sheets.js, AeroDBSheets), stats(),
  //   offline : { supported(), zones(), keep(zone, { onProgress }), release(zone), common(), aircraft() } — données
  //   gardées dans le cache du frame pour le hors-ligne (carte « Données hors ligne » des Réglages) ; le lecteur doit
  //   alors offrir cached(préfixe) → [{ path, rev, bytes, at }] (copies locales, sans réseau) et evict(chemin ou
  //   préfixe/) (copies locales de références libérées, rien d'envoyé) — l'adaptateur du frame les offre (lot 6).
  if (window.AeroDB) return;
  // dossier de ce script : registry.js et sheets.js y sont chargés au premier appel d'aircraft()
  const HERE = document.currentScript?.src || location.href;
  /** Script du dossier d'aerodb chargé une fois (global : nom qu'il définit) ; rien s'il l'est déjà. */
  const loadOwn = (file, global) => window[global] ? Promise.resolve() : new Promise((ok, ko) => {
    const sc = document.createElement('script');
    sc.src = new URL(`${file}?v=0`, HERE).href;
    sc.onload = () => ok();
    sc.onerror = () => ko(new Error(`aerodb: ${file} not loaded`));
    document.head.append(sc);
  });
  const PUB = 'sia/base/',
    PUB_WHOLE = /^sia\/base\/([a-z0-9_-]+)\/(\d{4}-\d{2}-\d{2})\.json$/,
    PUB_SPLIT = /^sia\/base\/([a-z0-9_-]+)\/(\d{4}-\d{2}-\d{2})\/([a-z_]+)\.json$/,
    SPLIT_KINDS = ['meta', 'airspaces', 'aerodromes', 'aeroindex', 'navaids', 'points', 'vrp', 'airways', 'obstacles', 'mora',
      'obstaclemax', 'cities'
    ], // sortes publiées d'une zone (format découpé) ; aeroindex : index léger des terrains à code OACI (SPEC § 2)
    COMMON = ['sia/base/index.json', 'sia/base/cities_major.json'], // fichiers communs à toutes les zones
    POINT_KINDS = ['aerodromes', 'navaids', 'points', 'vrp', 'obstacles'],
    MARGIN = .5, // marge des cadres de zone (côtes, eaux territoriales, espaces au large), comme la V2
    WIDE = 400; // au-delà de ce nombre de cases, un espace va dans la liste « large » (FIR, UIR) plutôt que case par case
  /** Texte comparable : majuscules sans accents. */
  const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  const cellKey = (lat, lon) => `${Math.floor(lat)}|${Math.floor(lon)}`;
  const num = v => v !== null && v !== '' && Number.isFinite(+v);
  /** Emprise normalisée [ouest, sud, est, nord] d'une requête : { bbox }, { lat, lon, radiusNm } ; null sans emprise. */
  function boxOf(q = {}) {
    if (Array.isArray(q.bbox) && q.bbox.length === 4) return q.bbox.map(Number);
    if (num(q.lat) && num(q.lon)) {
      const r = (+q.radiusNm || 0) / 60,
        k = Math.max(.1, Math.cos(+q.lat * Math.PI / 180));
      return [+q.lon - r / k, +q.lat - r, +q.lon + r / k, +q.lat + r];
    }
    return null;
  }
  const hits = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
  /** Clés des cases d'un degré d'une emprise ; null au-delà de max cases. */
  function cellsOf(b, max = Infinity) {
    const x0 = Math.floor(b[0]),
      x1 = Math.floor(b[2]),
      y0 = Math.floor(b[1]),
      y1 = Math.floor(b[3]);
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > max) return null;
    const out = [];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) out.push(`${y}|${x}`);
    return out;
  }
  /** Contenus des cases d'un index (Map « lat|lon » → valeur) qui tombent dans l'emprise b : cases de l'emprise une à une
   *  si elles sont moins nombreuses que celles de l'index, sinon cases de l'index filtrées (grande emprise, monde entier). */
  function* within(map, b) {
    const ks = cellsOf(b, map.size);
    if (ks) {
      for (const k of ks) {
        const v = map.get(k);
        if (v) yield v;
      }
      return;
    }
    const y0 = Math.floor(b[1]),
      y1 = Math.floor(b[3]),
      x0 = Math.floor(b[0]),
      x1 = Math.floor(b[2]);
    for (const [k, v] of map) {
      const i = k.indexOf('|'),
        y = +k.slice(0, i),
        x = +k.slice(i + 1);
      if (y >= y0 && y <= y1 && x >= x0 && x <= x1) yield v;
    }
  }
  /** Cadre [ouest, sud, est, nord] des anneaux [[lat, lon]…] d'un espace. */
  function ringBox(rings) {
    let w = 180,
      s = 90,
      e = -180,
      n = -90;
    for (const r of rings || [])
      for (const [la, lo] of r || []) {
        if (la < s) s = la;
        if (la > n) n = la;
        if (lo < w) w = lo;
        if (lo > e) e = lo;
      }
    return w <= e ? [w, s, e, n] : null;
  }
  /** Index de points (lat, lon) d'une liste : Map case → éléments. */
  function pointIndex(list) {
    const m = new Map();
    for (const x of list || [])
      if (num(x?.lat) && num(x?.lon)) {
        const k = cellKey(+x.lat, +x.lon);
        (m.get(k) || m.set(k, []).get(k)).push(x);
      }
    return m;
  }
  /** Cycles AIRAC (dates de début « AAAA-MM-JJ ») : le cycle en vigueur à date puis les n - 1 précédents. */
  function airacCycles(n = 6, date = Date.now()) {
    const DAY = 864e5,
      CYCLE = 28 * DAY,
      REF = Date.UTC(2024, 0, 25), // AIRAC 2401
      d = new Date(date),
      today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      cur = REF + Math.floor((today - REF) / CYCLE) * CYCLE;
    return Array.from({
      length: n
    }, (_, i) => new Date(cur - i * CYCLE).toISOString().slice(0, 10));
  }
  /** Littéral d'un fichier .js de données (« window.NOM = {…}; ») lu comme du JSON ; null s'il n'en est pas un. */
  function literal(text, name) {
    const m = new RegExp(`window\\.${name}\\s*=\\s*`).exec(String(text || ''));
    if (!m) return null;
    try {
      return JSON.parse(text.slice(m.index + m[0].length).replace(/;\s*$/, '').trim());
    } catch {
      return null;
    }
  }
  /** Valeur JSON d'une réponse du lecteur (value déjà analysée, sinon text). */
  const valueOf = r => {
    if (!r) return null;
    if (r.value !== undefined && typeof r.value !== 'string') return r.value;
    try {
      return JSON.parse(r.text ?? r.value);
    } catch {
      return null;
    }
  };
  const sizeOf = r => (r?.text ?? (typeof r?.value === 'string' ? r.value : '')).length || 0;

  // ---- lecteur provisoire (remplacé par la couche de données du frame : FrameData.adapter, INTEGRATION.md § 3)
  /** Lecteur de fichiers sans le frame : mode GitHub (GitHubData : contents, ETag, arbre) ou lanceur (fichiers servis :
   *  data/<chemin>, AircraftDB/ à la racine de la suite ; pas de liste de dossier, list rend null). root : racine de la
   *  suite (défaut : deux niveaux au-dessus de ce script). */
  function fetchReader({
    root = new URL('../../', document.currentScript?.src || location.href).href
  } = {}) {
    const G = () => window.GitHubData?.on?.() ? window.GitHubData : null;
    const urlOf = path => /^AircraftDB\//.test(path) && !G() ? new URL(path, root).href : new URL(`data/${path}`, root).href;
    return {
      async read(path) {
        let r;
        try {
          r = await fetch(urlOf(path), {
            cache: 'no-cache'
          });
        } catch {
          return null; // hors ligne sans copie
        }
        if (!r.ok) return null;
        const text = await r.text();
        return {
          text,
          rev: r.headers.get('x-gh-etag') || r.headers.get('ETag') || r.headers.get('Last-Modified') || '',
          cached: r.status === 304,
          at: new Date().toISOString()
        };
      },
      list: async prefix => G()?.list ? G().list(prefix) : null,
      watch: () => () => {}
    };
  }

  function create({
    reader = fetchReader(),
    zones = window.AERODB_ZONES || {},
    now = () => Date.now(),
    lnmperf: lnmAuto = true, // fiches .lnmperf suivies d'elles-mêmes sur un poste au dossier réglé (les essais l'éteignent)
    // lanceur du poste, donné par le cadre (frame/INTEGRATION.md § 15) : { request(route, opts) → { status, body } | null,
    // info() → relevé | null, job(route, corps, { onProgress, signal }) → fin du travail suivi (client du cadre) | null } ;
    // sans lui (bancs d'aerodb), lnmperf.js appelle le lanceur lui-même et fetchProcedures() répond 'no-launcher'
    launcher = null,
    access = () =>
    true // l'appareil a-t-il de quoi lire la base (lanceur, dépôt réglé) ? Sans cela, « non réglé » et non « non publiée »
  } = {}) {
    const loaded = new Map(), // zone → { id, cycle, split, base | data, parts, reads, idx } ; chargée une fois
      loading = new Map(), // zone → promesse de chargement
      missing = new Set(), // zones sans fichier publié (sondées en vain)
      listeners = new Set(),
      stateFns = new Set(); // écouteurs de l'état de la base (on('state')) : lecture commencée ou finie, base rafraîchie
    let listing = false, // la liste des zones publiées est en cours de lecture
      asked = false, // la base a été demandée au moins une fois
      emptyAt = 0, // quand une liste vide a été reçue (0 : en cours, ou non vide) : redemandée passé EMPTY_RETRY
      listedP = null, // promesse de { zones: { zone: { cycles, split: Set, whole: Set, prefixes } }, source }
      majorP = null, // grandes villes du monde (format découpé)
      worldP = null, // villes du monde entier (ancien format)
      aircraftP = null;
    const emitState = () => stateFns.forEach(fn => {
      try {
        fn();
      } catch {
        /* écouteur en échec : les autres sont appelés */
      }
    });
    const emit = what => listeners.forEach(fn => {
      try {
        fn(what);
      } catch {
        /* écouteur en échec : les autres sont appelés */
      }
    });
    const revs = new Map(); // chemin lu → révision lue (un fichier changé se reconnaît à sa révision)
    /** Fichier de terrain que le travail du poste vient d'installer (proc/manual/<OACI>.json tel qu'écrit, rendu dans le résultat du travail) :
     *  servi à la place de la copie du lecteur tant que celle-ci n'est pas aussi récente (même updated_at ou plus) — la première lecture
     *  répondait « 0 procédures » parce que le lecteur tenait encore l'ancienne copie. Retiré dès que le lecteur rattrape. */
    const manualFresh = new Map();
    const eadBusy = new Map(); // OACI → lecture EAD Basic en cours (fetchProcedures : une seule à la fois par terrain)
    const read = path => reader.read(path, {
      policy: 'reference',
      wait: true
    }).then(r => {
      if (r) revs.set(path, r.rev || '');
      return r;
    }, () => null);

    // ---- zones publiées : liste du lecteur (arbre du dépôt), sinon manifeste sia/base/index.json, sinon inconnues
    function published() {
      // une liste vide n'est pas une réponse sûre (réseau pas encore prêt au lancement, accès réglé depuis) : redemandée
      // à la question suivante passé EMPTY_RETRY, jamais en boucle ni par minuteur
      if (listedP && emptyAt && now() - emptyAt > EMPTY_RETRY) listedP = null;
      if (listedP) return listedP;
      asked = true;
      emptyAt = 0;
      listing = true;
      const mine = listedP = listZones().then(r => {
        if (listedP === mine && !Object.keys(r.zones || {}).length) emptyAt = now();
        return r;
      }).finally(() => {
        if (listedP === mine) listing = false;
        emitState();
      });
      emitState(); // après listedP : un écouteur qui questionne aussitôt trouve la lecture en cours
      return mine;
    }

    function listZones() {
      return (async () => {
        const out = {},
          zone = id => out[id] ||= {
            cycles: [],
            split: new Set(),
            whole: new Set(),
            kinds: {}, // cycle → sortes listées
            prefixes: [],
            kb: null // cycle du manifeste → { sorte: Ko }
          };
        const paths = await reader.list?.(PUB).catch(() => null);
        const mv = valueOf(await read(`${PUB}index.json`)),
          manifest = mv?.zones || mv?.data?.zones || null; // { zones } au premier niveau (publication du lot 3)
        if (paths) {
          for (const p of paths) {
            let m = PUB_SPLIT.exec(p);
            if (m) {
              if (m[3] === 'meta') zone(m[1]).split.add(m[2]);
              (zone(m[1]).kinds[m[2]] ||= []).push(m[3]);
            } else if ((m = PUB_WHOLE.exec(p))) zone(m[1]).whole.add(m[2]);
          }
        } else if (manifest) {
          for (const [id, e] of Object.entries(manifest))
            if (e?.cycle) zone(id).split.add(e.cycle);
        } else return {
          zones: null,
          source: 'none'
        };
        for (const [id, e] of Object.entries(manifest || {}))
          if (out[id]) Object.assign(out[id], {
            prefixes: e.prefixes || [],
            kb: e.cycle ? {
              [e.cycle]: e.kb || {}
            } : null,
            cells: e.cells && typeof e.cells === 'object' ? e.cells : null // cases d'un degré couvertes par ses données
          });
        for (const z of Object.values(out)) z.cycles = [...new Set([...z.split, ...z.whole])].sort();
        return {
          zones: out,
          source: paths ? 'list' : 'index'
        };
      })();
    }
    /** La base est-elle prête, en cours de lecture, sans accès ou non publiée ? 'loading' (liste ou zone en cours de
     *  lecture : rien n'est encore su), 'ready' (des zones publiées, lues ou gardées ici), 'noaccess' (rien pour la lire sur
     *  cet appareil : ni lanceur ni dépôt réglé), 'offline' (rien de publié connu et pas de réseau), 'unpublished' (l'accès
     *  marche, rien n'est publié), 'idle' (jamais demandée). Ne lit rien. */
    async function baseState() {
      if (listing || loading.size) return {
        state: 'loading',
        asked,
        loading: [...loading.keys()]
      };
      if (!asked || !listedP) return {
        state: access() ? 'idle' : 'noaccess',
        asked
      };
      const n = Object.keys((await listedP).zones || {}).length;
      return {
        state: n ? 'ready' : !access() ? 'noaccess' : navigator.onLine === false ? 'offline' : 'unpublished',
        asked,
        zones: n
      };
    }
    /** Cycle à lire parmi ceux publiés : le plus récent déjà en vigueur, sinon le plus ancien (publié d'avance). */
    const pickCycle = list => {
      const today = new Date(now()).toISOString().slice(0, 10),
        past = list.filter(c => c <= today);
      return past.length ? past[past.length - 1] : list[0];
    };
    /** Cycle des procédures publiées (proc/<cycle>/…) : dans la liste du lecteur, le plus récent en vigueur qui porte le
     *  fichier du terrain (icao) ou l'index ; sans liste, le premier des cycles AIRAC récents dont le fichier se lit. */
    const procCycle = async icao => {
      const file = icao ? `${icao}.json` : 'index.json',
        listed = reader.list ? await reader.list('proc/').catch(() => null) : null;
      if (Array.isArray(listed) && listed.length) {
        const found = listed.map(p => /^proc\/(\d{4}-\d{2}-\d{2})\/([^/]+)$/.exec(p)).filter(m => m && m[2] === file).map(m => m[1])
          .sort();
        return found.length ? pickCycle(found) : null;
      }
      for (const c of airacCycles(6, now()))
        if (await read(`proc/${c}/${file}`)) return c;
      return null;
    };
    const procLib = () => loadOwn('procedures.js', 'AeroDBProcedures').then(() => window.AeroDBProcedures);
    /** Les fiches d'un terrain par source : publiées (cycle en vigueur), lues à la main (proc/manual/, hors des cycles : marquées
     *  `outdated` quand le cycle de leur page n'est plus en vigueur), vues dans un OFP (proc-seen/), repli X-Plane du poste
     *  (proc/local/ : jamais synchronisé ; statut forcé à `xplane`, le rang le plus bas, et `local: true`). Copies : le cache
     *  du lecteur n'est pas modifié. */
    async function procLists(k) {
      const cycle = await procCycle(k),
        [pub, man, seen, loc] = await Promise.all([cycle ? read(`proc/${cycle}/${k}.json`) : null, read(`proc/manual/${k}.json`),
          read(`proc-seen/${k}.json`), read(`proc/local/${k}.json`)
        ]),
        inForce = airacCycles(1, now())[0];
      let mv = valueOf(man);
      const fresh = manualFresh.get(k);
      if (fresh) {
        if (mv?.updated_at && mv.updated_at >= fresh.updated_at) manualFresh.delete(k);
        else mv = fresh;
      }
      return {
        pub: valueOf(pub)?.procedures || [],
        manual: (mv?.procedures || []).map(p => {
          const c = p.source?.cycle || mv.cycle || null;
          return c && c !== inForce ? {
            ...p,
            outdated: true
          } : p;
        }),
        seen: valueOf(seen)?.procedures || [],
        local: (valueOf(loc)?.procedures || []).map(p => ({
          ...p,
          status: 'xplane',
          local: true
        }))
      };
    }
    /** Points publiés sans position (points en route des pages DATA de l'eAIP) : cherchés dans la base, le plus proche du premier
     *  point placé de la procédure ; un tronçon SANS point (id null : VA, CA, VM, FM…) reste sans position, jamais placé. */
    async function placeProc(k, rec) {
      if (!rec.points.some(p => p.lat == null && p.id)) return rec;
      const anchor = rec.points.find(p => p.lat != null) || await api.coords(k).catch(() => null);
      return {
        ...rec,
        points: await Promise.all(rec.points.map(async p => {
          if (p.lat != null || !p.id) return p;
          const all = await api.coordsAll(p.id).catch(() => []),
            d = x => (x.item.lat - anchor.lat) ** 2 + ((x.item.lon - anchor.lon) * Math.cos(anchor.lat * Math.PI / 180)) ** 2,
            best = anchor ? all.slice().sort((a, b) => d(a) - d(b))[0] : all[0];
          return best ? {
            ...p,
            lat: best.item.lat,
            lon: best.item.lon,
            placed: 'base'
          } : p;
        }))
      };
    }
    /** Zones dont un cadre (élargi de la marge) touche l'emprise b ; limitées aux zones publiées si elles sont connues. */
    /** Vrai si l'emprise b touche une des cases d'un degré d'une zone ({ "lat": [[lon0, lon1], …] }, manifeste). */
    const cellsHit = (cells, b) => {
      const x0 = Math.floor(b[0]),
        x1 = Math.floor(b[2]);
      for (let y = Math.floor(b[1]); y <= Math.floor(b[3]); y++)
        if ((cells[y] || []).some(([a, c]) => a <= x1 && c >= x0)) return true;
      return false;
    };
    /** Zones dont les données touchent l'emprise b : par les cases d'un degré du manifeste (couverture réelle des
     *  données), sinon par les cadres de la table élargis de la marge ; limitées aux zones publiées si elles sont connues. */
    async function zonesFor(b) {
      const pub = (await published()).zones,
        out = [];
      for (const [id, e] of Object.entries(pub || {}))
        if (e.cells && cellsHit(e.cells, b)) out.push(id);
      for (const [id, z] of Object.entries(zones)) {
        if (pub && (!pub[id] || pub[id].cells)) continue;
        if ((z.b || []).some(p => hits([p[0] - MARGIN, p[1] - MARGIN, p[2] + MARGIN, p[3] + MARGIN], b))) out.push(id);
      }
      // zones publiées sans cases ni cadre (zone océanique, nouvelle zone) : chargées si aucune autre ne couvre l'emprise
      if (pub && !out.length) out.push(...Object.keys(pub).filter(id => !zones[id] && !pub[id].cells));
      return out;
    }
    /** Zone ouverte (cycle et format choisis ; rien n'est encore lu en format découpé) ; null si absente. Sans liste ni
     *  manifeste : cycles AIRAC récents sondés (découpé, puis entier). */
    function loadZone(id) {
      if (loaded.has(id)) return Promise.resolve(loaded.get(id));
      if (missing.has(id)) return Promise.resolve(null);
      if (loading.has(id)) return loading.get(id);
      const p = (async () => {
        const pub = (await published()).zones,
          e = pub?.[id],
          cycles = pub ? e ? [pickCycle(e.cycles)] : [] : airacCycles(6, now());
        for (const cycle of cycles) {
          const base = `${PUB}${id}/${cycle}/`,
            z = {
              id,
              cycle,
              parts: new Map(),
              reads: [],
              idx: {},
              // index léger des terrains publié pour ce cycle (liste de l'arbre ou tailles du manifeste) : lu pour
              // trouver un terrain par son code ou le long d'une route, au lieu de aerodromes.json (dix fois plus lourd)
              lite: !!e && ((e.kinds?.[cycle] || []).includes('aeroindex') || e.kb?.[cycle]?.aeroindex != null)
            };
          // découpé : préféré ; méta lue d'emblée (petite : cycle, axes AAR, tracks NAT)
          if (!pub || e.split.has(cycle)) {
            const t0 = performance.now(),
              r = await read(`${base}meta.json`);
            if (r) {
              Object.assign(z, {
                split: true,
                base
              });
              z.parts.set('meta', Promise.resolve(valueOf(r)?.data || {}));
              z.reads.push({
                kind: 'meta',
                bytes: sizeOf(r),
                ms: Math.round(performance.now() - t0)
              });
            }
          }
          if (!z.split && (!pub || e.whole.has(cycle))) {
            const t0 = performance.now(),
              r = await read(`${PUB}${id}/${cycle}.json`),
              data = valueOf(r);
            if (data) {
              Object.assign(z, {
                split: false,
                data
              });
              z.reads.push({
                kind: 'whole',
                bytes: sizeOf(r),
                ms: Math.round(performance.now() - t0)
              });
            }
          }
          if (z.split !== undefined) {
            loaded.set(id, z);
            emit({
              zone: id,
              cycle
            });
            return z;
          }
        }
        // absente : retenue seulement si rien ne la dit publiée (sondage) ; publiée mais illisible (hors ligne, zone non
        // gardée) : redemandée à la prochaine question
        if (!e) missing.add(id);
        return null;
      })().finally(() => {
        loading.delete(id);
        emitState();
      });
      loading.set(id, p);
      emitState();
      return p;
    }
    /** Zones qui couvrent l'emprise b (ouvertes à la demande). */
    async function zonesOf(b) {
      return (await Promise.all((await zonesFor(b)).map(loadZone))).filter(Boolean);
    }
    /** Données d'une sorte d'une zone (lues une fois) : tableau, objet (obstaclemax, meta) ; vides si absentes. */
    function part(z, kind) {
      if (z.parts.has(kind)) return z.parts.get(kind);
      const empty = kind === 'obstaclemax' || kind === 'meta' ? {} : [];
      let p;
      if (z.split) {
        p = (async () => {
          const t0 = performance.now(),
            r = await read(`${z.base}${kind}.json`);
          z.reads.push({
            kind,
            bytes: sizeOf(r),
            ms: Math.round(performance.now() - t0)
          });
          if (!r) z.parts.delete(kind); // illisible (hors ligne, sorte non gardée) : vide cette fois, redemandée ensuite
          return valueOf(r)?.data ?? empty;
        })();
      } else {
        const d = z.data,
          a = d.aero || {};
        p = Promise.resolve(kind === 'airspaces' ? d.airspaces || [] : POINT_KINDS.includes(kind) || kind === 'airways' ? a[kind] || [] :
          kind === 'mora' ? d.moraCells || [] : kind === 'obstaclemax' ? d.obstacleMax || {} : kind === 'meta' ? d : kind === 'cities' ?
          null : empty);
      }
      z.parts.set(kind, p);
      return p;
    }

    // ---- index d'une zone, par sorte, construits à la première demande
    function idx(z, kind) {
      if (z.idx[kind]) return z.idx[kind];
      const p = z.idx[kind] = buildIdx(z, kind),
        k = kind.startsWith('ident:') ? kind.slice(6) : kind === 'aerodromes:lite' ? 'aeroindex:list' : kind;
      // index bâti sur une sorte illisible : oublié avec elle, rebâti à la prochaine question
      p.then(() => !z.parts.has(k) && z.idx[kind] === p && delete z.idx[kind], () => z.idx[kind] === p && delete z.idx[kind]);
      return p;
    }

    function buildIdx(z, kind) {
      return (async () => {
        if (kind === 'airspaces') {
          const cells = new Map(),
            wide = [],
            boxes = new Map();
          for (const a of await part(z, 'airspaces')) {
            const b = ringBox(a.rings);
            if (!b) continue;
            boxes.set(a, b);
            const ks = cellsOf(b, WIDE);
            if (!ks) wide.push(a);
            else
              for (const k of ks)(cells.get(k) || cells.set(k, []).get(k)).push(a);
          }
          return {
            cells,
            wide,
            boxes
          };
        }
        if (kind === 'airways') {
          const cells = new Map();
          for (const w of await part(z, 'airways')) {
            if (!num(w?.a?.lat) || !num(w?.b?.lat)) continue;
            const b = [Math.min(w.a.lon, w.b.lon), Math.min(w.a.lat, w.b.lat), Math.max(w.a.lon, w.b.lon), Math.max(w.a.lat, w.b
                .lat)],
              ks = cellsOf(b, 64) || [cellKey(w.a.lat, w.a.lon), cellKey(w.b.lat, w.b.lon)];
            for (const k of ks)(cells.get(k) || cells.set(k, []).get(k)).push(w);
          }
          return {
            cells
          };
        }
        if (kind === 'mora') return new Map((await part(z, 'mora')).map(c => [cellKey(c.lat, c.lon), c]));
        if (kind === 'aerodromes:lite') return pointIndex(await aerodromesFor(z));
        if (kind.startsWith('ident:')) { // identifiant → éléments d'une sorte (aérodromes par code OACI : index léger d'abord)
          const k = kind.slice(6),
            m = new Map();
          for (const x of await (k === 'aerodromes' ? aerodromesFor(z) : part(z, k))) {
            const id = fold(k === 'aerodromes' ? x.icao || x.id : x.id);
            if (id)(m.get(id) || m.set(id, []).get(id)).push(x);
          }
          return m;
        }
        if (kind === 'cities') {
          const list = await part(z, 'cities');
          return list && {
            cells: pointIndex(list),
            list
          };
        }
        return pointIndex(await part(z, kind));
      })();
    }
    /** Terrains légers d'une zone (aeroindex.json : { fields, rows }) en objets { icao, id, name, lat, lon, elev, bearing,
     *  magVar, lite: true } ; lus une fois. */
    function liteAerodromes(z) {
      if (z.parts.has('aeroindex:list')) return z.parts.get('aeroindex:list');
      const p = part(z, 'aeroindex').then(d => {
        const f = Array.isArray(d?.fields) ? d.fields : [];
        if (!f.length || !Array.isArray(d?.rows)) z.parts.delete('aeroindex:list'); // illisible : redemandé ensuite
        return (d?.rows || []).map(r => {
          const o = Object.fromEntries(f.map((k, i) => [k, r[i]]));
          return {
            ...o,
            id: o.icao,
            lite: true
          };
        });
      });
      z.parts.set('aeroindex:list', p);
      return p;
    }
    /** Terrains d'une zone pour une recherche par code ou le long d'une route : l'index léger s'il est publié et que la
     *  sorte complète n'est pas déjà lue, sinon aerodromes.json. */
    const aerodromesFor = z => z.split && z.lite && !z.parts.has('aerodromes') ? liteAerodromes(z) : part(z, 'aerodromes');
    /** Éléments d'une sorte de points dans l'emprise de q (filtre : f(x)) ; toutes zones couvrantes. q.lite (terrains) :
     *  l'index léger suffit (code, nom, position, altitude, axe de piste). */
    async function pointsIn(kind, q, f = () => true) {
      const b = boxOf(q);
      if (!b) return [];
      const out = [],
        seen = new Set(),
        k = kind === 'aerodromes' && q?.lite ? 'aerodromes:lite' : kind;
      for (const z of await zonesOf(b))
        for (const list of within(await idx(z, k), b))
          for (const x of list)
            if (!seen.has(x) && x.lon >= b[0] && x.lon <= b[2] && x.lat >= b[1] && x.lat <= b[3] && f(x)) {
              seen.add(x);
              out.push(x);
            }
      return out;
    }

    // ---- villes : par zone (format découpé) et grandes villes du monde ; ancien format : monde entier
    const byPop = (a, b) => (b.population || 0) - (a.population || 0);
    const major = () => majorP ||= read(`${PUB}cities_major.json`).then(r => (valueOf(r)?.data || []).sort(byPop));
    const world = () => worldP ||= read(`${PUB}cities.json`).then(r => (valueOf(r)?.cities || []).sort(byPop));
    /** Villes candidates d'une recherche par nom : celles des zones ouvertes, puis les grandes villes du monde ; sans
     *  format découpé, celles du monde entier. */
    async function nameCities() {
      const zs = [...loaded.values()];
      if (zs.some(z => z.split)) {
        const lists = await Promise.all(zs.filter(z => z.split).map(z => part(z, 'cities')));
        return [...lists.flat(), ...await major()];
      }
      return world();
    }

    // ---- base des types (JSON en V3 ; .js de la V2 lu comme littéral tant que le lanceur l'écrit)
    let aircraftBusy = false; // registre en cours de lecture
    function aircraft() {
      return aircraftP ||= (async () => {
        aircraftBusy = true;
        // tout en parallèle (premier écran sur un réseau lent : une attente au lieu de six) : les scripts du registre, les
        // sources du registre dès que registry.js est là (readAll), et la base des types ; JSON ou .js de la V2 choisi
        // d'après l'arbre du dépôt quand le lecteur le connaît (sinon les deux demandés à la fois, le JSON préféré)
        const libsP = Promise.all([loadOwn('registry.js', 'AeroDBRegistry'), loadOwn('sheets.js', 'AeroDBSheets')]),
          rawP = libsP.then(() => window.AeroDBRegistry.readAll(reader)),
          listed = reader.list ? await reader.list('AircraftDB/').catch(() => null) : null;
        const one = async (base, name) => {
          const jp = `AircraftDB/${base}.json`,
            sp = `AircraftDB/${base}.js`,
            has = p => !Array.isArray(listed) || listed.includes(p),
            [j, s] = await Promise.all([has(jp) ? read(jp) : null, has(sp) && !(Array.isArray(listed) && listed.includes(jp)) ?
              read(sp) :
              null
            ]);
          if (j) return valueOf(j);
          const t = s || (Array.isArray(listed) && listed.includes(jp) && has(sp) ? await read(sp) : null);
          return t ? literal(t.text ?? t.value, name) : null;
        };
        const [db, perf] = await Promise.all([one('aircraft_db', 'AIRCRAFT_DB'), one('aircraft_perf', 'AIRCRAFT_PERF')]),
          catalog = window.AeroDBAircraft.create({
            db: db || {},
            perf: perf || {}
          });
        // registre : fiches, flotte, référence, recherche unique (registry.js) ; logique des fiches (sheets.js)
        await libsP;
        const reg = registry = window.AeroDBRegistry.create({
            reader,
            catalog,
            now,
            raw: rawP
          }),
          state = await reg.load(),
          fleet = await reg.fleetTypes();
        window.AeroDBSheets.configure({
          aircraft: catalog,
          profiles: () => Object.fromEntries([...state.sheets].map(([id, x]) => [id, x.sheet])),
          fleet: () => fleet
        });
        return Object.assign(catalog, {
          searchTypes: catalog.search,
          search: reg.search,
          resolve: reg.resolve,
          aircraftOf: reg.aircraftOf,
          sheets: reg.sheets,
          fleetTypes: reg.fleetTypes,
          lib: window.AeroDBSheets
        });
      })().finally(() => {
        aircraftBusy = false; // lu, ou en échec
      });
    }
    let registry = null;
    // ---- fiches .lnmperf (lnmperf.js), chargé à la première demande ; axes AAR dessinables (aar.js)
    let lnmP = null,
      aarCache = null;
    const lnmperf = () => lnmP ||= loadOwn('lnmperf.js', 'AeroDBLnmperf').then(() => window.AeroDBLnmperf.create({
      reader,
      aircraft,
      launcher,
      launcherRoot: new URL('../../', HERE).href
    }));

    // ---- données gardées hors ligne (cache du frame)
    /** Fichiers d'une zone pour son cycle choisi : [{ path, kind, kb }] (kb : taille publiée, null si inconnue), cycle et
     *  format ; null si la zone n'est pas publiée. */
    async function zoneFiles(id) {
      const e = (await published()).zones?.[id];
      if (!e) return null;
      const cycle = pickCycle(e.cycles),
        kb = e.kb?.[cycle] || {};
      if (e.split.has(cycle)) {
        const kinds = e.kinds[cycle]?.length ? e.kinds[cycle] : Object.keys(kb).length ? Object.keys(kb) : SPLIT_KINDS;
        return {
          cycle,
          format: 'split',
          files: kinds.map(k => ({
            path: `${PUB}${id}/${cycle}/${k}.json`,
            kind: k,
            kb: kb[k] ?? null
          }))
        };
      }
      return {
        cycle,
        format: 'whole',
        files: [{
          path: `${PUB}${id}/${cycle}.json`,
          kind: 'whole',
          kb: null
        }]
      };
    }
    /** Copies locales du lecteur sous un préfixe : Map chemin → { rev, bytes, at } ; null si le lecteur ne le dit pas. */
    async function cachedMap(prefix) {
      if (typeof reader.cached !== 'function') return null;
      const list = await reader.cached(prefix).catch(() => null);
      return list ? new Map(list.map(x => [x.path, x])) : null;
    }
    /** État d'un ensemble de fichiers attendus dans le cache : absent, partiel, complet ; inconnu sans cached(). */
    function stateOf(files, cache) {
      if (!cache) return {
        state: 'unknown',
        cachedKb: null,
        at: null
      };
      const hit = files.filter(f => cache.has(f.path)),
        at = hit.map(f => cache.get(f.path).at).filter(Boolean).sort().pop() || null;
      return {
        state: !hit.length ? 'absent' : hit.length === files.length ? 'complete' : 'partial',
        cachedKb: Math.round(hit.reduce((n, f) => n + (cache.get(f.path).bytes || 0), 0) / 1024),
        at: at && new Date(at).toISOString()
      };
    }
    /** Lit (et laisse dans le cache du frame) une liste de chemins ; onProgress({ done, total, path, kb }). */
    async function fetchAll(paths, onProgress) {
      let done = 0,
        kb = 0;
      const failed = [];
      for (const path of paths) {
        const r = await read(path);
        if (r) kb += sizeOf(r) / 1024;
        else failed.push(path);
        onProgress?.({
          done: ++done,
          total: paths.length,
          path,
          kb: Math.round(kb)
        });
      }
      return {
        failed,
        kb: Math.round(kb)
      };
    }
    const offline = {
      /** Ce que le lecteur permet : cached (état du cache sans réseau), evict (libérer). */
      supported: () => ({
        cached: typeof reader.cached === 'function',
        evict: typeof reader.evict === 'function'
      }),
      /** Zones publiées : [{ id, names [fr, en, de, es], prefixes, cycle, format, publishedKb, cachedKb, state (absent,
       *  partial, complete, unknown), at (copie la plus récente), staleKb (copies d'autres cycles) }], par nom. */
      async zones() {
        const pub = (await published()).zones || {},
          cache = await cachedMap(PUB),
          out = [];
        for (const id of Object.keys(pub)) {
          const zf = await zoneFiles(id),
            known = zf.files.every(f => f.kb !== null),
            stale = cache ? [...cache.values()].filter(c => (PUB_SPLIT.exec(c.path) || PUB_WHOLE.exec(c.path))?.[1] === id && !zf
              .files
              .some(f => f.path === c.path)) : [];
          out.push({
            id,
            names: zones[id]?.n || [id.toUpperCase()],
            prefixes: pub[id].prefixes,
            cycle: zf.cycle,
            format: zf.format,
            publishedKb: known ? zf.files.reduce((n, f) => n + f.kb, 0) : null,
            ...stateOf(zf.files, cache),
            staleKb: cache ? Math.round(stale.reduce((n, c) => n + (c.bytes || 0), 0) / 1024) : null
          });
        }
        return out.sort((a, b) => String(a.names[0]).localeCompare(String(b.names[0])));
      },
      /** Garde une zone hors ligne : toutes ses sortes lues dans le cache du frame (et les fichiers communs : manifeste,
       *  grandes villes) ; rend l'état de la zone et { failed, kb } lus. */
      async keep(id, {
        onProgress
      } = {}) {
        const zf = await zoneFiles(id);
        if (!zf) throw new Error(`aerodb: zone ${id} not published`);
        const got = await fetchAll([...zf.files.map(f => f.path), ...COMMON], onProgress);
        return {
          ...(await offline.zones()).find(z => z.id === id),
          failed: got.failed,
          readKb: got.kb
        };
      },
      /** Libère une zone : copies locales de tous ses cycles retirées du cache du frame (rien n'est envoyé), zone fermée en
       *  mémoire ; les fichiers communs restent. */
      async release(id) {
        if (typeof reader.evict !== 'function') throw new Error('aerodb: the reader cannot evict (evict missing)');
        // un seul appel pour tout le dossier de la zone (tous cycles, format entier compris : evict d'un préfixe en /)
        const cache = await cachedMap(`${PUB}${id}/`);
        await reader.evict(`${PUB}${id}/`);
        for (const path of cache?.keys() || []) revs.delete(path);
        loaded.delete(id);
        missing.delete(id);
        emit({
          released: id
        });
        return (await offline.zones()).find(z => z.id === id) || null;
      },
      /** Fichiers communs (manifeste, grandes villes du monde) : état dans le cache. */
      async common() {
        const files = COMMON.map(path => ({
          path
        }));
        return stateOf(files, await cachedMap(PUB));
      },
      /** Base des types : fichiers lus (JSON, sinon .js de la V2) et leur état dans le cache. */
      async aircraft() {
        const cache = await cachedMap('AircraftDB/'),
          json = ['AircraftDB/aircraft_db.json', 'AircraftDB/aircraft_perf.json'],
          js = ['AircraftDB/aircraft_db.js', 'AircraftDB/aircraft_perf.js'],
          files = (cache && json.some(p => cache.has(p))) || !cache || !js.some(p => cache.has(p)) ? json : js;
        return {
          files: files.map(path => ({
            path,
            cached: cache ? cache.has(path) : null,
            kb: cache?.has(path) ? Math.round((cache.get(path).bytes || 0) / 1024) : null
          })),
          types: aircraftP ? (await aircraftP).size() : null,
          ...stateOf(files.map(path => ({
            path
          })), cache)
        };
      }
    };

    // ---- carte de couverture des procédures (§ 10.22) : coverage(icao), coverageByState()
    let covP = null; // promesse de la table { held: Map OACI → { source, outdated, counts }, ead: EAD_STATES } ; null : à bâtir
    // issues d'EAD_STATES qui disent POURQUOI rien n'est lisible (toute autre valeur, 'sia' d'un État autre que LF comprise, est
    // inattendue : 'unknown', jamais une raison inventée)
    const COV_WHY = new Set(['images', 'labels', 'points', 'prose', 'vfr', 'none']);
    /** Les index dont la table est tirée ont peut-être changé : la table est jetée, rebâtie à la prochaine question. */
    const dropCoverage = () => {
      covP = null;
    };
    /** Cet appareil peut-il lancer la lecture ? Un lanceur avec `job`, non appairé (comme fetchProcedures). Lu à chaque appel. */
    const canRead = () => typeof launcher?.job === 'function' && !!launcher.info?.() && !launcher.info().lan;
    /** Le poste a-t-il une base de Little Navmap ? (noms seuls dans /__setup/status › lnm.) Lu à chaque appel. */
    const hasLnm = () => {
      const l = launcher?.info?.()?.lnm;
      return Array.isArray(l) && l.length > 0;
    };
    /** Table des terrains détenus, bâtie UNE fois depuis procedureIndex() (cycle publié + proc/manual/ + proc/local/, déjà fusionnés)
     *  et EAD_STATES, jamais depuis la base ; des appels simultanés partagent la même promesse. Un terrain dont l'index ne porte
     *  aucune procédure n'est pas « détenu ». */
    function coverageTable() {
      if (covP) return covP;
      const p = (async () => {
        const [ix, src] = await Promise.all([api.procedureIndex().catch(() => null), api.sources().catch(() => null)]),
          held = new Map();
        for (const [k, e] of Object.entries(ix?.aerodromes || {})) {
          const counts = {
            SID: +e?.SID || 0,
            STAR: +e?.STAR || 0,
            APP: +e?.APP || 0
          };
          if (!e || counts.SID + counts.STAR + counts.APP === 0) continue;
          held.set(k.toUpperCase(), {
            source: e.local ? 'local' : e.manual ? 'manual' : 'published',
            outdated: !!(e.manual && !e.local && e.outdated),
            counts
          });
        }
        // catalogue illisible : la table sert cette fois mais n'est pas gardée (redemandée au prochain appel)
        if (!src?.EAD_STATES && covP === p) covP = null;
        return {
          held,
          ead: src?.EAD_STATES || {}
        };
      })();
      return covP = p;
    }
    /** Ce qu'un État offre à la demande, hors terrain détenu : [niveau, raison]. */
    function stateCoverage(prefix, ead, lnm) {
      if (prefix === 'LF') return ['orange', 'sia']; // la France : l'eAIP du SIA, quoi qu'en dise EAD_STATES
      const out = ead[prefix]?.outcome;
      if (out === 'read') return ['orange', 'ead'];
      if (lnm) return ['orange', 'lnm'];
      return ['red', COV_WHY.has(out) ? out : 'unknown'];
    }

    const EMPTY_RETRY = 30e3;
    const api = {
      /** État de la base (sans rien lire), voir baseState : { state, asked, zones, loading }. */
      state: baseState,
      /** L'accès ou la source a changé (dépôt réglé, accès coupé, réseau revenu) : la liste des zones publiées est relue
       *  à la prochaine question ; les zones déjà ouvertes restent. */
      refresh() {
        listedP = null;
        listing = false;
        emptyAt = 0;
        missing.clear();
        dropCoverage();
        emitState();
        emit({
          refreshed: true,
          coverage: true
        });
      },
      /** État : zones publiées et leur cycle (null : inconnues), source de la liste (list, index, none), zones ouvertes et
       *  leur format, zones sans fichier, cycle le plus récent ouvert. */
      async status() {
        const pub = await published();
        return {
          published: pub.zones ? Object.fromEntries(Object.entries(pub.zones).map(([k, e]) => [k, pickCycle(e.cycles)])) : null,
          source: pub.source,
          loaded: Object.fromEntries([...loaded.values()].map(z => [z.id, `${z.cycle}${z.split ? '' : ' (whole)'}`])),
          missing: [...missing],
          cycle: [...new Set([...loaded.values()].map(z => z.cycle))].sort().pop() || null
        };
      },
      /** Zones ouvertes pour l'emprise de q. */
      ready: async (q = {}) => {
        const b = boxOf(q);
        return b ? (await zonesOf(b)).map(z => z.id) : [];
      },
      /** Écoute des changements (zone ouverte, fichier publié changé) ; rend la fonction de désabonnement. */
      on(event, fn) {
        const set = event === 'change' ? listeners : event === 'state' ? stateFns : null;
        if (!set) return () => {};
        set.add(fn);
        return () => set.delete(fn);
      },
      /** Espaces qui touchent l'emprise de q ; q.types : types gardés (« R », « D », « TMA »…). */
      async airspaces(q = {}) {
        const b = boxOf(q);
        if (!b) return [];
        const types = q.types ? new Set([].concat(q.types)) : null,
          out = [],
          seen = new Set();
        for (const z of await zonesOf(b)) {
          const ix = await idx(z, 'airspaces'),
            take = a => {
              if (seen.has(a) || (types && !types.has(a.type))) return;
              seen.add(a);
              if (hits(ix.boxes.get(a), b)) out.push(a);
            };
          ix.wide.forEach(take);
          for (const list of within(ix.cells, b)) list.forEach(take);
        }
        return out;
      },
      /** Aérodromes de l'emprise de q, ou celui de q.icao (index léger quand il est publié : { icao, name, lat, lon,
       *  elev, bearing, magVar, lite }) ; q.lite : l'emprise aussi dans l'index léger (pas de type ni de piste en dur). */
      aerodromes: async (q = {}) => q.icao ? (await api.coordsAll(q.icao)).filter(x => x.kind === 'aerodrome').map(x => x.item) :
        pointsIn(
          'aerodromes', q),
      navaids: q => pointsIn('navaids', q),
      points: q => pointsIn('points', q),
      vrp: q => pointsIn('vrp', q),
      /** Obstacles de l'emprise de q ; q.minHgt : hauteur minimale (ft). */
      obstacles: q => pointsIn('obstacles', q, o => !(q?.minHgt > 0) || (o.hgt || 0) >= q.minHgt),
      /** Voies aériennes dont un segment touche l'emprise de q. */
      async airways(q = {}) {
        const b = boxOf(q);
        if (!b) return [];
        const out = [],
          seen = new Set();
        for (const z of await zonesOf(b))
          for (const list of within((await idx(z, 'airways')).cells, b))
            for (const w of list)
              if (!seen.has(w) && hits([Math.min(w.a.lon, w.b.lon), Math.min(w.a.lat, w.b.lat), Math.max(w.a.lon, w.b.lon), Math.max(w
                  .a.lat, w
                  .b.lat)], b)) {
                seen.add(w);
                out.push(w);
              }
        return out;
      },
      /** MORA (ft) de la case d'un degré qui contient le point ; null si inconnue. */
      async mora(lat, lon) {
        for (const z of await zonesOf([lon, lat, lon, lat])) {
          const c = (await idx(z, 'mora')).get(cellKey(lat, lon));
          if (c) return c.moraFt ?? +String(c.mora).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d)) * 100;
        }
        return null;
      },
      /** Cases MORA de l'emprise de q. */
      async moraCells(q = {}) {
        const b = boxOf(q);
        if (!b) return [];
        const out = new Map();
        for (const z of await zonesOf(b))
          for (const c of within(await idx(z, 'mora'), b)) {
            const k = cellKey(c.lat, c.lon);
            if (!out.has(k)) out.set(k, c);
          }
        return [...out.values()];
      },
      /** Axes de ravitaillement (texte XML MILAIP ENR 5.7 et ceux d'autres pays) des zones ouvertes. */
      async aar() {
        const out = [];
        for (const z of loaded.values()) {
          const m = await part(z, 'meta');
          if (m.aarXml) out.push(m.aarXml);
          out.push(...(m.aarXmlExtra || []));
        }
        return out;
      },
      /** Points de report, séquences et consignes VFR d'un terrain, extraits des cartes VAC (sia/vfr/<OACI>.json, écrit par
       *  Paramètres › Maintenance › « Importer une compilation VFR ») : { ad, status: 'candidate', label, source, points
       *  [{ code, vrp, lat, lon, page, text }], routes [{ codes, vrps, page, text, fragment }], notes [{ page, title, text
       *  }] } ; candidats à vérifier, jamais un itinéraire publié. null sans fichier pour ce terrain. */
      async vfrRoutes(icao) {
        const k = String(icao || '').toUpperCase();
        if (!/^[A-Z]{4}$/.test(k)) return null;
        const v = valueOf(await read(`sia/vfr/${k}.json`));
        return v?.ad === k ? v : null;
      },
      /** Index des terrains de la compilation VFR (sia/vfr/index.json) : { aerodromes [{ ad, points, routes, notes,
       *  unmatched }], generatedAt, label } ; null sans import. */
      async vfrIndex() {
        return valueOf(await read('sia/vfr/index.json')) || null;
      },
      /** Procédures (SID, STAR, approches) d'un terrain, au schéma commun (SPEC § 5 quinquies) : le fichier publié du cycle
       *  (proc/<cycle>/<OACI>.json) et ce qui a été vu dans les OFP de l'utilisateur (proc-seen/<OACI>.json, source
       *  secondaire), fusionnés ; q : { kind, runway, name, transition }. [] sans donnée. */
      async procedures(icao, q = {}) {
        const k = String(icao || '').toUpperCase();
        if (!/^[A-Z0-9]{3,4}$/.test(k)) return [];
        const P = await procLib(),
          lists = await procLists(k);
        const out = P.filter(P.merge(lists.pub, lists.manual, lists.seen, lists.local), q);
        return Promise.all(out.map(rec => placeProc(k, P.withPhases(rec))));
      },
      /** Une procédure par son identifiant (OACI.TYPE.NOM.PISTE[.TRANSITION]) : la fiche fusionnée qui le porte, sinon la fiche
       *  de la source qui le porte (publiée, proc/manual/ ou proc-seen/ : une procédure d'OFP, statut ofp, se retrouve ainsi) ;
       *  null sinon. Carburant y retrouve le choix gardé dans route.procedures (§ 10.20). */
      async procedure(id) {
        const s = String(id || '').trim().toUpperCase(),
          k = s.split('.')[0];
        if (!/^[A-Z0-9]{3,4}$/.test(k)) return null;
        const merged = (await api.procedures(k)).find(p => p.id === s);
        if (merged) return merged;
        const P = await procLib(),
          lists = await procLists(k),
          raw = [...lists.pub, ...lists.manual, ...lists.seen, ...lists.local].find(p => p && p.id === s);
        return raw ? placeProc(k, P.withPhases({
          ...raw,
          sources: [{
            ...raw.source,
            status: raw.status
          }]
        })) : null;
      },
      /** Pistes d'un terrain (§ 10.20) : [{ id ('23', '05R'), lat, lon (seuil), elev (ft, seuil), qfu (relèvement magnétique, °),
       *  displaced (ft), length, width, source, approx }] — celles que les fichiers de procédures portent (FAA CIFP : enregistrements
       *  de piste, complets), ceux de la page AD 2.12 de l'eAIP du SIA (complets aussi : `true` cap vrai, `displaced` en ft comme le CIFP,
       *  `dthr` : null ou le seuil décalé { lat, lon, elev }), sinon déduites des points RWnn des procédures (seuil seulement :
       *  `approx: true`, QFU du numéro de la piste, altitude du terrain) ; [] sans rien. */
      async runways(icao) {
        const k = String(icao || '').toUpperCase();
        if (!/^[A-Z0-9]{3,4}$/.test(k)) return [];
        const cycle = await procCycle(k),
          [pub, man, loc] = await Promise.all([cycle ? read(`proc/${cycle}/${k}.json`) : null, read(`proc/manual/${k}.json`),
            read(`proc/local/${k}.json`)
          ]),
          byId = new Map();
        for (const r of [...(valueOf(pub)?.runways || []), ...(valueOf(man)?.runways || []), ...(valueOf(loc)?.runways || [])])
          if (r && r.id && !byId.has(r.id)) byId.set(r.id, {
            ...r,
            approx: false
          });
        const ad = (await api.aerodromes({
          icao: k
        }).catch(() => []))[0];
        const recs = await api.procedures(k);
        for (const rec of recs)
          for (const p of rec.points) {
            const m = /^RW(\d\d)([LRC]?)$/.exec(p.id || '');
            if (!m || p.lat == null || byId.has(m[1] + m[2])) continue;
            byId.set(m[1] + m[2], {
              id: m[1] + m[2],
              lat: p.lat,
              lon: p.lon,
              elev: ad && Number.isFinite(+ad.elev) ? +ad.elev : null,
              qfu: +m[1] * 10,
              displaced: null,
              length: null,
              width: null,
              source: rec.source?.kind || null,
              approx: true
            });
          }
        // les pistes que les fiches nomment (`runways`) sans que la table en donne le seuil (le SIA renvoie les seuils à la page AD 2.12) :
        // sans position (lat, lon null), QFU du numéro ; jamais « ALL » (ni RWALL) ; une forme « 16B » (les deux parallèles) est coupée en 16L et 16R
        for (const rec of recs)
          for (const name of rec.runways || []) {
            const m = /^(?:RW)?(\d\d)([LRCB]?)$/.exec(String(name).trim().toUpperCase());
            if (!m || +m[1] < 1 || +m[1] > 36) continue;
            const ids = m[2] === 'B' ? [m[1] + 'L', m[1] + 'R'] : [m[1] + m[2]]; // « 16B » : les deux parallèles
            for (const id of ids)
              if (!byId.has(id)) byId.set(id, {
                id,
                lat: null,
                lon: null,
                elev: null,
                qfu: +m[1] * 10,
                displaced: null,
                length: null,
                width: null,
                source: rec.source?.kind || null,
                approx: true
              });
          }
        // « 14 » d'une STAR commune aux deux parallèles n'est pas une piste de plus quand 14L / 14R sont là (sans position, seulement)
        for (const [id, r] of byId)
          if (/^\d\d$/.test(id) && r.lat == null && [...byId.keys()].some(o => o.length === 3 && o.startsWith(id))) byId.delete(id);
        return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
      },
      /** Index des procédures publiées : { cycle, aerodromes: { OACI: { SID, STAR, APP, status } } }, les terrains lus à la main
       *  (proc/manual/index.json) ajoutés quand le cycle n'en a rien, avec `manual: true` et `outdated`, puis ceux du repli
       *  X-Plane du poste (proc/local/index.json) avec `local: true` ; null sans rien. */
      async procedureIndex() {
        const cycle = await procCycle(),
          [ix, mx, lx] = await Promise.all([cycle ? read(`proc/${cycle}/index.json`) : null, read('proc/manual/index.json'),
            read('proc/local/index.json')
          ]),
          v = valueOf(ix),
          m = valueOf(mx),
          l = valueOf(lx);
        if (!v && !m && !l) return null;
        const inForce = airacCycles(1, now())[0],
          out = {
            ...(v || {}),
            cycle: v?.cycle || cycle || null,
            aerodromes: {
              ...(v?.aerodromes || {})
            }
          };
        for (const [k, e] of Object.entries(m?.aerodromes || {}))
          if (!out.aerodromes[k]) out.aerodromes[k] = {
            ...e,
            manual: true,
            outdated: !!e.cycle && e.cycle !== inForce
          };
        for (const [k, e] of Object.entries(l?.aerodromes || {}))
          if (!out.aerodromes[k]) out.aerodromes[k] = {
            ...e,
            status: 'xplane',
            local: true
          };
        return out;
      },
      /** Lecture À LA DEMANDE des procédures d'un terrain (§ 10.20, contrat du 28 octobre 2026) : le travail du poste est lancé par
       *  le cadre sur le lanceur (route regen/job, jeu proc, tools/regen_jobs.py), choisi par l'ÉTAT du terrain : la France (LF) par
       *  l'eAIP du SIA (verbe eaip-fetch, sans compte), un État dont EAD Basic se lit (EAD_STATES, outcome 'read') par EAD Basic
       *  (verbe ead-fetch, un terrain par geste, EAD_BASIC.md § 1), tout autre État : rien à lire, 'no-tables'. Le poste installe le
       *  résultat dans proc/manual/ et le valide dans le dépôt des données (ces deux fichiers seulement, sans envoi), puis
       *  procedures() le sert. Rend { ok: true, icao, procedures, warnings, commit, source: 'eaip' | 'ead' } ou
       *  { ok: false, reason, message? } — reason : 'bad-icao', 'no-launcher' (sans lanceur : l'OFP SimBrief reste la source du
       *  vol), 'paired' (appareil appairé au poste : le geste se fait sur le poste), 'no-tables' (aucune table de codage publiée
       *  pour cet État, ou la page du terrain n'en cite pas ; pour un État sans lecture, `outcome` (EAD_STATES) dit pourquoi et `lnm`
       *  vaut true quand le poste a des bases de Little Navmap : indice, leur lecture est prévue à part, § 10.21), 'no-credentials'
       *  (EAD : secrets/ead.json absent, à régler sur le poste), 'too-soon' (EAD : une lecture il y a moins de 30 s ; `wait` dit les
       *  secondes restantes), 'busy' (ce terrain est déjà en lecture, ou le lanceur fait un autre
       *  travail), 'cancelled', 'failed' (`message` : refus de connexion, page non publiée, aucune procédure lue, contrôle de
       *  géométrie, lanceur plus ancien…). `onProgress({ step, done, total, source })`, `signal` (AbortSignal). Jamais silencieux,
       *  jamais deux fois pour le même terrain en même temps. */
      async fetchProcedures(icao, {
        onProgress,
        signal
      } = {}) {
        const k = String(icao || '').trim().toUpperCase(),
          no = (reason, more = {}) => ({
            ok: false,
            reason,
            ...more
          });
        if (!/^[A-Z0-9]{4}$/.test(k)) return no('bad-icao');
        if (signal?.aborted) return no('cancelled');
        if (typeof launcher?.job !== 'function' || !launcher.info?.()) return no('no-launcher');
        if (launcher.info().lan) return no('paired');
        if (eadBusy.has(k)) return no('busy');
        // enregistrée avant le premier await : un second appel du même instant trouve la lecture en cours
        const run = (async () => {
          let source = 'eaip'; // la France : l'eAIP du SIA, jamais EAD_STATES
          if (!k.startsWith('LF')) {
            const st = (await api.sources().catch(() => null))?.EAD_STATES?.[k.slice(0, 2)];
            if (st?.outcome !== 'read') return no('no-tables', { // ni l'eAIP lu ici ni EAD Basic : rien à lancer
              outcome: st?.outcome ?? null,
              lnm: Array.isArray(launcher.info()?.lnm) && launcher.info().lnm.length > 0
            });
            source = 'ead';
          }
          const r = await launcher.job('regen/job', {
            set: 'proc',
            verb: source === 'eaip' ? 'eaip-fetch' : 'ead-fetch',
            args: {
              icao: k
            }
          }, {
            onProgress: st => {
              try {
                onProgress?.({
                  step: st.step,
                  done: st.done,
                  total: st.total,
                  source
                });
              } catch {
                /* écouteur du module en échec : la lecture continue */
              }
            },
            signal
          });
          if (!r) return no('no-launcher');
          const res = r.result;
          if (r.cancelled) return no('cancelled');
          if (res?.ok !== true) { // un travail annulé trop tard pour l'être (fichiers déjà installés) vaut sa réussite
            if (r.status === 409) return no('busy');
            if (r.status === 429 || r.reason === 'too-soon') return no('too-soon', { // EAD Basic : 30 s entre deux lectures
              wait: Number.isFinite(r.wait) ? r.wait : null
            });
            if (r.status === 403) return no('paired');
            if (r.state === 'cancelled') return no('cancelled');
            const why = res?.ok === false && typeof res.reason === 'string' ? res.reason : 'failed';
            return no(['no-credentials', 'no-tables', 'cancelled', 'failed'].includes(why) ? why : 'failed', {
              message: String(res?.message || r.message || (r.offline ? 'launcher unreachable' : '')),
              ...(Array.isArray(res?.warnings) ? {
                warnings: res.warnings
              } : {}),
              ...(res?.stats && typeof res.stats === 'object' ? {
                stats: res.stats
              } : {})
            });
          }
          // Les fichiers viennent d'être écrits par le lanceur, hors de toute écriture de la couche de données : sa copie locale de
          // ces deux fichiers (policy 'reference') est périmée. evict la retire (relue au prochain read) ; mais sans échange
          // (transport 'local'), l'arbre des références est gardé tel quel et ne connaît pas le fichier neuf : un passage de
          // synchronisation, qui sans échange se borne à revalider les références, le renouvelle. Avec un transport qui échange
          // (lanceur, GitHub), l'arbre est relu de lui-même pour un chemin qu'il ne connaît pas : on ne lance PAS de passage ici
          // (il enverrait le dépôt). Un lecteur sans evict ni sync (bancs) n'a rien à oublier.
          const paths = [`proc/manual/${k}.json`, 'proc/manual/index.json'];
          for (const path of paths) {
            revs.delete(path);
            await Promise.resolve(reader.evict?.(path)).catch(() => 0);
          }
          if ((await Promise.resolve(reader.status?.()).catch(() => null))?.transport === 'local') await Promise.resolve(reader
            .sync?.()).catch(() => null);
          if (res.file && typeof res.file === 'object' && Array.isArray(res.file.procedures)) manualFresh.set(k, res
            .file); // le résultat fait foi sur la copie du lecteur
          dropCoverage(); // le terrain lu est désormais détenu (proc/manual/index.json)
          emit({
            procedures: k,
            coverage: true
          });
          return {
            ok: true,
            icao: k,
            procedures: await api.procedures(k),
            warnings: Array.isArray(res.warnings) ? res.warnings : [],
            commit: res.commit ?? null,
            source,
            stats: res.stats && typeof res.stats === 'object' ? res.stats : null
          };
        })();
        eadBusy.set(k, run);
        try {
          return await run;
        } finally {
          eadBusy.delete(k);
        }
      },
      /** Couverture des procédures d'un terrain (§ 10.22) : de quoi colorer une épingle de la Carte, sans charger la base. Une table
       *  des terrains détenus est bâtie une fois (procedureIndex + EAD_STATES), puis chaque appel est une recherche. null pour un
       *  code mal formé (quatre caractères A-Z 0-9). Sinon { level, reason, state, here } :
       *  · 'green' / 'held' : procédures détenues — + source ('published' > 'manual' > 'local', la meilleure détenue), outdated
       *    (vrai si la seule détention est une lecture à la main d'un cycle passé), counts { SID, STAR, APP } ;
       *  · 'orange' : lisibles à la demande — reason 'sia' (LF), 'ead' (État lisible dans EAD Basic) ou 'lnm' (le poste a une base de
       *    Little Navmap : lanceur.info().lnm non vide), dans cet ordre de préférence ;
       *  · 'red' : rien — reason = issue d'EAD_STATES ('images', 'labels', 'points', 'prose', 'vfr', 'none'), 'unknown' pour un
       *    État absent d'EAD_STATES (ou à l'issue inattendue).
       *  state : les deux premières lettres ; here : vrai si CET appareil peut lancer la lecture (lanceur avec job, non appairé) —
       *  l'orange reste orange quand here est faux (la lecture se fera sur le poste). Le changement des index est annoncé par
       *  on('change', fn) avec { coverage: true } : les réponses déjà obtenues sont alors à redemander. */
      async coverage(icao) {
        const k = String(icao ?? '').trim().toUpperCase();
        if (!/^[A-Z0-9]{4}$/.test(k)) return null;
        const t = await coverageTable(),
          state = k.slice(0, 2),
          here = canRead(),
          h = t.held.get(k);
        if (h) return {
          level: 'green',
          reason: 'held',
          state,
          here,
          source: h.source,
          outdated: h.outdated,
          counts: {
            ...h.counts
          }
        };
        const [level, reason] = stateCoverage(state, t.ead, hasLnm());
        return {
          level,
          reason,
          state,
          here
        };
      },
      /** Couverture par État, pour le module Données (§ 10.22) : { [préfixe]: { level, reason, label: [fr, en, de, es] } } pour chaque
       *  préfixe d'EAD_STATES (LF compris), mêmes règles que coverage() SANS terrain détenu (un État lisible à la demande ou non ;
       *  une base de Little Navmap sur le poste rend orange ('lnm') tout État sans sia ni ead). label : AeroCatalogue.COVERAGE[reason]. */
      async coverageByState() {
        const src = await api.sources().catch(() => null),
          ead = src?.EAD_STATES || {},
          lnm = hasLnm(),
          out = {};
        for (const prefix of new Set([...Object.keys(ead), 'LF'])) {
          const [level, reason] = stateCoverage(prefix, ead, lnm);
          out[prefix] = {
            level,
            reason,
            label: [...(src?.COVERAGE?.[reason] || [reason, reason, reason, reason])]
          };
        }
        return out;
      },
      // ---- pour le module Données (lot D1, SPEC § 5 « For the Données module ») : ce qui est publié, les zones, le catalogue
      /** Ce qui est publié, SANS charger la base : la liste du lecteur, le manifeste, le meta.json de chaque cycle d'une zone,
       *  proc/<cycle>/index.json, sia/vfr/index.json et la liste d'AircraftDB/ seulement. { base: { zone: { cycles: { date: {
       *  parserVersion, at, by, format } }, inForce } }, proc: { cycles: { date: { aerodromes, byStatus } }, inForce }, vfr: { cycle,
       *  at, count } | null, aircraft: { at, types, files } | null }. at / by : builtAt / builtBy du meta.json écrit par les
       *  constructeurs ; avant eux, at = updated_at du meta.json et by = null. Rien n'est gardé en mémoire de zone. */
      async publication() {
        const l = await published(),
          base = {};
        for (const [id, z] of Object.entries(l.zones || {})) {
          const cycles = {};
          await Promise.all(z.cycles.map(async c => {
            const split = z.split.has(c),
              v = split ? valueOf(await read(`${PUB}${id}/${c}/meta.json`)) : null; // l'ancien format entier n'est pas lu (toute la zone)
            cycles[c] = {
              parserVersion: v?.parserVersion ?? null,
              at: v?.builtAt ?? v?.data?.builtAt ?? v?.updated_at ?? null,
              by: v?.builtBy ?? v?.data?.builtBy ?? null,
              format: split ? 'split' : 'whole'
            };
          }));
          base[id] = {
            cycles: Object.fromEntries(Object.keys(cycles).sort().map(k => [k, cycles[k]])),
            inForce: pickCycle(z.cycles)
          };
        }
        // procédures : les cycles de la liste du lecteur, sinon les cycles AIRAC récents dont l'index se lit
        const listed = reader.list ? await reader.list('proc/').catch(() => null) : null,
          dates = Array.isArray(listed) ? [...new Set(listed.map(x => /^proc\/(\d{4}-\d{2}-\d{2})\/index\.json$/.exec(x)).filter(
            Boolean).map(m => m[1]))] :
          airacCycles(6, now()),
          procCycles = {};
        await Promise.all(dates.map(async c => {
          const ix = valueOf(await read(`proc/${c}/index.json`));
          if (!ix) return;
          const byStatus = {};
          for (const e of Object.values(ix.aerodromes || {})) byStatus[e?.status || 'official'] = (byStatus[e?.status ||
            'official'] || 0) + 1;
          procCycles[c] = {
            aerodromes: Object.keys(ix.aerodromes || {}).length,
            byStatus
          };
        }));
        const vi = valueOf(await read('sia/vfr/index.json')),
          air = reader.list ? await reader.list('AircraftDB/').catch(() => null) : null,
          db = Array.isArray(air) && air.includes('AircraftDB/aircraft_db.json') ? valueOf(await read(
            'AircraftDB/aircraft_db.json')) : null;
        return {
          base,
          proc: {
            cycles: Object.fromEntries(Object.keys(procCycles).sort().map(k => [k, procCycles[k]])),
            inForce: pickCycle(Object.keys(procCycles).sort())
          },
          vfr: vi ? {
            cycle: vi.cycle || vi.source?.cycle || null,
            at: vi.generatedAt || vi.updated_at || null,
            count: Array.isArray(vi.aerodromes) ? vi.aerodromes.length : Object.keys(vi.aerodromes || {}).length
          } : null,
          aircraft: Array.isArray(air) && air.length ? {
            at: db?.updated_at || db?.generated || null,
            types: db ? Object.keys(db.types || db).filter(k => !/^(schema|updated_at|generated|source)$/.test(k)).length : null,
            files: air.filter(x => /\.(json|js)$/.test(x)).length
          } : null
        };
      },
      /** Toutes les zones connues de la suite (AERODB_ZONES), publiées ou non : [{ id, names: [fr, en, de, es], frames, published }],
       *  dans l'ordre de leur nom français (« Ajouter un pays » du module Données). */
      async zones() {
        const l = await published();
        return Object.entries(zones).map(([id, z]) => ({
          id,
          names: z.n || [id, id, id, id],
          frames: z.b || [],
          published: !!(l.zones && l.zones[id])
        })).sort((a, b) => a.names[0].localeCompare(b.names[0], 'fr'));
      },
      /** Le catalogue des sources (catalogue.js, chargé à la première demande avec airac.js) : AeroCatalogue, et le cycle AIRAC
       *  (AeroAirac) sous `airac`. */
      async sources() {
        await loadOwn('airac.js', 'AeroAirac');
        await loadOwn('catalogue.js', 'AeroCatalogue');
        return {
          ...window.AeroCatalogue,
          airac: window.AeroAirac
        };
      },
      /** { sid, star } d'un OFP SimBrief (json=v2), au schéma commun, statut « ofp » ; chacun null sans point marqué. Rien
       *  n'est écrit : c'est la procédure du vol courant. */
      async procedureFromOfp(ofp) {
        await loadOwn('procedures.js', 'AeroDBProcedures');
        return window.AeroDBProcedures.fromOfp(ofp);
      },
      /** Garde la SID et la STAR d'un OFP dans proc-seen/<OACI>.json (synchronisé avec le dépôt privé, source secondaire) ;
       *  { sid, star } comme procedureFromOfp, ou null si le lecteur n'écrit pas. Un OFP à la fois, aucun appel à SimBrief. */
      async rememberOfp(ofp) {
        const out = await api.procedureFromOfp(ofp);
        if (typeof reader.put !== 'function') return null;
        for (const rec of [out.sid, out.star].filter(Boolean)) {
          const path = `proc-seen/${rec.icao}.json`,
            old = valueOf(await read(path)),
            merged = window.AeroDBProcedures.mergeSeen(null, {
              icao: rec.icao,
              procedures: [rec]
            }, old);
          if ((old?.procedures || []).some(p => p.id === rec.id && JSON.stringify(p.points) === JSON.stringify(rec.points) && p
              .name === rec.name)) continue;
          await reader.put(path, merged.value);
        }
        return out;
      },
      /** Tracks NAT du jour (zone océanique « nat », ouverte à la demande). */
      async nat() {
        const z = await loadZone('nat');
        return (z && (await part(z, 'meta')).natTracks) || null;
      },
      /** Axes AAR prêts à dessiner (aar.js : hippodromes, branches des axes lourds) des zones ouvertes ; refaits seulement
       *  quand les XML des zones ouvertes changent. */
      async aarTracks() {
        const xs = await api.aar(),
          key = xs.map(x => x.length).join(',');
        if (!xs.length) return [];
        if (aarCache?.key === key) return aarCache.tracks;
        await loadOwn('aar.js', 'AeroDBAar');
        aarCache = {
          key,
          tracks: window.AeroDBAar.tracksOf(xs)
        };
        return aarCache.tracks;
      },
      /** Tracks NAT du jour, points placés : un nom par la base (coords), « 61/20 » ou « 6130/20 » en degrés nord et ouest ;
       *  [{ id, points: [{ id, lat, lon }], west, east (niveaux), from, to, by }]. */
      async natTracks() {
        const n = await api.nat();
        if (!n?.tracks?.length) return [];
        const pos = async w => {
          const m = /^(\d{2})(\d{2})?\/(\d{2,3})$/.exec(String(w));
          if (m) return {
            id: String(w),
            lat: +m[1] + (+m[2] || 0) / 60,
            lon: - +m[3]
          };
          const c = await api.coords(w).catch(() => null);
          return c ? {
            id: String(w),
            lat: c.lat,
            lon: c.lon
          } : null;
        };
        return Promise.all(n.tracks.map(async t => ({
          id: t.id,
          points: (await Promise.all((t.route || []).map(pos))).filter(Boolean),
          west: t.west || [],
          east: t.east || [],
          from: t.from || '',
          to: t.to || '',
          by: t.by || ''
        })));
      },
      /** Villes de l'emprise de q (zones couvrantes), ou dont le nom commence par q.prefix (zones ouvertes et grandes
       *  villes du monde) ; les plus peuplées d'abord, q.n au plus. */
      async cities(q = {}) {
        const n = q.n || 50;
        if (q.prefix) {
          const p = fold(q.prefix),
            out = [],
            seen = new Set();
          for (const c of (await nameCities()).sort(byPop)) {
            const k = `${fold(c.name)}|${c.lat}|${c.lon}`;
            if (!seen.has(k) && fold(c.name).startsWith(p)) {
              seen.add(k);
              if (out.push(c) >= n) break;
            }
          }
          return out;
        }
        const b = boxOf(q);
        if (!b) return [];
        const out = [];
        for (const z of await zonesOf(b)) {
          const ix = await idx(z, 'cities');
          const cells = ix ? ix.cells : pointIndex(await world());
          for (const list of within(cells, b))
            for (const c of list)
              if (c.lon >= b[0] && c.lon <= b[2] && c.lat >= b[1] && c.lat <= b[3] && !out.includes(c)) out.push(c);
          if (!ix) break; // ancien format : le monde entier d'un coup
        }
        return out.sort(byPop).slice(0, n);
      },
      /** Tous les lieux d'un identifiant (aérodrome, balise, point, VRP) : zones dont le manifeste annonce le préfixe OACI,
       *  zones ouvertes, puis, faute de mieux, les zones publiées une à une — aérodromes d'abord : [{ kind, item }]. */
      async coordsAll(ident) {
        const k = fold(ident),
          kinds = [
            ['aerodromes', 'aerodrome'],
            ['navaids', 'navaid'],
            ['points', 'point'],
            ['vrp', 'vrp']
          ];
        const look = async z => {
          for (const [kk, kind] of kinds) {
            const items = (await idx(z, `ident:${kk}`)).get(k) || [];
            if (items.length) return items.map(item => ({
              kind,
              item
            }));
          }
          return [];
        };
        const pub = (await published()).zones || {},
          pre = /^[A-Z]{4}$/.test(k) ? Object.keys(pub).filter(id => pub[id].prefixes.includes(k.slice(0, 2))) : [],
          order = [...new Set([...pre, ...loaded.keys(), ...Object.keys(pub)])];
        for (const id of order) {
          const z = await loadZone(id),
            out = z ? await look(z) : [];
          if (out.length) return out;
        }
        return [];
      },
      /** Position d'un identifiant (aérodrome d'abord) : { lat, lon, name, kind } ; null si inconnu. */
      async coords(ident) {
        const best = (await api.coordsAll(ident))[0];
        return best ? {
          lat: +best.item.lat,
          lon: +best.item.lon,
          name: best.item.name || best.item.id || best.item.icao || '',
          kind: best.kind
        } : null;
      },
      /** Lieux qui répondent au texte (aérodromes, balises, points, VRP des zones ouvertes ; villes de ces zones et grandes
       *  villes du monde), dans cet ordre : code exact ; aérodrome à code OACI dont le nom commence par le texte ; ville
       *  (les plus peuplées d'abord) ; autre lieu dont le code ou le nom commence par le texte ; puis ceux qui le
       *  contiennent. n au plus : [{ label, lat, lon, name, kind, code }]. */
      async find(text, n = 40) {
        const q = fold(text);
        if (q.length < 2) return [];
        const ranks = [
            [],
            [],
            [],
            [],
            []
          ],
          seen = new Set(),
          add = (code, name, x, kind) => {
            if (!num(x?.lat)) return;
            const c = fold(code),
              nm = fold(name),
              label = code && name && c !== nm ? `${code} — ${name}` : String(code || name),
              key = `${kind}|${label}`;
            if (seen.has(key)) return;
            const r = c && c === q ? 0 : kind === 'aerodrome' && x.icao && nm.startsWith(q) ? 1 : kind === 'city' && nm.startsWith(
                q) ? 2 :
              (c && c.startsWith(q)) || nm.startsWith(q) ? 3 : (c && c.includes(q)) || nm.includes(q) ? 4 : -1;
            if (r < 0 || ranks[r].length >= n) return;
            seen.add(key);
            ranks[r].push({
              label,
              lat: +x.lat,
              lon: +x.lon,
              name: name || code,
              kind,
              code: code || ''
            });
          };
        for (const z of loaded.values()) {
          const [ads, navs, pts, vrps] = await Promise.all(['aerodromes', 'navaids', 'points', 'vrp'].map(k => part(z, k)));
          for (const x of ads) add(x.icao || x.id, x.name, x, 'aerodrome');
          for (const x of navs) add(x.id, `${x.kind || ''} ${x.name || ''}`.trim(), x, 'navaid');
          for (const x of pts) add(x.id, '', x, 'point');
          for (const x of vrps) add(x.id, x.name, x, 'vrp');
        }
        for (const c of (await nameCities()).sort(byPop)) {
          if (ranks[2].length >= n) break;
          if (fold(c.name).includes(q)) add('', c.name, c, 'city');
        }
        return ranks.flat().slice(0, n);
      },
      /** Base des types (frame/aerodb/aircraft.js), lue à la première demande. */
      aircraft,
      /** Fiches et fichiers Little Navmap tenus pareils (lnmperf.js, SPEC.md § 5 ter) : contrôleur { start, sync, status,
       *  on, folder, setFolder, download, card }, chargé à la première demande. */
      lnmperf,
      /** Données gardées hors ligne (voir l'en-tête). */
      offline,
      /** Mesures : par zone ouverte, cycle, format, octets lus et durée par sorte, index construits. */
      stats: () => [...loaded.values()].map(z => ({
        zone: z.id,
        cycle: z.cycle,
        format: z.split ? 'split' : 'whole',
        mb: +(z.reads.reduce((s, r) => s + r.bytes, 0) / 1048576).toFixed(3),
        reads: z.reads.map(r => `${r.kind} ${(r.bytes / 1024).toFixed(0)} Ko ${r.ms} ms`),
        indexes: Object.keys(z.idx)
      }))
    };
    // Changements signalés par le lecteur. La couche de données du frame signale aussi la première arrivée d'un fichier
    // dans son cache (lecture « reference » demandée par aerodb lui-même) : seul compte un fichier déjà lu dont la
    // révision a changé, ou un cycle publié que la liste ne connaissait pas.
    const changedRev = async p => {
      if (!revs.has(p)) return false;
      const r = await reader.read(p, {
        policy: 'reference'
      }).catch(() => null);
      return !!r && (r.rev || '') !== revs.get(p);
    };
    reader.watch?.(PUB, async paths => {
      const pub = listedP ? (await listedP).zones : null,
        out = [];
      for (const p of paths || []) {
        const m = PUB_SPLIT.exec(p) || PUB_WHOLE.exec(p);
        if (await changedRev(p)) {
          out.push(p);
          revs.delete(p);
          if (m) loaded.delete(m[1]);
          if (p === `${PUB}cities_major.json`) majorP = null;
          if (p === `${PUB}cities.json`) worldP = null;
          if (p === `${PUB}index.json`) listedP = null;
        } else if (m && (!pub || !pub[m[1]]?.cycles.includes(m[2]))) {
          // cycle ou zone publiés depuis la liste lue, ou liste vide jusqu'ici (rien de publié à son premier passage :
          // téléphone en mode GitHub avant la première poussée)
          out.push(p);
          listedP = null;
          loaded.delete(m[1]);
          missing.clear();
        }
      }
      if (out.length) emit({
        changed: out
      });
    });
    // procédures changées (cycle publié, proc/manual/, proc/local/, proc-seen/ : synchronisation depuis un autre appareil, autre
    // onglet, lecture à la demande) : la table de couverture est jetée ; un index changé s'annonce { coverage: true }, le fichier
    // d'un terrain { procedures: OACI, coverage: true } (Carburant et la Carte relisent ce terrain). Comme pour la base, seul compte un
    // fichier dont la révision a changé ou que rien n'avait lu (l'écho d'une lecture d'aerodb lui-même ne compte pas).
    const PROC_FILE = /^proc(?:\/(?:manual|local|\d{4}-\d{2}-\d{2})|-seen)\/([A-Z0-9]{3,4}|index)\.json$/;
    const procWatch = async paths => {
      let index = false;
      const icaos = new Set();
      for (const p of paths || []) {
        const m = PROC_FILE.exec(p);
        if (!m || !(!revs.has(p) || await changedRev(p))) continue;
        if (m[1] === 'index') index = true;
        else icaos.add(m[1]);
      }
      if (!index && !icaos.size) return;
      dropCoverage();
      if (!icaos.size || icaos.size > 50) emit({ // beaucoup de terrains d'un coup (cycle publié) : une annonce générale
        coverage: true,
        ...(icaos.size ? {
          refreshed: true
        } : {})
      });
      else
        for (const k of icaos) emit({
          procedures: k,
          coverage: true
        });
    };
    reader.watch?.('proc/', procWatch);
    reader.watch?.('proc-seen/', procWatch);
    // fiches, flotte, référence changées (synchronisation, autre onglet, écriture) : registre relu à la prochaine demande
    for (const prefix of ['aircraft/', 'airline/', 'planner/', 'references/'])
      reader.watch?.(prefix, () => {
        if (!aircraftP || aircraftBusy) return; // pendant sa propre lecture : ses premières arrivées ne comptent pas
        aircraftP = null;
        registry = null;
        emit({
          aircraft: true
        });
      });
    reader.watch?.('AircraftDB/', async paths => {
      let hit = false;
      for (const p of paths || [])
        if (await changedRev(p)) {
          revs.delete(p);
          hit = true;
        } else if (!revs.has(p) && !aircraftBusy) hit = true; // base des types arrivée après l'ouverture (jamais lue)
      if (!hit) return;
      aircraftP = null;
      emit({
        aircraft: true
      });
    });
    // .lnmperf : passages automatiques seulement avec une couche de données qui écrit (le lecteur provisoire lit)
    // suivi des .lnmperf : seulement quand un lanceur sert la page (il lui faut /__setup/lnmperf) ; ailleurs (téléphone,
    // site), lnmperf.js n'est pas chargé
    if (lnmAuto && typeof reader.put === 'function') setTimeout(async () => {
      const here = launcher ? launcher.info() : await Promise.resolve(window.FrameData?.launcher?.detect?.()).catch(() => null);
      if (here) lnmperf().then(c => c.start()).catch(() => {});
    }, 1500);
    return api;
  }

  /** Préfixes lus et écrits par aerodb, pour FrameData.adapter : base SIA, base des types et fichiers de la V2 en
   *  « reference » ; fiches, flotte, fpdb en « document » ; écrit seulement les fiches (aircraft/sheets/, fusion champ par
   *  champ) et le miroir fpdb de la V2 (fusion fiche par fiche). Jamais la base SIA ni AircraftDB. */
  const declaration = () => ({
    id: 'aerodb',
    reads: [{
      prefix: 'sia/base/',
      policy: 'reference'
    }, {
      prefix: 'AircraftDB/',
      policy: 'reference'
    }, {
      prefix: 'sia/vfr/',
      policy: 'reference'
    }, {
      prefix: 'proc/',
      policy: 'reference'
    }, {
      prefix: 'references/',
      policy: 'reference'
    }, 'airline/', 'planner/', 'aircraft/', 'proc-seen/', 'cache/aerodb/'],
    writes: [{
      prefix: 'cache/aerodb/',
      policy: 'cache' // manifeste des fichiers .lnmperf de ce poste
    }, {
      prefix: 'proc-seen/',
      merge: (b, l, r) => window.AeroDBProcedures ? window.AeroDBProcedures.mergeSeen(b, l, r) : {
        value: l,
        lost: r
      }
    }, {
      prefix: 'aircraft/sheets/',
      merge: (b, l, r) => window.AeroDBRegistry ? window.AeroDBRegistry.mergeSheets(b, l, r) : {
        value: l,
        lost: r
      }
    }, {
      prefix: 'planner/flight_performance_database_merged.fpdb.json',
      merge: 'keyed:profiles:id'
    }]
  });

  window.AeroDB = {
    create,
    fetchReader,
    airacCycles,
    literal,
    declaration
  };
})();
