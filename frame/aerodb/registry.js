(() => {
  'use strict';
  // V3 aerodb — registre des aéronefs (frame/aerodb/SPEC.md § 5 bis) : toutes les données d'aéronefs au même endroit.
  //   · quatre sortes d'entrées : les fiches de performances (aircraft/sheets/<id>.json, maîtresses ; celles de la V2,
  //     planner/flight_performance_database_merged.fpdb.json, adoptées en lecture), les appareils (immatriculation :
  //     flotte airline/fleet.json, sinon references/aircraft_fleet.js de la V2 ; référence references/defa_reference.js
  //     pour les immatriculations absentes), les types OACI publiés (catalogue, aircraft.js), le code libre ;
  //   · chaque champ porte son origine et sa date ; la plus récente gagne, l'autre valeur est gardée (_kept) ;
  //   · une recherche : fiches → flotte → référence → types → code libre, chacune avec son origine ;
  //   · un appareil prend sa fiche, sinon celle de son type (alias suivis), sinon l'estimation du type.
  // Les fichiers V2 (.js) sont lus comme des littéraux (« let data = {…}; »), jamais exécutés. Aucun texte d'interface.
  // API : window.AeroDBRegistry = { create({ reader, catalog, now }) → registre, mergeSheets, stamp, whenOf, PATHS }.
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

  function create({
    reader,
    catalog,
    now = () => Date.now()
  } = {}) {
    // recherche des types du catalogue, prise avant qu'aerodb ne donne sa propre search au catalogue (sinon elle
    // s'appellerait elle-même)
    const typeSearch = catalog?.search;
    const read = path => reader.read(path, {
      policy: path.startsWith('references/') ? 'reference' : 'document',
      wait: true
    }).catch(() => null);
    let loadP = null;

    // ---------------------------------------------------------------- lecture de toutes les sources
    function load() {
      return loadP ||= (async () => {
        // fiches : les siennes (aircraft/sheets/), puis celles de la V2 adoptées ou fusionnées
        const own = new Map(),
          paths = (await reader.list?.(PATHS.sheets).catch(() => null)) || [];
        for (const p of paths.filter(x => /\.json$/i.test(x))) {
          const s = valueOf(await read(p));
          if (s?.id) own.set(String(s.id), {
            sheet: s,
            path: p
          });
        }
        const fpdb = valueOf(await read(PATHS.fpdb)),
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
        const fleetDoc = valueOf(await read(PATHS.fleet)),
          v2 = fleetDoc?.aircraft?.length ? null : v2File(textOf(await read(PATHS.fleetV2))),
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
          aircraft.set(reg, e);
        }
        const ref = v2File(textOf(await read(PATHS.reference)));
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
        return {
          sheets,
          aircraft,
          fpdb
        };
      })();
    }

    // ---------------------------------------------------------------- appareils, fiches, recherche
    /** Fiche d'un appareil : la sienne (même immatriculation), sinon celle de son type (alias suivis), sinon null
     *  (estimation du type). */
    function sheetFor(state, e) {
      const list = [...state.sheets.values()].map(x => x.sheet),
        mine = list.find(s => regOf(s.registration) === e.registration);
      if (mine) return {
        sheet: mine,
        via: 'own'
      };
      const codes = new Set(catalog?.related?.(e.type) || [fold(e.type)]),
        byType = list.find(s => codes.has(catalog?.canonical?.(s.icao || s.type) || fold(s.icao || s.type)));
      return byType ? {
        sheet: byType,
        via: 'type'
      } : {
        sheet: null,
        via: 'estimate'
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
        estimate: s.sheet ? null : catalog?.estimate?.(e.type) || null
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
    /** Une recherche sur toutes les sources, dans l'ordre fiches → flotte → référence → types → code libre ; texte vide :
     *  fiches puis flotte. Chaque résultat : { kind, source, key, label, sheetId, type, registration, callsign, name }. */
    async function search(text = '', n = 30) {
      const st = await load(),
        q = fold(text),
        has = (...vs) => !q || vs.some(v => fold(v).includes(q)),
        out = [];
      for (const {
          sheet: s
        }
        of st.sheets.values())
        if (has(s.id, s.name, s.icao, s.type, s.registration, s.callsign)) out.push({
          kind: 'sheet',
          source: 'sheet',
          key: `sheet:${s.id}`,
          label: [s.name || s.id, s.icao || s.type, s.registration].filter(Boolean).join(' — '),
          sheetId: s.id,
          type: catalog?.canonical?.(s.icao || s.type) || s.icao || s.type || '',
          registration: regOf(s.registration),
          callsign: s.callsign || '',
          name: s.name || s.id
        });
      for (const src of ['fleet', 'reference']) {
        for (const e of st.aircraft.values()) {
          const fromFleet = e.sources.some(x => x.startsWith('fleet'));
          if ((src === 'fleet') !== fromFleet) continue;
          if (!has(e.registration, e.type, e.variant, e.number, e.tacticalNumber, ...e.callsigns)) continue;
          const s = sheetFor(st, e);
          out.push({
            kind: 'aircraft',
            source: src,
            key: `reg:${e.registration}`,
            label: [e.registration, e.variant || e.type, e.callsigns[0]].filter(Boolean).join(' — '),
            sheetId: s.sheet?.id || '',
            sheetVia: s.via,
            type: e.type || '',
            registration: e.registration,
            callsign: e.callsigns[0] || '',
            name: e.variant || e.type || e.registration
          });
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
       *  lnmperf…), aircraft/sheets/<id>.json écrit, miroir dans le fpdb.json de la V2 (updated_at et updatedAt). */
      async put(next, {
        source = 'edit'
      } = {}) {
        if (!next?.id) throw new Error('aerodb: sheet without id');
        if (typeof reader.put !== 'function') throw new Error('aerodb: the reader cannot write');
        const st = await load(),
          id = String(next.id),
          old = st.sheets.get(id)?.sheet || null,
          at = new Date(now()).toISOString(),
          s = stamp(old, next, source, at);
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
          sheet: s,
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
      fileOf
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
    mergeSheets,
    stamp,
    whenOf,
    leaves,
    PATHS
  };
})();
