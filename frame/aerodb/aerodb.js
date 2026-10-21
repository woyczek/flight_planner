(() => {
  'use strict';
  // V3 aerodb — la base aéronautique pour tous les modules (frame/aerodb/SPEC.md, INTEGRATION.md, DECISIONS.md).
  // Lit les bases publiées dans le dépôt des données par un poste avec lanceur — base SIA par zone et par cycle
  // (sia/base/<zone>/<cycle>.json, villes sia/base/cities.json) et base des types (AircraftDB/aircraft_db.json ou .js,
  // aircraft_perf.json ou .js) —, jamais les fichiers des sources ; ne construit rien, n'écrit rien. Un module demande
  // une emprise ou un identifiant, jamais une zone ni un fichier : aerodb charge les zones utiles, une fois, et répond
  // par des index en mémoire, case par case d'un degré.
  // Lecture des fichiers : par le lecteur reçu (couche de données du frame : data.read(chemin, { policy: 'reference',
  // wait }) → { value | text, rev, cached, at } | null ; data.list(préfixe) → chemins | null ; data.watch(préfixe, fn)),
  // ou, en attendant le frame, par AeroDB.fetchReader() (lanceur : fichiers servis ; mode GitHub : GitHubData).
  // API : window.AeroDB = { create({ reader, zones, now }) → service, fetchReader({ root }), airacCycles(n, date) }.
  // Service : status(), ready(), on('change', fn), airspaces(q), aerodromes(q), navaids(q), points(q), airways(q), vrp(q),
  //   obstacles(q), mora(lat, lon), moraCells(q), aar(), nat(), cities(q), find(texte, n), coords(ident),
  //   aircraft() → base des types (frame/aerodb/aircraft.js), stats().
  if (window.AeroDB) return;
  const PUB = 'sia/base/',
    PUB_FILE = /^sia\/base\/([a-z0-9_-]+)\/(\d{4}-\d{2}-\d{2})\.json$/,
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
    const body = text.slice(m.index + m[0].length).replace(/;\s*$/, '').trim();
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  /** Valeur JSON d'une réponse du lecteur (value déjà analysée, sinon text). */
  const valueOf = r => r ? r.value !== undefined ? r.value : (() => {
    try {
      return JSON.parse(r.text);
    } catch {
      return null;
    }
  })() : null;

  // ---- lecteur provisoire (remplacé par la couche de données du frame dès qu'elle est livrée)
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
    now = () => Date.now()
  } = {}) {
    const loaded = new Map(), // zone → { id, cycle, path, rev, data, idx: {} } ; chargée une fois
      loading = new Map(), // zone → promesse de chargement
      missing = new Set(), // zones sans fichier publié (sondées en vain)
      listeners = new Set();
    let published = null, // { zone: [cycles] } d'après la liste ; null : inconnue (lanceur, hors ligne)
      listed = null,
      citiesP = null,
      citiesIdx = null,
      aircraftP = null;
    const emit = what => listeners.forEach(fn => {
      try {
        fn(what);
      } catch {
        /* écouteur en échec : les autres sont appelés */
      }
    });
    /** Zones publiées et leurs cycles, d'après la liste du lecteur (une fois) ; null si la liste est indisponible. */
    async function publishedZones() {
      if (listed) return listed;
      return listed = (async () => {
        const paths = await reader.list?.(PUB).catch(() => null);
        if (!paths) return published = null;
        const out = {};
        for (const p of paths) {
          const m = PUB_FILE.exec(p);
          if (m)(out[m[1]] ||= []).push(m[2]);
        }
        for (const c of Object.values(out)) c.sort();
        return published = out;
      })();
    }
    /** Cycle à lire parmi ceux publiés : le plus récent déjà en vigueur, sinon le plus ancien (publié d'avance). */
    const pickCycle = list => {
      const today = new Date(now()).toISOString().slice(0, 10),
        past = list.filter(c => c <= today);
      return past.length ? past[past.length - 1] : list[0];
    };
    /** Zones dont un cadre (élargi de la marge) touche l'emprise b ; limitées aux zones publiées si la liste est connue. */
    async function zonesFor(b) {
      const pub = await publishedZones(),
        out = [];
      for (const [id, z] of Object.entries(zones)) {
        if (pub && !pub[id]) continue;
        if ((z.b || []).some(p => hits([p[0] - MARGIN, p[1] - MARGIN, p[2] + MARGIN, p[3] + MARGIN], b))) out.push(id);
      }
      // zones publiées absentes de la table (zone océanique, nouvelle zone) : chargées si aucune autre ne couvre l'emprise
      if (pub && !out.length) out.push(...Object.keys(pub).filter(id => !zones[id]));
      return out;
    }
    /** Charge une zone (fichier publié du cycle choisi ; sans liste : cycles AIRAC récents sondés) ; null si absente. */
    function loadZone(id) {
      if (loaded.has(id)) return Promise.resolve(loaded.get(id));
      if (missing.has(id)) return Promise.resolve(null);
      if (loading.has(id)) return loading.get(id);
      const p = (async () => {
        const pub = await publishedZones(),
          cycles = pub ? pub[id] ? [pickCycle(pub[id])] : [] : airacCycles(6, now());
        for (const cycle of cycles) {
          const path = `${PUB}${id}/${cycle}.json`,
            t0 = performance.now(),
            r = await reader.read(path, {
              policy: 'reference',
              wait: true
            }).catch(() => null),
            data = valueOf(r);
          if (!data) continue;
          const z = {
            id,
            cycle,
            path,
            rev: r.rev || '',
            data,
            idx: {},
            ms: Math.round(performance.now() - t0),
            bytes: r.text ? r.text.length : 0
          };
          loaded.set(id, z);
          emit({
            zone: id,
            cycle
          });
          return z;
        }
        missing.add(id);
        return null;
      })().finally(() => loading.delete(id));
      loading.set(id, p);
      return p;
    }
    /** Zones chargées qui couvrent l'emprise b (chargées à la demande). */
    async function zonesOf(b) {
      return (await Promise.all((await zonesFor(b)).map(loadZone))).filter(Boolean);
    }

    // ---- index d'une zone, par sorte, construits à la première demande
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

    function idx(z, kind) {
      if (z.idx[kind]) return z.idx[kind];
      const d = z.data,
        aero = d.aero || {};
      let out;
      if (kind === 'airspaces') {
        const cells = new Map(),
          wide = [],
          boxes = new Map();
        for (const a of d.airspaces || []) {
          const b = ringBox(a.rings);
          if (!b) continue;
          boxes.set(a, b);
          const ks = cellsOf(b, WIDE);
          if (!ks) wide.push(a);
          else
            for (const k of ks)(cells.get(k) || cells.set(k, []).get(k)).push(a);
        }
        out = {
          cells,
          wide,
          boxes
        };
      } else if (kind === 'airways') {
        const cells = new Map();
        for (const w of aero.airways || []) {
          if (!num(w?.a?.lat) || !num(w?.b?.lat)) continue;
          const b = [Math.min(w.a.lon, w.b.lon), Math.min(w.a.lat, w.b.lat), Math.max(w.a.lon, w.b.lon), Math.max(w.a.lat, w.b.lat)],
            ks = cellsOf(b, 64) || [cellKey(w.a.lat, w.a.lon), cellKey(w.b.lat, w.b.lon)];
          for (const k of ks)(cells.get(k) || cells.set(k, []).get(k)).push(w);
        }
        out = {
          cells
        };
      } else if (kind === 'mora') {
        out = new Map((d.moraCells || []).map(c => [cellKey(c.lat, c.lon), c]));
      } else if (kind === 'ident') {
        // identifiant → éléments (aérodromes par code OACI, balises, points, VRP)
        out = new Map();
        const put = (k, x) => k && (out.get(k) || out.set(k, []).get(k)).push(x);
        for (const a of aero.aerodromes || []) put(fold(a.icao || a.id), a);
        for (const k of ['navaids', 'points', 'vrp'])
          for (const x of aero[k] || []) put(fold(x.id), x);
      } else out = pointIndex(aero[kind]);
      return z.idx[kind] = out;
    }
    /** Éléments d'une sorte de points dans l'emprise de q (filtre : f(x)) ; toutes zones couvrantes. */
    async function pointsIn(kind, q, f = () => true) {
      const b = boxOf(q);
      if (!b) return [];
      const out = [],
        seen = new Set();
      for (const z of await zonesOf(b)) {
        for (const list of within(idx(z, kind), b))
          for (const x of list)
            if (!seen.has(x) && x.lon >= b[0] && x.lon <= b[2] && x.lat >= b[1] && x.lat <= b[3] && f(x)) {
              seen.add(x);
              out.push(x);
            }
      }
      return out;
    }

    // ---- villes (sia/base/cities.json : monde entier aujourd'hui ; par zone au lot 3)
    function loadCities() {
      return citiesP ||= (async () => {
        const r = await reader.read(`${PUB}cities.json`, {
          policy: 'reference',
          wait: true
        }).catch(() => null);
        const list = valueOf(r)?.cities || [];
        citiesIdx = {
          cells: pointIndex(list),
          byName: [...list].sort((a, b) => (b.population || 0) - (a.population || 0)).map(c => [fold(c.name), c])
        };
        return list;
      })();
    }

    // ---- base des types (JSON en V3 ; .js de la V2 lu comme littéral tant que le lanceur l'écrit)
    function aircraft() {
      return aircraftP ||= (async () => {
        const one = async (base, name) => {
          const j = await reader.read(`AircraftDB/${base}.json`, {
            policy: 'reference',
            wait: true
          }).catch(() => null);
          if (j) return valueOf(j);
          const s = await reader.read(`AircraftDB/${base}.js`, {
            policy: 'reference',
            wait: true
          }).catch(() => null);
          return s ? literal(s.text, name) : null;
        };
        const [db, perf] = await Promise.all([one('aircraft_db', 'AIRCRAFT_DB'), one('aircraft_perf', 'AIRCRAFT_PERF')]);
        return window.AeroDBAircraft.create({
          db: db || {},
          perf: perf || {}
        });
      })();
    }

    const api = {
      /** État : cycle(s) chargé(s), zones publiées (null : liste indisponible) et chargées, zones sans fichier. */
      async status() {
        const pub = await publishedZones();
        return {
          published: pub ? Object.fromEntries(Object.entries(pub).map(([k, c]) => [k, pickCycle(c)])) : null,
          loaded: Object.fromEntries([...loaded.values()].map(z => [z.id, z.cycle])),
          missing: [...missing],
          cycle: [...new Set([...loaded.values()].map(z => z.cycle))].sort().pop() || null
        };
      },
      /** Prêt à répondre pour l'emprise de q (zones chargées) ; rend les zones. */
      ready: async (q = {}) => {
        const b = boxOf(q);
        return b ? (await zonesOf(b)).map(z => z.id) : [];
      },
      /** Écoute des changements (zone chargée, fichier publié changé) ; rend la fonction de désabonnement. */
      on(event, fn) {
        if (event !== 'change') return () => {};
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      /** Espaces qui touchent l'emprise de q ; q.types : types gardés (« R », « D », « TMA »…). */
      async airspaces(q = {}) {
        const b = boxOf(q);
        if (!b) return [];
        const types = q.types ? new Set([].concat(q.types)) : null,
          out = [],
          seen = new Set();
        for (const z of await zonesOf(b)) {
          const ix = idx(z, 'airspaces'),
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
      /** Aérodromes de l'emprise de q, ou celui de q.icao. */
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
        for (const z of await zonesOf(b)) {
          for (const list of within(idx(z, 'airways').cells, b))
            for (const w of list)
              if (!seen.has(w) && hits([Math.min(w.a.lon, w.b.lon), Math.min(w.a.lat, w.b.lat), Math.max(w.a.lon, w.b.lon), Math.max(w
                  .a.lat,
                  w.b.lat)], b)) {
                seen.add(w);
                out.push(w);
              }
        }
        return out;
      },
      /** MORA (ft) de la case d'un degré qui contient le point ; null si inconnue. */
      async mora(lat, lon) {
        for (const z of await zonesOf([lon, lat, lon, lat])) {
          const c = idx(z, 'mora').get(cellKey(lat, lon));
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
          for (const c of within(idx(z, 'mora'), b)) {
            const k = cellKey(c.lat, c.lon);
            if (!out.has(k)) out.set(k, c);
          }
        return [...out.values()];
      },
      /** Axes de ravitaillement (texte XML MILAIP ENR 5.7 et ceux d'autres pays) des zones chargées. */
      aar: async () => {
        const out = [];
        for (const z of loaded.values()) {
          if (z.data.aarXml) out.push(z.data.aarXml);
          out.push(...(z.data.aarXmlExtra || []));
        }
        return out;
      },
      /** Tracks NAT du jour (zone océanique « nat », chargée à la demande). */
      nat: async () => (await loadZone('nat'))?.data?.natTracks || [...loaded.values()].map(z => z.data.natTracks).find(Boolean) ||
        null,
      /** Villes de l'emprise de q, ou dont le nom commence par q.prefix (les plus peuplées d'abord) ; n au plus (q.n). */
      async cities(q = {}) {
        await loadCities();
        const n = q.n || 50;
        if (q.prefix) {
          const p = fold(q.prefix),
            out = [];
          for (const [k, c] of citiesIdx.byName)
            if (k.startsWith(p) && out.push(c) >= n) break;
          return out;
        }
        const b = boxOf(q);
        if (!b) return [];
        const out = [];
        for (const list of within(citiesIdx.cells, b))
          for (const c of list)
            if (c.lon >= b[0] && c.lon <= b[2] && c.lat >= b[1] && c.lat <= b[3]) out.push(c);
        return out.sort((x, y) => (y.population || 0) - (x.population || 0)).slice(0, n);
      },
      /** Tous les lieux d'un identifiant (aérodrome, balise, point, VRP) dans les zones chargées, puis, faute de mieux, dans
       *  les zones publiées une à une : [{ kind, item }]. */
      async coordsAll(ident) {
        const k = fold(ident),
          kinds = new Map([
            ['aerodromes', 'aerodrome'],
            ['navaids', 'navaid'],
            ['points', 'point'],
            ['vrp', 'vrp']
          ]);
        const look = z => (idx(z, 'ident').get(k) || []).map(item => ({
          kind: [...kinds].find(([kk]) => (z.data.aero?.[kk] || []).includes(item))?.[1] || 'point',
          item
        }));
        let out = [...loaded.values()].flatMap(look);
        if (out.length) return out;
        const pub = await publishedZones();
        for (const id of pub ? Object.keys(pub) : []) {
          const z = await loadZone(id);
          if (z && (out = look(z)).length) return out;
        }
        return [];
      },
      /** Position d'un identifiant (aérodrome d'abord) : { lat, lon, name, kind } ; null si inconnu. */
      async coords(ident) {
        const all = await api.coordsAll(ident),
          best = all.find(x => x.kind === 'aerodrome') || all[0];
        return best ? {
          lat: +best.item.lat,
          lon: +best.item.lon,
          name: best.item.name || best.item.id || best.item.icao || '',
          kind: best.kind
        } : null;
      },
      /** Lieux qui répondent au texte (aérodromes, balises, points, VRP des zones chargées, villes), dans cet ordre : code
       *  exact ; aérodrome à code OACI dont le nom commence par le texte ; ville (les plus peuplées d'abord) ; autre lieu dont
       *  le code ou le nom commence par le texte ; puis ceux qui le contiennent. n au plus : [{ label, lat, lon, name, kind,
       *  code }]. */
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
          const a = z.data.aero || {};
          for (const x of a.aerodromes || []) add(x.icao || x.id, x.name, x, 'aerodrome');
          for (const x of a.navaids || []) add(x.id, `${x.kind || ''} ${x.name || ''}`.trim(), x, 'navaid');
          for (const x of a.points || []) add(x.id, '', x, 'point');
          for (const x of a.vrp || []) add(x.id, x.name, x, 'vrp');
        }
        await loadCities();
        for (const [k, c] of citiesIdx.byName) {
          if (ranks[2].length >= n) break;
          if (k.includes(q)) add('', c.name, c, 'city');
        }
        return ranks.flat().slice(0, n);
      },
      /** Base des types (frame/aerodb/aircraft.js), lue à la première demande. */
      aircraft,
      /** Mesures : zones chargées (cycle, octets lus, durée de lecture), index construits. */
      stats: () => [...loaded.values()].map(z => ({
        zone: z.id,
        cycle: z.cycle,
        mb: +(z.bytes / 1048576).toFixed(2),
        readMs: z.ms,
        indexes: Object.keys(z.idx)
      }))
    };
    // fichier publié changé à la synchronisation : la zone est oubliée (relue à la prochaine demande)
    reader.watch?.(PUB, paths => {
      for (const p of paths || []) {
        const m = PUB_FILE.exec(p);
        if (m && loaded.get(m[1])) loaded.delete(m[1]);
        if (p === `${PUB}cities.json`) citiesP = null;
      }
      listed = null;
      missing.clear();
      emit({
        changed: paths
      });
    });
    reader.watch?.('AircraftDB/', () => {
      aircraftP = null;
      emit({
        aircraft: true
      });
    });
    return api;
  }

  window.AeroDB = {
    create,
    fetchReader,
    airacCycles,
    literal
  };
})();
