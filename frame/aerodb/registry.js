(() => {
  'use strict';
  // V3 aerodb — registre des aéronefs (frame/aerodb/SPEC.md § 5 bis) : toutes les données d'aéronefs au même endroit.
  //   · quatre sortes d'entrées : les fiches de performances (aircraft/sheets/<id>.json, maîtresses ; celles de la V2,
  //     planner/flight_performance_database_merged.fpdb.json, adoptées en lecture), les appareils (immatriculation :
  //     flotte airline/fleet.json, sinon references/aircraft_fleet.js de la V2 ; référence references/defa_reference.js
  //     pour les immatriculations absentes), les types OACI publiés (catalogue, aircraft.js), le code libre ;
  //   · chaque champ porte son origine et sa date ; la plus récente gagne, l'autre valeur est gardée (_kept) ;
  //   · une recherche : fiches → flotte → référence → types → code libre, chacune avec son origine ;
  //   · une fiche décrit un type ou une variante, jamais un appareil (V3 § 10.35, L0) : identifiant C30J (la base du type) ou
  //     C30J-<VARIANTE> ([A-Z0-9-], unique, validé ici) ; une fiche ancienne qui porte une immatriculation est lue comme la
  //     variante « TYPE · F-XXXX » de cet appareil (_variant), rien perdu ni caché ;
  //   · un appareil prend la fiche que nomme son entrée de flotte (sheetId, schéma 2 de airline/fleet.json), sinon (schéma 1)
  //     la variante ancienne de son immatriculation, sinon la fiche de son type (la base d'abord, alias suivis), sinon
  //     l'estimation du type.
  // Les fichiers V2 (.js) sont lus comme des littéraux (« let data = {…}; »), jamais exécutés. Aucun texte d'interface.
  // API : window.AeroDBRegistry = { create({ reader, catalog, now, raw }) → registre, readAll(reader) (toutes les sources
  //   lues en parallèle, à passer en raw), mergeSheets, stamp, whenOf, PATHS }.
  if (window.AeroDBRegistry) return;
  const PATHS = {
    sheets: 'aircraft/sheets/',
    fpdb: 'planner/flight_performance_database_merged.fpdb.json',
    fleet: 'airline/fleet.json',
    fleetV2: 'references/aircraft_fleet.js',
    reference: 'references/defa_reference.js'
  };
  const KEPT = 5; // valeurs écartées gardées par champ
  const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  const regOf = r => String(r ?? '').toUpperCase().replace(/\s+/g, '');
  // identifiants de fiche (V3 § 10.35) : la base d'un type (son code OACI) ou une de ses variantes (code, tiret, majuscules,
  // chiffres et tirets) ; les identifiants anciens (DB_…, SB_…) restent lus tels quels
  const BASE_ID = /^[A-Z][A-Z0-9]{1,3}$/,
    VARIANT_ID = /^([A-Z][A-Z0-9]{1,3})-([A-Z0-9]+(?:-[A-Z0-9]+)*)$/;
  /** Immatriculation d'une fiche ancienne (champ registration, d'avant § 10.35) ; '' sinon. */
  const legacyReg = s => regOf(s?.registration);
  /** Type d'une fiche (son code OACI) : icao, sinon type, sinon le code de son identifiant. */
  const typeOfSheet = s => fold(s?.icao || s?.type || (BASE_ID.test(s?.id) ? s.id : VARIANT_ID.exec(s?.id || '')?.[1]) || '');
  /** Vérifie l'identifiant d'une fiche nouvelle : '' s'il convient ; sinon 'format' (ni C30J ni C30J-VARIANTE), 'type' (son
   *  code n'est pas le type de la fiche) ou 'taken' (déjà pris). */
  function checkId(id, type = '', taken = () => false) {
    const m = BASE_ID.test(id) ? [id, id] : VARIANT_ID.exec(String(id ?? ''));
    if (!m) return 'format';
    if (type && fold(type) !== m[1]) return 'type';
    return taken(id) ? 'taken' : '';
  }
  /** Lecture d'une fiche comme base ou variante : { of: type, base, label, registration? } ; une fiche ancienne qui porte
   *  une immatriculation est la variante « TYPE · F-XXXX » ; une fiche C30J-X, la variante X de C30J (son nom pour libellé). */
  function variantOf(s) {
    const type = typeOfSheet(s),
      reg = legacyReg(s),
      v = VARIANT_ID.exec(s?.id || '');
    if (reg) return {
      of: type,
      base: false,
      label: `${type || '?'} · ${reg}`,
      registration: reg
    };
    if (v) return {
      of: v[1],
      base: false,
      label: s.name || `${v[1]} · ${v[2]}`
    };
    return {
      of: type,
      base: true,
      label: s?.name || s?.id || type
    };
  }
  /** Pose la lecture de variante (_variant, propriété non énumérable : jamais écrite ni copiée) sur une fiche lue ; la rend. */
  const annotate = s => {
    if (s && typeof s === 'object') Object.defineProperty(s, '_variant', {
      value: variantOf(s),
      configurable: true,
      enumerable: false,
      writable: true
    });
    return s;
  };
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  /** Valeur d'une réponse du lecteur (value analysée, sinon text). */
  const valueOf = r => {
    if (!r) return null;
    if (r.value !== undefined && typeof r.value !== 'string') return r.value;
    try {
      return JSON.parse(r.text ?? r.value);
    } catch {
      return null;
    }
  };
  const textOf = r => r ? typeof r.value === 'string' ? r.value : r.text ?? '' : '';
  /** Littéral de données d'un fichier .js de la V2 (« let data = {…}; » et « const META = {…}; ») ; null sinon. */
  function v2File(text) {
    const d = /let data = (\{[\s\S]*?\n\});/.exec(text || ''),
      m = /const META = (\{.*?\});/.exec(text || '');
    try {
      return d ? {
        data: JSON.parse(d[1]),
        meta: m ? JSON.parse(m[1]) : {}
      } : null;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------- fiches : champs, origine, fusion
  const NOT_FIELDS = new Set(['id', 'updated_at', 'updatedAt', '_fields', '_kept', 'mergedProfileIds']);
  /** Champs d'une fiche à plat : { « cruise.tasKt » : valeur } (objets parcourus ; listes et valeurs simples en feuilles ;
   *  identifiant, dates et champs « _ » à part). */
  function leaves(o, pre = '', out = {}) {
    for (const [k, v] of Object.entries(o || {})) {
      if (!pre && NOT_FIELDS.has(k)) continue;
      if (k.startsWith('_')) continue;
      const path = pre + k;
      if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, `${path}.`, out);
      else if (v !== undefined) out[path] = v;
    }
    return out;
  }

  function setPath(o, path, v) {
    const ks = path.split('.');
    let x = o;
    for (const k of ks.slice(0, -1)) x = x[k] && typeof x[k] === 'object' && !Array.isArray(x[k]) ? x[k] : (x[k] = {});
    if (v === undefined) delete x[ks[ks.length - 1]];
    else x[ks[ks.length - 1]] = v;
  }
  /** Date d'une fiche (ms) : la plus récente de ses dates (mise à jour, import, OFP, calibration) ; 0 sans date. */
  function whenOf(p) {
    const d = v => Date.parse(v || '') || 0;
    return Math.max(d(p?.updated_at), d(p?.updatedAt), d(p?.source?.importedAt), d(p?.simbriefSnapshot?.fetchedAt), d(p?.calibration
      ?.at), d(p?.calibration?.appliedAt));
  }
  const iso = ms => new Date(ms || 0).toISOString();
  /** Date et origine d'un champ d'une fiche : son tampon (_fields), sinon la date de la fiche et l'origine donnée. */
  const fieldStamp = (p, k, fallback = 'v2') => p?._fields?.[k] || {
    at: iso(whenOf(p)),
    source: fallback
  };
  /** Fiche next tamponnée par rapport à old : chaque champ changé reçoit { at, source } dans _fields, sa valeur
   *  précédente va dans _kept (les KEPT dernières) ; dates updated_at et updatedAt posées. */
  function stamp(old, next, source = 'edit', at = new Date().toISOString()) {
    const a = leaves(old),
      b = leaves(next),
      fields = {
        ...(old?._fields || {}),
        ...(next?._fields || {})
      },
      kept = clone(old?._kept || {});
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (same(a[k], b[k])) continue;
      fields[k] = {
        at,
        source
      };
      if (k in a) kept[k] = [{
        value: a[k],
        ...fieldStamp(old, k)
      }, ...(kept[k] || [])].slice(0, KEPT);
    }
    return {
      ...clone(next),
      _fields: fields,
      _kept: kept,
      updated_at: at,
      updatedAt: at
    };
  }
  /** Fusion de deux versions d'une fiche, champ par champ (règle du cadre pour aircraft/sheets/ : (base, local, distant)
   *  → { value, lost }) : pour chaque champ, la version dont le tampon est le plus récent gagne ; la valeur perdante va
   *  dans _kept ; lost : la version perdante entière si un même champ a deux valeurs différentes (conflit signalé). */
  function mergeSheets(base, local, remote) {
    if (!local || !remote) return {
      value: local || remote,
      lost: null
    };
    const L = leaves(local),
      R = leaves(remote),
      out = clone(remote),
      fields = {},
      kept = clone(remote._kept || {});
    for (const [k, v] of Object.entries(local._kept || {})) kept[k] = [...(kept[k] || []), ...v].filter((x, i, a) => a.findIndex(y =>
      same(
        y, x)) === i).slice(0, KEPT);
    let conflict = false,
      newest = 0;
    for (const k of new Set([...Object.keys(L), ...Object.keys(R)])) {
      const sl = fieldStamp(local, k, 'local'),
        sr = fieldStamp(remote, k, 'remote'),
        useLocal = !(k in R) || ((k in L) && (Date.parse(sl.at) || 0) >= (Date.parse(sr.at) || 0)),
        win = useLocal ? L[k] : R[k],
        lose = useLocal ? R[k] : L[k],
        ws = useLocal ? sl : sr;
      setPath(out, k, clone(win));
      fields[k] = ws;
      newest = Math.max(newest, Date.parse(ws.at) || 0);
      if ((k in L) && (k in R) && !same(L[k], R[k])) {
        conflict = true;
        kept[k] = [{
          value: lose,
          ...(useLocal ? sr : sl)
        }, ...(kept[k] || [])].slice(0, KEPT);
      }
    }
    const at = iso(Math.max(newest, whenOf(local), whenOf(remote)));
    return {
      value: {
        ...out,
        id: local.id || remote.id,
        _fields: fields,
        _kept: kept,
        updated_at: at,
        updatedAt: at
      },
      lost: conflict ? remote : null,
      side: 'mixed'
    };
  }
  /** Fiche de la V2 vue comme tamponnée : chaque champ porte la date de la fiche et l'origine « v2 ». */
  function fromV2(p) {
    const at = iso(whenOf(p));
    return {
      ...clone(p),
      _fields: Object.fromEntries(Object.keys(leaves(p)).map(k => [k, {
        at,
        source: 'v2'
      }]))
    };
  }
  /** Fiche sans ses champs de registre (miroir V2). */
  const plain = p => Object.fromEntries(Object.entries(p || {}).filter(([k]) => k !== '_fields' && k !== '_kept'));
  /** Nom de fichier d'une fiche (identifiant gardé dans la fiche). */
  const fileOf = id => `${PATHS.sheets}${String(id).replace(/[^A-Za-z0-9._-]/g, '_')}.json`;

  /** Lecture d'une source du registre (références en « reference », le reste en « document ») ; null si absente. */
  const readOne = (reader, path) => reader.read(path, {
    policy: path.startsWith('references/') ? 'reference' : 'document',
    wait: true
  }).catch(() => null);
  /** Toutes les sources du registre lues en parallèle, sans rien interpréter : la liste des fiches (arbre en mémoire) puis
   *  chacune, la base partagée de la V2, la flotte, la référence, et la flotte de la V2 quand l'arbre dit que
   *  airline/fleet.json manque (sans arbre : lue à la demande). Lancées par aerodb dès que ce fichier est chargé, en même
   *  temps que la base des types : sur un réseau lent, une attente au lieu de six. */
  async function readAll(reader) {
    const listP = reader.list ? reader.list(PATHS.sheets).catch(() => null) : Promise.resolve(null),
      airline = reader.list ? reader.list('airline/').catch(() => null) : Promise.resolve(null),
      one = p => readOne(reader, p);
    const [paths, aPaths] = await Promise.all([listP, airline]),
      noFleet = Array.isArray(aPaths) && !aPaths.includes(PATHS.fleet),
      [own, fpdb, fleet, reference, fleetV2] = await Promise.all([
        Promise.all((paths || []).filter(x => /\.json$/i.test(x)).map(p => one(p).then(r => [p, valueOf(r)]))),
        one(PATHS.fpdb),
        noFleet ? null : one(PATHS.fleet),
        one(PATHS.reference),
        noFleet ? one(PATHS.fleetV2) : null
      ]);
    return {
      own,
      fpdb,
      fleet,
      reference,
      fleetV2
    };
  }

  function create({
    reader,
    catalog,
    now = () => Date.now(),
    raw = null // promesse de readAll(reader) lancée d'avance (aerodb), sinon lue au premier load()
  } = {}) {
    // recherche des types du catalogue, prise avant qu'aerodb ne donne sa propre search au catalogue (sinon elle
    // s'appellerait elle-même)
    const typeSearch = catalog?.search;
    const read = path => reader.read(path, {
      policy: path.startsWith('references/') ? 'reference' : 'document',
      wait: true
    }).catch(() => null);
    let loadP = null,
      rawP = raw || null; // lectures lancées d'avance par aerodb (readAll), prises par le premier load()

    // ---------------------------------------------------------------- lecture de toutes les sources
    function load() {
      return loadP ||= (async () => {
        // toutes les sources lues d'un coup (readAll), puis interprétées
        const R = await (rawP || readAll(reader));
        rawP = null;
        // fiches : les siennes (aircraft/sheets/), puis celles de la V2 adoptées ou fusionnées
        const own = new Map();
        for (const [p, s] of R.own)
          if (s?.id) own.set(String(s.id), {
            sheet: s,
            path: p
          });
        const fpdb = valueOf(R.fpdb),
          sheets = new Map();
        for (const [id, x] of own) sheets.set(id, {
          sheet: x.sheet,
          own: true
        });
        for (const p of Array.isArray(fpdb?.profiles) ? fpdb.profiles : []) {
          if (!p?.id) continue;
          const id = String(p.id),
            mine = sheets.get(id);
          // V2 plus récente sur un champ : fusionnée au passage (écrite à la prochaine modification)
          sheets.set(id, mine ? {
            sheet: mergeSheets(null, mine.sheet, fromV2(p)).value,
            own: true
          } : {
            sheet: fromV2(p),
            own: false
          });
        }
        // appareils : flotte (airline/fleet.json, sinon la V2), puis référence pour les immatriculations absentes
        const fleetDoc = valueOf(R.fleet),
          v2 = fleetDoc?.aircraft?.length ? null : v2File(textOf(R.fleetV2 || await readOne(reader, PATHS.fleetV2))),
          rows = fleetDoc?.aircraft?.length ? fleetDoc.aircraft : v2?.data?.rows || [],
          fleetAt = fleetDoc?.updated_at || v2?.meta?.updatedAt || '',
          fleetSrc = fleetDoc?.aircraft?.length ? 'fleet' : 'fleet-v2',
          aircraft = new Map();
        for (const r of rows) {
          const reg = regOf(r.registration);
          if (!reg) continue;
          const at = r.locationAt || fleetAt,
            e = {
              key: reg,
              registration: reg,
              origin: {},
              sources: [fleetSrc]
            };
          for (const k of ['type', 'variant', 'operator', 'base', 'tacticalNumber', 'number', 'operational', 'location']) {
            const v = k === 'type' ? catalog?.canonical?.(r.type) || r.type : r[k];
            if (v !== undefined && v !== '') {
              e[k] = v;
              e.origin[k] = {
                source: fleetSrc,
                at
              };
            }
          }
          e.callsigns = [...new Set((r.callsigns || (r.callsign ? [r.callsign] : [])).map(c => String(c).toUpperCase()))];
          // schéma 2 (modules/aircraft/SPEC) : la fiche que l'appareil instancie ; vide, l'estimation du type ; absente
          // (schéma 1), la règle d'avant (sheetFor)
          if (Object.hasOwn(r, 'sheetId')) e.sheetId = String(r.sheetId ?? '');
          aircraft.set(reg, e);
        }
        const ref = v2File(textOf(R.reference));
        for (const r of ref?.data?.aircraft || []) {
          const reg = regOf(r.registration);
          if (!reg || /^\d+$/.test(reg)) continue; // numéros purs (« 1 », « 110 ») : pas des immatriculations
          const at = r.last || ref.meta?.updatedAt || '',
            e = aircraft.get(reg) || {
              key: reg,
              registration: reg,
              origin: {},
              sources: [],
              callsigns: []
            };
          for (const [k, v0] of [
              ['type', r.type],
              ['variant', r.variant],
              ['fleetId', r.fleetId],
              ['lastAd', r.lastAd],
              ['homeAd', r.homeAd]
            ]) {
            const v = k === 'type' ? catalog?.canonical?.(v0) || v0 : v0;
            if (v === undefined || v === '') continue;
            // la plus récente gagne ; la base de la flotte reste (règle de la V2)
            if (e[k] === undefined || (e.origin[k]?.source !== 'fleet' && (e.origin[k]?.at || '') < at)) {
              e[k] = v;
              e.origin[k] = {
                source: 'reference',
                at
              };
            }
          }
          e.callsigns = [...new Set([...e.callsigns, ...(r.callsigns || []).map(c => String(c).toUpperCase())])];
          if (!e.sources.includes('reference')) e.sources.push('reference');
          aircraft.set(reg, e);
        }
        for (const x of sheets.values()) annotate(x.sheet);
        return {
          sheets,
          aircraft,
          fpdb
        };
      })();
    }

    // ---------------------------------------------------------------- appareils, fiches, recherche
    /** Vrai si une fiche donne un devis : un débit connu (croisière, ou une ligne de sa table RPM). */
    const quotable = s => +s?.cruise?.fuelFlowPerHour > 0 || (s?.rpmFuelCurve || []).some(r => +r?.fuelFlowPerHour > 0);
    /** Fiche d'un appareil pour le devis (V3 § 10.35). Schéma 2 de la flotte (sheetId présent) : la fiche qu'il nomme si elle
     *  donne un devis (via 'fleet'), sinon l'estimation du type (sheetId vide, fiche absente ou sans débit) ; jamais une autre
     *  fiche. Schéma 1 (sans sheetId), comme avant : la variante ancienne qui porte son immatriculation si elle donne un devis
     *  (via 'own'), sinon la fiche de son type qui en donne un (la base C30J d'abord, puis une fiche du type sans
     *  immatriculation, puis n'importe laquelle, alias suivis ; via 'type'), sinon null (estimation). own : la fiche liée à
     *  l'appareil, même incomplète. */
    function sheetFor(state, e) {
      const list = [...state.sheets.values()].map(x => x.sheet),
        schema2 = typeof e.sheetId === 'string',
        linked = schema2 && e.sheetId ? state.sheets.get(e.sheetId)?.sheet || null : null,
        mine = schema2 ? linked : list.find(s => e.registration && legacyReg(s) === e.registration) || null;
      if (mine && quotable(mine)) return {
        sheet: mine,
        via: schema2 ? 'fleet' : 'own',
        own: mine
      };
      if (schema2) return {
        sheet: null,
        via: 'estimate',
        own: mine
      };
      const type = e.type || catalog?.canonical?.(mine?.icao || mine?.type) || mine?.icao || mine?.type || '',
        codes = new Set(catalog?.related?.(type) || [fold(type)]),
        ofType = s => s !== mine && quotable(s) && codes.has(catalog?.canonical?.(s.icao || s.type) || fold(s.icao || s.type)),
        byType = list.find(s => ofType(s) && BASE_ID.test(s.id) && !legacyReg(s)) || list.find(s => ofType(s) && !legacyReg(s)) || list
        .find(ofType);
      return byType ? {
        sheet: byType,
        via: 'type',
        own: mine
      } : {
        sheet: null,
        via: 'estimate',
        own: mine
      };
    }
    /** Appareil du registre (immatriculation) avec sa fiche ; null s'il est inconnu. */
    async function resolve(registration) {
      const st = await load(),
        e = st.aircraft.get(regOf(registration));
      if (!e) return null;
      const s = sheetFor(st, e);
      return {
        ...e,
        sheetId: s.sheet?.id || '',
        sheetVia: s.via,
        ownSheetId: s.own?.id || '',
        estimate: s.sheet ? null : catalog?.estimate?.(e.type || s.own?.icao || s.own?.type) || null
      };
    }
    /** Fiche choisie pour le vol courant : { sheetId, type, registration, callsign, name, source } (schéma de fuel). */
    function aircraftOf(hit) {
      return {
        sheetId: hit.sheetId || '',
        type: hit.type || '',
        registration: hit.registration || '',
        callsign: hit.callsign || '',
        name: hit.name || '',
        source: hit.source
      };
    }
    /** Ligne d'un appareil (immatriculation) : sa fiche à lui, la flotte et la référence fusionnées champ par champ
     *  (la fiche d'abord, origine de chaque champ dans origin) ; sheetId : la fiche qui donne le devis (la sienne, sinon
     *  celle du type ; vide : estimation du type). */
    function aircraftRow(st, e, own) {
      const s = sheetFor(st, e || {
          registration: legacyReg(own),
          type: ''
        }),
        mine = s.own || own || null,
        pick = (k, sheetVal, other, otherSrc) => sheetVal ? [sheetVal, 'sheet'] : other ? [other, otherSrc] : ['', ''],
        src = e?.sources?.some(x => x.startsWith('fleet')) ? 'fleet' : e ? 'reference' : 'sheet',
        [type, tSrc] = pick('type', mine && (catalog?.canonical?.(mine.icao || mine.type) || mine.icao || mine.type), e?.type, e?.origin
          ?.type
          ?.source || src),
        // l'indicatif est celui de l'appareil (flotte, référence) ; celui d'une fiche ancienne seulement à défaut (§ 10.35)
        [callsign, cSrc] = e?.callsigns?.[0] ? [e.callsigns[0], src] : pick('callsign', mine?.callsign, '', src),
        [name, nSrc] = pick('name', mine?.name, e?.variant || e?.type, src),
        reg = e?.registration || legacyReg(mine);
      return {
        kind: 'aircraft',
        source: mine ? 'sheet' : src,
        key: `reg:${reg}`,
        label: [reg, name || type, callsign].filter(Boolean).join(' — '),
        sheetId: s.sheet?.id || '',
        sheetVia: s.via,
        ownSheetId: mine?.id || '',
        type,
        registration: reg,
        callsign,
        name: name || type || reg,
        origin: {
          type: tSrc,
          callsign: cSrc,
          name: nSrc,
          sheet: s.via
        },
        sources: [...new Set([...(mine ? ['sheet'] : []), ...(e?.sources || [])])]
      };
    }
    /** Une recherche sur toutes les sources, une ligne par immatriculation (fiche, flotte et référence fusionnées), dans
     *  l'ordre appareils à fiche → fiches de type → flotte → référence → types → code libre ; texte vide : fiches puis
     *  flotte. Chaque résultat : { kind, source, key, label, sheetId, type, registration, callsign, name } (et pour un
     *  appareil sheetVia, ownSheetId, origin). */
    async function search(text = '', n = 30) {
      const st = await load(),
        q = fold(text),
        has = (...vs) => !q || vs.some(v => fold(v).includes(q)),
        out = [],
        withSheet = [],
        typeSheets = [];
      for (const {
          sheet: s
        }
        of st.sheets.values()) {
        const reg = legacyReg(s),
          e = reg ? st.aircraft.get(reg) : null;
        if (!has(s.id, s.name, s.icao, s.type, s.registration, s.callsign, e?.type, e?.variant, ...(e?.callsigns || []))) continue;
        // variante ancienne d'un appareil : une seule ligne avec la flotte et la référence ; base ou variante : sa ligne
        if (reg) withSheet.push(aircraftRow(st, e, s));
        else typeSheets.push({
          kind: 'sheet',
          source: 'sheet',
          key: `sheet:${s.id}`,
          label: [s._variant?.label || s.name || s.id, s.icao || s.type].filter(Boolean).join(' — '),
          sheetId: s.id,
          type: catalog?.canonical?.(s.icao || s.type) || s.icao || s.type || '',
          registration: '',
          callsign: s.callsign || '',
          name: s.name || s.id
        });
      }
      out.push(...withSheet, ...typeSheets);
      const done = new Set(withSheet.map(r => r.registration));
      for (const src of ['fleet', 'reference']) {
        for (const e of st.aircraft.values()) {
          const fromFleet = e.sources.some(x => x.startsWith('fleet'));
          if ((src === 'fleet') !== fromFleet || done.has(e.registration)) continue;
          if (!has(e.registration, e.type, e.variant, e.number, e.tacticalNumber, ...e.callsigns)) continue;
          out.push(aircraftRow(st, e, null));
        }
      }
      if (q.length >= 2)
        for (const t of typeSearch?.(text, n) || []) out.push({
          kind: 'type',
          source: 'type',
          key: `type:${t.code}`,
          label: t.label,
          sheetId: '',
          type: t.code,
          registration: '',
          callsign: '',
          name: t.label
        });
      if (/^[A-Z0-9]{2,4}$/.test(q) && !out.some(r => r.kind === 'type' && r.type === q)) out.push({
        kind: 'free',
        source: 'free',
        key: `free:${q}`,
        label: q,
        sheetId: '',
        type: q,
        registration: '',
        callsign: '',
        name: q
      });
      return out.slice(0, n);
    }

    // ---------------------------------------------------------------- fiches : lecture et écriture
    const sheets = {
      /** Fiches, les plus récentes d'abord : [fiche] (avec _fields, _kept). */
      async list() {
        return [...(await load()).sheets.values()].map(x => x.sheet).sort((a, b) => whenOf(b) - whenOf(a));
      },
      async get(id) {
        return (await load()).sheets.get(String(id))?.sheet || null;
      },
      /** Origine et date de chaque champ, valeurs écartées : { chemin: { at, source, kept: [...] } }. */
      async origins(id) {
        const s = await sheets.get(id);
        if (!s) return {};
        return Object.fromEntries(Object.keys(leaves(s)).map(k => [k, {
          ...fieldStamp(s, k),
          kept: s._kept?.[k] || []
        }]));
      },
      /** Enregistre une fiche : champs changés tamponnés (source : edit, chatgpt, eurocontrol, simbrief, ofp, import,
       *  lnmperf…), aircraft/sheets/<id>.json écrit, miroir dans le fpdb.json de la V2 (updated_at et updatedAt) ;
       *  kept : { chemin: [{ value, at, source }] } ajoutés aux valeurs gardées. */
      async put(next, {
        source = 'edit',
        kept = null
      } = {}) {
        if (!next?.id) throw new Error('aerodb: sheet without id');
        if (typeof reader.put !== 'function') throw new Error('aerodb: the reader cannot write');
        const st = await load(),
          id = String(next.id),
          old = st.sheets.get(id)?.sheet || null,
          at = new Date(now()).toISOString();
        // une fiche nouvelle : identifiant C30J ou C30J-VARIANTE de son type, libre ; une fiche existante garde le sien
        const bad = old ? '' : checkId(id, typeOfSheet({
          ...next,
          id: ''
        }), x => st.sheets.has(x));
        if (bad) throw Object.assign(new Error(`aerodb: sheet id ${id} refused (${bad})`), {
          code: `sheet-id-${bad}`
        });
        const s = stamp(old, next, source, at);
        // valeurs écartées venues d'ailleurs (ex. un fichier .lnmperf plus ancien) : gardées comme les autres
        for (const [k, v] of Object.entries(kept || {})) s._kept[k] = [...[].concat(v), ...(s._kept[k] || [])].slice(0, KEPT);
        await reader.put(fileOf(id), s);
        const doc = clone(st.fpdb) || {
            schema: 'flight-performance-db/v1',
            profiles: []
          },
          i = (doc.profiles ||= []).findIndex(p => String(p?.id) === id);
        if (i >= 0) doc.profiles[i] = plain(s);
        else doc.profiles.push(plain(s));
        await reader.put(PATHS.fpdb, doc);
        st.sheets.set(id, {
          sheet: annotate(s),
          own: true
        });
        st.fpdb = doc;
        return s;
      },
      /** Retire une fiche (son fichier et son entrée du fpdb). */
      async remove(id) {
        if (typeof reader.remove !== 'function') throw new Error('aerodb: the reader cannot write');
        const st = await load(),
          key = String(id);
        if (st.sheets.get(key)?.own) await reader.remove(fileOf(key));
        if (st.fpdb?.profiles?.some(p => String(p?.id) === key)) {
          const doc = clone(st.fpdb);
          doc.profiles = doc.profiles.filter(p => String(p?.id) !== key);
          await reader.put(PATHS.fpdb, doc);
          st.fpdb = doc;
        }
        st.sheets.delete(key);
      },
      fileOf,
      /** Identifiant d'une fiche nouvelle : '' s'il convient, sinon 'format', 'type' ou 'taken' (checkId). */
      async checkId(id, type = '') {
        const st = await load();
        return checkId(String(id ?? ''), type, x => st.sheets.has(x));
      },
      /** Identifiant libre pour une fiche du type : C30J (la base) s'il est libre et sans variante demandée, sinon
       *  C30J-<VARIANTE> (en majuscules [A-Z0-9-] ; -2, -3… si pris ; C30J-V2… sans variante) ; '' si le type n'est pas un code. */
      async newId(type, variant = '') {
        const t = fold(type).replace(/[^A-Z0-9]/g, ''),
          st = await load(),
          v = fold(variant).replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (!BASE_ID.test(t)) return '';
        if (!v && !st.sheets.has(t)) return t;
        const root = v ? `${t}-${v}` : `${t}-V`;
        let out = v ? root : `${root}2`,
          k = v ? 2 : 3;
        while (st.sheets.has(out)) out = v ? `${root}-${k++}` : `${root}${k++}`;
        return out;
      },
      variantOf
    };
    /** Flotte vue par la logique des fiches (demande ChatGPT) : [{ type, model, registrations }]. */
    async function fleetTypes() {
      const by = new Map();
      for (const e of (await load()).aircraft.values()) {
        if (!e.type) continue;
        const x = by.get(e.type) || by.set(e.type, {
          type: e.type,
          model: e.variant || '',
          registrations: []
        }).get(e.type);
        x.registrations.push(e.registration);
      }
      return [...by.values()];
    }

    return {
      load,
      search,
      resolve,
      aircraftOf,
      sheets,
      fleetTypes,
      /** Oublie ce qui a été lu (fichier changé : relu à la prochaine demande). */
      reset: () => {
        loadP = null;
      }
    };
  }

  window.AeroDBRegistry = {
    create,
    checkId,
    variantOf,
    readAll,
    mergeSheets,
    stamp,
    whenOf,
    leaves,
    PATHS
  };
})();
