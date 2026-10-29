(() => {
  'use strict';
  // V3 aerodb — les fiches de performances en calcul pur (frame/aerodb/SPEC.md § 5 bis), reprises de modules/fuel/sheets.js
  // le 23/10/2026 (registre des aéronefs : aerodb en est le propriétaire, fuel les édite par son API). Fonctions de la V2
  // (apps/planner/flight_planner.js) recopiées telles quelles par tools d'extraction le 22/10/2026 : lecture des CSV de
  // performances (simples et enrichis), des tables RPM, des JSON de fiches, des .lnmperf (Little Navmap, DOMParser), des
  // OFP SimBrief (fiche et calibration sur le navlog), des réponses ChatGPT quelle que soit leur forme ; écriture .lnmperf ;
  // compléments EUROCONTROL et SimBrief ; fusion fiche par fiche (différences, choix, sources). Seules les globales de la
  // V2 ont été remplacées par l'environnement du module (ENV) : base des types et performances (aerodb), fiches
  // existantes, fiche active, textes, prompts ChatGPT. Ni page, ni stockage, ni réseau.
  // Configuration : AeroDBSheets.configure({ aircraft (aerodb.aircraft()), profiles () → { id: fiche }, active () →
  //   fiche, t (ligne [fr, en, de, es] → texte), tf (ligne, valeurs → texte), lang () → 'fr' | 'en' | 'de' | 'es', fleet ()
  //   → [{ type, model, registrations }] (flotte du registre), prompt () → { profile, missing, schema } (textes ChatGPT
  //   de fuel, modules/fuel/perf_prompt.js, par défaut s'ils sont chargés) }). aerodb la règle lui-même (registry.js) ;
  //   immatriculation et indicatif sont des champs de fiche modifiables.
  if (window.AeroDBSheets) return;
  const LANGS = ['fr', 'en', 'de', 'es'];
  const ENV = {
    aircraft: null,
    profiles: () => ({}),
    active: () => null,
    lang: () => 'en',
    t: row => row[LANGS.indexOf(ENV.lang())] ?? row[1] ?? row[0],
    tf: (row, vals = {}) => String(ENV.t(row)).replace(/\{(\w+)\}/g, (_, k) => vals[k] ?? ''),
    fleet: () => [],
    prompt: () => ({
      profile: window.PERF_PROMPT,
      missing: window.PERF_PROMPT_MISSING,
      schema: window.PERF_PROMPT_SCHEMA
    })
  };
  // base des types et des performances vues comme les objets de la V2 (AIRCRAFT_DB, AIRCRAFT_PERF, AircraftCatalog), lues
  // dans aerodb
  const lookup = fn => new Proxy({}, {
    get: (_, k) => typeof k === 'string' && ENV.aircraft ? fn(k) || undefined : undefined
  });
  ENV.perfDb = () => ENV.aircraft ? lookup(k => ENV.aircraft.perf(k)) : null;
  ENV.typeDb = () => ENV.aircraft ? lookup(k => ENV.aircraft.record(k)) : null;
  ENV.catalog = () => ENV.aircraft ? {
    related: c => ENV.aircraft.related(c),
    classify: c => ENV.aircraft.classify(c),
    defaTypes: () => ENV.fleet() || []
  } : null;
  ENV.kit = () => ({
    t: row => ENV.t(row),
    tf: (row, vals) => ENV.tf(row, vals)
  });
  /** Règle l'environnement (voir l'en-tête) ; rend l'API. */
  const configure = (o = {}) => {
    Object.assign(ENV, o);
    return window.AeroDBSheets;
  };
  // textes et formats de la V2, sur l'environnement
  const KIT = {
      lang: () => ENV.lang(),
      t: row => ENV.t(row),
      tf: (row, vals) => ENV.tf(row, vals)
    },
    kt = row => KIT.t(row),
    ktf = (row, vals) => KIT.tf(row, vals),
    tl = (...r) => KIT.t(r),
    fmt = (x, d = 0) => Number.isFinite(x) ? x.toLocaleString(ENV.lang(), {
      maximumFractionDigits: d
    }) : '—',
    flTxt = h => 'FL' + String(Math.round(h / 100)).padStart(3, '0');
  // kg ↔ lb (même calcul que modules/fuel/model.js convertFuel ; aerodb ne dépend pas de fuel)
  const KG_PER_LB = 0.45359237,
    convertFuel = (v, from, to) => !Number.isFinite(v) || !from || !to || from === to ? v : from === 'kg' ? v / KG_PER_LB : v *
    KG_PER_LB;
  // fiches du panneau ChatGPT de la V2 : ici, une entrée { id, p (fiche) } passée par le module
  const gptFor = null;
  const gptProfileOf = e => !e ? null : e.p ? normalize(structuredClone(e.p)) : ENV.profiles()?.[e.id] ? normalize(structuredClone(ENV
    .profiles()[e.id])) : null;
  // fiches cochées pour « Renseigner les champs manquants » : passées par le module (gptMissingPrompt(list))
  const gptMissingList = () => [];
  // fiches du Landing sans fiche (_landingOnly) : hors du module (landing) ; leur origine se dit sans estimation
  const profileInfo = () => ({
      s: {}
    }),
    ffSourceText = () => '';

  const FLIGHT_PHASES = ["idle", "parking", "taxi", "takeoff", "climb", "cruise", "descent", "approach"];
  const FUEL_PATHS = new Set(["usableFuel", "taxiFuel", "reserveFuel", "extraFuel", "taxi.fuelFlowPerHour", "alternate.fuelFlowPerHour",
    "climb.fuelFlowPerHour", "cruise.fuelFlowPerHour", "descent.fuelFlowPerHour"
  ]);
  const FUEL_KEYS = new Set(["fuelFlowPerHour", "fuelFlowMin", "fuelFlowMax", "usableFuel", "taxiFuel", "reserveFuel", "extraFuel"]);
  const SKIP_MERGE_KEYS = new Set(["_rowId", "id", "unit", "source", "mergedProfileIds", "lnmSource", "estimatedFields", "gptSources"]);
  /** Mention « estimé (ChatGPT) » (4 langues) ajoutée au commentaire d'une ligne de cartographie estimée. */
  const ESTIMATED_MARK = /\s*(—\s*)?(estimé|estimated|geschätzt|estimado) \(ChatGPT\)/i;
  const PROFILE_FIELDS = [
    ["Identité et format", "Nom", "name", "text"],
    ["Identité et format", "Type / ICAO", "icao", "text"],
    ["Identité et format", "Cellule (auto : base OACI)", "airframe", "select:aeroplane,helicopter,gyroplane,glider,balloon,airship",
      false
    ],
    ["Identité et format", "Propulsion (auto : base OACI)", "propulsion", "select:piston,turboprop,turboshaft,jet,electric,none,other",
      false
    ],
    ["Identité et format", "Immatriculation", "registration", "text", false],
    ["Identité et format", "Indicatif", "callsign", "text", false],
    ["Identité et format", "Description", "description", "textarea"],
    ["Identité et format", "Carburant en volume", "fuelAsVolume", "bool"],
    ["Identité et format", "Carburant Jet", "jetFuel", "bool"],
    ["Carburant et opération", "Carburant utilisable", "usableFuel", "number"],
    ["Carburant et opération", "Taxi", "taxiFuel", "number"],
    ["Carburant et opération", "Taxi · régime nominal (RPM / N1)", "taxi.rpmNominal", "number", false],
    ["Carburant et opération", "Taxi · fuel flow", "taxi.fuelFlowPerHour", "number", false],
    ["Carburant et opération", "Réserve", "reserveFuel", "number"],
    ["Carburant et opération", "Contingence (%)", "contingencyPercent", "number"],
    ["Carburant et opération", "Carburant extra", "extraFuel", "number"],
    ["Piste et alternat", "Longueur piste mini (ft)", "minRunwayLengthFt", "number"],
    ["Piste et alternat", "Type de piste", "runwayType", "select:HARD,SOFT,WATER"],
    ["Piste et alternat", "Alternat · fuel flow", "alternate.fuelFlowPerHour", "number"],
    ["Piste et alternat", "Alternat · TAS (kt)", "alternate.tasKt", "number"],
    ["Montée", "Badin / IAS (kt)", "climb.iasKt", "number", false],
    ["Montée", "Régime nominal (RPM / N1)", "climb.rpmNominal", "number", false],
    ["Montée", "Fuel flow", "climb.fuelFlowPerHour", "number"],
    ["Montée", "TAS (kt)", "climb.tasKt", "number"],
    ["Montée", "Vario (ft/min)", "climb.rateFpm", "number"],
    ["Croisière", "Badin / IAS (kt)", "cruise.iasKt", "number", false],
    ["Croisière", "Régime nominal (RPM / N1)", "cruise.rpmNominal", "number", false],
    ["Croisière", "Fuel flow", "cruise.fuelFlowPerHour", "number"],
    ["Croisière", "TAS (kt)", "cruise.tasKt", "number"],
    ["Croisière", "Plafond max (ft)", "cruise.ceilingFt", "number", false],
    ["Croisière", "Altitude de référence (ft)", "cruise.refAltFt", "number", false],
    ["Croisière", "Altitude de rétablissement (ft)", "engineCriticalAltFt", "number", false],
    ["Croisière", "Cabine pressurisée", "pressurized", "bool", false],
    ["Descente", "Badin / IAS (kt)", "descent.iasKt", "number", false],
    ["Descente", "Régime nominal (RPM / N1)", "descent.rpmNominal", "number", false],
    ["Descente", "Fuel flow", "descent.fuelFlowPerHour", "number"],
    ["Descente", "TAS (kt)", "descent.tasKt", "number"],
    ["Descente", "Vario (ft/min)", "descent.rateFpm", "number"],
    ["Régime et consommation", "Référence RPM / puissance", "rpmPowerReference", "textarea", false],
    ["Régime et consommation", "Données RPM / fuel flow", "rpmFuelRaw", "textarea", false],
    ["Régime et consommation", "Base / provenance", "rpmFuelBasis", "textarea", false]
  ];
  /** Clé de comparaison d'un nom d'appareil : majuscules, sans accents ni séparateurs. */
  function aKey(s) {
    return String(s || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "")
  }
  /** Nombre lu dans un texte (séparateurs de milliers « , » retirés) ; null s'il n'est pas lisible. */
  const n = v => {
    let x = Number(String(v ?? "").replace(/,/g, ""));
    return Number.isFinite(x) ? x : null
  };
  /** Premier nombre lisible parmi les clés données (valeur directe ou nœud texte d'un OFP converti en JSON). */
  const firstNum = (o, keys) => {
    for (const k of keys) {
      let v = o?.[k];
      if (v && typeof v === "object") v = v["#text"] ?? v.text ?? v.value;
      let x = n(v);
      if (x !== null) return x
    }
    return null
  };
  /** Premier texte non vide parmi les clés données (valeur directe ou nœud texte). */
  const firstText = (o, keys) => {
    for (const k of keys) {
      let v = o?.[k];
      if (v && typeof v === "object") v = v["#text"] ?? v.text ?? v.value;
      if (v !== undefined && v !== null && String(v).trim()) return String(v).trim()
    }
    return ""
  };
  /** Première valeur non vide de o parmi les clés données. */
  function pick(o, ...keys) {
    for (const k of keys)
      if (o?.[k] !== undefined && o[k] !== null && o[k] !== "") return o[k]
  }
  /** Nombre écrit à la française ou à l'anglaise (espaces, espace fine, virgule décimale) → Number. */
  function numberText(value) {
    return Number(String(value).replace(/[\s\u202f]/g, "").replace(",", "."))
  }
  /** Lecteur CSV (séparateur sep, guillemets doublés, fins de ligne CR / LF). Sortie : tableau de lignes (tableaux de cellules), lignes vides omises. */
  function parseDelimited(text, sep = ";") {
    let rows = [],
      row = [],
      cell = "",
      quote = false;
    for (let i = 0; i < text.length; i++) {
      let c = text[i];
      if (c === '"') {
        if (quote && text[i + 1] === '"') {
          cell += '"';
          i++
        } else quote = !quote
      } else if (c === sep && !quote) {
        row.push(cell);
        cell = ""
      } else if ((c === '\n' || c === '\r') && !quote) {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell);
        if (row.some(x => x !== "")) rows.push(row);
        row = [];
        cell = ""
      } else cell += c
    }
    row.push(cell);
    if (row.some(x => x !== "")) rows.push(row);
    return rows
  }
  /** Séparateur d'un CSV collé ou importé : celui qui revient le plus sur la ligne de titres (« ; » des CSV de la suite,
   *  « , » ou tabulation). */
  function csvSep(text) {
    const head = String(text).split(/\r?\n/, 1)[0],
      n = c => head.split(c).length - 1;
    return [";", ",", "\t"].sort((a, b) => n(b) - n(a))[0]
  }
  /** Valeurs simples trouvées, à toute profondeur (≤ 8), sous l'une des clés aliases (minuscules). */
  function deepValuesByKey(o, aliases, out = [], depth = 0) {
    if (!o || typeof o !== "object" || depth > 8) return out;
    for (const [k, v] of Object.entries(o)) {
      if (aliases.includes(k.toLowerCase()) && v !== null && v !== undefined && typeof v !== "object") out.push(v);
      if (v && typeof v === "object") deepValuesByKey(v, aliases, out, depth + 1)
    }
    return out;
  }
  /** Premier nombre trouvé en profondeur sous l'une des clés aliases ; null sinon. */
  function deepFirstNum(o, aliases) {
    for (const v of deepValuesByKey(o, aliases)) {
      const x = n(v);
      if (x !== null) return x
    }
    return null
  }
  /** Premier texte non vide trouvé en profondeur sous l'une des clés aliases ; « » sinon. */
  function deepFirstText(o, aliases) {
    for (const v of deepValuesByKey(o, aliases)) {
      if (String(v).trim()) return String(v).trim()
    }
    return ""
  }
  /** Durée en minutes depuis « h:mm(:ss) », « hhmm » ou un nombre (secondes si > 10 000). */
  function normalizeTime(v) {
    let s = String(v ?? "").trim(),
      m = s.match(/^(\d+):(\d+)(?::(\d+))?$/);
    if (m) return +m[1] * 60 + +m[2] + +(m[3] || 0) / 60;
    if (/^\d{3,4}$/.test(s)) {
      let h = +s.slice(0, -2),
        min = +s.slice(-2);
      if (min < 60) return h * 60 + min
    }
    let x = n(s);
    return x !== null ? (x > 10000 ? x / 60 : x) : null
  }
  /** Valeur d'un chemin pointé (« cruise.tasKt ») dans un objet ; undefined si absent. */
  function pathGet(o, path) {
    return path.split(".").reduce((v, k) => v?.[k], o)
  }
  /** Écrit une valeur à un chemin pointé, en créant les objets intermédiaires. */
  function pathSet(o, path, value) {
    let a = path.split("."),
      k = a.pop(),
      t = o;
    for (const x of a) t = t[x] ??= {};
    t[k] = value
  }
  /** Vrai pour null, undefined, chaîne vide ou tableau vide (valeur « à compléter »). */
  function isBlankValue(v) {
    return v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && !v.length)
  }
  // valeurs fermées des deux champs de fiche « cellule » (ce qui porte l'appareil) et « propulsion » (ce qui le fait avancer)
  const AIRFRAMES = ["aeroplane", "helicopter", "gyroplane", "glider", "balloon", "airship"],
    PROPULSIONS = ["piston", "turboprop", "turboshaft", "jet", "electric", "none", "other"];
  /** Cellule, propulsion et pressurisation d'un code que la base OACI donne, seulement ceux qu'elle donne (clé absente
   *  sinon). Cellule : dirigeable et ballon selon la fiche, puis lettre 1 de la description OACI (H hélicoptère, G
   *  gyroplane, L / A / S avion ; T, convertible, ou inconnu : rien). Propulsion : ballon et planeur (GLID, BALL) sans
   *  moteur, sinon lettre 3 (J réacteur, P pistons, E électrique, T turbine : turbomoteur d'un hélicoptère, sinon
   *  turbopropulseur ; R fusée ou inconnu : rien). Pressurisation : seulement si la fiche du type porte un booléen
   *  « pressurized » (aucune base n'en porte aujourd'hui, l'accroche est prête). */
  function factsOfCode(code) {
    const out = {};
    if (!code) return out;
    const c = ENV.catalog()?.classify?.(code) || {},
      is = k => code === k || c.code === k;
    if (is("GLID")) return {
      airframe: "glider",
      propulsion: "none"
    };
    if (is("BALL")) return {
      airframe: "balloon",
      propulsion: "none"
    };
    if (c.kind === "airship" || c.kind === "balloon") out.airframe = c.kind;
    else if (c.family === "H") out.airframe = "helicopter";
    else if (c.family === "G") out.airframe = "gyroplane";
    else if (c.family === "L" || c.family === "A" || c.family === "S") out.airframe = "aeroplane";
    if (out.airframe === "balloon") out.propulsion = "none";
    else if (c.power === "J") out.propulsion = "jet";
    else if (c.power === "P") out.propulsion = "piston";
    else if (c.power === "E") out.propulsion = "electric";
    else if (c.power === "T") out.propulsion = out.airframe === "helicopter" ? "turboshaft" : "turboprop";
    if (typeof c.rec?.pressurized === "boolean") out.pressurized = c.rec.pressurized;
    return out
  }
  /** Ce que la base OACI donne de l'appareil d'une fiche : { airframe?, propulsion?, pressurized? }, chaque clé seulement
   *  si la base la donne (code = icao, sinon type, sinon id de la fiche). */
  function catalogFacts(p) {
    return factsOfCode(aKey(p?.icao || p?.type || p?.id))
  }
  /** Valeurs en vigueur de la cellule, de la propulsion et de la pressurisation : celle que la fiche porte si l'utilisateur
   *  l'a fixée, sinon celle de la base OACI ; une clé n'est là que si l'une des deux la donne. code : code OACI à
   *  consulter à la place de celui de la fiche. */
  function effectiveFacts(p, code) {
    const out = factsOfCode(code ? aKey(code) : aKey(p?.icao || p?.type || p?.id));
    for (const k of ["airframe", "propulsion", "pressurized"]) {
      const v = p?.[k];
      if (k === "pressurized" ? typeof v === "boolean" : !isBlankValue(v) && v !== "auto") out[k] = v
    }
    return out
  }
  /** Phase de vol (taxi, climb, cruise…) reconnue dans un texte libre (commentaire de ligne RPM) ; « » sinon. */
  function inferredCurvePhase(text) {
    let x = String(text || "").toLowerCase();
    return FLIGHT_PHASES.find(p => new RegExp(`\\b${p}\\b`, `i`).test(x)) || ""
  }
  /** Complète un profil sur place (id, nom, unité, phases, TOD, identifiants de lignes RPM). Entrée : profil, nom de fichier (id par défaut). Sortie : le même objet. */
  function normalize(p, name = "profil") {
    p.id = p.id || p.icao || name.replace(/\.[^.]+$/, "");
    p.name = p.name || p.aircraft || p.id;
    p.unit = p.unit || "kg";
    p.cruise = p.cruise || {};
    p.climb = p.climb || {};
    p.descent = p.descent || {};
    p.taxi = p.taxi || {};
    p.tod = p.tod || {
      gradientFtPerNm: 300,
      bufferNm: 5
    };
    p.rpmFuelCurve = (p.rpmFuelCurve || []).map(x => ({
      ...x,
      _rowId: x._rowId || crypto.randomUUID()
    }));
    // « auto » n'est plus une valeur : la case vide veut dire « selon la base OACI »
    for (const k of ["airframe", "propulsion"])
      if (p[k] === "auto") delete p[k];
    // ancien champ engineType (jet, turboprop, piston ou auto) : retiré ; sa valeur n'est gardée, en propulsion, que si la
    // fiche n'en dit rien et que la base OACI non plus (turbopropulseur d'un hélicoptère : turbomoteur)
    if ("engineType" in p) {
      const old = p.engineType;
      delete p.engineType;
      if (["jet", "turboprop", "piston"].includes(old) && isBlankValue(p.propulsion)) {
        const facts = catalogFacts(p);
        if (!facts.propulsion) p.propulsion = old === "turboprop" && (p.airframe || facts.airframe) === "helicopter" ? "turboshaft" : old
      }
    }
    return p;
  }
  /** Profils d'un CSV « PERFORMANCES_INTERPOLEES » (colonnes Aircraft, ICAO…, carburant en lb). Lève une erreur si les colonnes requises manquent. */
  function parsePerformanceCsv(text, name) {
    let rows = parseDelimited(text.replace(/^\uFEFF/, ""));
    if (rows.length < 2) throw Error("CSV sans données");
    let headers = rows.shift().map(x => x.trim()),
      ix = h => headers.indexOf(h),
      get = (r, h) => r[ix(h)]?.trim() ?? "",
      num = (r, h) => {
        let v = get(r, h);
        return v === "" ? null : Number(v.replace(",", "."))
      };
    if (ix("Aircraft") < 0 || ix("ICAO") < 0) throw Error("Colonnes Aircraft et ICAO requises");
    return rows.map(r => {
      let reg = get(r, "Registration"),
        icao = get(r, "ICAO").toUpperCase(),
        aircraft = get(r, "Aircraft");
      return normalize({
        id: `DB_${icao}_${(reg||aircraft).replace(/[^A-Za-z0-9_-]/g,"_")}`,
        name: aircraft || icao,
        icao,
        type: icao,
        registration: reg,
        callsign: reg,
        unit: "lb",
        fuelAsVolume: false,
        jetFuel: null,
        confidence: get(r, "Confidence"),
        basis: get(r, "Basis"),
        description: get(r, "Basis"),
        usableFuel: num(r, "Usable fuel lb"),
        taxiFuel: num(r, "Taxi lb"),
        reserveFuel: num(r, "Reserve lb"),
        contingencyPercent: null,
        extraFuel: null,
        minRunwayLengthFt: null,
        runwayType: "",
        alternate: {
          fuelFlowPerHour: null,
          tasKt: null
        },
        climb: {
          fuelFlowPerHour: num(r, "Climb FF lb/h"),
          tasKt: num(r, "Climb TAS kt"),
          rateFpm: num(r, "Climb VS fpm")
        },
        cruise: {
          fuelFlowPerHour: num(r, "Cruise FF lb/h"),
          tasKt: num(r, "Cruise TAS kt")
        },
        descent: {
          fuelFlowPerHour: num(r, "Descent FF lb/h"),
          tasKt: num(r, "Descent TAS kt"),
          rateFpm: num(r, "Descent VS fpm")
        },
        source: {
          format: "PERFORMANCES_INTERPOLEES CSV",
          file: name,
          importedAt: new Date().toISOString()
        }
      }, name)
    })
  }
  /** Profils d'un CSV enrichi (piste mini, table RPM texte, contingence…) ; lignes sans avion ou OACI ignorées. Lève une erreur si aucune ligne n'est valide. */
  function parsePerformanceCsvEnriched(text, name, sep = ";") { // sep : séparateur (« ; » pour les CSV de la suite)
    let rows = parseDelimited(text.replace(/^\uFEFF/, ""), sep);
    if (rows.length < 2) throw Error("CSV sans données");
    let h = rows.shift().map(x => x.trim()),
      ix = k => h.indexOf(k),
      get = (r, k) => r[ix(k)]?.trim() ?? "",
      num = (r, k) => {
        let x = get(r, k);
        return x === "" ? null : Number(x.replace(",", "."))
      };
    if (ix("Aircraft") < 0 || ix("ICAO") < 0) throw Error("Colonnes Aircraft et ICAO requises");
    let out = rows.map(r => {
      let reg = get(r, "Registration"),
        icao = get(r, "ICAO").toUpperCase(),
        aircraft = get(r, "Aircraft");
      if (!aircraft || !icao) return null;
      let runway = num(r, "LNM Min Runway ft") ?? num(r, "Min Runway Required ft (max TO/LDG)"),
        rpmRaw = get(r, "Fuel Flow vs RPM / Power");
      return normalize({
        id: `DB_${icao}_${(reg||aircraft).replace(/[^A-Za-z0-9_-]/g,"_")}`,
        name: aircraft,
        icao,
        type: icao,
        registration: reg,
        callsign: reg,
        unit: "lb",
        fuelAsVolume: false,
        jetFuel: null,
        confidence: get(r, "Confidence"),
        basis: get(r, "Basis"),
        description: get(r, "Basis"),
        usableFuel: num(r, "Usable fuel lb"),
        taxiFuel: num(r, "Taxi lb"),
        reserveFuel: num(r, "Reserve lb"),
        contingencyPercent: num(r, "Contingency %"),
        extraFuel: num(r, "Extra Fuel lb"),
        minRunwayLengthFt: runway,
        runwayBasis: get(r, "Runway Basis"),
        rpmPowerReference: get(r, "Typical RPM / Power Reference"),
        rpmFuelBasis: get(r, "RPM/Fuel Basis"),
        rpmFuelRaw: rpmRaw,
        rpmFuelCurve: parseRpmFuelCurve(rpmRaw, "lb"),
        alternate: {
          fuelFlowPerHour: null,
          tasKt: null
        },
        climb: {
          fuelFlowPerHour: num(r, "Climb FF lb/h"),
          tasKt: num(r, "Climb TAS kt"),
          rateFpm: num(r, "Climb VS fpm")
        },
        cruise: {
          fuelFlowPerHour: num(r, "Cruise FF lb/h"),
          tasKt: num(r, "Cruise TAS kt")
        },
        descent: {
          fuelFlowPerHour: num(r, "Descent FF lb/h"),
          tasKt: num(r, "Descent TAS kt"),
          rateFpm: num(r, "Descent VS fpm")
        },
        source: {
          format: "PERFORMANCES_INTERPOLEES enriched CSV",
          file: name,
          importedAt: new Date().toISOString()
        }
      }, name)
    }).filter(Boolean);
    if (!out.length) throw Error("CSV sans lignes appareil valides : vérifie les guillemets et les séparateurs.");
    return out
  }
  /** Plage de débit lue dans un texte (« 1 000–1 300 kg/h », « 950 lb/h ») convertie dans targetUnit. Sortie : { min, nominal, max, sourceUnit } ou null. */
  function parseFuelRange(text, targetUnit = "kg") {
    const n = "(\\d{1,3}(?:[\\s\\u202f]\\d{3})*|\\d+)(?:[.,](\\d+))?",
      s = String(text || ""),
      range = new RegExp(`${n}\\s*(?:kg|kgs|lb|lbs)?\\s*\\/?\\s*h?\\s*(?:-|–|à|to|/)\\s*${n}\\s*(kg|kgs|lb|lbs)\\s*\\/?\\s*h\\b`, "i"),
      single = new RegExp(`${n}\\s*(kg|kgs|lb|lbs)\\s*\\/?\\s*h\\b`, "i");
    let m = s.match(range),
      a, b, unit;
    if (m) {
      a = numberText(`${m[1]}${m[2]?","+m[2]:""}`);
      b = numberText(`${m[3]}${m[4]?","+m[4]:""}`);
      unit = m[5]
    } else {
      m = s.match(single);
      if (!m) return null;
      a = b = numberText(`${m[1]}${m[2]?","+m[2]:""}`);
      unit = m[3]
    }
    const from = /^kg/i.test(unit) ? "kg" : "lb";
    a = convertFuel(a, from, targetUnit);
    b = convertFuel(b, from, targetUnit);
    return {
      min: Math.min(a, b),
      nominal: (a + b) / 2,
      max: Math.max(a, b),
      sourceUnit: from
    };
  }
  /** Table RPM / débit extraite d'un texte libre (une entrée par ligne ou par « ; », formats « 2400 rpm = 45 », « 45 lb/h @ 2400 »…), triée par régime. */
  function parseRpmFuelCurve(raw, targetUnit = "kg") {
    let out = [],
      seen = new Set(),
      add = (rpm, range, comment) => {
        rpm = numberText(rpm);
        if (!range || !Number.isFinite(rpm) || rpm <= 0 || seen.has(rpm)) return;
        seen.add(rpm);
        out.push({
          rpm,
          fuelFlowMin: range.min,
          fuelFlowPerHour: range.nominal,
          fuelFlowMax: range.max,
          comment
        })
      };
    for (const part of String(raw || "").split(/;|\n/)) {
      let rpm = part.match(/(\d{2,5}(?:[.,]\d+)?)\s*(?:rpm|n1|%\s*n1|%\s*power)\b/i)?.[1],
        range = parseFuelRange(part, targetUnit);
      if (rpm && range) {
        add(rpm, range, part.trim());
        continue
      }
      let m = part.match(
        /(\d{2,5}(?:[.,]\d+)?)\s*(?:rpm|n1|%\s*n1|%\s*power)?\s*(?:=|:|→|->|@)\s*~?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*~?(\d+(?:[.,]\d+)?))?/i
      );
      if (m) {
        let a = numberText(m[2]),
          b = m[3] ? numberText(m[3]) : a;
        add(m[1], {
          min: a,
          nominal: (a + b) / 2,
          max: b
        }, part.trim())
      } else {
        m = part.match(
          /~?(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*~?(\d+(?:[.,]\d+)?))?\s*(?:lb\/?h|kg\/?h|gph)?\s*(?:@|at)\s*(\d{2,5}(?:[.,]\d+)?)/i);
        if (m) {
          let a = numberText(m[1]),
            b = m[2] ? numberText(m[2]) : a;
          add(m[3], {
            min: a,
            nominal: (a + b) / 2,
            max: b
          }, part.trim())
        }
      }
    }
    return out.sort((a, b) => a.rpm - b.rpm)
  }
  /** Fusionne deux tables RPM (t prioritaire) : lignes de s ajoutées si leur RPM (à la même altitude) est absent de t ; phase et commentaire complétés sinon. */
  function mergeCurves(t, s) {
    t = Array.isArray(t) ? t : [];
    s = Array.isArray(s) ? s : [];
    /** Clé de rapprochement d'une ligne de table RPM : régime au millième et altitude (colonne facultative), null sans régime. */
    const key = r => r && r.rpm !== null && r.rpm !== undefined && Number.isFinite(Number(r.rpm)) ?
      `${Math.round(Number(r.rpm) * 1000)}@${r.altFt !== null && r.altFt !== undefined && r.altFt !== "" && Number.isFinite(+r.altFt) ? +r.altFt : ""}` : null;
    const out = [...t];
    for (const r of s) {
      const k = key(r);
      if (k === null) continue;
      const cur = out.find(x => key(x) === k);
      if (cur) {
        if (isBlankValue(cur.phaseLabel) && !isBlankValue(r.phaseLabel)) cur.phaseLabel = r.phaseLabel;
        if (isBlankValue(cur.comment) && !isBlankValue(r.comment)) cur.comment = r.comment;
        continue
      }
      out.push(r)
    }
    return out
  }
  /** Copie profonde d'un objet dont les champs de carburant (FUEL_KEYS) sont convertis from → to ; ok faux : ces champs sont vidés (conversion impossible, ex. gallons). */
  function fuelConvertedCopy(o, from, to, ok) {
    if (Array.isArray(o)) return o.map(x => fuelConvertedCopy(x, from, to, ok));
    if (o && typeof o === "object") {
      let r = {};
      for (const [k, v] of Object.entries(o)) r[k] = FUEL_KEYS.has(k) && typeof v === "number" ? (ok ? convertFuel(v, from, to) : null) :
        (
          k === "simbriefSnapshot" || k === "calibration" ? structuredClone(v) : fuelConvertedCopy(v, from, to, ok));
      return r
    }
    return o
  }
  /** Vrai si un objet a la structure d'un OFP SimBrief (navlog + général / avion, ou api_params). */
  function isSimbriefOfp(o) {
    if (!o || typeof o !== "object" || Array.isArray(o)) return false;
    const k = new Set(Object.keys(o).map(x => x.toLowerCase()));
    if (k.has("navlog") && (k.has("general") || k.has("aircraft") || k.has("origin") || k.has("destination"))) return true;
    if (k.has("general") && k.has("aircraft") && (k.has("fuel") || k.has("times") || k.has("params"))) return true;
    return !!(o.api_params && o.general && o.aircraft);
  }
  /** Nature d'un JSON importé (base de profils, OFP SimBrief, profil, générique), pour l'affichage. */
  function jsonKind(obj) {
    if (obj?.schema === "flight-performance-db/v1" && Array.isArray(obj.profiles)) return "Base de profils";
    if (isSimbriefOfp(obj)) return "OFP SimBrief";
    if (obj && typeof obj === "object" && (obj.cruise || obj.climb || obj.descent || obj.icao || obj.aircraft))
      return "Profil performance JSON";
    return "JSON générique";
  }
  /** Profils d'un JSON : base exportée (schema flight-performance-db/v1) ou profil unique. */
  function profilesFromJson(obj, name) {
    if (obj?.schema === "flight-performance-db/v1" && Array.isArray(obj.profiles)) return obj.profiles.map(p => normalize(p, name));
    // la forme de la demande ChatGPT, { sheets: [fiche…] }, et un tableau de fiches : une fiche par élément (jamais un champ
    // « sheets » posé sur une seule fiche)
    if (Array.isArray(obj)) return obj.filter(o => o && typeof o === "object").flatMap(o => profilesFromJson(o, name));
    if (obj && typeof obj === "object" && Array.isArray(obj.sheets) && !obj.cruise && !obj.climb && !obj.descent) return obj.sheets
      .filter(o => o && typeof o === "object").flatMap(o => profilesFromJson(o, name));
    if (obj && typeof obj === "object" && !obj.source && !obj.lnmSource && !obj.simbrief && !obj.simbriefSnapshot) obj.source = {
      format: "JSON",
      file: name,
      importedAt: new Date().toISOString()
    };
    return [normalize(obj, name)]
  }
  /** Nombre du premier élément tag sous root (def si absent ou non numérique). */
  function xmlNum(root, tag, def = 0) {
    let n = root.querySelector(tag);
    return n ? Number(n.textContent) || def : def
  }
  /** Texte du premier élément tag sous root (def si absent). */
  function xmlText(root, tag, def = "") {
    let n = root.querySelector(tag);
    return n ? n.textContent.trim() : def
  }
  /** Profil lu dans un fichier Little Navmap .lnmperf (options, carburants, phases). Lève une erreur si le XML ou la structure est invalide. */
  function parseLnmperf(txt, name = "profil.lnmperf") {
    const x = new DOMParser().parseFromString(txt, "application/xml");
    if (x.querySelector("parsererror")) throw Error("XML .lnmperf invalide");
    const ap = x.querySelector("AircraftPerf"),
      opt = ap?.querySelector("Options"),
      perf = ap?.querySelector("Perf");
    if (!ap || !perf) throw Error("Structure Little Navmap non reconnue");
    const fuelAsVolume = xmlNum(opt, "FuelAsVolume", 0),
      unit = fuelAsVolume ? "gal" : "lb";
    /** Phase d'un profil Little Navmap : débit et TAS (et vario pour la montée ou la descente). */
    const phase = (tag, vert = false) => {
      let q = perf.querySelector(tag);
      if (!q) return {};
      let z = {
        fuelFlowPerHour: xmlNum(q, "FuelFlowLbsGalPerHour"),
        tasKt: xmlNum(q, "SpeedKtsTAS")
      };
      if (vert) z.rateFpm = Math.abs(xmlNum(q, "VertSpeedFtPerMin"));
      return z
    };
    return normalize({
      id: xmlText(opt, "AircraftType", name.replace(/\.lnmperf$/i, "")),
      icao: xmlText(opt, "AircraftType", ""),
      name: xmlText(opt, "Name", name.replace(/\.lnmperf$/i, "")),
      description: xmlText(opt, "Description", ""),
      unit,
      jetFuel: !!xmlNum(opt, "JetFuel", 1),
      fuelAsVolume: !!fuelAsVolume,
      contingencyPercent: xmlNum(perf, "ContingencyFuelPercent", 0),
      extraFuel: xmlNum(perf, "ExtraFuelLbsGal", 0),
      reserveFuel: xmlNum(perf, "ReserveFuelLbsGal", 0),
      taxiFuel: xmlNum(perf, "TaxiFuelLbsGal", 0),
      usableFuel: xmlNum(perf, "UsableFuelLbsGal", 0),
      minRunwayLengthFt: xmlNum(perf, "MinRunwayLengthFt", 0),
      runwayType: xmlText(perf, "RunwayType", "HARD"),
      alternate: phase("Alternate"),
      climb: phase("Climb", true),
      cruise: phase("Cruise"),
      descent: phase("Descent", true),
      lnmSource: true
    }, name);
  }
  /** Échappe un texte pour HTML / XML (& < > " '). */
  function escXml(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;"
    } [c]))
  }
  /** Bloc XML d'une phase .lnmperf (débit, TAS, vario si vertical). */
  function lnmPhase(tag, p, vertical = false) {
    p = p || {};
    return `      <${tag}>\n        <FuelFlowLbsGalPerHour>${Number(p.fuelFlowPerHour||0).toFixed(3)}</FuelFlowLbsGalPerHour>\n        <SpeedKtsTAS>${Number(p.tasKt||0).toFixed(3)}</SpeedKtsTAS>${vertical?`\n        <VertSpeedFtPerMin>${Number(Math.abs(p.rateFpm||0)).toFixed(3)}</VertSpeedFtPerMin>`:""}\n      </${tag}>`;
  }
  /** Libellés des champs requis par l'export .lnmperf encore vides dans le profil p. */
  function missingLnmperfFields(p) {
    return PROFILE_FIELDS.filter(([, label, path, type, lnm = true]) => lnm !== false && type !== "textarea" && (pathGet(p, path) ===
      null ||
      pathGet(p, path) === undefined || pathGet(p, path) === "")).map(x => x[1])
  }
  /** Texte .lnmperf d'un profil (Little Navmap). Lève une erreur si des champs requis manquent. */
  function toLnmperf(p) {
    const missing = missingLnmperfFields(p);
    if (missing.length) throw Error("Export `.lnmperf` bloqué : champs non renseignés : " + missing.join(" ; "));
    // un .lnmperf est en livres (ou en gallons) : une fiche en kg est convertie (avant : ses kg écrits tels quels)
    if (p.unit === "kg") p = fuelConvertedCopy(p, "kg", "lb", true);
    p = {
      ...p,
      simbriefAirframeId: ""
    }; // les métadonnées SimBrief restent JSON-only ; Description reste strictement identique
    const now = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>\n<LittleNavmap xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="https://www.littlenavmap.org/schema/lnmperf.xsd">\n  <AircraftPerf>\n    <Header>\n      <CreationDate>${now}</CreationDate>\n      <FileVersion>1.0</FileVersion>\n      <ProgramName>Flight Performance &amp; Fuel Planner</ProgramName>\n      <ProgramVersion>0.2</ProgramVersion>\n      <Documentation>https://www.littlenavmap.org/lnmperf.html</Documentation>\n    </Header>\n    <Options>\n      <Name>${escXml(p.name||p.id)}</Name>\n      <AircraftType>${escXml(p.icao||p.id)}</AircraftType>\n      <Description>${escXml((p.description||"")+(p.simbriefAirframeId?` | SimBrief airframe ${p.simbriefAirframeId}`:""))}</Description>\n      <FuelAsVolume>${p.fuelAsVolume?1:0}</FuelAsVolume>\n      <JetFuel>${p.jetFuel===false?0:1}</JetFuel>\n    </Options>\n    <Perf>\n      <ContingencyFuelPercent>${Number(p.contingencyPercent||0).toFixed(1)}</ContingencyFuelPercent>\n      <ExtraFuelLbsGal>${Number(p.extraFuel||0).toFixed(3)}</ExtraFuelLbsGal>\n      <MinRunwayLengthFt>${Number(p.minRunwayLengthFt||0).toFixed(3)}</MinRunwayLengthFt>\n      <ReserveFuelLbsGal>${Number(p.reserveFuel||0).toFixed(3)}</ReserveFuelLbsGal>\n      <RunwayType>${escXml(p.runwayType||"HARD")}</RunwayType>\n      <TaxiFuelLbsGal>${Number(p.taxiFuel||0).toFixed(3)}</TaxiFuelLbsGal>\n      <UsableFuelLbsGal>${Number(p.usableFuel||0).toFixed(3)}</UsableFuelLbsGal>\n${lnmPhase("Alternate",p.alternate)}\n${lnmPhase("Climb",p.climb,true)}\n${lnmPhase("Cruise",p.cruise)}\n${lnmPhase("Descent",p.descent,true)}\n    </Perf>\n  </AircraftPerf>\n</LittleNavmap>\n`;
  }
  /** Tableau des points du navlog trouvé dans un OFP (clés navlog / waypoints / fix…) ; null sinon. */
  function findNavlog(o) {
    if (!o || typeof o !== "object") return null;
    // OFP SimBrief (json=1 ou v2) : navlog.fix du plan lui-même, avant toute recherche en profondeur (un bloc antérieur
    // — dégagement, terrains… — pouvait être pris pour le navlog, et la route perdait ses points tournants)
    if (!Array.isArray(o) && o.navlog) {
      // json=v2 : navlog est DIRECTEMENT la liste des points ({ ident, pos_lat… }) ; json=1 : { fix: [...] } ; un point
      // n'est jamais un conteneur (l'ancienne lecture cherchait .fix dans chaque point et ne trouvait rien)
      const isFix = f => f && typeof f === "object" && !Array.isArray(f) && (f.pos_lat != null || f.ident != null),
        nav = o.navlog,
        list = Array.isArray(nav) ? nav : [].concat(nav?.fix || nav?.waypoint || []),
        fixes = list.flatMap(n => Array.isArray(n) ? n : isFix(n) ? [n] : [].concat(n?.fix || n?.waypoint || []));
      if (fixes.some(isFix)) return fixes
    }
    if (Array.isArray(o) && o.length > 1 && o.some(x => typeof x === "object" && firstNum(x, ["altitude_feet", "altitude", "time_total",
        "fuel_total"
      ]) !== null)) return o;
    for (const [k, v] of Object.entries(o)) {
      if (/navlog|waypoints?|fixes|fix/i.test(k)) {
        if (Array.isArray(v)) return v;
        if (Array.isArray(v?.fix)) return v.fix;
        if (Array.isArray(v?.waypoint)) return v.waypoint
      }
      if (v && typeof v === "object") {
        let r = findNavlog(v);
        if (r) return r
      }
    }
    return null
  }
  /** Profil construit depuis un OFP SimBrief (type, nom, indicatif, immatriculation, carburants), sur la base du profil local du même type ; instantané de l'OFP conservé. */
  function profileFromOFP(ofp) {
    const ac = ofp?.aircraft || {},
      atc = ofp?.atc || {},
      general = ofp?.general || {},
      params = ofp?.params || {};
    const icao = String(pick(ac, "icaocode", "icao", "type", "aircraft_type") || pick(general, "aircraft_type", "type") || "SIMBRIEF")
      .toUpperCase();
    const name = pick(ac, "name", "aircraft_name", "airframe_name", "fullname") || pick(general, "aircraft_name", "aircraft") || icao;
    const callsign = pick(atc, "callsign", "flight_number", "flightnum") || pick(ac, "callsign", "atc_callsign") || pick(params,
      "callsign") || "";
    const registration = pick(ac, "reg", "registration", "tailnumber", "tail_number") || "";
    const airframeId = ENV.active()?.simbriefAirframeId || pick(ac, "airframe_internal_id", "internal_id") || "";
    const local = Object.values(ENV.profiles() || {}).find(p => String(p.icao || p.type || p.id).toUpperCase() === icao);
    const key = `SB_${icao}_${(registration||callsign||airframeId||"latest").replace(/[^A-Za-z0-9_-]/g,"_")}`;
    let p = local ? structuredClone(local) : normalize({
      id: key,
      icao,
      type: icao,
      name,
      unit: (String(pick(params, "units") || "").toLowerCase().includes("lb") ? "lb" : "kg"),
      simbrief: true
    }, key);
    p.id = key;
    p.icao = icao;
    p.type = icao;
    p.name = name;
    p.callsign = callsign;
    p.registration = registration;
    p.simbrief = true;
    p.simbriefAirframeId = airframeId || p.simbriefAirframeId || "";
    const fuel = ofp?.fuel || {};
    const usable = firstNum(ac, ["max_fuel", "maxfuel", "fuel_capacity", "fuelcapacity"]);
    if (usable !== null) p.usableFuel = usable;
    const taxi = firstNum(fuel, ["taxi", "taxi_fuel", "taxiout"]);
    if (taxi !== null) p.taxiFuel = taxi;
    const reserve = firstNum(fuel, ["reserve", "reserve_fuel", "final_reserve"]);
    if (reserve !== null) p.reserveFuel = reserve;
    const extra = firstNum(fuel, ["extra", "extra_fuel"]);
    if (extra !== null) p.extraFuel = extra;
    const cont = firstNum(params, ["contpct", "cont_percent", "contingency_percent"]);
    if (cont !== null) p.contingencyPercent = cont;
    p.simbriefSnapshot = {
      fetchedAt: new Date().toISOString(),
      aircraft: ac,
      atc,
      params,
      times: ofp?.times || {},
      fuel
    };
    return normalize(p, key);
  }
  /** Mesures par phase (montée, croisière, descente) sur le navlog d'un OFP : durée, carburant, distance air ou sol, débit, TAS (distance air seulement), vario, Badin moyen. Phases repérées par l'altitude (croisière ≥ 98 % du max). Lève une erreur sans navlog ou sans altitudes. */
  function extractOfpCalibration(ofp) {
    const nav = findNavlog(ofp);
    if (!nav || nav.length < 2) throw Error("Navlog/waypoints exploitable absent : aucune calibration par phase possible.");
    const pts = nav.map((x, i) => ({
      raw: x,
      i,
      alt: firstNum(x, ["altitude_feet", "altitude", "altitude_ft", "altitudefeet"]),
      time: normalizeTime(firstText(x, ["time_total", "time_enroute", "time", "time_remain"])),
      fuel: firstNum(x, ["fuel_total", "fuel_enroute", "fuel", "fuel_remain"]),
      dist: firstNum(x, ["distance_total", "distance", "dist_total", "distance_nm"]),
      airDist: firstNum(x, ["air_distance", "air_distance_nm", "airdist"]),
      ias: firstNum(x, ["ind_airspeed", "ias", "indicated_airspeed"])
    }));
    const maxAlt = Math.max(...pts.map(p => p.alt ?? -Infinity));
    if (!Number.isFinite(maxAlt)) throw Error("Altitudes du navlog absentes : phases non identifiables sans les inventer.");
    const cruiseFloor = maxAlt * .98;
    /** Phase du point i du navlog : croisière près de l'altitude max, sinon montée ou descente selon la variation. */
    let phaseOf = i => {
      let p = pts[i],
        q = pts[Math.max(0, i - 1)];
      if (i === 0) return "climb";
      if ((p.alt ?? 0) >= cruiseFloor) return "cruise";
      if ((p.alt ?? 0) > (q.alt ?? 0) + 100) return "climb";
      if ((p.alt ?? 0) < (q.alt ?? 0) - 100) return "descent";
      return i < pts.findIndex(z => (z.alt ?? 0) >= cruiseFloor) ? "climb" : "descent"
    };
    const groups = {
      climb: [],
      cruise: [],
      descent: []
    };
    for (let i = 1; i < pts.length; i++) groups[phaseOf(i)].push([pts[i - 1], pts[i]]);
    /** Mesures d'une phase sur ses segments : durée, carburant, distances, débit, TAS (distance air) et vario moyens. */
    const phase = (name, segs) => {
      let time = 0,
        fuel = 0,
        dist = 0,
        air = 0,
        altDelta = 0,
        hasAir = false,
        source = [],
        iasSum = 0,
        iasN = 0;
      for (const [a, b] of segs) {
        let dt = a.time !== null && b.time !== null ? Math.abs(b.time - a.time) : null;
        if (b.ias > 0) {
          iasSum += b.ias;
          iasN++
        }
        let df = a.fuel !== null && b.fuel !== null ? Math.abs(b.fuel - a.fuel) : null;
        let dd = a.dist !== null && b.dist !== null ? Math.abs(b.dist - a.dist) : null;
        let da = a.airDist !== null && b.airDist !== null ? Math.abs(b.airDist - a.airDist) : null;
        if (dt !== null && dt > 0) {
          time += dt;
          if (df !== null) fuel += df;
          if (dd !== null) dist += dd;
          if (da !== null) {
            air += da;
            hasAir = true
          }
          if (a.alt !== null && b.alt !== null) altDelta += b.alt - a.alt
        }
        source.push(`${a.i}→${b.i}`)
      }
      let ff = time && fuel ? fuel / (time / 60) : null,
        speed = time ? (hasAir ? air : dist) / (time / 60) : null,
        vr = time && altDelta ? Math.abs(altDelta) / time : null;
      return {
        name,
        source: source.join(", "),
        timeMin: time || null,
        fuel: fuel || null,
        distanceNm: dist || null,
        airDistanceNm: hasAir ? air : null,
        fuelFlowPerHour: ff,
        tasKt: hasAir ? speed : null,
        groundSpeedKt: !hasAir ? speed : null,
        rateFpm: vr,
        estimated: !hasAir && speed !== null,
        altitudeDeltaFt: altDelta || null,
        iasKt: iasN ? iasSum / iasN : null
      };
    };
    const r = {
      climb: phase("climb", groups.climb),
      cruise: phase("cruise", groups.cruise),
      descent: phase("descent", groups.descent)
    };
    const available = Object.values(r).filter(p => p.timeMin && p.fuelFlowPerHour !== null).map(p => p.name);
    return {
      schema: "flight-perf/ofp-calibration-v1",
      cruiseAltFt: maxAlt,
      createdAt: new Date().toISOString(),
      ofpTimestamp: firstText(ofp?.params || ofp, ["time_generated", "generated", "created_at"]) || null,
      airframeId: ENV.active()?.simbriefAirframeId || null,
      aircraft: {
        icao: firstText(ofp?.aircraft || {}, ["icaocode", "type"]),
        name: firstText(ofp?.aircraft || {}, ["name", "reg"])
      },
      phases: r,
      availablePhases: available,
      partial: available.length < 3,
      notes: ["Distance air uniquement quand le navlog l’expose.",
        "Une vitesse issue de distance sol est affichée comme GS et n’est pas écrite en TAS dans le profil.", available.length === 3 ?
        "Trois phases mesurées." : `Calibration partielle : ${available.join(", ")||"aucune phase mesurable"}. Les autres valeurs sont laissées intactes.`
      ]
    };
  }
  /** Écrit dans le profil les valeurs mesurées sur l'OFP (débit, TAS, vario, Badin par phase ; altitude de croisière = altitude de référence) ; garde la calibration. Sortie : le profil. */
  function applyCalibration(p, c) {
    for (const k of ["climb", "cruise", "descent"]) {
      let q = c.phases[k],
        target = p[k] || {};
      if (q.fuelFlowPerHour !== null) target.fuelFlowPerHour = q.fuelFlowPerHour;
      if (q.tasKt !== null) target.tasKt = q.tasKt;
      if (q.rateFpm !== null && k !== "cruise") target.rateFpm = q.rateFpm;
      if (q.iasKt > 0) target.iasKt = Math.round(q.iasKt);
      if (k === "cruise" && c.cruiseAltFt > 0) target.refAltFt = Math.round(c.cruiseAltFt);
      p[k] = target
    }
    p.calibration = c;
    p.description = (p.description || "") + ` | OFP calibration ${c.createdAt}`;
    return p
  }
  /** TAS (kt) en atmosphère standard au niveau ft : depuis un Mach, ou depuis une vitesse indiquée (ias). */
  function isaTas(ft, {
    mach,
    ias
  }) {
    const h = Math.min(ft, 36089) * 0.3048,
      t = 288.15 - 0.0065 * h;
    if (mach > 0) return Math.round(mach * 38.967854 * Math.sqrt(ft > 36089 ? 216.65 : t));
    const sigma = Math.pow(t / 288.15, 4.2559) * (ft > 36089 ? Math.exp(-(ft - 36089) * 0.3048 / 6341.6) : 1);
    return ias > 0 ? Math.round(ias / Math.sqrt(sigma)) : null
  }
  /** Fiche SimBrief du type (AIRCRAFT_PERF[code].simbrief, posée par le lanceur ; alias suivis) ; null si SimBrief ne le
   *  connaît pas. */
  function simbriefRecordFor(code) {
    const perf = ENV.perfDb() || {},
      // code, chaîne d'alias, alias qui y renvoient (catalogue commun)
      k = (ENV.catalog()?.related?.(code || "") || [aKey(code || "")]).find(x => perf[x]?.simbrief?.fuelflowKgh > 0);
    return k ? perf[k].simbrief : null
  }
  /** Valeurs EUROCONTROL APD proposées pour les champs du profil p. Sortie : { code, data (fiche APD), fields : chemin → { v : valeur, how : explication } } ou null si le type n'a pas de fiche. Vario moyen de montée / descente calculé par tranches APD jusqu'à l'altitude de référence. */
  function apdFor(p) {
    const perf = ENV.perfDb() || {},
      code = String(p?.icao || p?.type || p?.id || "").toUpperCase().replace(/[^A-Z0-9]/g, ""),
      key = (ENV.catalog()?.related?.(code) || [code]).find(k => perf[k]); // fiche rangée sous un code équivalent
    const a = key && perf[key];
    if (!a) return null;
    const out = {},
      set = (path, v, how) => {
        if (Number.isFinite(v) && v > 0) out[path] = {
          v: Math.round(v),
          how
        }
      },
      c = a.cruise || {},
      ceil = c.ceilingFL ? c.ceilingFL * 100 : null;
    // altitude de référence : celle où TAS / Mach de l'APD donnent la même vitesse du son (sous la tropopause), sinon près du plafond
    let ref = null;
    if (c.tasKt && c.mach) {
      const T = (c.tasKt / c.mach / 38.9679) ** 2;
      ref = T > 216.65 ? (288.15 - T) / .0019812 : Math.min((ceil || 41000) - 2000, 39000)
    } else if (ceil) ref = .8 * ceil;
    if (ref) ref = Math.round(ref / 1000) * 1000;
    const top = +p?.cruise?.refAltFt || ref || (ceil ? .8 * ceil : null);
    // vario moyen jusqu'à l'altitude de référence, par tranches APD (0–5000, 5000–FL150, FL150–FL240, au-dessus : montée en Mach)
    const segs = [
      [0, 5000, a.climbInitial?.rocFpm],
      [5000, 15000, a.climb150?.rocFpm],
      [15000, 24000, a.climb240?.rocFpm],
      [24000, 1e9, a.machClimb?.rocFpm]
    ];
    let last = null,
      t = 0;
    if (top) {
      for (const [lo, hi, r0] of segs) {
        const r = r0 || last;
        if (r) last = r;
        const dh = Math.max(0, Math.min(hi, top) - lo);
        if (dh && r) t += dh / r
      }
    }
    // vario moyen de descente depuis l'altitude de référence (descente initiale en Mach, puis FL240–FL100, puis approche)
    const dsegs = [
      [24000, 1e9, a.descentInitial?.rodFpm],
      [10000, 24000, a.descent?.rodFpm],
      [0, 10000, a.approach?.rodFpm || a.descent?.rodFpm]
    ];
    let dt = 0,
      dl = null;
    if (top) {
      for (const [lo, hi, r0] of dsegs) {
        const r = r0 || dl;
        if (r) dl = r;
        const dh = Math.max(0, Math.min(hi, top) - lo);
        if (dh && r) dt += dh / r
      }
    }
    /** Libellé [fr, en, de, es] dans la langue de la page. */
    const T = v => tl(...v);
    set("cruise.tasKt", c.tasKt, T(["TAS de croisière", "cruise TAS", "Reiseflug-TAS", "TAS de crucero"]));
    set("cruise.ceilingFt", ceil, T(["plafond", "ceiling", "Gipfelhöhe", "techo"]));
    set("cruise.refAltFt", ref, T([`déduite de TAS ${c.tasKt} kt / Mach ${c.mach}`, `derived from TAS ${c.tasKt} kt / Mach ${c.mach}`, `abgeleitet aus TAS ${c.tasKt} kt / Mach ${c.mach}`, `deducida de TAS ${c.tasKt} kt / Mach ${c.mach}`]));
    set("climb.iasKt", a.climb150?.iasKt ?? a.climb240?.iasKt ?? a.climbInitial?.iasKt, T(["Badin de montée (jusqu’au FL150)",
      "climb IAS (to FL150)", "Steig-IAS (bis FL150)", "IAS de ascenso (hasta FL150)"
    ]));
    if (t) set("climb.rateFpm", top / t, T([`vario moyen jusqu’à ${flTxt(top)} (tranches APD)`, `average rate to ${flTxt(top)} (APD segments)`, `mittlere Steigrate bis ${flTxt(top)} (APD-Abschnitte)`, `régimen medio hasta ${flTxt(top)} (tramos APD)`]));
    set("descent.iasKt", a.descent?.iasKt, T(["Badin de descente (FL240–FL100)", "descent IAS (FL240–FL100)", "Sink-IAS (FL240–FL100)",
      "IAS de descenso (FL240–FL100)"
    ]));
    if (dt) set("descent.rateFpm", top / dt, T([`vario moyen de descente depuis ${flTxt(top)}`, `average descent rate from ${flTxt(top)}`, `mittlere Sinkrate ab ${flTxt(top)}`, `régimen medio de descenso desde ${flTxt(top)}`]));
    if (a.takeoff?.distanceM) set("minRunwayLengthFt", a.takeoff.distanceM * 3.28084, T([`distance de décollage ${a.takeoff.distanceM} m`, `take-off distance ${a.takeoff.distanceM} m`, `Startstrecke ${a.takeoff.distanceM} m`, `distancia de despegue ${a.takeoff.distanceM} m`]));
    return {
      code: key,
      data: a,
      fields: out
    };
  }
  /** Profil construit depuis la fiche SimBrief du type : consommation de croisière, plafond, vitesse (Mach ou vitesse
   *  indiquée, TAS au niveau de référence), Badin de montée et de descente des profils SimBrief, carburant utilisable,
   *  piste, masses et moteurs en description ; identifiant « SB_TYPE_<code> », unité kg. */
  function profileFromSimbriefType(code, sb) {
    const c = aKey(code),
      ceil = +sb.ceilingFt || null,
      ref = sb.mach ? Math.min(ceil || 35000, 35000) : Math.round((ceil || 10000) * 0.6 / 1000) * 1000,
      climbIas = +String(sb.climb?.[0] || "").split("/")[1] || +String(sb.climb?.[0] || "").split("/")[0] || null,
      descIas = +String(sb.descent?.[0] || "").split("/")[1] || null,
      kg = v => v > 0 ? `${fmt(v, 0)} kg` : null,
      masses = [
        ["MTOW", kg(sb.mtowKg)],
        ["OEW", kg(sb.oewKg)],
        ["MZFW", kg(sb.mzfwKg)],
        ["MLW", kg(sb.mlwKg)]
      ].filter(x => x[1]).map(x => x.join(" ")).join(", ");
    return normalize({
      id: `SB_TYPE_${c}`,
      icao: c,
      type: c,
      name: `${sb.name || c} — SimBrief`,
      unit: "kg",
      simbrief: true,
      simbriefType: structuredClone(sb),
      usableFuel: sb.maxFuelKg || undefined,
      minRunwayLengthFt: sb.takeoffM ? Math.round(sb.takeoffM * 3.28084) : undefined,
      cruise: {
        fuelFlowPerHour: sb.fuelflowKgh,
        tasKt: isaTas(ref, {
          mach: sb.mach,
          ias: sb.speedKt
        }) || undefined,
        iasKt: sb.speedKt || undefined,
        ceilingFt: ceil || undefined,
        refAltFt: ref
      },
      climb: climbIas ? {
        iasKt: climbIas
      } : {},
      descent: descIas ? {
        iasKt: descIas
      } : {},
      description: [`SimBrief : ${sb.name || c}${sb.engines ? `, ${sb.engines}` : ""}${masses ? ` ; ${masses}` : ""}${sb.accuracy === "high" ? "" : " ; " + kt(["précision non garantie par SimBrief", "accuracy not guaranteed by SimBrief", "Genauigkeit von SimBrief nicht garantiert", "precisión no garantizada por SimBrief"])}`].join(""),
      source: {
        format: "SimBrief (liste publique des types)",
        importedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    }, c)
  }
  /** Complète les champs vides de target avec ceux de source (unités converties), sans écraser une valeur existante ; tables RPM fusionnées. Sortie : target. */
  function fillProfileGaps(target, source) {
    if (!target || !source || target === source) return target;
    let src = structuredClone(source);
    if (src.unit && target.unit && src.unit !== target.unit) src = fuelConvertedCopy(src, src.unit, target.unit, ["kg", "lb"].includes(src
      .unit) && ["kg", "lb"].includes(target.unit));
    /** Fusion récursive : champs vides de t remplis par s (clés exclues ignorées, tables RPM fusionnées). */
    const merge = (t, s) => {
      for (const [k, v] of Object.entries(s)) {
        if (SKIP_MERGE_KEYS.has(k)) continue;
        if (k === "rpmFuelCurve") {
          t[k] = mergeCurves(t[k], v);
          continue
        }
        if (isBlankValue(t[k])) {
          if (!isBlankValue(v)) t[k] = v;
          continue
        }
        if (v && typeof v === "object" && !Array.isArray(v) && typeof t[k] === "object" && !Array.isArray(t[k])) merge(t[k], v)
      }
    };
    merge(target, src);
    return target
  }
  /** Date la plus récente connue d'un profil (modification, import, OFP SimBrief, calibration) en ms ; 0 si aucune. */
  function profileWhen(p) {
    const d = v => Date.parse(v || "") || 0;
    return Math.max(d(p?.updatedAt), d(p?.source?.importedAt), d(p?.simbriefSnapshot?.fetchedAt), d(p?.calibration?.at), d(p?.calibration
      ?.appliedAt))
  }
  /** Valeurs renseignées d'un profil à plat : { « cruise.tasKt » : valeur… } (identifiants, unité, sources et table RPM à
   *  part). */
  function profileLeaves(p, prefix = "", out = {}) {
    for (const [k, v] of Object.entries(p || {})) {
      if (SKIP_MERGE_KEYS.has(k) || k === "rpmFuelCurve" || k.startsWith("_")) continue;
      const path = prefix + k;
      if (v && typeof v === "object" && !Array.isArray(v)) profileLeaves(v, path + ".", out);
      else if (!isBlankValue(v)) out[path] = JSON.stringify(v)
    }
    return out
  }
  /** Libellé d'un champ de profil (PROFILE_FIELDS : « Croisière · TAS (kt) »), sinon son chemin. */
  function profileFieldLabel(path) {
    const f = PROFILE_FIELDS.find(x => x[2] === path);
    return f ? `${f[0]} · ${f[1]}` : path
  }
  /** Clé de rapprochement d'une ligne de cartographie (régime au millième, altitude) ; null sans régime. */
  function curveKey(r) {
    return r && r.rpm !== null && r.rpm !== "" && Number.isFinite(Number(r.rpm)) ? `${Math.round(Number(r.rpm) * 1000)}@${r.altFt ?? ""}` :
      null
  }
  /** Écart entre deux profils pour l'aperçu : champs { path, label, old, now, src, changed } (date de modification et
   *  fiche SimBrief brute à part ; src : origin[chemin], sinon defaultSrc pour un champ qui change), lignes de cartographie
   *  ajoutées ou remplacées { key, kind, label, old, now }, nombre de changements. */
  function profileDiff(before, after, origin = {}, defaultSrc = "") {
    const skip = k => k === "updatedAt" || k === "simbrief" || k.startsWith("simbriefType."),
      a = profileLeaves(before ? normalize(structuredClone(before)) : {}),
      b = profileLeaves(after),
      rows = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => !skip(k)).map(k => ({
        path: k,
        label: profileFieldLabel(k),
        old: a[k],
        now: b[k],
        changed: a[k] !== b[k],
        src: origin[k] || (a[k] !== b[k] ? defaultSrc : "")
      })),
      plain = r => JSON.stringify(r, (k, v) => k.startsWith("_") ? undefined : v),
      was = new Map((before?.rpmFuelCurve || []).map(r => [curveKey(r), r])),
      ff = r => r ? `${Math.round(Number(r.fuelFlowPerHour) * 10) / 10}` : "—",
      curve = [];
    for (const r of after?.rpmFuelCurve || []) {
      const k = curveKey(r);
      if (k === null) continue;
      const o = was.get(k);
      if (o && plain(o) === plain(r)) continue;
      curve.push({
        key: k,
        kind: o ? "replaced" : "added",
        label: `${r.rpm}${r.altFt !== null && r.altFt !== undefined && r.altFt !== "" ? ` @ ${r.altFt} ft` : ""}${r.phaseLabel ? ` (${r.phaseLabel})` : ""}`,
        old: o ? ff(o) : "—",
        now: ff(r)
      })
    }
    const added = curve.filter(c => c.kind === "added").length;
    return {
      rows,
      curve,
      added,
      replaced: curve.length - added,
      changed: rows.filter(r => r.changed).length + curve.length
    }
  }
  /** Profil after où les données décochées de l'aperçu (sel.skip : chemins de champs, sel.skipCurve : clés de lignes de
   *  cartographie) reprennent leur valeur de before ; champs estimés recalculés en conséquence. */
  function pickChanges(before, after, diff, sel) {
    const out = structuredClone(after),
      b = normalize(structuredClone(before || {}));
    for (const path of sel.skip) {
      const v = pathGet(b, path);
      pathSet(out, path, v === undefined ? null : structuredClone(v))
    }
    if (sel.skipCurve.size) {
      const old = new Map((b.rpmFuelCurve || []).map(r => [curveKey(r), r]));
      out.rpmFuelCurve = (out.rpmFuelCurve || []).flatMap(r => {
        const k = curveKey(r);
        if (!sel.skipCurve.has(k)) return [r];
        return old.has(k) ? [structuredClone(old.get(k))] : [] // remplacée : l'ancienne revient ; ajoutée : retirée
      })
    }
    const est = [...(after.estimatedFields || []).filter(k => !sel.skip.has(k)), ...(b.estimatedFields || []).filter(k => sel.skip.has(
      k))];
    if (est.length) out.estimatedFields = [...new Set(est)];
    else delete out.estimatedFields;
    return out
  }
  /** Nom court d'une source de fusion (colonne « Source » de l'aperçu). */
  function mergeSourceShort(p) {
    return p._simbriefSource ? "SimBrief" : p._gptSource ? "ChatGPT" : p.name || p.id
  }
  /** Origine d'un profil en clair : OFP SimBrief calibré, SimBrief, Little Navmap, CSV, JSON, saisie ; « aucun profil »
   *  pour un type de la flotte ou du Landing sans profil, suivi de l'estimation de consommation s'il y en a une.
   *  info : profileInfo(p) déjà calculé (facultatif). */
  function profileSourceText(p, info) {
    if (p._landingOnly) {
      const i = info || profileInfo(p);
      return i.s.auto ? ktf(["aucun profil — {src}", "no profile — {src}", "kein Profil — {src}", "sin perfil — {src}"], {
        src: ffSourceText(i.s, i.s.auto.kind)
      }) : kt(["aucun profil", "no profile", "kein Profil", "sin perfil"])
    }
    if (p.calibration) return kt(["OFP SimBrief (calibré)", "SimBrief OFP (calibrated)", "SimBrief-OFP (kalibriert)",
      "OFP SimBrief (calibrado)"
    ]);
    if (p.simbriefSnapshot || p.simbrief) return "SimBrief";
    if (p.lnmSource) return "Little Navmap (.lnmperf)";
    const f = String(p.source?.format || "");
    if (/chatgpt/i.test(f)) return "ChatGPT";
    if (/class/i.test(f)) return kt(["estimé par la classe", "estimated from the class", "aus der Klasse geschätzt",
      "estimado por la clase"
    ]);
    if (/csv/i.test(f)) return "CSV";
    if (/json/i.test(f)) return "JSON";
    return kt(["saisie", "manual entry", "manuelle Eingabe", "entrada manual"])
  }
  /** Libellé d'une source de fusion : « nom » (source), avec la date de la fiche SimBrief. */
  function mergeSourceName(p) {
    if (p._gptSource) return ktf(["« ChatGPT » (réponse du {d})", "“ChatGPT” (answer of {d})", "„ChatGPT“ (Antwort vom {d})",
      "«ChatGPT» (respuesta del {d})"
    ], {
      d: new Date(p.updatedAt || Date.now()).toLocaleDateString()
    });
    return p._simbriefSource ? ktf(["« {p} » (fiche SimBrief du {d})", "“{p}” (SimBrief record of {d})",
      "„{p}“ (SimBrief-Eintrag vom {d})",
      "«{p}» (ficha SimBrief del {d})"
    ], {
      p: p.name,
      d: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—"
    }) : `« ${p.name || p.id} » (${profileSourceText(normalize(structuredClone(p)))})`
  }
  /** Réunit des sources (profils, fiche SimBrief virtuelle) dans le profil keeper : champ par champ, la valeur du plus
   *  récent qui l'a (le plus récent sert de base, les autres comblent ses manques dans l'ordre de leur date), table RPM
   *  réunie ; keeper garde son identifiant, son nom (ou name), son unité, sa source et sa description, complétée de la
   *  liste des sources. Rien n'est enregistré (aperçu d'abord) ; retour { target, before, base, took, names, origin }
   *  (origin : chemin du champ → source retenue). */
  function mergeProfileSources(keeper, sources, name) {
    const recent = [...sources].sort((a, b) => profileWhen(b) - profileWhen(a)),
      before = structuredClone(keeper),
      names = recent.map(mergeSourceName).join(", "),
      target = normalize(structuredClone(recent[0])),
      took = [];
    if (recent[0] !== keeper) {
      // base plus récente que le profil gardé : son identité reprend le dessus, ses valeurs comblent les manques ensuite
      for (const k of ["simbrief", "simbriefType", "_simbriefSource", "_gptSource", "lnmSource", "mergedProfileIds"]) delete target[k];
      Object.assign(target, {
        id: keeper.id,
        name: keeper.name,
        unit: keeper.unit || target.unit,
        source: structuredClone(keeper.source),
        description: keeper.description || ""
      });
      for (const k of ["simbrief", "simbriefType", "lnmSource"])
        if (keeper[k] !== undefined) target[k] = structuredClone(keeper[k])
    }
    const origin = {},
      kl = profileLeaves(keeper);
    for (const [k, v] of Object.entries(profileLeaves(target))) origin[k] = mergeSourceShort(kl[k] === v ? keeper : recent[0]);
    if (recent[0] !== keeper) {
      // base plus récente : ce qu'elle change dans le profil gardé est « repris » d'elle
      const fromBase = Object.keys(origin).filter(k => k !== "updatedAt" && origin[k] === mergeSourceShort(recent[0]) && origin[k] !==
        mergeSourceShort(
          keeper));
      if (fromBase.length) took.push(`${recent[0].name || recent[0].id} : ${fromBase.map(profileFieldLabel).join(", ")}`)
    }
    for (const p of recent.slice(1)) {
      const was = profileLeaves(target),
        rows = (target.rpmFuelCurve || []).length;
      fillProfileGaps(target, p);
      const now = profileLeaves(target),
        fresh = Object.keys(now).filter(k => !(k in was)),
        fields = fresh.map(profileFieldLabel),
        added = (target.rpmFuelCurve || []).length - rows;
      for (const k of fresh) origin[k] = mergeSourceShort(p);
      if (fields.length || added) took.push(`${p.name || p.id} : ${[...fields, ...(added ? [ktf(["cartographie +{n} ligne(s)",
        "engine map +{n} row(s)", "Motorkennfeld +{n} Zeile(n)", "mapa motor +{n} fila(s)"
      ], {
        n: added
      })] : [])].join(", ")}`)
    }
    // champs estimés : ceux qui viennent d'une source qui les disait estimés ; références (ChatGPT) de toutes les sources
    const est = recent.flatMap(x => (x.estimatedFields || []).filter(k => origin[k] === mergeSourceShort(x))),
      refs = recent.flatMap(x => x.gptSources || []);
    if (est.length) target.estimatedFields = [...new Set(est)];
    else delete target.estimatedFields;
    if (refs.length) target.gptSources = refs.filter((x, i) => refs.findIndex(y => JSON.stringify(y) === JSON.stringify(x)) === i);
    target.name = name || keeper.name || target.name;
    target.updatedAt = new Date().toISOString();
    target.mergedProfileIds = [...new Set([...(target.mergedProfileIds || []), ...recent.filter(p => p.id !== keeper.id && !p
      ._simbriefSource).map(p => p.id)])];
    return {
      target,
      before,
      base: recent[0],
      took,
      names,
      origin,
      // notes et sources d'une réponse ChatGPT, gardées dans la description (finishMerge)
      notes: recent.filter(x => x._gptSource && x.description && x !== keeper).map(x => `ChatGPT — ${x.description}`)
    }
  }
  /** Même clé à la casse et aux séparateurs près (ICAO, cruise_tas, « fuel flow per hour »). */
  function gptKeyEq(a, b) {
    return String(a).toLowerCase().replace(/[^a-z0-9]/g, "") === String(b).toLowerCase().replace(/[^a-z0-9]/g, "")
  }
  /** JSON d'un texte : le premier objet (ou tableau) lisible entre accolades équilibrées, après nettoyage — guillemets
   *  typographiques, commentaires // et /* *\/, virgules finales, NaN/Infinity ; null si rien ne se lit (dernière erreur
   *  relancée). */
  function gptJsonParse(text) {
    let t = String(text || "").replace(/[\u201c\u201d\u201e]/g, '"').replace(/[\u2018\u2019]/g, "'"),
      err = null;
    const clean = x => x.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1").replace(/,\s*([}\]])/g, "$1").replace(
      /:\s*(NaN|-?Infinity)\b/g, ": null");
    for (const open of ["{", "["]) {
      const close = open === "{" ? "}" : "]";
      let from = 0;
      while ((from = t.indexOf(open, from)) >= 0) {
        // fin de l'objet : accolades équilibrées hors chaînes
        let depth = 0,
          str = false,
          esc = false,
          end = -1;
        for (let i = from; i < t.length; i++) {
          const ch = t[i];
          if (str) {
            if (esc) esc = false;
            else if (ch === "\\") esc = true;
            else if (ch === '"') str = false;
            continue
          }
          if (ch === '"') str = true;
          else if (ch === "{" || ch === "[") depth++;
          else if (ch === "}" || ch === "]") {
            if (--depth === 0) {
              end = i;
              break
            }
          }
        }
        if (end < 0) break;
        const raw = t.slice(from, end + 1);
        for (const v of [raw, clean(raw)]) try {
          const o = JSON.parse(v);
          if (o && typeof o === "object") return o
        } catch (x) {
          err = x
        }
        from = end + 1
      }
    }
    if (err) throw err;
    return null
  }
  /** Objet de la fiche dans ce que ChatGPT a rendu : un tableau → son premier objet ; un objet enveloppant (une seule clé,
   *  ou profile / aircraft / data / result / performance / output) → son contenu, tant que l'objet courant n'a aucune clé du
   *  schéma S. */
  function gptJsonUnwrap(o, S) {
    const keys = Object.keys(S || {}),
      known = x => x && typeof x === "object" && !Array.isArray(x) && Object.keys(x).some(k => keys.some(sk => gptKeyEq(k, sk)));
    for (let i = 0; i < 4 && o; i++) {
      if (Array.isArray(o)) {
        o = o.find(x => x && typeof x === "object") || null;
        continue
      }
      if (known(o)) return o;
      if (typeof o !== "object") return null;
      const ks = Object.keys(o),
        wrap = ks.find(k => /^(profile|aircraft|data|result|performance|output|fiche|response|answer)$/i.test(k) && o[k] && typeof o[
            k] ===
          "object") || (ks.length === 1 && o[ks[0]] && typeof o[ks[0]] === "object" ? ks[0] : null);
      if (!wrap) return null;
      o = o[wrap]
    }
    return known(o) ? o : null
  }
  /** Réponse ramenée au schéma S : clés renommées comme dans le schéma (deux niveaux, lignes de cartographie comprises) ;
   *  une valeur donnée en objet ({ value, unit, source }, { min, max }, { nominal }) ramenée à son nombre ; un nombre en
   *  texte avec séparateurs de milliers (« 1 200 », « 1'200 ») nettoyé. Une unité par champ contraire à celle de la fiche
   *  (lb/h dans une fiche kg) est convertie et signalée en warnings. */
  /** Premier nombre d'un texte de ChatGPT écrit sans ambiguïté (point décimal, sans séparateur de milliers), le reste
   *  du texte (unités) gardé : virgules de milliers (« 2,400 », « 1,234.5 » ; groupes de trois chiffres, premier groupe
   *  non nul) retirées ; points de milliers et virgule décimale à l'européenne (« 2.400,5 ») ; sinon une virgule seule est
   *  décimale (« 2,5 », « 0,850 »). Correctif V3 du défaut V2 qui lisait « 2,400 » comme 2,4 (DECISIONS.md). */
  function gptNumberText(s) {
    return String(s).replace(/-?\d[\d.,]*/, m => {
      if (/^-?[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/.test(m)) return m.replace(/,/g, "");
      if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(m)) return m.replace(/\./g, "").replace(",", ".");
      if (/^-?\d+,\d+$/.test(m)) return m.replace(",", ".");
      return m
    })
  }

  function gptJsonNormalize(obj, S, warnings) {
    const unit = String(obj.unit ?? Object.entries(obj).find(([k]) => gptKeyEq(k, "unit"))?.[1] ?? "kg").trim().toLowerCase(),
      badUnit = [],
      scalar = (v, path) => {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          const e = Object.entries(v),
            get = n => e.find(([k]) => gptKeyEq(k, n))?.[1],
            u = String(get("unit") || "").toLowerCase(),
            val = get("value") ?? get("val") ?? get("v") ?? get("nominal") ?? get("typical") ?? get("mean") ?? (
              get("min") !== undefined && get("max") !== undefined ? (Number(get("min")) + Number(get("max"))) / 2 : undefined);
          // unité par champ contraire à celle de la fiche (lb/h dans une fiche kg) : convertie, et signalée
          const fu = /fuel/i.test(path) && u ? (/\blbs?\b/.test(u) ? "lb" : /\bkg\b/.test(u) ? "kg" : "") : "";
          if (fu && fu !== unit && val !== undefined) {
            const n = Number(scalar(val, path));
            if (Number.isFinite(n)) {
              badUnit.push(`${path} (${u})`);
              return fu === "lb" ? n * KG_PER_LB : n / KG_PER_LB
            }
          }
          return val === undefined ? undefined : scalar(val, path)
        }
        if (typeof v === "string") {
          const n = v.trim().replace(/(\d)[\s\u00a0\u202f'](?=\d{3}\b)/g, "$1");
          return gptNumberText(n)
        }
        return v
      },
      rename = (o, schema, prefix = "") => {
        const out = {};
        for (const [k, v] of Object.entries(o || {})) {
          const sk = Object.keys(schema).find(x => gptKeyEq(x, k)) || k,
            path = prefix ? `${prefix}.${sk}` : sk;
          if (sk === "rpmFuelCurve" && Array.isArray(v)) out[sk] = v.map(r => r && typeof r === "object" ? rename(r, schema.rpmFuelCurve
            ?.[
              0
            ] || {}, "rpmFuelCurve") : r);
          else if (["estimated", "sources", "notes", "unit", "name", "icao"].includes(sk)) out[sk] = sk === "estimated" && typeof v ===
            "string" ? v.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean) : sk === "estimated" && v && typeof v === "object" && !Array
            .isArray(v) ? Object.keys(v).filter(x => v[x]) : v;
          else if (schema[sk] && typeof schema[sk] === "object" && !Array.isArray(schema[sk])) out[sk] = v && typeof v === "object" && !
            Array.isArray(v) && !("value" in v) ? rename(v, schema[sk], path) : scalar(v, path);
          else out[sk] = scalar(v, path)
        }
        return out
      },
      out = rename(obj, S);
    if (badUnit.length && warnings) warnings.push(ENV.kit().tf([
      "Unité par champ différente de celle de la fiche ({u}), valeur convertie : {list}.",
      "Per-field unit differs from the sheet's ({u}), value converted: {list}.",
      "Einheit je Feld weicht von der des Eintrags ab ({u}), Wert umgerechnet: {list}.",
      "Unidad por campo distinta de la de la ficha ({u}), valor convertido: {list}."
    ], {
      u: unit,
      list: badUnit.join(", ")
    }));
    return out
  }
  /** Chemins du schéma de réponse (PERF_PROMPT_SCHEMA) renseignables un par un : valeurs simples à la racine et dans
   *  taxi / climb / cruise / descent (identité, unité, textes, cartographie et listes à part). */
  function gptSchemaPaths() {
    const out = [];
    for (const [k, v] of Object.entries(ENV.prompt().schema || {})) {
      if (["name", "icao", "unit", "rpmPowerReference", "rpmFuelCurve", "estimated", "sources", "notes"].includes(k)) continue;
      if (v && typeof v === "object" && !Array.isArray(v)) out.push(...Object.keys(v).map(x => `${k}.${x}`));
      else out.push(k)
    }
    return out
  }
  /** Champs vides d'une fiche (chemins du schéma), plus « rpmFuelCurve » quand elle n'a aucune ligne de cartographie ;
   *  sans ceux que la base OACI donne (cellule, propulsion, pressurisation), jamais demandés à ChatGPT ; l'altitude de
   *  rétablissement (moteur suralimenté) n'est comptée et demandée que pour un moteur à pistons ou une propulsion inconnue
   *  (propulsion en vigueur : celle de la fiche, sinon celle de la base). */
  function sheetMissingPaths(p) {
    const facts = catalogFacts(p),
      propulsion = effectiveFacts(p).propulsion,
      paths = gptSchemaPaths().filter(k => !(k in facts) && !(k === "engineCriticalAltFt" && propulsion && propulsion !== "piston") &&
        isBlankValue(pathGet(p, k)));
    if (!(p.rpmFuelCurve || []).some(r => r.rpm !== null && r.rpm !== "" && Number.isFinite(+r.rpm))) paths.push("rpmFuelCurve");
    return paths
  }
  // familles de champs manquants, dans l'ordre où la liste des fiches les nomme
  const MISSING_FAMILIES = ["rpm", "speeds", "cruise", "rates", "flows", "taxi", "runway", "fuel", "aircraft", "other"];
  /** Famille d'un chemin de champ : rpm (régimes et cartographie), speeds (IAS, TAS), cruise (plafond, altitude de
   *  référence, débit de croisière), rates (varios), flows (débits de montée, descente, dégagement), taxi, runway, fuel,
   *  aircraft (cellule, propulsion, pressurisation, altitude de rétablissement), other. */
  function sheetMissingFamily(path) {
    if (/rpm/i.test(path)) return "rpm";
    if (/(iasKt|tasKt)$/.test(path)) return "speeds";
    if (/^cruise\.(ceilingFt|refAltFt|fuelFlowPerHour)$/.test(path)) return "cruise";
    if (/rateFpm$/.test(path)) return "rates";
    if (/^taxi\.|^taxiFuel$/.test(path)) return "taxi";
    if (/fuelFlowPerHour$/.test(path)) return "flows";
    if (/^(minRunwayLengthFt|runwayType)$/.test(path)) return "runway";
    if (/^(usableFuel|reserveFuel|extraFuel|contingencyPercent|jetFuel)$/.test(path)) return "fuel";
    if (/^(airframe|propulsion|pressurized|engineCriticalAltFt)$/.test(path)) return "aircraft";
    return "other"
  }
  /** Familles des champs manquants (chemins de sheetMissingPaths), une fois chacune, dans l'ordre de MISSING_FAMILIES. */
  function sheetMissingFamilies(paths) {
    const seen = new Set((paths || []).map(sheetMissingFamily));
    return MISSING_FAMILIES.filter(f => seen.has(f))
  }
  /** Modèle de réponse d'une fiche : son id, ses champs vides seulement (valeurs du schéma : null, ou choix proposés),
   *  estimated, sources, notes. */
  function sheetMissingModel(p, paths) {
    const S = ENV.prompt().schema || {},
      o = {
        id: p.id
      };
    for (const k of paths) {
      if (k === "rpmFuelCurve") {
        o.rpmPowerReference = "";
        o.rpmFuelCurve = structuredClone(S.rpmFuelCurve || []);
        continue
      }
      const [a, b] = k.split(".");
      if (b)(o[a] ||= {})[b] = S[a]?.[b] ?? null;
      else o[a] = S[a] ?? null
    }
    return Object.assign(o, {
      estimated: [],
      sources: [],
      notes: ""
    })
  }
  /** Motorisation connue en clair : description OACI (nombre et nature des moteurs), moteurs SimBrief, motorisation du
   *  profil. */
  function gptEngines(p, code) {
    // classement commun (AircraftCatalog.classify : alias suivis, ballon et dirigeable compris)
    const c = ENV.catalog()?.classify?.(code) || {},
      kind = {
        J: ["réacteur(s)", "jet engine(s)", "Strahltriebwerk(e)", "reactor(es)"],
        T: ["turbine(s) (turbopropulseur ou turbomoteur)", "turbine(s) (turboprop or turboshaft)",
          "Turbine(n) (Turboprop oder Wellenturbine)",
          "turbina(s) (turbohélice o turboeje)"
        ],
        P: ["moteur(s) à pistons", "piston engine(s)", "Kolbenmotor(en)", "motor(es) de pistón"],
        E: ["moteur(s) électrique(s)", "electric motor(s)", "Elektromotor(en)", "motor(es) eléctrico(s)"]
      } [c.power],
      sb = simbriefRecordFor(code),
      out = [];
    const what = c.kind === "airship" ? kt([", dirigeable", ", airship", ", Luftschiff", ", dirigible"]) : c.category === "helico" ? kt([
      ", hélicoptère", ", helicopter", ", Hubschrauber", ", helicóptero"
    ]) : "";
    if (kind) out.push(`${c.engines || "?"} ${kt(kind)}${what}`);
    if (sb?.engines) out.push(`SimBrief — ${sb.engines}`);
    const eff = effectiveFacts(p, code);
    if (eff.airframe) out.push(`airframe = ${eff.airframe}`);
    if (eff.propulsion) out.push(`propulsion = ${eff.propulsion}`);
    return out.join(" ; ") || kt(["inconnue", "unknown", "unbekannt", "desconocida"])
  }
  /** Ce que la suite sait déjà du type, une ligne par source (EUROCONTROL APD, SimBrief, Airframe DB, profil actuel) ;
   *  valeurs nommées par leur chemin dans le schéma. */
  function gptKnown(p, code, landing) {
    const lines = [],
      colon = kt([" :", ":", ":", ":"]), // typographie de la langue du prompt
      apd = apdFor({
        icao: code
      }),
      sb = simbriefRecordFor(code),
      af = (ENV.perfDb() || {})[code]?.airframedb;
    if (apd?.fields && Object.keys(apd.fields).length) lines.push(`- EUROCONTROL Aircraft Performance Database${colon} ${Object.entries(apd.fields).map(([k, x]) => `${k} = ${x.v} (${x.how})`).join(" ; ")}`);
    if (sb) lines.push(`- SimBrief (${kt(["liste publique des types", "public type list", "öffentliche Typenliste", "lista pública de tipos"])})${colon} ${[
        ["fuelflowKgh", "kg/h"], ["ceilingFt", "ft"], ["mach", ""], ["speedKt", "kt"], ["maxFuelKg", "kg"], ["mtowKg", "kg"], ["oewKg", "kg"],
        ["mzfwKg", "kg"], ["mlwKg", "kg"], ["takeoffM", "m"], ["landingM", "m"]
      ].filter(([k]) => sb[k]).map(([k, u]) => `${k} = ${sb[k]}${u ? " " + u : ""}`).concat(sb.climb?.length ? [`climb = ${sb.climb.join(" / ")}`] : [],
        sb.descent?.length ? [`descent = ${sb.descent.join(" / ")}`] : []).join(" ; ")}`);
    if (af) lines.push(`- Airframe DB (${af.url || "airframedb.com"})${colon} ${Object.entries(af).filter(([k, v]) => !["url", "fetched", "name"].includes(k) && v !== null && v !== "" && typeof v !== "object").map(([k, v]) => `${k} = ${v}`).join(" ; ")}`);
    if (p && !landing) {
      const leaves = profileLeaves(p),
        keys = Object.keys(leaves).filter(k => !["name", "icao", "type", "description", "updatedAt", "simbrief"].includes(k) && !
          /^(simbriefType|simbriefSnapshot|calibration|tod|source)\b/.test(k)),
        map = (p.rpmFuelCurve || []).filter(r => r.rpm !== null && r.rpm !== "" && Number.isFinite(+r.rpm));
      lines.push(`- ${ktf(["Profil actuel « {p} » (unité {u})", "Current profile “{p}” (unit {u})", "Aktuelles Profil „{p}“ (Einheit {u})",
        "Perfil actual «{p}» (unidad {u})"
      ], {
        p: p.name || p.id,
        u: p.unit || "kg"
      })}${colon} ${keys.map(k => `${k} = ${[].concat(JSON.parse(leaves[k])).join(", ")}`).join(" ; ") || "—"}${map.length ? ` ; rpmFuelCurve = ${map.map(r => `${r.rpm}${Number.isFinite(+r.altFt) && r.altFt !== null && r.altFt !== "" ? ` @ ${r.altFt} ft` : ""} → ${r.fuelFlowPerHour ?? "?"}`).join(", ")}` : ""}`)
    }
    return lines.join("\n") || kt(["- rien", "- nothing", "- nichts", "- nada"])
  }
  /** Code OACI de l'entrée du panneau. */
  function gptCode(e = gptFor) {
    const p = gptProfileOf(e);
    return aKey(p?.icao || p?.type || p?.id || e?.id || "")
  }
  /** Prompt rempli pour l'entrée e (langue de la page) ; chaîne vide si perf_prompt.js n'est pas chargé. */
  function gptPrompt(e = gptFor) {
    const base = ENV.prompt().profile?.[KIT.lang()] || ENV.prompt().profile?.fr;
    if (!base || !e) return "";
    const p = gptProfileOf(e),
      code = gptCode(e),
      model = (ENV.typeDb() || {})[code]?.model || p?.name || code,
      fleet = (ENV.catalog()?.defaTypes() || []).find(t => aKey(t.type) === code),
      variant = (p?.name && p.name !== model && !e.landing ? ktf([", variante « {v} »", ", variant “{v}”", ", Variante „{v}“",
        ", variante «{v}»"
      ], {
        v: p.name
      }) : "") + (fleet ? ktf([" ; flotte : {m}, {n} appareil(s)", "; fleet: {m}, {n} aircraft", "; Flotte: {m}, {n} Luftfahrzeug(e)",
        "; flota: {m}, {n} aeronave(s)"
      ], {
        m: fleet.model || code,
        n: (fleet.registrations || []).length
      }) : "");
    let out = base;
    for (const [k, v] of [
        ["TYPE", code],
        ["MODELE", model],
        ["VARIANTE", variant],
        ["MOTORISATION", gptEngines(p, code)],
        ["CONNU", gptKnown(p, code, e.landing)]
      ]) out = out.split(`{{${k}}}`).join(String(v));
    return out
  }
  /** Prompt « champs manquants » des fiches cochées (langue de la page) : par fiche, ce que la suite sait et les champs à
   *  renseigner ; modèle de réponse { sheets: [...] }. Chaîne vide si perf_prompt.js n'est pas chargé ou rien ne manque. */
  function gptMissingPrompt(list = gptMissingList()) {
    const base = ENV.prompt().missing?.[KIT.lang()] || ENV.prompt().missing?.fr;
    if (!base || !list.length) return "";
    const colon = kt([" :", ":", ":", ":"]),
      sheets = list.map(({
        p,
        paths
      }) => {
        const code = aKey(p.icao || p.type || p.id),
          model = (ENV.typeDb() || {})[code]?.model || code;
        return [`### id "${p.id}" — ${p.name || model} (${kt(["OACI", "ICAO", "ICAO", "OACI"])} ${code}, ${model})`,
          `${kt(["Motorisation connue", "Known powerplant", "Bekannte Motorisierung", "Motorización conocida"])}${colon} ${gptEngines(p, code)}`,
          `${kt(["Déjà connu", "Already known", "Schon bekannt", "Ya conocido"])}${colon}`, gptKnown(p, code, false),
          `${kt(["Champs à renseigner", "Fields to fill", "Auszufüllende Felder", "Campos que rellenar"])}${colon} ${paths.map(k => k === "rpmFuelCurve" ? "rpmFuelCurve + rpmPowerReference" : k).join(", ")}`
        ].join("\n")
      }).join("\n\n"),
      reply = JSON.stringify({
        sheets: list.map(x => sheetMissingModel(x.p, x.paths))
      }, null, 1);
    let out = base;
    for (const [k, v] of [
        ["NOMBRE", list.length],
        ["FICHES", sheets],
        ["MODELE_REPONSE", reply]
      ]) out = out.split(`{{${k}}}`).join(String(v));
    return out
  }

  /** Cellule ou propulsion écrite librement par ChatGPT ramenée à la liste fermée du champ (turbofan, turbojet → jet ;
   *  …shaft → turboshaft ; …prop → turboprop ; reciprocating → piston ; heli… → helicopter ; autogyro, gyro… → gyroplane ;
   *  sailplane → glider ; blimp → airship ; airplane → aeroplane) ; '' si rien ne convient. */
  function gptEnum(path, v) {
    const s = String(v ?? "").trim().toLowerCase(),
      rules = path === "airframe" ? [
        [/^heli/, "helicopter"],
        [/gyro/, "gyroplane"],
        [/sailplane|glider/, "glider"],
        [/blimp|dirigible|airship/, "airship"],
        [/^air-?plane|^aeroplane/, "aeroplane"]
      ] : [
        [/turbofan|turbojet|^jet/, "jet"],
        [/shaft$/, "turboshaft"],
        [/prop$/, "turboprop"],
        [/reciprocat|piston/, "piston"],
        [/electric/, "electric"]
      ];
    return (path === "airframe" ? AIRFRAMES : PROPULSIONS).includes(s) ? s : rules.find(([re]) => re.test(s))?.[1] || ""
  }

  function parseGptReply(text, code) {
    const S = ENV.prompt().schema || {},
      warnings = [],
      now = new Date().toISOString();
    let t = String(text || "").trim(),
      obj = null,
      err = null;
    // JSON cherché dans chaque bloc de code (une longue réponse en a souvent plusieurs : le bon est celui qui se lit),
    // puis dans le texte entier ; texte nettoyé (commentaires, virgules finales, guillemets typographiques) ; un tableau
    // ou un objet enveloppant ({ profile: {…} }) est déballé ; clés et valeurs ramenées au schéma
    const fences = [...t.matchAll(/```[a-z]*\s*([\s\S]*?)```/gi)].map(m => m[1].trim());
    let fallback = null; // objet lisible mais sans clé du schéma (ex. un petit exemple avant la vraie fiche)
    for (const cand of [...fences, t]) {
      try {
        const parsed = gptJsonParse(cand);
        obj = gptJsonUnwrap(parsed, S);
        if (obj) {
          err = null;
          break
        }
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) fallback ||= parsed
      } catch (x) {
        err ||= x
      }
    }
    obj ||= fallback;
    if (fences.length && !obj) t = fences[0];
    if (obj) obj = gptJsonNormalize(obj, S, warnings);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      const head = t.split(/\r?\n/)[0] || "";
      if (/aircraft/i.test(head) && /icao/i.test(head)) {
        // séparateur de l'en-tête : ChatGPT rend souvent des virgules, les CSV de la suite des points-virgules
        const count = c => head.split(c).length - 1,
          list = parsePerformanceCsvEnriched(t, "ChatGPT.csv", [";", ",", "\t"].sort((a, b) => count(b) - count(a))[0]);
        if (list.length > 1) warnings.push(ktf(["{n} lignes CSV : seule la première est reprise.",
          "{n} CSV rows: only the first one is used.",
          "{n} CSV-Zeilen: nur die erste wird übernommen.", "{n} filas CSV: solo se toma la primera."
        ], {
          n: list.length
        }));
        return {
          code: aKey(list[0].icao || list[0].type || "") || null,
          profile: Object.assign(list[0], {
            source: {
              format: "ChatGPT (CSV)",
              importedAt: now
            },
            updatedAt: now,
            _gptSource: true
          }),
          warnings
        }
      }
      throw Error(kt(["Réponse illisible : ni JSON ni CSV de performances (colonnes Aircraft et ICAO).",
        "Unreadable answer: neither JSON nor a performance CSV (Aircraft and ICAO columns).",
        "Antwort unlesbar: weder JSON noch Leistungs-CSV (Spalten Aircraft und ICAO).",
        "Respuesta ilegible: ni JSON ni CSV de rendimiento (columnas Aircraft e ICAO)."
      ]) + (err ? ` (${err.message})` : ""))
    }
    const unknown = [],
      dropped = [],
      unitIn = String(obj.unit || "kg").trim().toLowerCase(),
      unit = ["kg", "lb"].includes(unitIn) ? unitIn : "kg",
      kg = v => unit === "lb" ? v * KG_PER_LB : v,
      field = path => PROFILE_FIELDS.find(f => f[2] === path),
      // plages plausibles (carburant ramené en kg) : au-delà, la valeur est écartée et signalée
      range = path => /fuelFlow/.test(path) ? [0.5, 40000, true] : /Fuel$/.test(path) ? [0, 400000, true] : /Kt$/.test(path) ? [20, 700] :
      /rateFpm$/.test(path) ? [50, 12000] : /Ft$/.test(path) ? [0, 70000] : /rpm/i.test(path) ? [0.1, 100000] : null,
      value = (path, v) => {
        if (v === null || v === undefined || v === "") return undefined;
        const type = field(path)?.[3] || "number";
        if (type === "bool") {
          if (typeof v === "boolean") return v;
          if (/^(true|oui|yes|ja|sí|si|1)$/i.test(String(v).trim())) return true;
          if (/^(false|non|no|nein|0)$/i.test(String(v).trim())) return false;
          dropped.push(`${path} (${v})`);
          return undefined
        }
        if (type.startsWith("select:")) {
          const want = path === "airframe" || path === "propulsion" ? gptEnum(path, v) : String(v).trim().toLowerCase(),
            x = type.slice(7).split(",").find(o => o.toLowerCase() === want);
          if (!x) dropped.push(`${path} (${v})`);
          return x
        }
        if (type === "text" || type === "textarea") return String(v).trim() || undefined;
        let n = typeof v === "number" ? v : Number(String(v).replace(",", ".").replace(/\s*[a-z/%°]+$/i, "").trim());
        if (!Number.isFinite(n)) {
          dropped.push(`${path} (${v})`);
          return undefined
        }
        if (/rateFpm$/.test(path) && n < 0) n = -n;
        const r = range(path),
          c = r?.[2] ? kg(n) : n;
        if (r && (c < r[0] || c > r[1])) {
          dropped.push(`${path} = ${v}`);
          return undefined
        }
        return n
      },
      out = {};
    if (!["kg", "lb"].includes(unitIn)) warnings.push(ktf(["Unité « {u} » non reconnue : kg retenu.",
      "Unit “{u}” not recognised: kg used.",
      "Einheit „{u}“ nicht erkannt: kg verwendet.", "Unidad «{u}» no reconocida: se usa kg."
    ], {
      u: obj.unit
    }));
    for (const [k, v] of Object.entries(obj)) {
      if (!(k in S)) {
        unknown.push(k);
        continue
      }
      if (["estimated", "sources", "notes", "rpmFuelCurve", "unit"].includes(k)) continue;
      if (S[k] && typeof S[k] === "object" && !Array.isArray(S[k])) {
        if (!v || typeof v !== "object") continue;
        out[k] = {};
        for (const [sk, sv] of Object.entries(v)) {
          if (!(sk in S[k])) {
            unknown.push(`${k}.${sk}`);
            continue
          }
          const x = value(`${k}.${sk}`, sv);
          if (x !== undefined) out[k][sk] = x
        }
        continue
      }
      const x = value(k, v);
      if (x !== undefined) out[k] = x
    }
    // type de la réponse (icao, sinon type) : il prime sur l'appareil choisi (repli seulement si la réponse n'en donne pas)
    const replyCode = aKey(out.icao || obj.type || "") || null;
    // ce que la base OACI donne de l'appareil (cellule, propulsion, pressurisation) prime sur la réponse
    for (const k of Object.keys(factsOfCode(replyCode || aKey(code)))) delete out[k];
    // cartographie moteur, lue comme l'éditeur ; lignes estimées notées dans leur commentaire
    const est = (Array.isArray(obj.estimated) ? obj.estimated : []).map(String),
      estRows = new Set(est.map(x => x.match(/^rpmFuelCurve\[(\d+)\]/)?.[1]).filter(Boolean).map(Number)),
      rowKeys = Object.keys(S.rpmFuelCurve?.[0] || {}),
      curve = [];
    (Array.isArray(obj.rpmFuelCurve) ? obj.rpmFuelCurve : []).forEach((r, i) => {
      if (!r || typeof r !== "object") return;
      for (const k of Object.keys(r))
        if (!rowKeys.includes(k)) unknown.push(`rpmFuelCurve[${i}].${k}`);
      const num = k => value(`rpmFuelCurve.${k}`, r[k]),
        rpm = num("rpm");
      let min = num("fuelFlowMin"),
        nom = num("fuelFlowPerHour"),
        max = num("fuelFlowMax");
      min ??= nom;
      max ??= nom;
      nom ??= Number.isFinite(min) && Number.isFinite(max) ? (min + max) / 2 : undefined;
      if (rpm === undefined || nom === undefined) return dropped.push(`rpmFuelCurve[${i}]`);
      const ph = String(r.phaseLabel || "").trim().toLowerCase(),
        comment = String(r.comment || "").trim();
      if (ph && !FLIGHT_PHASES.includes(ph)) dropped.push(`rpmFuelCurve[${i}].phaseLabel (${r.phaseLabel})`);
      curve.push({
        rpm,
        altFt: num("altFt") ?? null,
        fuelFlowMin: min,
        fuelFlowPerHour: nom,
        fuelFlowMax: max,
        phaseLabel: FLIGHT_PHASES.includes(ph) ? ph : inferredCurvePhase(comment),
        comment: estRows.has(i) ? [comment, kt(["estimé (ChatGPT)", "estimated (ChatGPT)", "geschätzt (ChatGPT)",
            "estimado (ChatGPT)"
          ])]
          .filter(Boolean).join(" — ") : comment
      })
    });
    const has = path => path.split(".").reduce((o, k) => o?.[k], out) !== undefined,
      sources = (Array.isArray(obj.sources) ? obj.sources : []).map(x => typeof x === "string" ? {
        title: x
      } : x && typeof x === "object" ? {
        title: String(x.title || ""),
        publisher: String(x.publisher || ""),
        url: String(x.url || "")
      } : null).filter(x => x && (x.title || x.url));
    if (unknown.length) warnings.push(ktf(["Clés inconnues ignorées : {list}.", "Unknown keys ignored: {list}.",
      "Unbekannte Schlüssel ignoriert: {list}.",
      "Claves desconocidas ignoradas: {list}."
    ], {
      list: unknown.join(", ")
    }));
    if (dropped.length) warnings.push(ktf(["Valeurs écartées (illisibles ou hors plage) : {list}.",
      "Values discarded (unreadable or out of range): {list}.",
      "Verworfene Werte (unlesbar oder außerhalb des Bereichs): {list}.",
      "Valores descartados (ilegibles o fuera de rango): {list}."
    ], {
      list: dropped.join(", ")
    }));
    const p = normalize({
      ...out,
      icao: replyCode || code,
      type: replyCode || code,
      unit,
      rpmFuelCurve: curve,
      description: [obj.notes ? String(obj.notes).trim() : "", sources.length ? kt(["Sources : ", "Sources: ", "Quellen: ",
          "Fuentes: "
        ]) +
        sources.map(x => [x.title, x.publisher, x.url].filter(Boolean).join(", ")).join(" ; ") : ""
      ].filter(Boolean).join("\n"),
      source: {
        format: "ChatGPT",
        importedAt: now
      },
      updatedAt: now,
      _gptSource: true
    }, code);
    const fields = est.filter(x => !/^rpmFuelCurve/.test(x) && has(x));
    if (fields.length) p.estimatedFields = fields;
    if (sources.length) p.gptSources = sources;
    return {
      code: replyCode,
      profile: p,
      warnings
    }
  }

  window.AeroDBSheets = {
    configure,
    FLIGHT_PHASES,
    PROFILE_FIELDS,
    FUEL_PATHS,
    // lecture
    normalize,
    parseDelimited,
    csvSep,
    parsePerformanceCsv,
    parsePerformanceCsvEnriched,
    parseFuelRange,
    parseRpmFuelCurve,
    inferredCurvePhase,
    isSimbriefOfp,
    jsonKind,
    profilesFromJson,
    parseLnmperf,
    toLnmperf,
    missingLnmperfFields,
    // OFP SimBrief
    findNavlog,
    normalizeTime,
    profileFromOFP,
    extractOfpCalibration,
    applyCalibration,
    // compléments
    apdFor,
    simbriefRecordFor,
    profileFromSimbriefType,
    fillProfileGaps,
    mergeCurves,
    fuelConvertedCopy,
    // fusion
    profileWhen,
    profileLeaves,
    profileDiff,
    pickChanges,
    mergeProfileSources,
    mergeSourceName,
    profileSourceText,
    pathGet,
    pathSet,
    // ChatGPT
    gptPrompt,
    gptMissingPrompt,
    parseGptReply,
    gptJsonParse,
    gptJsonNormalize,
    gptNumberText,
    sheetMissingPaths,
    sheetMissingFamilies,
    catalogFacts,
    effectiveFacts,
    sheetMissingModel,
    gptSchemaPaths
  };
})();
