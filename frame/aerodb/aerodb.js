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
  // API : window.AeroDB = { create({ reader, zones, now }) → service, fetchReader({ root }), airacCycles(n, date), vfrParts(index VFR), literal, zoneFrame(anneaux),
  //   declaration() → préfixes lus et écrits par aerodb (à donner à FrameData.adapter) }.
  // Service : status(), state() (loading, ready, noaccess, offline, unpublished, idle : sans lire), refresh(), ready(q),
  //   on('change' | 'state', fn), airspaces(q), aerodromes(q), navaids(q), points(q), airways(q), vrp(q),
  //   obstacles(q), mora(lat, lon), moraCells(q), aar(), nat(), aarTracks(), natTracks(), vfrRoutes(oaci), vfrIndex(), procedures(oaci, q), procedure(id), runways(oaci), procedureStats(), procedureIndex(), coverage(oaci), coverageByState(), procedureFromOfp(ofp), rememberOfp(ofp), cities(q),
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
  // contours des zones (zoneOutlines) : shared/carto/aero_zones_geo.js (Natural Earth 1:50 M, domaine public), chargé à la
  // première demande, une fois pour toute la page (une promesse partagée par tous les services)
  let outlinesP = null;
  let packsP = null; // les paquets de pays (packs()), lus une fois ; null si le fichier ne s'est pas lu : le prochain appel réessaie
  /** Gel en profondeur (les contours servis tels quels, sans copie : personne ne les change). */
  const freezeAll = v => {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) {
      Object.freeze(v);
      for (const k in v) freezeAll(v[k]);
    }
    return v;
  };
  const FRAME_GAP = 10; // degrés : deux anneaux d'une zone plus proches que cela sont du même groupe (côtes, îles d'un archipel)
  const mod360 = x => (x % 360 + 360) % 360;
  /** Le plus petit arc de longitudes qui couvre des intervalles [w, w + len] pris sur le cercle : { w, span }. */
  function arcOf(iv) {
    let best = null;
    for (const a of iv) {
      let span = 0;
      for (const b of iv) span = Math.max(span, mod360(b.w - a.w) + b.len);
      if (!best || span < best.span) best = {
        w: a.w,
        span
      };
    }
    return best;
  }
  /** Le cadre [ouest, sud, est, nord] d'anneaux mesurés (arcOf, latitudes), placé autour de la longitude ref : ouest ou est peut sortir
   *  de [−180, 180] (les Aléoutiennes à l'ouest de l'Alaska), jamais plus de 360° de large. */
  function frameBox(iv, ref) {
    const {
      w,
      span
    } = arcOf(iv),
      k = Math.round((ref - (w + span / 2)) / 360) * 360;
    return [w + k, Math.min(...iv.map(i => i.s)), w + k + span, Math.max(...iv.map(i => i.n))].map(v => Math.round(v * 100) /
      100); // au centième, comme le fichier
  }
  /** Le cadre d'une zone d'après ses anneaux, sans faire le tour du monde (V3, 31 oct. 2026) : les longitudes sont prises sur le cercle,
   *  autour de l'anneau principal (le plus grand) ; un anneau qui passe l'antiméridien est lu d'un seul tenant. → { box, parts, framed } :
   *  box, le cadre de toute la zone si elle tient dans 180° de longitude, sinon celui du groupe de l'anneau principal (la France
   *  métropolitaine, sans l'outre-mer) ; parts, les cadres des groupes d'anneaux contigus (à moins de FRAME_GAP), le principal d'abord ;
   *  framed, les anneaux avec leurs longitudes décalées de ±360° pour tomber dans ce repère (les mêmes tableaux quand rien ne bouge). */
  function zoneFrame(rings) {
    const iv = (rings || []).filter(r => r?.length).map(r => {
      let xs = r.map(p => p[0]);
      const across = Math.max(...xs) - Math.min(...xs) > 180,
        pts = across ? r.map(([x, y]) => [x < 0 ? x + 360 : x, y]) : r;
      if (across) xs = pts.map(p => p[0]);
      const ys = pts.map(p => p[1]),
        w = Math.min(...xs),
        e = Math.max(...xs);
      let a = 0;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i],
          q = pts[(i + 1) % pts.length];
        a += p[0] * q[1] - q[0] * p[1];
      }
      return {
        r,
        pts,
        w,
        len: e - w,
        s: Math.min(...ys),
        n: Math.max(...ys),
        area: Math.abs(a) / 2
      };
    });
    if (!iv.length) return null;
    const main = iv.reduce((m, i) => i.area > m.area ? i : m),
      ref = main.w + main.len / 2;
    // groupes : deux anneaux à moins de FRAME_GAP en longitude (sur le cercle) et en latitude sont du même groupe
    const up = iv.map((_, i) => i),
      root = i => up[i] === i ? i : up[i] = root(up[i]),
      gapLon = (a, b) => mod360(b.w - a.w) <= a.len || mod360(a.w - b.w) <= b.len ? 0 : Math.min(mod360(b.w - a.w - a.len), mod360(a.w -
        b.w - b.len));
    for (let i = 0; i < iv.length; i++)
      for (let j = i + 1; j < iv.length; j++)
        if (root(i) !== root(j) && Math.max(0, iv[j].s - iv[i].n, iv[i].s - iv[j].n) <= FRAME_GAP && gapLon(iv[i], iv[j]) <= FRAME_GAP)
          up[
            root(j)] = root(i);
    const groups = new Map();
    iv.forEach((x, i) => {
      const g = root(i);
      groups.has(g) ? groups.get(g).push(x) : groups.set(g, [x]);
    });
    const mainG = groups.get(root(iv.indexOf(main))),
      list = [mainG, ...[...groups.values()].filter(g => g !== mainG).sort((a, b) => b.reduce((s, x) => s + x.area, 0) - a.reduce((s,
          x) =>
        s + x.area, 0))],
      parts = list.map(g => frameBox(g, ref)),
      all = arcOf(iv).span <= 180 ? frameBox(iv, ref) : parts[0],
      mid = (all[0] + all[2]) / 2,
      framed = iv.map(x => {
        const k = Math.round((mid - (x.w + x.len / 2)) / 360) * 360;
        return k || x.pts !== x.r ? x.pts.map(([lon, lat]) => [Math.round((lon + k) * 100) / 100, lat]) : x.r;
      });
    return {
      box: all,
      parts,
      framed
    };
  }
  /** { <zone>: { name: [fr, en, de, es], rings: [[[lon, lat], …]], box: [w, s, e, n], parts: [[w, s, e, n], …], framed: [[[lon, lat], …]] } } :
   *  les contours du fichier, servis tels quels (ordre GeoJSON) et gelés ; box, parts et framed : zoneFrame (box jamais plus large que 180°
   *  de longitude ; ouest ou est peut sortir de [−180, 180]) ; sans anneau, box réunit les parties de AERODB_ZONES. */
  /** Distance (NM) entre deux points [lat, lon] (grand cercle). */
  const distNm = (a, b) => {
    const r = Math.PI / 180,
      h = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2;
    return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  /** Distance (NM) d'un point [lat, lon] au cadre [ouest, sud, est, nord] d'une zone (0 dedans). */
  const boxDistNm = (p, box) => !box ? 0 : distNm(p, [Math.min(Math.max(p[0], box[1]), box[3]), Math.min(Math.max(p[1], box[0]), box[
    2])]);
  /** La zone dont un contour contient le point (lancer de rayon sur les contours de zoneOutlines) ; null sinon. */
  const zoneAt = (lat, lon, outlines) => {
    for (const [id, o] of Object.entries(outlines || {})) {
      if (o.box && (lon < o.box[0] || lon > o.box[2] || lat < o.box[1] || lat > o.box[3])) continue;
      for (const ring of o.rings || []) {
        let c = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
          if ((ring[i][1] > lat) !== (ring[j][1] > lat) && lon < (ring[j][0] - ring[i][0]) * (lat - ring[i][1]) / (ring[j][1] - ring[i][
              1
            ]) + ring[i][0]) c = !c;
        if (c) return id;
      }
    }
    return null;
  };

  function zoneOutlines() {
    outlinesP ||= (window.AERO_ZONES_GEO ? Promise.resolve() : new Promise((ok, ko) => {
      const sc = document.createElement('script');
      sc.src = new URL('../../shared/carto/aero_zones_geo.js?v=0', HERE).href;
      sc.onload = () => ok();
      sc.onerror = () => ko(new Error('aerodb: aero_zones_geo.js not loaded'));
      document.head.append(sc);
    })).then(() => {
      const geo = window.AERO_ZONES_GEO || {},
        frames = window.AERODB_ZONES || {},
        out = {};
      for (const [id, g] of Object.entries(geo)) {
        const f = zoneFrame(g.r),
          parts = f ? f.parts : (frames[id]?.b || []).map(b => [...b]);
        out[id] = {
          name: g.n || [id, id, id, id],
          rings: g.r || [],
          box: f ? f.box : parts.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[2]), Math.max(b[3],
            p[3])], [
            180, 90, -180, -90
          ]),
          parts,
          framed: f ? f.framed : []
        };
      }
      return freezeAll(out);
    }).catch(e => {
      outlinesP = null; // un échec de chargement (hors ligne au premier appel) : le suivant réessaie
      throw e;
    });
    return outlinesP;
  }
  const PUB = 'sia/base/',
    PUB_WHOLE = /^sia\/base\/([a-z0-9_-]+)\/(\d{4}-\d{2}-\d{2})\.json$/,
    PUB_SPLIT = /^sia\/base\/([a-z0-9_-]+)\/(\d{4}-\d{2}-\d{2})\/([a-z_]+)\.json$/,
    SPLIT_KINDS = ['meta', 'airspaces', 'aerodromes', 'aeroindex', 'navaids', 'points', 'vrp', 'airways', 'obstacles', 'mora',
      'obstaclemax', 'cities'
    ], // sortes publiées d'une zone (format découpé) ; aeroindex : index léger des terrains à code OACI (SPEC § 2)
    COMMON = ['sia/base/index.json', 'sia/base/cities_major.json'], // fichiers communs à toutes les zones
    POINT_KINDS = ['aerodromes', 'navaids', 'points', 'vrp', 'obstacles'],
    // zones dont la base a un cycle AIRAC propre : celui de leur source datée (miroir de CYCLED de tools/aero_cycles.py, vérifié par le cas K76) ;
    // les autres (openAIP, GeoNames, relief, UK Mil, FAA…) n'ont pas de cycle : le dossier sous lequel elles sont écrites n'est qu'une date de
    // construction, jamais un cycle « dépassé » (SOG-0026, 5 nov. 2026)
    CYCLED_ZONES = {
      fr: 'sia',
      gb: 'nats',
      es: 'enaire',
      ie: 'airnav',
      se: 'lfv'
    },
    // les noms d'un pays que ses habitants ou l'usage courant donnent (SOG-0158) : l'endonyme (« Sverige »), les sigles et les noms d'usage (« usa », « uk », « holland ») ; les quatre noms de la zone (fr, en, de, es) sont dans `names`
    AKA = {
      ad: ['Andorra'],
      al: ['Shqipëria', 'Shqiperia'],
      at: ['Österreich', 'Osterreich'],
      ax: ['Åland'],
      ba: ['Bosna i Hercegovina', 'BiH'],
      be: ['België', 'Belgique'],
      by: ['Belarus'],
      ch: ['Schweiz', 'Suisse', 'Svizzera'],
      cy: ['Kýpros', 'Kibris'],
      de: ['Deutschland', 'BRD'],
      dk: ['Danmark'],
      dz: ['Algérie'],
      ee: ['Eesti'],
      eg: ['Misr'],
      es: ['España'],
      fi: ['Suomi'],
      fo: ['Føroyar'],
      gb: ['UK', 'GB', 'Great Britain', 'England', 'Albion'],
      gl: ['Kalaallit Nunaat', 'Grønland'],
      gr: ['Ellada', 'Hellas'],
      hr: ['Hrvatska'],
      hu: ['Magyarország', 'Magyarorszag'],
      ie: ['Éire', 'Eire'],
      il: ['Yisrael'],
      im: ['Mann'],
      in: ['Bharat'],
      is: ['Ísland'],
      it: ['Italia'],
      jo: ['Urdun'],
      kh: ['Kampuchea'],
      lb: ['Lubnan'],
      lt: ['Lietuva'],
      lu: ['Lëtzebuerg'],
      lv: ['Latvija'],
      ma: ['Maroc'],
      me: ['Crna Gora'],
      mk: ['Severna Makedonija', 'Macedonia'],
      mm: ['Burma'],
      nl: ['Nederland', 'Holland'],
      no: ['Norge', 'Noreg'],
      ph: ['Pilipinas'],
      ps: ['Filastin'],
      se: ['Sverige'],
      sy: ['Suriyah'],
      th: ['Prathet Thai', 'Siam'],
      tj: ['Tojikiston'],
      tm: ['Türkmenistan'],
      tn: ['Tunisie'],
      tr: ['Türkiye', 'Turkiye'],
      us: ['USA', 'US', 'United States', 'United States of America', 'America', 'États-Unis', 'Etats-Unis', 'Estados Unidos',
        'Vereinigte Staaten'
      ],
      va: ['Vaticano', 'Holy See'],
      vn: ['Việt Nam'],
      xk: ['Kosova']
    },
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
  /** SOG-0191 : ce que sia/vfr/index.json dit du cycle de chaque part : { cycles: { 'AAAA-MM-JJ': n } | null (jamais écrit : un index d'avant), unknown: n (terrains dont le cycle n'est pas connu), partial: bool }.
   *  partial : plusieurs cycles, ou des terrains sans cycle à côté de terrains datés, ou `complete` faux (compilation d'un cache incomplet). Une valeur lue qui n'est pas de la forme attendue est écartée. */
  function vfrParts(vi) {
    const raw = vi && typeof vi.cycles === 'object' && vi.cycles && !Array.isArray(vi.cycles) ? vi.cycles : null,
      cycles = raw ? Object.fromEntries(Object.entries(raw).filter(([k, n]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isInteger(n) &&
        n >= 0).sort(([a], [b]) => a < b ? -1 : 1).slice(0, 12)) : null,
      unknown = Number.isInteger(vi?.unknown) && vi.unknown >= 0 ? vi.unknown : 0,
      groups = (cycles ? Object.keys(cycles).length : 0) + (unknown ? 1 : 0);
    return {
      cycles,
      unknown,
      partial: groups > 1 || vi?.complete === false
    };
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
    lnmperf: lnmAuto =
      false, // fiches .lnmperf suivies d'elles-mêmes sur un poste au dossier réglé : ÉTEINT par défaut (V3 § 10.35, 5 nov. 2026 : la fiche JSON est l'unique source, .lnmperf n'est qu'un import ou un export à la demande) ; true : un essai
    // lanceur du poste, donné par le cadre (frame/INTEGRATION.md § 15) : { request(route, opts) → { status, body } | null,
    // info() → relevé | null, job(route, corps, { onProgress, signal }) → fin du travail suivi (client du cadre) | null } ;
    // sans lui (bancs d'aerodb), lnmperf.js appelle le lanceur lui-même et fetchProcedures() répond 'no-launcher'
    launcher = null,
    // les points de navigation d'X-Plane (Navigraph / Jeppesen : propriétaires), lus par la PAGE dans le dossier d'X-Plane de l'utilisateur (le cadre donne le lecteur : { points: async () => [[identifiant, lat, lon], …] }) ; gardés en mémoire seulement, jamais écrits dans la
    // base ni exportés (SOG-0153 e) ; sans lecteur, pas de couche
    xplane = null,
    access = () =>
    true, // l'appareil a-t-il de quoi lire la base (lanceur, dépôt réglé) ? Sans cela, « non réglé » et non « non publiée »
    // borne d'une lecture de la base (ms) : passé ce délai, la lecture rend « rien » (illisible, redemandée ensuite), jamais
    // une promesse sans fin (31 oct. 2026 : une part lue sous charge pouvait rester pendante, aléa D86 / D87)
    readWait = 10e3
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
    // compteurs de la base pour le mémo des fiches (plus bas) : fichiers publiés remplacés ou rendus (`baseEpoch` : toute fiche qui a
    // lu la base est à refaire) ; zone ouverte (`loadEpoch` : seule l'est une fiche à qui il manquait un point ou un terrain, qu'une
    // zone de plus peut apporter)
    let baseEpoch = 0,
      loadEpoch = 0;
    const emit = what => {
      if (what?.changed || what?.released) baseEpoch++;
      if (what?.zone) loadEpoch++;
      listeners.forEach(fn => {
        try {
          fn(what);
        } catch {
          /* écouteur en échec : les autres sont appelés */
        }
      });
    };
    // chemin lu → révision lue : un fichier changé se reconnaît à sa révision, et l'écho d'une lecture d'aerodb elle-même dans les
    // observateurs (zones, types d'aéronefs, proc/) ne compte pas
    const revs = new Map();
    const lnmBusy = new Map(); // OACI → lecture Little Navmap en cours (fetchLnm)
    const eadBusy = new Map(); // OACI → lecture EAD Basic en cours (fetchProcedures : une seule à la fois par terrain)
    // chemins que CETTE instance est en train de lire : la couche de données annonce aux observateurs, pendant la lecture, l'arrivée dans son
    // cache du fichier qu'on lui demande ; ce n'est pas un changement (procWatch l'ignore)
    const reading = new Map();
    // bornes tombées (une lecture bornée qui a rendu « rien » faute de réponse) : un mémo construit pendant qu'une borne tombait n'est
    // pas gardé, la question suivante relit (1er nov. 2026 : aircraft() pendait sans fin quand l'API GitLab ne répondait plus)
    let lateN = 0;
    /** Une promesse bornée par readWait : sa valeur, sinon fallback à la borne (lateN compté, onLate appelé) ; jamais pendante. */
    const bound = (p, fallback = null, onLate = null) => {
      let timer = 0;
      return Promise.race([Promise.resolve(p), new Promise(res => timer = setTimeout(() => {
        lateN++;
        onLate?.();
        res(fallback);
      }, readWait))]).finally(() => clearTimeout(timer));
    };
    /** list(préfixe) du lecteur, bornée : null (liste inconnue) à la borne ou en échec. */
    const listOf = prefix => reader.list ? bound(Promise.resolve().then(() => reader.list(prefix)).catch(() => null)) : Promise.resolve(
      null);
    // bounded : lecture bornée par readWait (parts de zone, procédures, terrains VFR, villes, base des types, registre…) ; la liste des
    // zones, le manifeste et la méta d'une zone ne le sont pas (un premier lancement lent ne doit jamais faire dire « non publiée » à la
    // base, A15), ni une lecture qui précède une écriture (rememberOfp) ou un téléchargement hors ligne (fetchAll)
    const read = (path, bounded = false) => {
      reading.set(path, (reading.get(path) || 0) + 1);
      let timer = 0;
      const got = reader.read(path, {
        policy: 'reference',
        wait: true
      });
      return (bounded ? Promise.race([got, new Promise(res => timer = setTimeout(() => {
        // la borne : la lecture partagée de ce chemin est oubliée, la question suivante la relance vraiment
        lateN++;
        reader.abandon?.(path);
        res(null);
      }, readWait))]) : got).then(r => {
        if (r) revs.set(path, r.rev || '');
        return r;
      }, () => null).finally(() => {
        clearTimeout(timer);
        const n = reading.get(path) - 1;
        if (n > 0) reading.set(path, n);
        else reading.delete(path);
      });
    };

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
    /** Jour courant (UTC, « AAAA-MM-JJ ») : le cycle en vigueur et le choix du cycle à lire en dépendent. */
    const today = () => new Date(now()).toISOString().slice(0, 10);
    /** Cycle des procédures publiées (proc/<cycle>/…) : dans la liste du lecteur, le plus récent en vigueur qui porte le
     *  fichier du terrain (icao) ou l'index ; sans liste, le premier des cycles AIRAC récents dont le fichier se lit. */
    const pickProcCycle = async icao => {
      const file = icao ? `${icao}.json` : 'index.json',
        listed = await procList();
      if (Array.isArray(listed) && listed.length) {
        const found = listed.map(p => /^proc\/(\d{4}-\d{2}-\d{2})\/([^/]+)$/.exec(p)).filter(m => m && m[2] === file).map(m => m[1])
          .sort();
        return found.length ? pickCycle(found) : null;
      }
      for (const c of airacCycles(6, now()))
        if (await read(`proc/${c}/${file}`, true)) return c;
      return null;
    };
    // Le choix du cycle est gardé (par terrain, '' pour l'index) : list('proc/') du lecteur peut charger tout le cache du cadre, il
    // ne se refait que si un fichier de proc/ change (procWatch, dropProc, dropCoverage), à un autre jour, ou tant qu'aucun cycle n'a
    // été trouvé (rien n'est gardé d'un échec). La liste de proc/ est lue une fois pour tous les terrains (procList).
    let procListP = null; // list('proc/') du lecteur, une fois pour tous les terrains (chaque list() peut relire tout le cache du cadre)
    const procList = () => procListP ||= listOf('proc/')
      .then(l => {
        if (!Array.isArray(l) || !l.length) procListP = null; // sans liste (ou vide) : redemandée, jamais gardée
        return l;
      });
    const cycleMemo = new Map(); // '' | OACI → { day, p: Promise<cycle | null> }
    const procCycle = icao => {
      const key = icao || '',
        hit = cycleMemo.get(key),
        day = today();
      if (hit && hit.day === day) return hit.p;
      const e = {
        day,
        p: null
      };
      const late0 = lateN;
      e.p = pickProcCycle(icao).then(c => {
        if ((c === null || lateN !== late0) && cycleMemo.get(key) === e) cycleMemo.delete(
          key); // rien, ou une borne tombée : relu ensuite
        return c;
      }, err => {
        if (cycleMemo.get(key) === e) cycleMemo.delete(key);
        throw err;
      });
      cycleMemo.set(key, e);
      return e.p;
    };
    const procLib = () => loadOwn('procedures.js', 'AeroDBProcedures').then(() => window.AeroDBProcedures);
    /** Date ISO 8601 en UTC, à la seconde (« 2026-10-28T10:00:00Z »), d'une date lue dans un fichier ; null si illisible. */
    const isoUtc = v => {
      const t = typeof v === 'string' ? Date.parse(v) : NaN;
      return Number.isFinite(t) ? new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z') : null;
    };
    /** Les quatre fichiers d'un terrain, lus au lecteur (cycle publié, proc/manual/, proc-seen/, proc/local/), avec le cycle en
     *  vigueur (`outdated` en dépend) et `found` : l'un des quatre existe. Appelée à la construction d'une entrée du mémo seulement
     *  (procEntry) : une entrée est crue jusqu'à ce qu'une voie d'invalidation la jette, sans relire ses fichiers à chaque appel. */
    async function procSource(k) {
      const cycle = await procCycle(k),
        [pub, man, seen, loc] = await Promise.all([cycle ? read(`proc/${cycle}/${k}.json`, true) : null, read(`proc/manual/${k}.json`,
          true), read(`proc-seen/${k}.json`, true), read(`proc/local/${k}.json`, true)]);
      return {
        cycle,
        pub,
        man,
        seen,
        loc,
        inForce: airacCycles(1, now())[0],
        found: !!(pub || man || seen || loc)
      };
    }
    /** Les fiches d'un terrain par source : publiées (cycle en vigueur), lues à la main (proc/manual/, hors des cycles : marquées
     *  `outdated` quand le cycle de leur page n'est plus en vigueur, et `source.read_at` = la date du fichier), vues dans un OFP
     *  (proc-seen/), repli X-Plane du poste (proc/local/ : jamais synchronisé ; statut forcé à `xplane`, le rang le plus bas, et
     *  `local: true`). Copies : le cache du lecteur n'est pas modifié. */
    /** Lien « Source » d'une fiche de l'eAIP du SIA (§ 10.25) : `source.url` = charts.base du fichier du terrain + Cartes/<OACI>/ +
     *  le nom de sa page (source.file, sinon source.ref : les fichiers lus avant source.file portent le même nom dans ref) ; posé
     *  seulement pour une source eaip, un code OACI de quatre caractères, un nom simple et une base SOUS L'HÔTE DU SIA (celui de
     *  proc_sia.eaip_url) : le fichier du terrain est dans le dépôt synchronisé, modifiable par tout membre du groupe, et une base vers
     *  un autre hôte ferait un lien d'hameçonnage sous un libellé de confiance. Les autres sources n'ont pas de lien (leur nom suffit). */
    const SIA_EAIP_BASE = /^https:\/\/www\.sia\.aviation-civile\.gouv\.fr\/[A-Za-z0-9._~%/-]+\/$/;

    function withSourceUrl(k, file, p) {
      const s = p?.source,
        name = s?.file || s?.ref,
        base = file?.charts?.base;
      if (s?.kind !== 'eaip' || !/^[A-Z0-9]{4}$/.test(k) || typeof name !== 'string' || !/^[A-Za-z0-9._ -]+\.pdf$/.test(name) ||
        typeof base !== 'string' || !SIA_EAIP_BASE.test(base) || base.includes('..')) return p;
      return {
        ...p,
        source: {
          ...s,
          file: s.file || name,
          url: `${base}Cartes/${k}/${encodeURIComponent(name)}`
        }
      };
    }

    function listsOf(k, src) {
      const {
        pub,
        man,
        seen,
        loc,
        inForce
      } = src;
      const mv = valueOf(man),
        pv = valueOf(pub);
      const readAt = isoUtc(mv?.updated_at);
      return {
        pub: (pv?.procedures || []).map(p => withSourceUrl(k, pv, p)),
        manual: (mv?.procedures || []).map(p => {
          const c = p.source?.cycle || mv.cycle || null,
            q = withSourceUrl(k, mv, c && c !== inForce ? {
              ...p,
              outdated: true
            } : p);
          return readAt ? {
            ...q,
            source: {
              ...q.source,
              read_at: readAt
            }
          } : q;
        }),
        seen: valueOf(seen)?.procedures || [],
        local: (valueOf(loc)?.procedures || []).map(p => ({
          ...p,
          status: 'xplane',
          local: true
        })),
        lnm: lnmProcs.get(k)?.list || [] // lues de Little Navmap sur CE poste (fetchLnm), en mémoire de la page seulement
      };
    }
    // ---- mémo des fiches (§ 10.29, g) : par terrain, la liste fusionnée + phasée + placée, les pistes et les fiches brutes. UNE lecture
    // des fichiers et UNE analyse par terrain, partagées par tous les appels (procedures, procedure, runways) et tous les modules
    // (une instance d'aerodb) ; des appels simultanés partagent la même promesse. L'entrée est crue jusqu'à une invalidation, SANS
    // relire les révisions à chaque appel (une lecture du cadre = deux accès IndexedDB et une analyse JSON ; list() charge tout
    // son cache) : observateur de proc/ et de proc-seen/ sur une révision changée, fetchProcedures réussie, refresh, rememberOfp,
    // `baseEpoch` (fichiers publiés de la base remplacés) et, pour une entrée à qui il manquait un point ou un terrain, `loadEpoch` (une
    // zone de plus peut l'apporter). Une entrée sans aucun fichier, ou à qui la base entière n'a pas encore tout dit, n'est crue que
    // EMPTY_RETRY (le lecteur n'avait peut-être pas encore le fichier, la zone n'a peut-être pas pu être lue).
    const lnmProcs =
      new Map(); // OACI → { list, base, notice, at } : les fiches lues dans la base de Little Navmap du poste (fetchLnm, SOG-0210), jamais écrites
    const procMemo = new Map(); // OACI → entrée { day, base, load, sensitive, until, done, p: Promise<{ lists, list, table, … }> }
    const procStats = {
      merges: 0, // fusions faites (une par version des fichiers d'un terrain)
      hits: 0, // appels servis par le mémo
      guessed: {
        missed: 0 // approches dont l'approche interrompue a été devinée (compté à la construction de la liste)
      }
    };
    const dropProc = k => {
      procListP = null;
      if (k) {
        procMemo.delete(k);
        cycleMemo.delete(k);
      } else {
        procMemo.clear();
        cycleMemo.clear();
      }
    };
    /** Pistes d'un terrain (§ 10.20) à partir des fichiers et de la liste placée : voir `runways()`. */
    async function runwayTable(src, recs, adOf) {
      const byId = new Map();
      for (const r of [...(valueOf(src.pub)?.runways || []), ...(valueOf(src.man)?.runways || []), ...(valueOf(src.loc)?.runways ||
      [])])
        if (r && r.id && !byId.has(r.id)) byId.set(r.id, {
          ...r,
          approx: false
        });
      for (const rec of recs)
        for (const p of rec.points) {
          const m = /^RW(\d\d)([LRC]?)$/.exec(p.id || '');
          if (!m || p.lat == null || byId.has(m[1] + m[2])) continue;
          const ad = await adOf();
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
    }
    /** Passe commune de lecture, après les phases et les positions (§ 10.29, h) : une approche sans point d'approche interrompue
     *  reçoit la phase `missed` après son point le plus proche du seuil de sa piste (`dthr` quand il y en a un, sinon lat / lon ;
     *  sans piste placée, la position du terrain) ; la fiche porte alors `guessed: ['missed']` et le compteur compte. `incomplete()`
     *  est appelée quand ni seuil ni terrain ne sont connus (la base n'est peut-être pas encore là). */
    async function finishProc(P, rec, table, adOf, incomplete) {
      if (!P.lacksMissed(rec)) return rec;
      let refs = P.landingRefs(rec, table);
      if (!refs.length) {
        const ad = await adOf();
        if (ad && Number.isFinite(+ad.lat) && Number.isFinite(+ad.lon)) refs = [{
          lat: +ad.lat,
          lon: +ad.lon
        }];
      }
      if (!refs.length) {
        incomplete();
        return rec;
      }
      const out = P.markMissed(rec, refs);
      if (out !== rec) procStats.guessed.missed++;
      return out;
    }
    /** Recherches dans la base faites pour UNE construction d'entrée : les lieux d'un identifiant (coordsAll) ne sont cherchés qu'une fois
     *  par identifiant, tous tronçons et toutes fiches du terrain confondus (864 points sans position, 82 identifiants pour LFPO) ;
     *  `missed` dit qu'une recherche n'a rien trouvé (point, terrain) : le résultat dépend alors de la base entière. */
    function lookups() {
      const ids = new Map(),
        self = {
          missed: false,
          places: id => {
            if (!ids.has(id)) ids.set(id, api.coordsAll(id).catch(() => (self.missed = true, [])).then(all => {
              if (!all.length) self.missed = true;
              return all;
            }));
            return ids.get(id);
          },
          anchor: null
        };
      return self;
    }
    /** Construit l'entrée du mémo : fusion, phases, positions, pistes, puis la passe commune de lecture. `lk.missed` quand un
     *  résultat dépend d'une base qui n'a pas tout dit (point en route sans position, approche sans seuil ni terrain connus). */
    async function buildProc(k, src) {
      const P = await procLib(),
        lists = listsOf(k, src),
        lk = lookups();
      let adP = null;
      const adOf = () => adP ||= api.aerodromes({
        icao: k
      }).then(r => r[0] || null, () => null).then(ad => {
        if (!ad) lk.missed = true;
        return ad;
      });
      procStats.merges++;
      const placed = await Promise.all(P.merge(lists.pub, lists.manual, lists.seen, lists.local, lists.lnm).map(rec => placeProc(k, P
        .withPhases(
          rec), lk)));
      const table = await runwayTable(src, P.filter(placed), adOf),
        list = await Promise.all(placed.map(rec => finishProc(P, rec, table, adOf, () => lk.missed = true)));
      return {
        P,
        lists,
        list,
        table,
        lk,
        adOf,
        files: {
          pub: valueOf(src.pub),
          manual: valueOf(src.man)
        }
      };
    }
    /** La base entière a-t-elle été ouverte ? Vrai quand les zones publiées sont connues et toutes ouvertes (ou sans fichier) : un point
     *  ou un terrain que la base n'a pas est alors absent pour de bon (jusqu'à ce qu'elle change, `baseEpoch`). */
    async function baseFinal() {
      const pub = (await published()).zones;
      const ids = Object.keys(pub || {}); // une liste vide n'est pas une réponse sûre (voir published)
      return ids.length > 0 && !loading.size && ids.every(id => loaded.has(id) || missing.has(id));
    }
    /** L'entrée du mémo est-elle encore crue ? */
    const trusted = e => e.day === today() && (!e.done || e.base === baseEpoch && (!e.sensitive || e.load === loadEpoch) && (!e.until ||
      now() < e.until));
    /** L'entrée du mémo d'un terrain : bâtie une fois (les fichiers sont lus alors, et seulement alors), puis servie à tout appel,
     *  sans une lecture, jusqu'à une invalidation ; des appels simultanés partagent la même construction. */
    function procEntry(k) {
      const hit = procMemo.get(k);
      if (hit && trusted(hit)) {
        procStats.hits++;
        return hit.p;
      }
      const e = {
        day: today(),
        done: false,
        base: baseEpoch,
        load: loadEpoch,
        sensitive: false,
        until: 0,
        p: null
      };
      const late0 = lateN;
      e.p = (async () => {
        const src = await procSource(k),
          r = await buildProc(k, src),
          // une base qui a changé pendant la construction, ou une lecture tombée à la borne : l'entrée ne sert qu'aux appels en cours
          moved = e.base !== baseEpoch || lateN !== late0,
          final = !r.lk.missed || await baseFinal();
        Object.assign(e, {
          done: true,
          base: baseEpoch,
          load: loadEpoch,
          sensitive: !final,
          until: !src.found || !final || typeof reader.watch !== 'function' ? now() + EMPTY_RETRY : 0
        });
        if (moved && procMemo.get(k) === e) procMemo.delete(k);
        return r;
      })().catch(err => {
        if (procMemo.get(k) === e) procMemo.delete(k);
        throw err;
      });
      procMemo.set(k, e);
      return e.p;
    }
    /** Points publiés sans position (points en route des pages DATA de l'eAIP) : cherchés dans la base, le plus proche du premier
     *  point placé de la procédure ; un tronçon SANS point (id null : VA, CA, VM, FM…) reste sans position, jamais placé. `lk` : les
     *  recherches de la construction en cours (lookups) ; sans lui, celles de ce seul appel. */
    async function placeProc(k, rec, lk = lookups()) {
      if (!rec.points.some(p => p.lat == null && p.id)) return rec;
      const anchor = rec.points.find(p => p.lat != null) || await (lk.anchor ||= api.coords(k).catch(() => null)).then(a => (a || (lk
        .missed =
        true), a));
      return {
        ...rec,
        points: await Promise.all(rec.points.map(async p => {
          if (p.lat != null || !p.id) return p;
          const all = await lk.places(p.id),
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
              lite: !!e && ((e.kinds?.[cycle] || []).includes('aeroindex') || e.kb?.[cycle]?.aeroindex != null),
              // sortes que la liste du dépôt connaît pour ce cycle (null : inconnues, chaque part est lue)
              kinds: e?.kinds?.[cycle]?.length ? e.kinds[cycle] : null
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
    /** Tous les lieux de ce nom, du plus proche de near [lat, lon] au plus éloigné : [{ kind, item, zone, distanceNm }] (coordsAll avec near). Les zones sont ouvertes de la plus proche (cadre) à la plus lointaine ; la recherche s'arrête quand le cadre de la suivante est
     *  plus loin que le meilleur lieu trouvé : aucune zone restante ne peut en avoir un plus proche. */
    async function nearestOf(ident, near, all = false) {
      const k = fold(ident),
        pub = (await published()).zones || {},
        outlines = await zoneOutlines().catch(() => ({})),
        kinds = [
          ['aerodromes', 'aerodrome'],
          ['navaids', 'navaid'],
          ['points', 'point'],
          ['vrp', 'vrp']
        ],
        order = [...new Set([...Object.keys(pub), ...loaded.keys()])].map(id => ({
          id,
          d: boxDistNm(near, outlines[id]?.box)
        })).sort((a, b) => a.d - b.d),
        out = [];
      let best = Infinity;
      for (const {
          id,
          d
        }
        of order) {
        if (d > best && !all) break;
        const z = await loadZone(id);
        if (!z) continue;
        for (const [kk, kind] of kinds)
          for (const item of (await idx(z, `ident:${kk}`)).get(k) || []) {
            if (!num(item.lat) || !num(item.lon)) continue;
            const dn = distNm(near, [+item.lat, +item.lon]);
            out.push({
              kind,
              item,
              zone: id,
              distanceNm: Math.round(dn * 10) / 10
            });
            best = Math.min(best, dn);
          }
      }
      // SOG-0154 : un identifiant d'AÉRODROME (quatre lettres) se résout à l'aérodrome, sans parler d'homonymes : le « point » ou la « balise » de même identifiant à la même position est le même lieu (le SIA publie le point de référence
      // de l'aérodrome sous son code OACI), pas un homonyme ; un homonyme est un autre lieu de même genre (PAM de Pampelune et de Panama City)
      const rank = {
          aerodrome: 0,
          navaid: 1,
          point: 2,
          vrp: 3
        },
        sorted = out.sort((a, b) => a.distanceNm - b.distanceNm || rank[a.kind] - rank[b.kind]),
        kept = [];
      for (const x of sorted) {
        const same = kept.find(y => distNm([+y.item.lat, +y.item.lon], [+x.item.lat, +x.item.lon]) <= 1);
        if (same) continue;
        kept.push(x);
      }
      return kept.some(x => x.kind === 'aerodrome') && /^[A-Z0-9]{4}$/.test(k.toUpperCase()) ? kept.filter(x => x.kind ===
        'aerodrome') : kept;
    }
    /** Données d'une sorte d'une zone (lues une fois) : tableau, objet (obstaclemax, meta) ; vides si absentes. */
    function part(z, kind) {
      if (z.parts.has(kind)) return z.parts.get(kind);
      const empty = kind === 'obstaclemax' || kind === 'meta' ? {} : [];
      let p;
      if (z.split && z.kinds && !z.kinds.includes(kind)) {
        // part que le dépôt n'a pas : vide aussitôt, sans lecture, et dit dans les relevés (stats)
        z.reads.push({
          kind,
          bytes: 0,
          ms: 0,
          absent: true
        });
        p = Promise.resolve(empty);
      } else if (z.split) {
        p = (async () => {
          const t0 = performance.now(),
            r = await read(`${z.base}${kind}.json`, true);
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
    // une borne tombée pendant la lecture : la liste rendue (vide) n'est pas gardée, la question suivante relit
    const major = () => {
      if (majorP) return majorP;
      const l0 = lateN;
      return majorP = read(`${PUB}cities_major.json`, true).then(r => {
        if (lateN !== l0) majorP = null;
        return (valueOf(r)?.data || []).sort(byPop);
      });
    };
    const world = () => {
      if (worldP) return worldP;
      const l0 = lateN;
      return worldP = read(`${PUB}cities.json`, true).then(r => {
        if (lateN !== l0) worldP = null;
        return (valueOf(r)?.cities || []).sort(byPop);
      });
    };
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
    let fleetMoved = false; // la compagnie a changé pendant cette lecture : le registre lu l'est de l'ancienne flotte, le suivant relit
    function aircraft() {
      const late0 = lateN;
      return aircraftP ||= (async () => {
        aircraftBusy = true;
        // tout en parallèle (premier écran sur un réseau lent : une attente au lieu de six) : les scripts du registre, les
        // sources du registre dès que registry.js est là (readAll), et la base des types ; JSON ou .js de la V2 choisi
        // d'après l'arbre du dépôt quand le lecteur le connaît (sinon les deux demandés à la fois, le JSON préféré)
        const libsP = Promise.all([loadOwn('registry.js', 'AeroDBRegistry'), loadOwn('sheets.js', 'AeroDBSheets')]),
          // la flotte de la compagnie courante (§ 10.38) : le dossier que FrameData.airline() donne, sinon airline/fleet.json comme avant
          fleetPathP = libsP.then(async () => {
            try {
              const a = typeof window.FrameData?.airline === 'function' ? await window.FrameData.airline() : null;
              return window.AeroDBRegistry.fleetPathOf(a?.root);
            } catch {
              return window.AeroDBRegistry.PATHS.fleet;
            }
          }),
          rawP = fleetPathP.then(fleetPath => window.AeroDBRegistry.readAll(reader, {
            wait: readWait,
            late: () => lateN++,
            fleetPath
          })),
          listed = await listOf('AircraftDB/');
        const one = async (base, name) => {
          const jp = `AircraftDB/${base}.json`,
            sp = `AircraftDB/${base}.js`,
            has = p => !Array.isArray(listed) || listed.includes(p),
            [j, s] = await Promise.all([has(jp) ? read(jp, true) : null, has(sp) && !(Array.isArray(listed) && listed.includes(
                jp)) ?
              read(sp, true) :
              null
            ]);
          if (j) return valueOf(j);
          const t = s || (Array.isArray(listed) && listed.includes(jp) && has(sp) ? await read(sp, true) : null);
          return t ? literal(t.text ?? t.value, name) : null;
        };
        const [db, perf] = await Promise.all([one('aircraft_db', 'AIRCRAFT_DB'), one('aircraft_perf', 'AIRCRAFT_PERF')]),
          catalog = window.AeroDBAircraft.create({
            db: db || {},
            perf: perf || {}
          });
        // registre : fiches, flotte, référence, recherche unique (registry.js) ; logique des fiches (sheets.js)
        await libsP;
        const fleetPath = await fleetPathP,
          reg = registry = window.AeroDBRegistry.create({
            reader,
            catalog,
            now,
            raw: rawP,
            fleetPath,
            readWait,
            onLate: () => lateN++
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
        // une lecture tombée à la borne : ce registre (vide ou incomplet) sert les appels en cours, le suivant relit
        if (lateN !== late0 || fleetMoved) aircraftP = null;
        fleetMoved = false;
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
    let idxP = null; // promesse des index fusionnés (indexParts) ; null : à lire
    let covP = null; // promesse de la table { held: Map OACI → { source, outdated, counts }, ead: EAD_STATES } ; null : à bâtir
    // issues d'EAD_STATES qui disent POURQUOI rien n'est lisible (toute autre valeur, 'sia' d'un État autre que LF comprise, est
    // inattendue : 'unknown', jamais une raison inventée)
    const COV_WHY = new Set(['images', 'labels', 'points', 'prose', 'vfr', 'none']);
    /** Les index dont la table est tirée ont peut-être changé : la table est jetée, rebâtie à la prochaine question. */
    const dropCoverage = () => {
      covP = null;
      idxP = null;
      procListP = null;
      cycleMemo.delete('');
    };
    /** Cet appareil peut-il lancer la lecture ? Un lanceur avec `job`, non appairé (comme fetchProcedures). Lu à chaque appel. */
    const canRead = () => typeof launcher?.job === 'function' && !!launcher.info?.() && !launcher.info().lan;
    /** Table des terrains détenus, bâtie UNE fois depuis procedureIndex() (cycle publié + proc/manual/ + proc/local/, déjà fusionnés)
     *  et EAD_STATES, jamais depuis la base ; des appels simultanés partagent la même promesse. Un terrain dont l'index ne porte
     *  aucune procédure n'est pas « détenu ». */
    function coverageTable() {
      if (covP) return covP;
      const p = (async () => {
        const [parts, src] = await Promise.all([indexParts().catch(() => null), api.sources().catch(() => null)]),
          ix = parts?.out,
          held = new Map();
        for (const [k, e] of Object.entries(ix?.aerodromes || {})) {
          const counts = {
            SID: +e?.SID || 0,
            STAR: +e?.STAR || 0,
            APP: +e?.APP || 0
          };
          if (!e || counts.SID + counts.STAR + counts.APP === 0) continue;
          // lecture en partie (V3 § 10.26) : pages non lues (`pages_unread`) ou procédures à vérifier (`doubt`), comptées à l'installation
          // dans l'entrée de l'index (tools/proc_manual.py) ; une entrée sans ces comptes (fichier d'avant, cycle publié) n'est pas « partial »
          const pages = Math.max(0, +e.pages_unread || 0),
            doubt = Math.max(0, +e.doubt || 0);
          held.set(k.toUpperCase(), {
            source: e.local ? 'local' : e.manual ? 'manual' : 'published',
            outdated: !!(e.manual && !e.local && e.outdated),
            counts,
            partial: pages + doubt > 0 ? {
              pages,
              doubt
            } : null,
            read_at: parts.readAt.get(k.toUpperCase()) || null
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
    /** Ce qu'un État offre à la demande, hors terrain détenu : [niveau, raison]. Pas d'orange « lnm » : Little Navmap n'a pas encore de
     *  lecteur (§ 10.21, § 10.29) ; un orange sans lecteur promettrait un bouton qui ne fait rien. */
    function stateCoverage(prefix, ead, icao) {
      if (prefix === 'LF' || (icao ? window.AeroCatalogue?.siaRegionOf?.(icao) : Object.values(window.AeroCatalogue?.SIA_REGIONS || {})
          .some(r => r.prefixes.includes(prefix)))) return ['orange',
        'sia'
      ]; // la France et son outre-mer (SOG-0054) : l'eAIP du SIA, quoi qu'en dise EAD_STATES
      const out = ead[prefix]?.outcome;
      if (out === 'read') return ['orange', 'ead'];
      return ['red', COV_WHY.has(out) ? out : 'unknown'];
    }

    /** Les index des procédures (cycle publié, proc/manual/, proc/local/) fusionnés — le corps de procedureIndex() — et, par terrain, la
     *  date de sa dernière lecture (`readAt`, ISO 8601 UTC) : la plus récente des entrées de proc/manual/ et de proc/local/ qui portent
     *  `updated_at`, même quand le cycle publié l'emporte pour le reste. null sans aucun index. */
    function indexParts() {
      if (idxP) return idxP;
      const late0 = lateN,
        p = idxP = readIndexParts().then(r => {
          if ((!r || lateN !== late0) && idxP === p) idxP = null; // aucun index lu, ou une borne tombée : redemandé au prochain appel
          return r;
        }, err => {
          if (idxP === p) idxP = null;
          throw err;
        });
      return p;
    }
    async function readIndexParts() {
      const cycle = await procCycle(),
        [ix, mx, lx] = await Promise.all([cycle ? read(`proc/${cycle}/index.json`, true) : null, read('proc/manual/index.json', true),
          read('proc/local/index.json', true)
        ]),
        v = valueOf(ix),
        m = valueOf(mx),
        l = valueOf(lx);
      if (!v && !m && !l) return null;
      const inForce = airacCycles(1, now())[0],
        readAt = new Map(),
        out = {
          ...(v || {}),
          cycle: v?.cycle || cycle || null,
          aerodromes: {
            ...(v?.aerodromes || {})
          }
        };
      for (const idx of [m, l])
        for (const [k, e] of Object.entries(idx?.aerodromes || {})) {
          const at = isoUtc(e?.updated_at);
          if (at && (!readAt.get(k.toUpperCase()) || at > readAt.get(k.toUpperCase()))) readAt.set(k.toUpperCase(), at);
        }
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
      return {
        out,
        readAt
      };
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
        dropProc();
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
        const v = valueOf(await read(`sia/vfr/${k}.json`, true));
        return v?.ad === k ? v : null;
      },
      /** Index des terrains de la compilation VFR (sia/vfr/index.json) : { aerodromes [{ ad, points, routes, notes,
       *  unmatched }], generatedAt, label } ; null sans import. */
      async vfrIndex() {
        return valueOf(await read('sia/vfr/index.json', true)) || null;
      },
      /** Procédures (SID, STAR, approches) d'un terrain, au schéma commun (SPEC § 5 quinquies) : le fichier publié du cycle
       *  (proc/<cycle>/<OACI>.json) et ce qui a été vu dans les OFP de l'utilisateur (proc-seen/<OACI>.json, source
       *  secondaire), fusionnés ; q : { kind, runway, name, transition, doubt }. [] sans donnée. Les lectures de statut `doubt` (sans nom,
       *  point répété hors attente, zigzag, ligne de table non lue, géométrie incohérente ; la raison est dans `doubt`) ne sont rendues que
       *  si q.doubt === true (les modules les demandent pour les montrer « à vérifier ») ; elles ne passent jamais devant une autre lecture. */
      async procedures(icao, q = {}) {
        const k = String(icao || '').toUpperCase();
        if (!/^[A-Z0-9]{3,4}$/.test(k)) return [];
        const e = await procEntry(k);
        return e.P.filter(e.list, q).map(rec => ({
          ...rec
        }));
      },
      /** Une procédure par son identifiant (OACI.TYPE.NOM.PISTE[.TRANSITION]) : la fiche fusionnée qui le porte, sinon la fiche
       *  de la source qui le porte (publiée, proc/manual/ ou proc-seen/ : une procédure d'OFP, statut ofp, se retrouve ainsi) ;
       *  null sinon. Carburant y retrouve le choix gardé dans route.procedures (§ 10.20). Une lecture de statut `doubt` n'est rendue que
       *  si q.doubt === true. Lit le mémo de procedures() : aucune fusion de plus. */
      async procedure(id, q = {}) {
        const s = String(id || '').trim().toUpperCase(),
          k = s.split('.')[0];
        if (!/^[A-Z0-9]{3,4}$/.test(k)) return null;
        const e = await procEntry(k),
          merged = e.P.filter(e.list, {
            doubt: q.doubt === true
          }).find(p => p.id === s);
        if (merged) return {
          ...merged
        };
        const raw = [...e.lists.pub, ...e.lists.manual, ...e.lists.seen, ...e.lists.local, ...e.lists.lnm].find(p => p && p.id ===
          s && (q.doubt ===
            true ||
            p.status !== 'doubt'));
        if (!raw) return null;
        const rec = await placeProc(k, e.P.withPhases({
          ...raw,
          sources: [{
            ...raw.source,
            status: raw.status
          }]
        }), e.lk);
        return finishProc(e.P, rec, e.table, e.adOf, () => 0);
      },
      /** Pistes d'un terrain (§ 10.20) : [{ id ('23', '05R'), lat, lon (seuil), elev (ft, seuil), qfu (relèvement magnétique, °),
       *  displaced (ft), length, width, source, approx }] — celles que les fichiers de procédures portent (FAA CIFP : enregistrements
       *  de piste, complets), ceux de la page AD 2.12 de l'eAIP du SIA (complets aussi : `true` cap vrai, `displaced` en ft comme le CIFP,
       *  `dthr` : null ou le seuil décalé { lat, lon, elev }), sinon déduites des points RWnn des procédures (seuil seulement :
       *  `approx: true`, QFU du numéro de la piste, altitude du terrain) ; [] sans rien. Lues dans le mémo de procedures(). */
      async runways(icao) {
        const k = String(icao || '').toUpperCase();
        if (!/^[A-Z0-9]{3,4}$/.test(k)) return [];
        return (await procEntry(k)).table.map(r => ({
          ...r
        }));
      },
      /** Compteurs du lecteur de procédures, pour le diagnostic : { memo (terrains en mémoire), merges (fusions faites), hits (appels
       *  servis par le mémo), guessed { missed } (approches dont l'approche interrompue a été devinée à la construction de la liste) }. */
      procedureStats() {
        return {
          memo: procMemo.size,
          merges: procStats.merges,
          hits: procStats.hits,
          guessed: {
            ...procStats.guessed
          }
        };
      },
      /** Index des procédures publiées : { cycle, aerodromes: { OACI: { SID, STAR, APP, status } } }, les terrains lus à la main
       *  (proc/manual/index.json) ajoutés quand le cycle n'en a rien, avec `manual: true` et `outdated`, puis ceux du repli
       *  X-Plane du poste (proc/local/index.json) avec `local: true` ; null sans rien. */
      async procedureIndex() {
        const out = (await indexParts())?.out; // l'index fusionné est gardé (indexParts) : l'appelant en reçoit une copie
        return out ? structuredClone(out) : null;
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
        signal,
        ground
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
          let source =
            'eaip'; // la France et son outre-mer : l'eAIP du SIA (proc_sia.region_of, catalogue siaRegionOf), jamais EAD_STATES
          await api.sources().catch(() => null);
          if (!window.AeroCatalogue?.siaRegionOf?.(k) && !k.startsWith('LF')) {
            const st = (await api.sources().catch(() => null))?.EAD_STATES?.[k.slice(0, 2)];
            if (st?.outcome !== 'read') return no('no-tables', { // ni l'eAIP lu ici ni EAD Basic : rien à lancer
              outcome: st?.outcome ?? null,
              // le PAYS, jamais le terrain pris pour un État (SOG-0210 : « pour cet État (KDEN) ») : ses noms [fr, en, de, es], ou null
              state: Array.isArray(st?.names) && st.names.length === 4 ? [...st.names] : k.startsWith('K') ? [
                'États-Unis', 'United States', 'USA', 'Estados Unidos'
              ] : null,
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
          // ces deux fichiers est périmée. revalidate (FD.revalidate, frame/INTEGRATION.md § 4) relit ces deux chemins seulement
          // et attend la nouvelle copie avant de rendre : la réponse est bâtie sur le fichier installé (« 0 procédures » du
          // 28 octobre). Un lecteur sans revalidate (bancs, lecteur provisoire) oublie seulement ses copies.
          const paths = [`proc/manual/${k}.json`, 'proc/manual/index.json'];
          for (const path of paths) revs.delete(path);
          if (typeof reader.revalidate === 'function') await Promise.resolve(reader.revalidate(paths)).catch(() => null);
          else
            for (const path of paths) await Promise.resolve(reader.evict?.(path)).catch(() => 0);
          dropCoverage(); // le terrain lu est désormais détenu (proc/manual/index.json)
          dropProc(k); // le fichier du terrain a changé : sa liste est à refaire
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
          const out = await run;
          // SOG-0135 : si l'on décolle ou se pose, on doit rouler : le sol est lu à la suite des procédures (un seul geste), sans attendre pour rendre la réponse et sans qu'un échec la change
          if (out?.ok === true && ground !== false) readGroundAfter(k);
          return out;
        } finally {
          eadBusy.delete(k);
        }
      },
      /** Les procédures d'UN terrain lues dans la base de Little Navmap de CE poste (SOG-0210 ; travail proc/lnm du lanceur, lecture seule) : { ok: true, icao, count, notice, base } ou { ok: false, reason } avec
       *  reason ∈ not-personal (sans `personal: true` : la coche « usage personnel » de l'utilisateur, cache/data/personal.json { certified }, que l'appelant lit : aucun travail n'est lancé), no-launcher, paired, busy,
       *  bad-icao, cancelled, no-lnm, not-found, no-procedures, unreadable, failed. Les fiches (`status: 'lnm'`, `lnm: true`, `local: true`) sont gardées EN MÉMOIRE de la page seulement (jamais écrites, jamais exportées,
       *  jamais commitées) et servies par procedures(icao) / procedure(id) / runways comme les autres : rang `lnm` (après les lectures officielles, de l'OFP et d'X-Plane : une procédure publiée garde sa place), la Carte et
       *  Carburant les voient donc toutes deux ; on('change') annonce { procedures: icao, lnm: true }. forgetLnm(icao) les oublie. */
      async fetchLnm(icao, {
        personal,
        signal,
        onProgress
      } = {}) {
        const k = String(icao || '').trim().toUpperCase(),
          no = (reason, more = {}) => ({
            ok: false,
            reason,
            ...more
          });
        if (!/^[A-Z0-9]{4}$/.test(k)) return no('bad-icao');
        if (signal?.aborted) return no('cancelled');
        if (personal !== true) return no('not-personal');
        if (typeof launcher?.job !== 'function' || !launcher.info?.()) return no('no-launcher');
        if (launcher.info().lan) return no('paired');
        if (lnmBusy.has(k)) return no('busy');
        const run = (async () => {
          const r = await launcher.job('regen/job', {
            set: 'proc',
            verb: 'lnm',
            args: {
              icao: k,
              personal: true
            }
          }, {
            onProgress: st => {
              try {
                onProgress?.({
                  step: st.step,
                  done: st.done,
                  total: st.total
                });
              } catch {
                /* écouteur du module en échec : la lecture continue */
              }
            },
            signal
          });
          if (!r) return no('no-launcher');
          if (r.cancelled) return no('cancelled');
          if (r.status === 409) return no('busy');
          if (r.status === 403) return no('paired');
          const res = r.result;
          if (res?.ok !== true) {
            const why = res?.ok === false && typeof res.reason === 'string' ? res.reason : 'failed';
            return no(['not-personal', 'no-lnm', 'not-found', 'no-procedures', 'unreadable'].includes(why) ? why : 'failed');
          }
          const ref = String(res.base || '').slice(0, 80),
            list = (Array.isArray(res._procedures) ? res._procedures : []).slice(0, 1500).filter(p => p && ['SID', 'STAR',
              'APP'
            ].includes(p.kind) && typeof p.id === 'string' && Array.isArray(p.points) && p.points.length)
            .map(p => ({
              ...p,
              status: 'lnm',
              lnm: true,
              local: true,
              source: {
                kind: 'lnm',
                ref
              }
            }));
          if (!list.length) return no('no-procedures');
          lnmProcs.set(k, {
            list,
            base: ref,
            notice: String(res.notice || '').slice(0, 400),
            at: new Date(now()).toISOString()
          });
          dropProc(k);
          emit({
            procedures: k,
            lnm: true
          });
          return {
            ok: true,
            icao: k,
            count: list.length,
            notice: lnmProcs.get(k).notice,
            base: ref
          };
        })();
        lnmBusy.set(k, run);
        try {
          return await run;
        } finally {
          lnmBusy.delete(k);
        }
      },
      /** Oublie les fiches lues de Little Navmap pour un terrain (ou pour tous sans argument) ; true si quelque chose a été oublié. */
      forgetLnm(icao) {
        const k = icao == null ? null : String(icao).trim().toUpperCase(),
          had = k ? lnmProcs.delete(k) : lnmProcs.size > 0;
        if (!k) lnmProcs.clear();
        if (had) {
          dropProc(k);
          emit({
            procedures: k,
            lnm: true
          });
        }
        return had;
      },
      /** Les terrains dont des fiches Little Navmap sont en mémoire : { icao: { count, base, notice, at } } (de quoi marquer « lues de Little Navmap sur ce poste »). */
      lnmState() {
        return Object.fromEntries([...lnmProcs].map(([k, v]) => [k, {
          count: v.list.length,
          base: v.base,
          notice: v.notice,
          at: v.at
        }]));
      },
      /** Couverture des procédures d'un terrain (§ 10.22) : de quoi colorer une épingle de la Carte, sans charger la base. Une table
       *  des terrains détenus est bâtie une fois (procedureIndex + EAD_STATES), puis chaque appel est une recherche. null pour un
       *  code mal formé (quatre caractères A-Z 0-9). Sinon { level, reason, state, here } :
       *  · 'green' / 'held' : procédures détenues — + source ('published' > 'manual' > 'local', la meilleure détenue), outdated
       *    (vrai si la seule détention est une lecture à la main d'un cycle passé), counts { SID, STAR, APP } ;
       *  · 'orange' : lisibles à la demande — reason 'sia' (LF) ou 'ead' (État lisible dans EAD Basic). Jamais 'lnm' : Little Navmap n'a
       *    pas de lecteur (§ 10.21) ; la raison reste dans AeroCatalogue.COVERAGE pour plus tard ;
       *  · 'orange' / 'partial' (§ 10.26) : procédures détenues dont une partie n'est pas lue — pages non lues (`formats[].ok === false`)
       *    ou fiches de statut `doubt` — avec les mêmes champs que 'held' (source, outdated, counts, read_at) et partial { pages, doubt }.
       *    Les comptes viennent de l'entrée de l'index (proc/manual/index.json : `pages_unread`, `doubt`, écrits à l'installation) ;
       *    une entrée sans ces comptes n'est pas partielle ;
       *  · 'red' : rien — reason = issue d'EAD_STATES ('images', 'labels', 'points', 'prose', 'vfr', 'none'), 'unknown' pour un
       *    État absent d'EAD_STATES (ou à l'issue inattendue).
       *  read_at : date ISO 8601 UTC (à la seconde) de la dernière lecture du fichier du terrain — la plus récente des entrées de
       *  proc/manual/index.json et de proc/local/index.json qui en portent une (`updated_at`) ; null sans (terrain publié seul, orange,
       *  rouge, index plus ancien que l'écriture de cette date).
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
          level: h.partial ? 'orange' : 'green',
          reason: h.partial ? 'partial' : 'held',
          state,
          here,
          source: h.source,
          outdated: h.outdated,
          counts: {
            ...h.counts
          },
          ...(h.partial ? {
            partial: {
              ...h.partial
            }
          } : {}),
          read_at: h.read_at
        };
        const [level, reason] = stateCoverage(state, t.ead, k);
        return {
          level,
          reason,
          state,
          here,
          read_at: null
        };
      },
      /** Couverture par État, pour le module Données (§ 10.22) : { [préfixe]: { level, reason, label: [fr, en, de, es], names: [fr, en,
       *  de, es], held } } pour chaque préfixe d'EAD_STATES (LF compris). held : le nombre de terrains détenus dans l'État (la table de
       *  coverage(), bâtie des index) ; held > 0 → 'green' / 'held' ; sinon les règles de coverage() sans terrain détenu (un État lisible
       *  à la demande ou non ; la base de Little Navmap du poste ne change rien). label : AeroCatalogue.COVERAGE[reason] ; names :
       *  AeroCatalogue.EAD_STATES[préfixe].names. Comme coverage(), à redemander après { coverage: true }. */
      async coverageByState() {
        const [src, t] = await Promise.all([api.sources().catch(() => null), coverageTable().catch(() => null)]),
          ead = src?.EAD_STATES || {},
          held = {},
          out = {};
        for (const k of t?.held.keys() || []) held[k.slice(0, 2)] = (held[k.slice(0, 2)] || 0) + 1;
        for (const prefix of new Set([...Object.keys(ead), 'LF'])) {
          const n = held[prefix] || 0,
            [level, reason] = n ? ['green', 'held'] : stateCoverage(prefix, ead),
            names = ead[prefix]?.names;
          out[prefix] = {
            level,
            reason,
            label: [...(src?.COVERAGE?.[reason] || [reason, reason, reason, reason])],
            ...(Array.isArray(names) ? {
              names: [...names]
            } : {}),
            held: n
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
          base = {},
          done = new Map();
        // SOG-0164 : les meta.json de chaque cycle de chaque zone se lisent six zones à la fois (27 lectures EN SÉRIE à l'ouverture de Maintenance), le résultat gardant l'ordre des zones
        const zoneIds = Object.keys(l.zones || {});
        let next = 0;
        await Promise.all(Array.from({
          length: Math.min(6, zoneIds.length)
        }, async () => {
          while (next < zoneIds.length) {
            const id = zoneIds[next++],
              z = l.zones[id],
              cycles = {};
            await Promise.all(z.cycles.map(async c => {
              const split = z.split.has(c),
                v = split ? valueOf(await read(`${PUB}${id}/${c}/meta.json`, true)) :
                null; // l'ancien format entier n'est pas lu (toute la zone)
              cycles[c] = {
                parserVersion: v?.parserVersion ?? null,
                at: v?.builtAt ?? v?.data?.builtAt ?? v?.updated_at ?? null,
                by: v?.builtBy ?? v?.data?.builtBy ?? null,
                format: split ? 'split' : 'whole'
              };
            }));
            done.set(id, {
              cycles: Object.fromEntries(Object.keys(cycles).sort().map(k => [k, cycles[k]])),
              inForce: pickCycle(z.cycles),
              // la source datée dont le cycle est celui de la zone ('sia', 'nats', 'enaire') ; null : une zone sans cycle (jamais « dépassée », « datée du » at)
              cycleSource: Object.hasOwn(CYCLED_ZONES, id) ? CYCLED_ZONES[id] : null
            });
          }
        }));
        for (const id of zoneIds) base[id] = done.get(id);
        // procédures : les cycles de la liste du lecteur, sinon les cycles AIRAC récents dont l'index se lit
        const listed = await listOf('proc/'),
          dates = Array.isArray(listed) ? [...new Set(listed.map(x => /^proc\/(\d{4}-\d{2}-\d{2})\/index\.json$/.exec(x)).filter(
            Boolean).map(m => m[1]))] :
          airacCycles(6, now()),
          procCycles = {};
        await Promise.all(dates.map(async c => {
          const ix = valueOf(await read(`proc/${c}/index.json`, true));
          if (!ix) return;
          const byStatus = {};
          for (const e of Object.values(ix.aerodromes || {})) byStatus[e?.status || 'official'] = (byStatus[e?.status ||
            'official'] || 0) + 1;
          procCycles[c] = {
            aerodromes: Object.keys(ix.aerodromes || {}).length,
            byStatus
          };
        }));
        // le RAD et les points FRA compilés (SOG-0083 : data/route/index.json, écrit par route/import-rad) : les cycles présents, sans ouvrir les .gz
        const ri = valueOf(await read('route/index.json', true)),
          routeDays = a => Array.isArray(a) ? [...new Set(a.filter(x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)))]
          .sort().slice(-60) : [],
          vi = valueOf(await read('sia/vfr/index.json', true)),
          air = await listOf('AircraftDB/'),
          db = Array.isArray(air) && air.includes('AircraftDB/aircraft_db.json') ? valueOf(await read(
            'AircraftDB/aircraft_db.json', true)) : null;
        return {
          base,
          proc: {
            cycles: Object.fromEntries(Object.keys(procCycles).sort().map(k => [k, procCycles[k]])),
            inForce: pickCycle(Object.keys(procCycles).sort())
          },
          route: ri && typeof ri === 'object' ? {
            rad: routeDays(ri.rad),
            fra: routeDays(ri.fra),
            at: typeof ri.at === 'string' && !Number.isNaN(Date.parse(ri.at)) ? ri.at : null
          } : null,
          vfr: vi ? {
            cycle: vi.cycle || vi.source?.cycle || null,
            at: vi.generatedAt || vi.updated_at || null,
            count: Array.isArray(vi.aerodromes) ? vi.aerodromes.length : Object.keys(vi.aerodromes || {}).length,
            // SOG-0191 : le cycle de chaque part (sia/vfr/index.json : `cycle` est le plus ancien, `cycles` { 'AAAA-MM-JJ': n }, `unknown` : les terrains sans cycle connu) ; null avant la première
            // construction qui l'écrit. `partial` : plus d'un cycle, ou des terrains de cycle inconnu à côté de terrains datés, ou une compilation que le lanceur dit partielle (complete faux)
            ...vfrParts(vi)
          } : null,
          aircraft: Array.isArray(air) && air.length ? {
            at: db?.updated_at || db?.generated || null,
            types: db ? Object.keys(db.types || db).filter(k => !/^(schema|updated_at|generated|source)$/.test(k)).length : null,
            files: air.filter(x => /\.(json|js)$/.test(x)).length
          } : null
        };
      },
      /** Les contours des zones (shared/carto/aero_zones_geo.js, chargé une fois à la première demande) : { <zone>: { name:
       *  [fr, en, de, es], rings: [[[lon, lat], …]], box: [w, s, e, n] } }, gelés ; la carte des zones du module Données,
       *  bientôt le fond uni de la Carte (frame/aerodb/INTEGRATION.md). */
      zoneOutlines,
      /** Les paquets de pays et les thèmes (V3 § 10.42, SOG-0065) : frame/aerodb/packs.json, fait par tools/build_aero_packs.py (Natural Earth, listes à la main dites par `basis`). { generated, source, regions: [{ id, names: [fr, en, de, es], zones: [identifiants], partial?: [identifiants de zones seulement en partie dans le paquet], empty?: 'no-zone-no-source', basis }], themes: [{ id, names, zones, basis }] }.
       *  Un paquet est une liste de zones, plusieurs-à-plusieurs (la Turquie est dans la Méditerranée et au Moyen-Orient) ; un thème est un FILTRE : les zones qui touchent l'objet, il n'en ajoute aucune. Les zones inconnues de la liste des zones sont écartées, les noms nettoyés : le fichier est une entrée bornée (60 paquets, 250 zones chacun). Rien n'est construit ni publié par un paquet : « Ajouter tout » est le geste du pilote (addZone sur chaque identifiant). null si le fichier ne se lit pas. */
      async packs() {
        packsP ||= (async () => {
          const [raw, outlines] = await Promise.all([fetch(new URL('packs.json', HERE).href, {
            cache: 'no-cache'
          }).then(r => r.ok ? r.json() : null).catch(() => null), zoneOutlines().catch(() => null)]);
          if (!raw || raw.schema !== 1 || !outlines) return null;
          const known = new Set(Object.keys(outlines)),
            text = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f-\u009f<>]/g, ' ').replace(/\s+/g, ' ')
            .trim().slice(0, n) : '',
            ids = (list, only) => Array.isArray(list) ? [...new Set(list.filter(z => typeof z === 'string' && known.has(z) && (!
              only || only.has(z))))].slice(0, 250) : [],
            pack = (p, kind, date, source) => {
              if (!p || typeof p !== 'object' || !/^[a-z0-9-]{2,30}$/.test(p.id || '') || !Array.isArray(p.names) || p.names
                .length !== 4) return null;
              const zones = ids(p.zones);
              return Object.freeze({
                id: p.id,
                kind,
                date,
                source,
                names: Object.freeze(p.names.map(n => text(n, 60))),
                zones: Object.freeze(zones),
                ...(Array.isArray(p.partial) ? {
                  partial: Object.freeze(ids(p.partial, new Set(zones)))
                } : {}),
                ...(typeof p.empty === 'string' ? {
                  empty: text(p.empty, 40)
                } : {}),
                basis: text(p.basis, 300)
              });
            },
            date = text(raw.generated, 10),
            source = text(raw.source, 300),
            list = (l, kind) => Object.freeze((Array.isArray(l) ? l : []).slice(0, 60).map(p => pack(p, kind, date, source))
              .filter(Boolean)),
            regions = list(raw.regions, 'region'),
            themes = list(raw.themes, 'theme');
          return Object.freeze({
            generated: date,
            source,
            regions,
            themes,
            packs: Object.freeze([...regions, ...
              themes
            ]) // la forme du contrat de Réglages (SOG-0065) : une liste, `kind` dit la sorte
          });
        })();
        packsP.then(v => {
          if (!v) packsP = null;
        });
        return packsP;
      },
      /** Toutes les zones connues de la suite (AERODB_ZONES), publiées ou non : [{ id, names: [fr, en, de, es], frames, published }],
       *  dans l'ordre de leur nom français (« Ajouter un pays » du module Données). */
      async zones() {
        const l = await published();
        return Object.entries(zones).map(([id, z]) => ({
          id,
          names: z.n || [id, id, id, id],
          aka: AKA[id] || [], // l'endonyme, les sigles et les noms d'usage (SOG-0158)
          frames: z.b || [],
          published: !!(l.zones && l.zones[id])
        })).sort((a, b) => a.names[0].localeCompare(b.names[0], 'fr'));
      },
      /** Le catalogue des sources (catalogue.js, chargé à la première demande avec airac.js) : AeroCatalogue, et le cycle AIRAC
       *  (AeroAirac) sous `airac`. */
      /** L'adresse de la page d'un aérodrome dans l'AIP officiel de son État, là où sont ses cartes (ADC, SID, STAR, approche, VAC…), ou null (V3, lot C2, 5 nov. 2026 ; SOG-0024) :
       *  France (LF…) la page AD 2 de l'eAIP du SIA du cycle publié de la zone fr (à défaut, du cycle en vigueur), Espagne (LE…, GC…) la page de l'aérodrome d'ENAIRE (les cartes PDF de
       *  contenido_AIP/AD/AD2/<OACI>/ y sont listées), Irlande (EI…) la page AD 2 de l'édition d'AirNav Ireland de la zone ie publiée (rien sans zone publiée : le dossier d'une édition change
       *  à chaque cycle) ; tout autre État, un code qui n'a pas quatre lettres : null. Ne lit aucune donnée d'aérodrome : un code inexistant donne une adresse qui n'ouvre rien. */
      async chartsUrl(icao) {
        const k = String(icao || '').trim().toUpperCase();
        if (!/^[A-Z]{4}$/.test(k)) return null;
        await api.sources().catch(() => null);
        const region = window.AeroCatalogue?.siaRegionOf?.(k);
        if (region === 'FRANCE') {
          await loadOwn('airac.js', 'AeroAirac');
          // jamais plus ancien que le cycle en vigueur du calendrier (SOG-0221 : une liste de la base gardée par la page d'avant la mise à jour donnait le dossier du cycle précédent) : le plus récent des deux
          const cycle = [(await api.publication()).base?.fr?.inForce, window.AeroAirac.cycleOf(now()).date].filter(Boolean).sort()
            .pop();
          return `${window.AeroCatalogue.eaipBase(cycle)}/html/eAIP/FR-AD-2.${k}-fr-FR.html`;
        }
        if (
          region
        ) { // l'outre-mer du SIA (SOG-0054) : la date du dossier AIRAC de la région n'est pas sur le calendrier, le lanceur l'a écrite (proc/sia-regions.json, travail proc/regions)
          const base = valueOf(await read('proc/sia-regions.json', true))?.regions?.[region]?.base;
          return typeof base === 'string' && SIA_EAIP_BASE.test(base) && !base.includes('..') ? `${base}FR-AD-2.${k}-fr-FR.html` : null;
        }
        if (/^(LE|GC)/.test(k)) return `https://aip.enaire.es/AIP/contenido_AIP/AD/AD2/${k}/LE_AD_2_${k}_en.html`;
        if (/^EI/.test(k)) {
          const cycle = (await api.publication()).base?.ie?.inForce;
          return /^\d{4}-\d{2}-\d{2}$/.test(cycle || '') ? `https://www.airnav.ie/AIRAC/${cycle}-AIRAC/html/eAIP/EI-AD-2.${k}-en-IE.html` : null;
        }
        return null;
      },
      /** La couche sol d'un terrain (V3 § 10.40, SOG-0046) : { icao, cycle, source: 'osm', attribution, items [{ id, kind: 'twy' | 'park' | 'hold', name, line: [[lon, lat]…] | point: [lon, lat] }] } lue dans
       *  proc/ground/<OACI>.json (écrit par le travail ground/fetch du lanceur : OpenStreetMap, ODbL), ou null sans fichier, pour un code mal formé ou un fichier qui n'est pas celui du terrain. Le fichier
       *  est une entrée non fiable : copie bornée (5 000 éléments, 2 000 points par ligne, noms de 16 signes sans < > & " '), les éléments invalides retirés. L'attribution est à montrer tant que la couche est dessinée. */
      async ground(icao) {
        const k = String(icao || '').trim().toUpperCase();
        if (!/^[A-Z0-9]{4}$/.test(k)) return null;
        return cleanGround(k, valueOf(await read(`proc/ground/${k}.json`, true)));
      },
      /** Lit la couche sol d'un terrain dans OpenStreetMap par le lanceur (travail ground/fetch : UNE requête Overpass, ~30 s, jamais depuis la page) et l'installe dans proc/ground/ (un commit, sans envoi) :
       *  le geste du pilote depuis Données. Rend { ok: true, icao, items: { twy, park, hold }, bytes, truncated, warnings, commit, ground } ou { ok: false, reason, message?, wait? } — reason : 'bad-icao', 'no-launcher',
       *  'paired' (le geste se fait sur le poste), 'busy', 'too-soon' (30 s entre deux lectures ; `wait`), 'no-data' (rien d'OpenStreetMap dans l'aérodrome), 'cancelled', 'failed'. `onProgress({ step, done, total })`,
       *  `signal` (AbortSignal). `{ dry: true }` : à blanc, le plan seulement, rien d'appelé ni d'écrit. */
      async fetchGround(icao, {
        onProgress,
        signal,
        dry
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
        if (groundBusy.has(k)) return no('busy');
        const run = (async () => {
          const r = await launcher.job('regen/job', {
            set: 'ground',
            verb: 'fetch',
            args: dry === true ? {
              icao: k,
              dry: true
            } : {
              icao: k
            }
          }, {
            onProgress: st => {
              try {
                onProgress?.({
                  step: st.step,
                  done: st.done,
                  total: st.total
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
          if (res?.ok !== true) {
            if (r.status === 409) return no('busy');
            if (r.status === 429 || r.reason === 'too-soon') return no('too-soon', {
              wait: Number.isFinite(r.wait) ? r.wait : null
            });
            if (r.status === 403) return no('paired');
            if (r.state === 'cancelled') return no('cancelled');
            const why = res?.ok === false && typeof res.reason === 'string' ? res.reason : 'failed';
            return no(['no-data', 'cancelled', 'failed'].includes(why) ? why : 'failed', {
              message: String(res?.message || r.message || (r.offline ? 'launcher unreachable' : '')),
              ...(Array.isArray(res?.warnings) ? {
                warnings: res.warnings
              } : {})
            });
          }
          if (res.dry === true) return {
            ok: true,
            dry: true,
            icao: k,
            plan: res.plan && typeof res.plan === 'object' ? res.plan : null
          };
          const path = `proc/ground/${k}.json`;
          revs.delete(
            path); // écrit par le lanceur hors de la couche de données : sa copie locale est périmée (comme fetchProcedures)
          if (typeof reader.revalidate === 'function') await Promise.resolve(reader.revalidate([path,
            'proc/ground/index.json'
          ])).catch(() => null);
          else await Promise.resolve(reader.evict?.(path)).catch(() => 0);
          emit({
            ground: k
          });
          return {
            ok: true,
            icao: k,
            items: res.items && typeof res.items === 'object' ? res.items : null,
            bytes: Number.isFinite(res.bytes) ? res.bytes : null,
            truncated: res.truncated === true,
            warnings: Array.isArray(res.warnings) ? res.warnings : [],
            commit: res.commit ?? null,
            ground: await api.ground(k)
          };
        })();
        groundBusy.set(k, run);
        try {
          const out = await run;
          noteGround(k, out);
          return out;
        } finally {
          groundBusy.delete(k);
        }
      },
      /** Où en est la couche sol d'un terrain (SOG-0135, refus de recette du 10 nov. : une lecture du sol qui échoue ne se tait plus) : { state: 'none' (rien lu, rien tenté) | 'reading' | 'ok' | 'failed', reason?, message?, at?, wait? }. `failed` garde la raison
       *  (`busy` : le lanceur faisait autre chose ou envoyait ; `too-soon`, `failed` : Overpass occupé ou injoignable, `no-data` : OpenStreetMap n'a rien sur ce terrain…) et le texte du lanceur, tels que le dernier essai les a dits ; le lanceur garde le dernier résultat de chaque terrain
       *  (data/local/ground_state.json, travail ground/state) : ils survivent à un rechargement de la page. Le panneau Sol de la Carte et la ligne des procédures disent « Sol non lu : <raison> · Réessayer » (Réessayer : fetchGround). */
      async groundStatus(icao) {
        const k = String(icao || '').trim().toUpperCase();
        if (!/^[A-Z0-9]{4}$/.test(k)) return {
          state: 'none'
        };
        if (groundBusy.has(k)) return {
          state: 'reading'
        };
        if (!groundSt.has(k)) await loadGroundState();
        if (groundSt.has(k)) return {
          ...groundSt.get(k)
        };
        return {
          state: (await api.ground(k).catch(() => null)) ? 'ok' : 'none'
        };
      },
      /** L'adresse du PDF de la carte officielle d'une procédure, ou null (V3 § 10.39, SOG-0045) : `proc` est la fiche telle que procedures() la donne (SID, STAR, approche), ou, pour la piste,
       *  `{ icao, kind: 'RWY', id, name, runways: [piste] }` (la réponse est alors la carte d'aérodrome ADC, sinon la carte VAC de l'atlas VFR). SIA seulement (LF…) : la carte IAC / SID / STAR choisie
       *  dans `charts.items` du fichier du terrain qui porte la fiche (procedures.js chartFor : une seule carte qui convienne, jamais devinée), sinon la page DATA de sa table de codage
       *  (`source.url`, § 10.25) ; ENAIRE et AirNav : null tant que leurs adresses ne sont pas connues. Jamais composée ailleurs (même contrat que chartsUrl) : l'adresse est `charts.base` du
       *  fichier, sous l'hôte du SIA, + le chemin d'une carte listée par ce même fichier. Rien n'est lu ni téléchargé de la carte. */
      async chartUrl(proc) {
        const k = String(proc?.icao || '').trim().toUpperCase();
        await api.sources().catch(() => null);
        if (!window.AeroCatalogue?.siaRegionOf?.(k) || !proc || typeof proc !== 'object') return null;
        let e;
        try {
          e = await procEntry(k);
        } catch {
          return null;
        }
        const {
          pub,
          manual
        } = e.files || {}, mine = (f, lists) => f && lists.some(p => p && p.id === proc.id), cycle = proc.source?.cycle;
        const file = proc.kind === 'RWY' ? [pub, manual].find(f => f?.charts?.items?.length) :
          mine(pub, e.lists.pub) ? pub : mine(manual, e.lists.manual) ? manual : [pub, manual].find(f => f && cycle && f.cycle ===
            cycle);
        const base = file?.charts?.base;
        if (!file || typeof base !== 'string' || !SIA_EAIP_BASE.test(base) || base.includes('..')) return null;
        const P = await procLib(),
          path = P.chartFor({
            ...proc,
            icao: k
          }, file.charts.items),
          at = p => `${base}Cartes/${k}/${encodeURIComponent(p.split('/').pop())}`;
        if (path) return at(path);
        if (proc.kind === 'RWY') {
          const vac = file.charts.vac;
          return typeof vac === 'string' && /^https:\/\/www\.sia\.aviation-civile\.gouv\.fr\/[A-Za-z0-9._~%/-]+\.pdf$/.test(vac) && !
            vac.includes('..') ? vac : null;
        }
        return withSourceUrl(k, file, proc)?.source?.url || null;
      },
      /** Les approches « cartes seulement » d'un terrain du SIA (SOG-0232 / SOG-0216) : les cartes IAC de `charts.items` du fichier du terrain qu'AUCUNE fiche d'approche (lue, en doute ou d'une autre source) ne porte :
       *  [{ name: 'ILS LOC RWY 05', runway: '05', url }], triées par piste puis par nom. L'AIP ne publie de table de codage que pour une partie des approches (les RNP, quelques ILS) : les autres n'existent qu'en carte.
       *  L'adresse est composée ICI, comme chartUrl (`charts.base` du fichier sous l'hôte du SIA + le chemin d'une carte listée par ce même fichier) ; [] hors de la France, sans fichier du terrain ou sans carte IAC. Rien n'est lu de la carte. */
      async chartOnly(icao) {
        const k = String(icao || '').trim().toUpperCase();
        if (!/^[A-Z0-9]{4}$/.test(k)) return [];
        await api.sources().catch(() => null);
        if (!window.AeroCatalogue?.siaRegionOf?.(k)) return [];
        let e;
        try {
          e = await procEntry(k);
        } catch {
          return [];
        }
        const {
          pub,
          manual
        } = e.files || {}, file = [pub, manual].find(f => f?.charts?.items?.length), base = file?.charts?.base;
        if (!file || typeof base !== 'string' || !SIA_EAIP_BASE.test(base) || base.includes('..')) return [];
        const P = await procLib(),
          items = file.charts.items,
          mine = new RegExp('^Cartes/' + k + '/[A-Za-z0-9._ -]+\\.pdf$'),
          taken = new Set((await api.procedures(k, {
            doubt: true
          })).filter(p => p.kind === 'APP').map(p => P.chartFor({
            ...p,
            icao: k
          }, items)).filter(Boolean));
        return items.filter(i => i && i.kind === 'IAC' && typeof i.path === 'string' && mine.test(i.path) && !taken.has(i.path)).map(
          i => {
            const w = P.chartWords(i.path),
              runway = w.runways[0] || '';
            return {
              name: `${w.words.filter(x => x !== 'FNA').join(' ')}${w.runways.length ? ` RWY ${w.runways.join('/')}` : ''}`.trim(),
              runway,
              url: `${base}Cartes/${k}/${encodeURIComponent(i.path.split('/').pop())}`
            };
          }).sort((a, b) => (a.runway < b.runway ? -1 : a.runway > b.runway ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      },
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
          dropProc(rec.icao); // proc-seen/ vient de changer : la liste du terrain est à refaire
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
       *  zones ouvertes, puis, faute de mieux, les zones publiées une à une — aérodromes d'abord : [{ kind, item }].
       *  `near: [lat, lon]` (SOG-0142, les homonymes : PAM en Espagne et aux États-Unis) : les lieux de ce nom des zones examinées, du plus proche au plus éloigné (`all: true` : de TOUTES les zones publiées, plus long), chacun avec sa zone (`zone`) et sa distance en NM (`distanceNm`) ; les zones sont ouvertes de la plus proche à la plus
       *  lointaine (cadre de la zone) et la recherche s'arrête quand aucune zone restante ne peut avoir un lieu plus proche que le meilleur trouvé. */
      async coordsAll(ident, {
        near,
        all
      } = {}) {
        if (Array.isArray(near) && near.length === 2 && near.every(Number.isFinite)) {
          const found = await nearestOf(ident, near, all === true),
            // SOG-0142 : avec un voisinage, les points du classeur FRA d'EUROCONTROL de ce poste sont des homonymes comme les autres (« PAM » : Pampus, aux Pays-Bas, est dans le classeur ; le seul PAM publié était Tyndall, aux États-Unis) : le plus proche gagne ;
            // un point du classeur à moins de 0,1° d'un lieu publié est le même point
            fra = (await fraItems(fold(ident), near)).filter(f => !found.some(x => Math.abs(+x.item.lat - +f.item.lat) < 0.1 && Math
              .abs(+x.item.lon - +f.item.lon) < 0.1));
          return [...found, ...fra].sort((a, b) => (a.distanceNm ?? 1e9) - (b.distanceNm ?? 1e9));
        }
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
        return fraItems(
          k); // aucun lieu des zones publiées : le point FRA du classeur EUROCONTROL de ce poste, s'il y en a un (SOG-0153)
      },
      /** Position d'un identifiant (aérodrome d'abord) : { lat, lon, name, kind } ; null si inconnu. */
      async coords(ident, {
        near,
        all: every,
        maxNm
      } = {}) {
        const all = await api.coordsAll(ident, {
            near,
            all: every
          }),
          // SOG-0142 : `maxNm` (avec `near`) : un lieu plus loin que cela du voisinage n'est pas celui de la route (« LFRS PAM LFBD » plaçait PAM à Tyndall, aux États-Unis, à 3 877 NM) : null, jamais le premier trouvé
          best = Array.isArray(near) && near.length === 2 && Number.isFinite(maxNm) && all[0] && all[0].distanceNm > maxNm ?
          undefined : all[0],
          place = x => ({
            lat: +x.item.lat,
            lon: +x.item.lon,
            name: x.item.name || x.item.id || x.item.icao || '',
            kind: x.kind,
            ...(x.local ? {
              local: true,
              source: x.source,
              fir: x.fir
            } : {})
          });
        if (!best) return null;
        // avec un voisinage : le plus proche, et les homonymes écartés (jamais « le premier trouvé »)
        return Array.isArray(near) && near.length === 2 && near.every(Number.isFinite) ? {
          ...place(best),
          zone: best.zone,
          distanceNm: best.distanceNm,
          homonyms: all.slice(1, 6).map(x => ({
            ...place(x),
            zone: x.zone,
            distanceNm: x.distanceNm
          }))
        } : place(best);
      },
      /** Où est ce nom, et si on ne le trouve pas, pourquoi (SOG-0142) : { found: <coords, avec near : le plus proche et ses homonymes écartés> | null, unknown?: { reason, zone?, via?, position? } }.
       *  Introuvable parmi les aérodromes, balises, points et VRP des zones publiées, le nom est cherché comme extrémité d'une voie aérienne publiée (une voie le nomme avec sa position) : `unknown.reason` est alors
       *  'zone-not-built' (la zone du pays où il se trouve n'est pas construite : `zone` est celle qu'on attend) ou 'no-points' (la zone est construite mais sans source de points : openAIP n'en porte pas) ; `via` : la voie qui le nomme ;
       *  `position` : { lat, lon } d'après la voie. Sinon 'not-found'. */
      async whereIs(ident, {
        near,
        all
      } = {}) {
        const found = await api.coords(ident, {
          near,
          all
        });
        if (found) return {
          found
        };
        const k = fold(ident),
          pub = (await published()).zones || {},
          outlines = await zoneOutlines().catch(() => ({}));
        for (const id of Object.keys(pub).sort()) {
          if (!(+(pub[id].kb?.[pub[id].cycles?.[pub[id].cycles.length - 1]]?.airways) > 1))
            continue; // zone sans voies : rien à y lire
          const z = await loadZone(id);
          if (!z) continue;
          for (const w of await part(z, 'airways'))
            for (const e of [w.a, w.b])
              if (e && fold(e.id) === k && num(e.lat) && num(e.lon)) {
                const at = zoneAt(+e.lat, +e.lon, outlines),
                  built = at && pub[at],
                  has = built && (+(pub[at].kb?.[pub[at].cycles?.[pub[at].cycles.length - 1]]?.points) > 1);
                return {
                  found: null,
                  unknown: {
                    reason: !at || !built ? 'zone-not-built' : has ? 'not-found' : 'no-points',
                    zone: at || null,
                    via: w.route || '',
                    position: {
                      lat: +e.lat,
                      lon: +e.lon
                    }
                  }
                };
              }
        }
        return {
          found: null,
          unknown: {
            reason: 'not-found'
          }
        };
      },
      /** Propositions de terrains pour une saisie (SOG-0158) : un code, le début d'un nom ou d'un mot de son nom (la ville : « stockholm » trouve « STOCKHOLM / BROMMA »), ou un PAYS (ses quatre noms, son endonyme et ses sigles : « suède », « sverige », « usa ») qui rend ses
       *  principaux terrains, les plus grands d'abord (piste en dur la plus longue). Lit seulement l'index léger des terrains de CHAQUE zone publiée (aeroindex : un dixième de aerodromes.json, 438 Ko pour les 71 zones), une fois, gardé en mémoire : aucune zone n'est ouverte en entier.
       *  → [{ code, name, lat, lon, zone, country, hardLen, type, rank }] (type : AD, AH, HP ou MIL : à rang égal les terrains civils (AD) passent avant les hélistations et les bases militaires ; rank : 0 code exact, 1 début de code, 2 pays, 3 début de nom, 4 début d'un mot du nom, 5 contient) ; n au plus (7 par défaut). `lang` : l'indice du nom du pays dans `country` (0 fr, 1 en, 2 de, 3 es). */
      async suggest(text, {
        n = 7,
        lang = 1
      } = {}) {
        const q = fold(text);
        if (q.length < 2) return [];
        const pub = (await published()).zones || {};
        if (nameIndex.p && now() - nameIndex.at > 300000) nameIndex.p =
          null; // une zone reconstruite change ses terrains : l'index est refait après cinq minutes
        if (!nameIndex.p) nameIndex.at = now();
        if (!nameIndex.p) nameIndex.p = (async () => {
          const out = [];
          for (const id of Object.keys(pub)) {
            const z = await loadZone(id).catch(() => null);
            if (!z) continue;
            const list = z.split ? await liteAerodromes(z).catch(() => []) : await part(z, 'aerodromes');
            for (const a of list || []) {
              if (!a?.icao && !a?.id) continue;
              const code = String(a.icao || a.id).toUpperCase();
              if (!/^[A-Z0-9]{3,4}$/.test(code) || !num(a.lat) || !num(a.lon)) continue;
              out.push({
                code,
                name: String(a.name || ''),
                fold: fold(a.name || ''),
                lat: +a.lat,
                lon: +a.lon,
                zone: id,
                hardLen: num(a.hardLen) ? +a.hardLen : 0,
                type: /^(AD|AH|HP|MIL)$/.test(String(a.type || '').toUpperCase()) ? String(a.type).toUpperCase() : 'AD'
              });
            }
          }
          return out;
        })();
        const all = await nameIndex.p,
          names = id => zones[id]?.n || [id, id, id, id],
          country = id => names(id)[Math.min(3, Math.max(0, lang))] || id,
          countries = Object.keys(zones).filter(id => pub[id] && [...names(id), ...(AKA[id] || [])].some(x => fold(x).startsWith(q))),
          out = [];
        const row = (a, rank) => ({
          code: a.code,
          name: a.name,
          lat: a.lat,
          lon: a.lon,
          zone: a.zone,
          country: country(a.zone),
          hardLen: a.hardLen,
          type: a.type,
          rank
        });
        for (const a of all) {
          let rank = -1;
          if (a.code === q.toUpperCase()) rank = 0;
          else if (a.code.startsWith(q.toUpperCase())) rank = 1;
          else if (countries.includes(a.zone) && /^[A-Z]{4}$/.test(a.code)) rank = 2;
          else if (a.fold.startsWith(q)) rank = 3;
          else if (a.fold.split(/[^A-Z0-9]+/).some(w => w.startsWith(q))) rank = 4;
          else if (q.length >= 3 && a.fold.includes(q)) rank = 5;
          if (rank >= 0) out.push(row(a, rank));
        }
        return out.sort((a, b) => a.rank - b.rank || (a.type === 'AD' ? 0 : 1) - (b.type === 'AD' ? 0 : 1) || b.hardLen - a.hardLen ||
          a.name.localeCompare(b.name)).slice(0, Math.max(1, Math
          .min(50, n)));
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
        reads: z.reads.map(r => r.absent ? `${r.kind} absent` : `${r.kind} ${(r.bytes / 1024).toFixed(0)} Ko ${r.ms} ms`),
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
    /** La couche sol d'un terrain (proc/ground/<OACI>.json, § 10.40) : le fichier du dépôt des données est une entrée NON FIABLE (chaque pilote peut y pousser) : copie bornée et nettoyée, jamais l'objet lu.
     *  Rend null si ce n'est pas un fichier « osm » de ce terrain ; sinon { icao, cycle, source, attribution, items } dont les éléments valides seuls restent (au plus 5 000 ; id « w123 » / « n45 », kind twy
     *  (ligne de 2 à 2 000 points) | park | hold (un point), nom de 16 signes au plus, sans signe de commande ni < > & " ', coordonnées finies dans le globe). */
    const GROUND_MAX = 5000,
      cleanGround = (k, v) => {
        if (!v || typeof v !== 'object' || v.icao !== k || v.source !== 'osm' || !Array.isArray(v.items)) return null;
        const pt = p => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 180 &&
          Math.abs(p[1]) <= 90 ? [p[0], p[1]] : null,
          text = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f-\u009f<>&"']/g, ' ').replace(/\s+/g, ' ').trim().slice(
            0, n) : '',
          items = [];
        for (const it of v.items.slice(0, GROUND_MAX)) {
          if (!it || typeof it !== 'object' || !['twy', 'park', 'hold', 'apron'].includes(it.kind) || typeof it.id !== 'string' || !
            /^[wn]\d{1,12}$/.test(it.id)) continue;
          const out = {
            id: it.id,
            kind: it.kind,
            name: text(it.name, 16)
          };
          if (it.kind === 'twy' || it.kind === 'apron') {
            const line = Array.isArray(it.line) ? it.line.slice(0, 2000).map(pt) : [];
            if (line.length < (it.kind === 'apron' ? 3 : 2) || line.includes(null)) continue;
            out.line = line;
            if (it.kind === 'apron') {
              const c = pt(it.point);
              if (!c) continue;
              out.point = c; // le centre de l'aire : où poser son nom
            }
          } else {
            if (it.kind === 'park' && it.gate === true) out.gate = true;
            const p = pt(it.point);
            if (!p) continue;
            out.point = p;
          }
          items.push(out);
        }
        return {
          icao: k,
          cycle: typeof v.cycle === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.cycle) ? v.cycle : null,
          source: 'osm',
          attribution: text(v.attribution, 120) || '© OpenStreetMap contributors, ODbL',
          items
        };
      },
      nameIndex = {
        p: null,
        at: 0
      }, // l'index des noms de terrains de toutes les zones publiées (suggest), construit une fois
      groundBusy = new Map(), // OACI → lecture de la couche sol en cours
      groundSt = new Map(), // OACI → { state: 'ok' | 'failed', reason?, message?, at } : le dernier résultat (groundStatus)
      groundLoad = {
        at: -Infinity
      },
      /** Garde le résultat d'une lecture du sol (ni un « à blanc » ni une annulation) et annonce l'échec : on('change', { ground, groundFailed: true }). */
      noteGround = (k, out) => {
        if (out?.ok === true && out.dry !== true) groundSt.set(k, {
          state: 'ok',
          at: now()
        });
        else if (out?.ok === false && out.reason !== 'cancelled') {
          groundSt.set(k, {
            state: 'failed',
            reason: String(out.reason || 'failed'),
            message: String(out.message || '').slice(0, 300),
            at: now(),
            ...(Number.isFinite(out.wait) ? {
              wait: out.wait
            } : {})
          });
          emit({
            ground: k,
            groundFailed: true
          });
        }
      },
      /** Les derniers résultats que le lanceur a gardés (travail ground/state, lecture seule) : pour un terrain sans résultat en mémoire (page rechargée) ; au plus une fois par minute, un lanceur occupé ou absent n'y change rien. */
      loadGroundState = async () => {
          if (typeof launcher?.job !== 'function' || !launcher.info?.() || launcher.info().lan || now() - groundLoad.at < 60000) return;
          groundLoad.at = now();
          const res = (await launcher.job('regen/job', {
            set: 'ground',
            verb: 'state',
            args: {}
          }).catch(() => null))?.result;
          if (res?.ok !== true || !res.aerodromes || typeof res.aerodromes !== 'object') return;
          for (const [k, v] of Object.entries(res.aerodromes).slice(0, 400)) {
            if (!/^[A-Z0-9]{4}$/.test(k) || !v || typeof v !== 'object' || groundSt.has(k)) continue;
            groundSt.set(k, v.ok === true ? {
              state: 'ok',
              at: String(v.at || '')
            } : {
              state: 'failed',
              reason: String(v.reason || 'failed').slice(0, 20),
              message: String(v.message || '').slice(0, 300),
              at: String(v.at || '')
            });
          }
        },
        /** La couche sol d'un terrain, lue à la suite de ses procédures (SOG-0135) si son fichier manque ou date d'avant le cycle en vigueur ; en arrière-plan : la réponse des procédures ne l'attend pas, un échec (lanceur occupé, rien dans OpenStreetMap, trop tôt) est sans suite. fetchGround dit le changement (on('change', { ground })). */
        readGroundAfter = k => {
          (async () => {
            const had = await api.ground(k).catch(() => null),
              current = window.AeroAirac?.cycleOf?.(now())?.date || '';
            if (had?.cycle && had.cycle >= current) return; // le fichier du cycle en vigueur : rien à relire
            await api.fetchGround(k);
          })().catch(() => {});
        },
        fraLocal = {
          p: null,
          failedAt: -Infinity
        },
        /** Les points du classeur FRA d'EUROCONTROL en vigueur, lus sur CE poste par le lanceur (travail route/fra-points, SOG-0153) et gardés en mémoire seulement : { cycle, by: Map(identifiant → [{ id, lat, lon, fir }]) }, ou null (sans lanceur, appareil du réseau local,
         *  classeur non importé, lanceur occupé : redemandé au plus une fois par 30 s). Jamais écrit, jamais exporté : licence EUROCONTROL (usage de la compagnie), ces points ne sont pas dans la base publiée. */
        fraPoints = () => {
          if (fraLocal.p) return fraLocal.p;
          if (typeof launcher?.job !== 'function' || !launcher.info?.() || launcher.info().lan || now() - fraLocal.failedAt < 30000)
            return Promise.resolve(null);
          fraLocal.p = (async () => {
            const res = (await launcher.job('regen/job', {
              set: 'route',
              verb: 'fra-points',
              args: {}
            }))?.result;
            if (res?.ok !== true || !Array.isArray(res._points)) throw new Error('no FRA points');
            const by = new Map();
            for (const x of res._points.slice(0, 30000)) {
              if (!Array.isArray(x) || typeof x[0] !== 'string' || !/^[A-Za-z0-9]{1,7}$/.test(x[0]) || !num(x[1]) || !num(x[2]))
                continue;
              const key = fold(x[0]);
              if (!by.has(key)) by.set(key, []);
              by.get(key).push({
                id: x[0],
                lat: +x[1],
                lon: +x[2],
                fir: String(x[3] || '').slice(0, 4)
              });
            }
            return {
              cycle: /^\d{4}-\d{2}-\d{2}$/.test(res.cycle) ? res.cycle : null,
              by
            };
          })().catch(() => {
            fraLocal.p = null;
            fraLocal.failedAt = now();
            return null;
          });
          return fraLocal.p;
        },
        /** Le point FRA de ce nom, à défaut de tout lieu des zones publiées : [{ kind: 'point', item, zone: 'fra', local: true, source: 'eurocontrol-fra', fir, cycle, distanceNm? }] — `local` : lu sur ce poste, pas dans la base publiée. */
        xpLocal = {
          p: null,
          failedAt: -Infinity
        },
        /** Les points du dossier d'X-Plane de l'utilisateur (option `xplane`), en mémoire : Map(identifiant → [{ id, lat, lon }]) ou null ; redemandé au plus une fois par 30 s après un échec. Jamais écrit, jamais exporté (Navigraph / Jeppesen). */
        xplanePoints = () => {
          if (xpLocal.p) return xpLocal.p;
          if (typeof xplane?.points !== 'function' || now() - xpLocal.failedAt < 30000) return Promise.resolve(null);
          xpLocal.p = (async () => {
            const rows = await xplane.points();
            if (!Array.isArray(rows)) throw new Error('no X-Plane points');
            const by = new Map();
            for (const x of rows.slice(0, 400000)) {
              if (!Array.isArray(x) || typeof x[0] !== 'string' || !/^[A-Za-z0-9]{1,7}$/.test(x[0]) || !num(x[1]) || !num(x[2]))
                continue;
              const key = fold(x[0]);
              if (!by.has(key)) by.set(key, []);
              by.get(key).push({
                id: x[0],
                lat: +x[1],
                lon: +x[2]
              });
            }
            return by;
          })().catch(() => {
            xpLocal.p = null;
            xpLocal.failedAt = now();
            return null;
          });
          return xpLocal.p;
        },
        /** Le point d'un identifiant dans l'une des couches LOCALES, dans cet ordre : le classeur FRA d'EUROCONTROL, puis le dossier d'X-Plane ; jamais dans la base publiée (SOG-0153 a, e). */
        fraItems = async (k, near) => {
          const f = await fraPoints(),
            list = f?.by.get(k);
          if (!list) {
            const xp = (await xplanePoints())?.get(k);
            return xp ? xp.map(x => ({
              kind: 'point',
              item: {
                id: x.id,
                lat: x.lat,
                lon: x.lon,
                name: x.id
              },
              zone: 'xplane',
              local: true,
              source: 'xplane',
              ...(near ? {
                distanceNm: Math.round(distNm(near, [x.lat, x.lon]) * 10) / 10
              } : {})
            })).sort((a, b) => (a.distanceNm ?? 0) - (b.distanceNm ?? 0)) : [];
          }
          return list.map(x => ({
            kind: 'point',
            item: {
              id: x.id,
              lat: x.lat,
              lon: x.lon,
              name: x.id
            },
            zone: 'fra',
            local: true,
            source: 'eurocontrol-fra',
            fir: x.fir,
            cycle: f.cycle,
            ...(near ? {
              distanceNm: Math.round(distNm(near, [x.lat, x.lon]) * 10) / 10
            } : {})
          })).sort((a, b) => (a.distanceNm ?? 0) - (b.distanceNm ?? 0));
        };
    const procWatch = async paths => {
      let index = false;
      const icaos = new Set();
      for (const p of paths || []) {
        const m = PROC_FILE.exec(p);
        if (!m || reading.has(p) || !(!revs.has(p) || await changedRev(p)))
          continue; // (reading : l'arrivée d'un fichier que nous lisons)
        if (m[1] === 'index') index = true;
        else icaos.add(m[1]);
      }
      if (!index && !icaos.size) return;
      dropCoverage();
      if (icaos.size > 50) dropProc(); // un cycle publié : tous les terrains ; sinon seulement ceux dont le fichier a changé
      else icaos.forEach(dropProc);
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
    // le dossier de « personnel » est sous pilot/<trigramme>/ : sa flotte changée ; et un changement de compagnie (événement du cadre) : le registre est relu à la prochaine demande
    reader.watch?.('pilot/', paths => {
      if (!aircraftP || aircraftBusy || !(paths || []).some(p => /^pilot\/[^/]+\/airline\/perso\/fleet\.json$/.test(p))) return;
      aircraftP = null;
      registry = null;
      emit({
        aircraft: true
      });
    });
    if (typeof window.addEventListener === 'function') window.addEventListener('frame-data-airline', () => {
      if (aircraftBusy) fleetMoved = true;
      if (!aircraftP || aircraftBusy) return;
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
    // .lnmperf : aucun passage tout seul (lnmAuto faux par défaut) ; le service reste à la demande (api.lnmperf(), la carte des Réglages, « Synchroniser maintenant »).
    // Avec lnmAuto vrai (un essai) : passages automatiques seulement avec une couche de données qui écrit, et quand un lanceur sert la page (il lui faut /__setup/lnmperf)
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
    }],
    // routes du lanceur appelées par aerodb (frame/INTEGRATION.md § 15.1) : le travail des lectures de procédures ; le cadre
    // en fait le travail donné à create({ launcher }) (les fiches .lnmperf passent par le client du cadre lui-même)
    launcher: {
      routes: ['regen/job', 'regen/job/cancel']
    }
  });

  window.AeroDB = {
    create,
    fetchReader,
    airacCycles,
    vfrParts,
    literal,
    zoneFrame,
    CYCLED_ZONES,
    declaration
  };
})();
