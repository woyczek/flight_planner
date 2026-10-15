(() => {
  'use strict';
  // « Mes appareils » : les appareils du pilote, flotte comprise (Paramètres › Mon profil › Appareils et simulateurs ;
  // avant : blocs « Mes appareils » et « Mes simulateurs » de Mes missions). Une seule liste, dont le bloc « Profils de
  // performances » du Carburant est la face performances (mêmes lignes, même ordre, même nom).
  //   · appareils de la flotte possédés (dans son simulateur) / maîtrisés — une sous-carte par catégorie (hélicoptères,
  //     turbopropulseurs, réacteurs, pistons) ; tableau : type (silhouette, nom, désignateur et classe), variantes de la
  //     flotte, appareils et bases, performances, cases Possédé / Maîtrisé (maîtrisé implique possédé) ;
  //   · autres appareils (hors flotte) : ajoutés par un NOM (« CL-415 », « Canadair 415 », « Caravelle ») : le
  //     désignateur est cherché dans la flotte, la base des types de ce poste et ses alias, la liste OACI publiée ; rien
  //     de sûr : l'appareil est gardé sous son nom, « type OACI à confirmer » (jamais de code OACI obligatoire) ; partagés
  //     par les déclarations (le Centre les lit comme les types de la flotte) et proposés aux autres pilotes ;
  //   · performances : profil du Carburant du même type (flightPerfState de ce navigateur) — source, ou « aucune » avec
  //     « Créer depuis SimBrief » (si SimBrief connaît le type), « Demander à ChatGPT », « Estimer par la classe » :
  //     liens vers le Carburant, qui crée le profil et s'ouvre dessus (?aircraft=<type>&create=simbrief|gpt|estimate) ;
  //   · variantes : un désignateur partagé par plusieurs modèles (CL2T : CL-215T et CL-415) garde, dans la déclaration,
  //     les variantes déclarées (appareils.variantes : { CL2T: [« Canadair CL-415 »] }) — une ligne par variante ici et
  //     dans le Carburant, nom de la variante ; sans variante : nom de la fiche et de ses variantes connues (« Canadair
  //     CL-215T / CL-415 ») ; le profil de performances reste par désignateur (« performances communes aux variantes ») ;
  //   · simulateurs : liste de la feuille FLOTTE du classeur ODV (MissionAssignments.simulators) ;
  //   · enregistrés dans ce navigateur (MissionAssignments.saveAircraft / saveSims), puis recopiés dans les semaines
  //     déclarées du pilote à partir de la semaine en cours (le Centre lit les appareils dans ces fichiers).
  // API (window.EquipmentEditor) : mount(hôte, TRI) → Promise (Paramètres) ; myAircraft(TRI) → Promise<[appareil]> ;
  // addDialog(TRI, onAdded) (fenêtre d'ajout, Carburant) ; perfOf(code), fuelUrl(code, create), nameCell(appareil),
  // categoryOf(code), CATEGORIES.
  if (window.EquipmentEditor) return;
  const K = window.RepositoryKit,
    esc = K.esc,
    t = K.t,
    tf = K.tf;
  const A = () => window.MissionAssignments;
  const HERE = document.currentScript?.src || location.href; // adresse de ce script (AircraftDB/ à côté de shared/)

  function css() {
    if (document.getElementById('equipmentEditorCss')) return;
    const s = document.createElement('style');
    s.id = 'equipmentEditorCss';
    s.textContent = `.eq-sum{margin:0 0 8px;font-weight:600}.eq-cards{display:grid;gap:10px}
.eq-table{width:100%;border-collapse:collapse;font-size:12.5px}.eq-table th,.eq-table td{padding:5px 8px;text-align:left;vertical-align:middle;border-bottom:1px solid color-mix(in srgb,currentColor 12%,transparent)}
.eq-table th{font-size:11.5px;font-weight:700;opacity:.8}.eq-table .eq-c{width:5.5em;text-align:center}.eq-table .eq-c input{margin:0;width:16px;height:16px;vertical-align:middle;cursor:pointer}
.eq-table code{font-size:11px}.eq-table small{opacity:.75}.eq-table td[data-eq-fix]{cursor:pointer}.eq-table td[data-eq-fix]:hover b,.eq-table td[data-eq-fix]:focus-visible b{text-decoration:underline}
.eq-table tr.eq-fixing td{background:color-mix(in srgb,currentColor 8%,transparent)}
.eq-name{display:flex;align-items:center;gap:8px}.eq-name .ac-icon{flex:none;display:inline-flex;width:36px;height:20px}.eq-name .ac-icon svg{width:100%;height:100%;fill:currentColor}
.eq-perf{font-size:12px}.eq-perf .eq-perf-acts{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}.eq-perf .eq-perf-acts a{font-size:11.5px;padding:2px 7px;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:999px;text-decoration:none;color:inherit}
.eq-perf .eq-perf-acts a:hover{background:color-mix(in srgb,currentColor 10%,transparent)}.eq-tbc{color:#c98a1b;font-weight:600}
.eq-unvar{padding:0 6px;margin-left:6px;line-height:1.4;font-size:11px}.eq-table tr.eq-var td{padding-top:2px}
.eq-add{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0 0}.eq-add .eq-field{position:relative;flex:1 1 16em;min-width:0;display:flex}.eq-add input{flex:1 1 auto;min-width:0}
.eq-sugg{position:absolute;z-index:30;left:0;right:0;top:100%;margin:2px 0 0;padding:2px 0;list-style:none;max-height:16em;overflow:auto;background:var(--repo-card-bg,Canvas);color:inherit;border:1px solid color-mix(in srgb,currentColor 25%,transparent);box-shadow:0 4px 14px rgba(0,0,0,.18)}
.eq-sugg li{padding:4px 8px;cursor:pointer;font-size:12.5px}.eq-sugg li small{opacity:.7;margin-left:6px}.eq-sugg li[aria-selected=true],.eq-sugg li:hover{background:color-mix(in srgb,currentColor 12%,transparent)}
.eq-sims{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px 14px}.eq-sims label{display:inline-flex;align-items:center;gap:6px;margin:0}.eq-sims input{margin:0}
dialog.eq-dialog{max-width:min(680px,94vw);width:100%;border:1px solid color-mix(in srgb,currentColor 25%,transparent);background:var(--repo-card-bg,Canvas);color:inherit;padding:14px 16px}
dialog.eq-dialog h3{margin:0 0 6px}dialog.eq-dialog footer{display:flex;justify-content:flex-end;gap:6px;margin-top:10px}dialog.eq-dialog .eq-added{margin:8px 0 0}`;
    document.head.append(s);
  }

  // recopie dans les semaines déclarées : une à la fois, après la dernière coche (plusieurs coches rapprochées : une passe)
  let timer = 0,
    chain = Promise.resolve();
  /** Semaines déclarées du pilote à partir de la semaine en cours : appareils et simulateurs remis à jour ; nombre de
   *  semaines réécrites. */
  async function syncWeeks(tri) {
    const SD = window.SuiteDispos;
    if (!SD?.readPilot) return 0;
    const cur = SD.weekId(Date.now()),
      weeks = await SD.readPilot(tri, {
        fresh: true
      }),
      av = await A().availability(tri);
    const extra = {
      appareils: {
        possedes: av?.aircraft?.owned || [],
        maitrises: av?.aircraft?.mastered || [],
        variantes: av?.aircraft?.variants || {}
      },
      simulateurs: av?.sims || []
    };
    let n = 0;
    for (const [w, d] of Object.entries(weeks).sort())
      if (w >= cur && Object.keys(d?.dispos || {}).length) {
        await SD.saveWeek(tri, w, d.dispos, extra);
        n++;
      }
    return n;
  }

  /** Nom lisible d'un modèle de la base OACI (« DASSAULT Rafale » → « Dassault Rafale », comme MissionAssignments). */
  const modelName = s => String(s || '').replace(/(^|[\s(])([A-Z]{3,})(?=$|[\s),])/g, (_, b, w) => b + w.charAt(0) + w.slice(1)
    .toLowerCase());
  /** Fiche d'un type dans la base OACI (AIRCRAFT_DB, alias compris) ; {} si inconnu. */
  const dbInfo = ty => {
    const db = window.AIRCRAFT_DB || {};
    return db[ty] || db[db.__aliases?.[ty]] || {};
  };
  /** Clé de comparaison : majuscules sans accents ni séparateurs (« SE-210 » = « SE 210 » = SE210). */
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  /** Code au format d'un désignateur OACI (lettre puis 1 à 3 lettres ou chiffres : BN2T, B17, S210). */
  const designator = c => /^[A-Z][A-Z0-9]{1,3}$/.test(String(c || ''));
  /** Mots d'un texte (majuscules sans accents) : « Sud Aviation SE 210 » → [SUD, AVIATION, SE, 210]. */
  const wordsOf = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  // ---- liste OACI publiée (AircraftDB/aircraft_types.txt) et complétion de la base de ce poste par le lanceur
  let official = null;
  /** Désignateurs de la liste OACI publiée avec la suite (la base elle-même se complète sur chaque poste) : Set. */
  const officialCodes = () => official ||= fetch(new URL('../AircraftDB/aircraft_types.txt', HERE), {
    cache: 'no-cache'
  }).then(r => r.ok ? r.text() : '').then(s => new Set(s.split(/\r?\n/).map(l => l.trim().toUpperCase()).filter(l => /^[A-Z0-9]{2,4}$/
    .test(l)))).catch(() => new Set());
  /** Noms d'usage d'un désignateur d'après les alias de la base (S210 → « Caravelle », « SE210 ») : mots seuls d'abord. */
  const aliasNames = code => Object.entries(window.AIRCRAFT_DB?.__aliases || {}).filter(([k, v]) => v === code && k !== code).map((
    [k]) => k).sort((a, b) => /\d/.test(a) - /\d/.test(b) || b.length - a.length);
  /** Nom affiché d'un type : modèle de la flotte, sinon de la base, sinon son premier nom d'usage (« Caravelle ») ; un
   *  appareil gardé sous son nom (pas un désignateur) : ce nom. */
  const typeName = code => {
    const f = (A()?.fleetTypes?.() || []).find(x => x.type === code)?.model;
    if (f) return f;
    const m = dbInfo(code).model;
    if (m) return modelName(m);
    if (!designator(code)) return code;
    const a = aliasNames(code)[0];
    return a && !/\d/.test(a) ? a.charAt(0) + a.slice(1).toLowerCase() : a || '';
  };
  // variantes d'un désignateur partagé (CL2T : CL-215T et CL-415). Source : la déclaration du pilote
  // (aircraft.variants) ; repli local, ancien format : myAircraftNames:v1 (code → nom), lu seulement
  const LABELS = 'myAircraftNames:v1';
  /** Noms d'usage gardés dans ce navigateur (ancien format) : { code: nom }. */
  const labels = () => {
    try {
      return JSON.parse(localStorage.getItem(LABELS) || '{}') || {};
    } catch {
      return {};
    }
  };
  /** Constructeur d'une fiche (premier mot du modèle : « Canadair »), '' sans fiche. */
  const makerOf = code => {
    const m = String(dbInfo(code).model || '');
    return m ? modelName(m.split(/\s+/)[0]) : '';
  };
  /** Noms de variante tirés des alias de la base (CL415 → « CL-415 ») : 1 à 3 lettres, 3 chiffres ou plus, une lettre
   *  au plus ; ni désignateur eux-mêmes, ni déjà dans le modèle de la fiche. */
  const aliasVariants = code => {
    const db = window.AIRCRAFT_DB || {},
      model = norm(dbInfo(code).model);
    return aliasNames(code).filter(a => /^[A-Z]{1,3}\d{3,4}[A-Z]?$/.test(a) && !db[a] && !model.includes(a)).map(a => a.replace(
      /^([A-Z]+)(\d)/, '$1-$2'));
  };
  /** Nom de la fiche d'un type avec ses variantes connues (« Canadair CL-215T / CL-415 ») ; nom seul sinon. */
  const fullName = code => {
    const base = typeName(code);
    if (!base || !designator(code)) return base || code;
    const ex = aliasVariants(code).filter(v => !norm(base).includes(norm(v))).slice(0, 2);
    return ex.length ? `${base} / ${ex.join(' / ')}` : base;
  };
  /** Variantes proposées pour un type : modèle de la fiche (Doc 8643 du poste), variantes de la flotte (champ
   *  variant), noms d'usage de la base ; le texte libre vient ensuite (saisie). */
  const variantChoices = code => {
    const out = [],
      seen = new Set(),
      maker = makerOf(code);
    /** Ajoute une variante (sans doublon, constructeur en tête). */
    const push = v => {
      v = String(v || '').trim();
      if (!v) return;
      if (maker && !norm(v).includes(norm(maker))) v = `${maker} ${v}`;
      if (!seen.has(norm(v))) {
        seen.add(norm(v));
        out.push(v);
      }
    };
    String(typeName(code) || '').split(/\s+\/\s+/).forEach(push); // fiche nommée « Canadair CL-215T / CL-415 » : une variante par nom
    ((A()?.fleetTypes?.() || []).find(x => x.type === code)?.variants || []).forEach(push);
    aliasVariants(code).forEach(push);
    return out;
  };
  /** Chiffres d'un nom (« Canadair CL-415 » → « 415 »). */
  const digitsOf = v => (norm(v).match(/\d+/g) || []).join('');
  /** Variante désignée par une saisie : une des variantes proposées (même nom, nom qui finit par la saisie, mêmes
   *  chiffres : « CL-415 », « Canadair 415 » → « Canadair CL-415 ») quand le type en a plusieurs ; sinon une saisie
   *  avec un numéro absent de la fiche, complétée du constructeur (texte libre) ; '' si la saisie est le type lui-même. */
  const variantOf = (code, typed) => {
    typed = String(typed || '').split(/\s+[—-]\s+/)[0].trim().replace(/\s+/g, ' ');
    const T = norm(typed),
      d = digitsOf(typed);
    if (!T || T === code) return '';
    const ch = variantChoices(code),
      hit = ch.find(v => norm(v) === T) || ch.find(v => T.length >= 4 && norm(v).endsWith(T)) || (d ? ch.find(v => digitsOf(v) ===
        d) : null);
    if (hit) return ch.length > 1 || hit !== ch[0] ? hit : '';
    const model = String(dbInfo(code).model || '');
    if (!model || !d || norm(model).includes(d)) return '';
    const maker = makerOf(code);
    return maker && !T.includes(norm(maker)) ? `${maker} ${typed}` : typed;
  };
  /** Variantes déclarées d'un type : celles de la déclaration, sinon le nom d'usage gardé dans ce navigateur. */
  const variantsIn = (variants, code) => variants?.[code]?.length ? variants[code] : labels()[code] ? [labels()[code]] : [];
  /** Nom d'un appareil du pilote : sa (première) variante déclarée, sinon le nom de la fiche et de ses variantes. */
  const myName = (code, variants) => variantsIn(variants, code)[0] || fullName(code) || code;
  /** Appel au lanceur (/__setup/aircraft-db) : GET (état de la passe), POST { codes, quick } ; JSON, null sans lanceur. */
  const acApi = (body = null) => fetch('/__setup/aircraft-db', {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-SOG-Setup': '1',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  }).then(r => r.ok ? r.json() : null).catch(() => null);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  /** Script d'AircraftDB (re)chargé : base des types relue après une passe du lanceur, fiches de performances ou
   *  silhouettes chargées à la demande (page qui ne les charge pas). */
  const loadScript = file => new Promise(res => {
    const s = document.createElement('script');
    s.src = new URL(`../AircraftDB/${file}?t=${Date.now()}`, HERE).href;
    s.onload = s.onerror = () => {
      s.remove();
      res();
    };
    document.head.append(s);
  });
  const reloadDb = () => loadScript('aircraft_db.js');
  // complétion : demandée au lanceur au clic sur « Ajouter » seulement (jamais pendant la frappe) ; le lanceur fait une
  // passe à la fois et met en file les codes demandés pendant une passe (lancés à sa fin, même si la page est fermée).
  // La page ne fait que suivre : codes de la passe en cours et de la file (« complétion en cours… »), base relue à la fin ;
  // à l'ouverture, elle reprend le suivi d'une passe en cours.
  const running = new Set(), // codes suivis : dans la passe en cours ou en file
    tried = new Set(); // codes passés au lanceur et toujours absents (type retiré de l'OACI, source muette)
  let watching = false;
  const redraws = new Set(); // vues à redessiner à la fin d'une passe (carte de Paramètres, fenêtre d'ajout)
  /** Codes de la passe en cours et de la file d'attente d'après l'état du lanceur. */
  const busyCodes = s => new Set([...(s?.state === 'running' ? s.codes || [] : []), ...(s?.queue || [])]);
  /** Suit les codes suivis jusqu'à la fin de leur passe : base relue, vues redessinées à chaque changement. */
  async function watchTypes() {
    if (watching) return;
    watching = true;
    try {
      while (running.size) {
        await sleep(4000);
        const s = await acApi();
        if (!s) { // lanceur arrêté : plus rien à suivre
          running.clear();
          break;
        }
        const busy = busyCodes(s),
          done = [...running].filter(c => !busy.has(c));
        if (!done.length) continue;
        await reloadDb();
        done.forEach(c => {
          running.delete(c);
          if (!dbInfo(c).model) tried.add(c);
        });
        redraws.forEach(f => f());
      }
    } finally {
      watching = false;
    }
  }
  /** Demande au lanceur de compléter un code (passe courte, ou file d'attente si une passe tourne), puis le suit. */
  async function completeType(code, redraw) {
    if (redraw) redraws.add(redraw);
    running.add(code);
    redraw?.();
    const s = await acApi({
      codes: [code],
      quick: true
    });
    if (!s || !(s.started || busyCodes(s).has(code))) running.delete(code); // pas de lanceur : le code reste tel quel
    redraw?.();
    watchTypes();
  }
  /** À l'ouverture : passe en cours ou file d'attente qui concernent ces codes → suivies ; dernière passe terminée
   *  sans fiche pour un code → « introuvable ». */
  async function resumeTypes(codes, redraw) {
    redraws.add(redraw);
    const s = await acApi();
    if (!s) return;
    const busy = busyCodes(s);
    codes.forEach(c => {
      if (busy.has(c)) running.add(c);
      else if (s.state !== 'running' && (s.codes || []).includes(c) && !dbInfo(c).model) tried.add(c);
    });
    redraw();
    if (running.size) watchTypes();
  }
  /** Types hors flotte déclarés par les autres pilotes (index des déclarations) : Map type → [trigrammes]. */
  async function othersTypes(M, tri, fleet) {
    const idx = await M.readData?.('disponibilites/_index.json').catch(() => null),
      out = new Map();
    await Promise.all(Object.keys(idx?.pilots || {}).filter(p => p !== tri).map(async p => {
      const d = await M.availability(p).catch(() => null);
      for (const ty of new Set([...(d?.aircraft?.owned || []), ...(d?.aircraft?.mastered || [])]))
        if (!fleet.has(ty)) out.set(ty, [...(out.get(ty) || []), p].sort());
    }));
    return out;
  }

  // ---- catégories (même ordre dans Paramètres et dans le Carburant)
  const CATEGORIES = ['helico', 'turboprop', 'jet', 'piston', 'other'];
  /** Libellé d'une catégorie (4 langues). */
  const categoryLabel = c => t({
    helico: ['Hélicoptères', 'Helicopters', 'Hubschrauber', 'Helicópteros'],
    turboprop: ['Turbopropulseurs', 'Turboprops', 'Turboprops', 'Turbohélices'],
    jet: ['Réacteurs', 'Jets', 'Strahlflugzeuge', 'Reactores'],
    piston: ['Pistons', 'Pistons', 'Kolbenmotor', 'Pistón'],
    other: ['Autres', 'Others', 'Andere', 'Otros']
  } [c] || ['Autres', 'Others', 'Andere', 'Otros']);
  /** Catégorie d'un type : celle de la flotte, sinon d'après la description OACI (H… hélicoptère, …J réacteur,
   *  …T turbopropulseur, …P piston). */
  const categoryOf = code => {
    const f = (A()?.fleetTypes?.() || []).find(x => x.type === code)?.category;
    if (CATEGORIES.includes(f)) return f;
    const d = String(dbInfo(code).description || '').toUpperCase();
    return d[0] === 'H' ? 'helico' : d[2] === 'J' ? 'jet' : d[2] === 'T' ? 'turboprop' : d[2] === 'P' ? 'piston' : 'other';
  };

  // ---- recherche des types par le nom (flotte, base du poste et ses alias, liste OACI publiée, types déclarés)
  /** Moteur de recherche des types : ctx = { extra() → codes à connaître en plus (déclarés par d'autres, lignes de la
   *  carte), offi() → liste OACI publiée }. Sortie : { candidates(texte), resolve(texte), reset() }. */
  function makeSearch(ctx = {}) {
    let index = null;
    const fleetTypes = () => A()?.fleetTypes?.() || [],
      fleetSet = () => new Set(fleetTypes().map(x => x.type));
    /** Type de la flotte de même fiche (A4M de la base = A400 de la flotte), sinon le code lui-même. */
    const twin = (code, fleet) => fleet.has(code) ? code : [...fleet].find(f => dbInfo(f).model && dbInfo(f) === dbInfo(code)) || code;
    /** Types connus, Map code → { code, keys } ; keys : clés comparables (code, modèle, alias). */
    const typeIndex = () => {
      if (index) return index;
      const db = window.AIRCRAFT_DB || {},
        fleet = fleetSet(),
        map = new Map();
      /** Ajoute le nom name (modèle, alias) au type code (rangé sous son jumeau de la flotte). */
      const add = (code, name = '') => {
        code = twin(code, fleet);
        const e = map.get(code) || map.set(code, {
          code,
          keys: new Set([code])
        }).get(code);
        if (norm(name)) e.keys.add(norm(name));
      };
      fleetTypes().forEach(f => add(f.type, f.model));
      Object.keys(db).filter(k => !k.startsWith('__')).forEach(k => add(k, db[k]?.model));
      Object.entries(db.__aliases || {}).forEach(([a, c]) => add(c, a));
      (ctx.offi?.() || []).forEach(c => add(c));
      (ctx.extra?.() || []).filter(designator).forEach(c => add(c));
      return index = map;
    };
    /** Types qui répondent à un texte, du plus sûr au moins sûr : [{ code, base, score }] ; base : 100 code exact, 95 nom
     *  exact (modèle, alias), 85 un mot ou deux mots accolés exacts (« SE 210 Caravelle » → SE210, CARAVELLE), 72 début
     *  de code, 68 début de nom, 55 nom qui contient le texte, 48 tous les mots dans les noms (« Canadair 415 ») ;
     *  score : base + flotte (4) ou fiche dans la base du poste (2). */
    const candidates = text => {
      const Kx = norm(text),
        W = wordsOf(text),
        tries = new Set([...W, ...W.slice(1).map((w, i) => W[i] + w)]),
        fleet = fleetSet();
      if (!Kx) return [];
      const out = [];
      for (const e of typeIndex().values()) {
        const keys = [...e.keys];
        const base = e.keys.has(Kx) ? (e.code === Kx ? 100 : 95) : [...tries].some(w => e.keys.has(w)) ? 85 : Kx.length >= 2 && e.code
          .startsWith(Kx) ? 72 : Kx.length >= 3 && keys.some(k => k.startsWith(Kx)) ? 68 : Kx.length >= 3 && keys.some(k => k.includes(
            Kx)) ? 55 : W.some(w => w.length >= 3) && W.every(w => w.length < 2 || keys.some(k => k.includes(w))) ? 48 : 0;
        if (base) out.push({
          code: e.code,
          base,
          score: base + (fleet.has(e.code) ? 4 : dbInfo(e.code).model ? 2 : 0)
        });
      }
      return out.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
    };
    /** Désignateur d'un texte saisi : le candidat sûr (mot exact et plus), ou le seul candidat de son niveau (nom qui
     *  contient le texte, tous les mots dans les noms : « Canadair 415 » → CL2T) ; un texte en forme de désignateur que
     *  rien n'approche, gardé tel quel ; '' sinon (appareil gardé sous son nom, ou choix parmi les plus proches). */
    const resolve = text => {
      const c = candidates(text),
        [a, b] = c;
      if (a && (a.base >= 85 || (a.base >= 48 && (!b || b.base < a.base)))) return a.code;
      const raw = norm(String(text || '').split(/\s+[—-]\s+/)[0]);
      return /^[A-Z][A-Z0-9]{1,3}$/.test(raw) && !(a && a.base >= 48) ? raw : '';
    };
    return {
      candidates,
      resolve,
      reset: () => {
        index = null;
      }
    };
  }

  // ---- performances (profils du Carburant gardés dans ce navigateur)
  /** Clé d'un type suivie à travers les alias de la base (CL415 → CL2T). */
  const typeKey = v => {
    const al = window.AIRCRAFT_DB?.__aliases || {};
    let x = norm(v);
    for (let i = 0; i < 5 && al[x] && al[x] !== x; i++) x = norm(al[x]);
    return x;
  };
  /** Profils de performances du Carburant (flightPerfState de ce navigateur) : liste. */
  const perfProfiles = () => {
    try {
      return Object.values(JSON.parse(localStorage.getItem('flightPerfState') || 'null')?.profiles || {}).filter(p => p && typeof p ===
        'object' && p.id);
    } catch {
      return [];
    }
  };
  /** Origine d'un profil en clair (comme le bloc « Profils de performances » du Carburant). */
  const perfSource = p => p.calibration ? t(['OFP SimBrief (calibré)', 'SimBrief OFP (calibrated)', 'SimBrief-OFP (kalibriert)',
    'OFP SimBrief (calibrado)'
  ]) : p.simbriefSnapshot || p.simbrief ? 'SimBrief' : p.lnmSource ? 'Little Navmap' : /chatgpt/i.test(String(p.source?.format ||
    '')) ? 'ChatGPT' : /class/i.test(String(p.source?.format || '')) ? t(['estimé par la classe', 'estimated from the class',
    'aus der Klasse geschätzt', 'estimado por la clase'
  ]) : /csv/i.test(String(p.source?.format || '')) ? 'CSV' : /json/i.test(String(p.source?.format || '')) ? 'JSON' : t(['saisie',
    'manual entry', 'manuelle Eingabe', 'entrada manual'
  ]);
  /** Profil de performances d'un appareil (code ou nom) : { id, name, source } ou null. */
  const perfOf = code => {
    const k = typeKey(code),
      p = perfProfiles().find(x => [x.id, x.icao, x.type].some(v => v && typeKey(v) === k)) || perfProfiles().find(x => !designator(
        code) && norm(x.name) === norm(code));
    return p ? {
      id: p.id,
      name: p.name || p.id,
      source: perfSource(p)
    } : null;
  };
  /** Fiche SimBrief du type connue de ce poste (AIRCRAFT_PERF[code].simbrief, alias suivis) : vrai si SimBrief le connaît. */
  const simbriefKnows = code => {
    const perf = window.AIRCRAFT_PERF || {},
      al = window.AIRCRAFT_DB?.__aliases || {};
    let x = norm(code);
    for (let i = 0; i < 6 && x; i++) {
      if (perf[x]?.simbrief?.fuelflowKgh > 0) return true;
      if (!al[x] || al[x] === x) break;
      x = norm(al[x]);
    }
    return false;
  };
  /** Adresse du Carburant ouvert sur un appareil ; create : « simbrief », « gpt » ou « estimate » (profil à créer). */
  const fuelUrl = (code, create = '') => new URL(`../apps/planner/flight_performance_planner.html?aircraft=${encodeURIComponent(code)}${create ? `&create=${create}` : ''}`, HERE).href;
  /** Cellule « Performances » (Paramètres) : source du profil (lien vers le Carburant), ou « aucune » et les trois façons
   *  d'en créer une. */
  const perfCell = code => {
    const p = perfOf(code);
    if (p) return `<div class="eq-perf"><a href="${esc(fuelUrl(code))}" title="${esc(t(['Ouvrir le Carburant sur cet appareil', 'Open Fuel on this aircraft', 'Kraftstoff für dieses Luftfahrzeug öffnen', 'Abrir Combustible con esta aeronave']))}">${esc(p.source)} ↗</a></div>`;
    return `<div class="eq-perf"><span>${esc(t(['aucune', 'none', 'keine', 'ninguno']))}</span><div class="eq-perf-acts">${simbriefKnows(code) ? `<a href="${esc(fuelUrl(code, 'simbrief'))}">${esc(t(['Créer depuis SimBrief', 'Create from SimBrief', 'Aus SimBrief anlegen', 'Crear desde SimBrief']))}</a>` : ''}<a href="${esc(fuelUrl(code, 'gpt'))}">${esc(t(['Demander à ChatGPT', 'Ask ChatGPT', 'ChatGPT fragen', 'Preguntar a ChatGPT']))}</a><a href="${esc(fuelUrl(code, 'estimate'))}">${esc(t(['Estimer par la classe', 'Estimate from the class', 'Aus der Klasse schätzen', 'Estimar por la clase']))}</a></div></div>`;
  };
  /** Cellule de nom commune à Paramètres et au Carburant : silhouette, nom en gras, désignateur et classe en petit
   *  (« type OACI à confirmer » pour un appareil gardé sous son nom) ; a.common : variante d'un désignateur partagé
   *  (« performances communes aux variantes »). a : { code, name, common }. */
  const nameCell = a => {
    const code = a.code,
      d = dbInfo(code).description || '',
      icon = window.AircraftDBIcons?.icon({
        type: code,
        icao: code,
        name: a.name
      }) || '',
      sub = designator(code) || dbInfo(code).model ? `<code>${esc(code)}</code>${d ? ` · ${esc(d)}` : ''}` :
      `<span class="eq-tbc">${esc(t(['type OACI à confirmer', 'ICAO type to confirm', 'ICAO-Typ zu bestätigen', 'tipo OACI por confirmar']))}</span>`;
    const common = a.common ? `<br><small>${esc(tf(['performances communes aux variantes de {c}', 'performance shared by the variants of {c}', 'Leistungen gemeinsam für die Varianten von {c}', 'rendimiento común a las variantes de {c}'], { c: code }))}</small>` : '';
    return `<div class="eq-name">${icon}<span><b>${esc(a.name || fullName(code) || code)}</b><br><small>${sub}</small>${common}</span></div>`;
  };

  /** Appareils du pilote, flotte comprise (possédés ou maîtrisés), dans l'ordre commun : catégorie (CATEGORIES), puis
   *  nom ; une entrée par variante déclarée d'un désignateur partagé. Sortie : [{ code, variant, name, category, fleet,
   *  owned, mastered }] (variant : '' sans variante ; plusieurs entrées du même code partagent son profil). */
  async function myAircraft(tri) {
    const M = A();
    tri = String(tri || M?.trigram?.() || '').toUpperCase();
    if (!M || !tri) return [];
    const d = await M.availability(tri).catch(() => null),
      owned = new Set([...(d?.aircraft?.owned || []), ...(d?.aircraft?.mastered || [])]),
      mastered = new Set(d?.aircraft?.mastered || []),
      fleet = new Set((M.fleetTypes?.() || []).map(x => x.type)),
      out = [];
    for (const code of owned) {
      const base = {
          code,
          category: categoryOf(code),
          fleet: fleet.has(code),
          owned: true,
          mastered: mastered.has(code)
        },
        vs = variantsIn(d?.aircraft?.variants, code);
      if (vs.length) vs.forEach(v => out.push({
        ...base,
        variant: v,
        name: v
      }));
      else out.push({
        ...base,
        variant: '',
        name: fullName(code) || code
      });
    }
    return out.sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name, 'fr', {
      numeric: true
    }));
  }

  /** Suggestions d'un champ de saisie (communes à Paramètres et à la fenêtre d'ajout) : liste sous le champ, flèches,
   *  Entrée, Échap ; une ligne par variante d'un désignateur partagé (CL2T — Canadair CL-215T, CL2T — Canadair CL-415).
   *  search : makeSearch() ; origin(code) : texte de provenance ; onPick(code, variante) ; onEnter() : Entrée sans
   *  suggestion choisie ; onEscape() → vrai si l'Échap a servi. Sortie : { show, close }. */
  function attachSuggest(input, sugg, search, origin, {
    onPick,
    onEnter,
    onEscape
  }) {
    let act = -1;
    const close = () => {
      sugg.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      act = -1;
    };
    const show = () => {
      const items = search.candidates(input.value).filter(c => c.base >= 48).slice(0, 8).flatMap(c => {
        const ch = designator(c.code) ? variantChoices(c.code) : [];
        return ch.length > 1 ? ch.map(v => ({
          code: c.code,
          variant: v,
          label: v
        })) : [{
          code: c.code,
          variant: '',
          label: fullName(c.code)
        }];
      }).slice(0, 10);
      act = -1;
      if (!items.length) return close();
      sugg.innerHTML = items.map((c, i) => `<li role="option" id="${sugg.id}${i}" data-code="${esc(c.code)}" data-variant="${esc(c.variant)}" aria-selected="false"><b>${esc(c.code)}</b>${c.label ? ` — ${esc(c.label)}` : ''}<small>${esc(origin(c.code))}</small></li>`).join('');
      sugg.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };
    const mark = n => {
      const items = [...sugg.children];
      if (!items.length) return;
      act = (n + items.length) % items.length;
      items.forEach((li, i) => li.setAttribute('aria-selected', String(i === act)));
      input.setAttribute('aria-activedescendant', items[act].id);
      items[act].scrollIntoView({
        block: 'nearest'
      });
    };
    input.oninput = show;
    input.onblur = () => setTimeout(close, 150);
    sugg.onmousedown = e => {
      const li = e.target.closest('li[data-code]');
      if (!li) return;
      e.preventDefault();
      close();
      onPick(li.dataset.code, li.dataset.variant || '');
    };
    input.onkeydown = e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (sugg.hidden) show();
        mark(act + (e.key === 'ArrowDown' ? 1 : -1));
        e.preventDefault();
      } else if (e.key === 'Escape') {
        if (!sugg.hidden) close();
        else if (!onEscape?.()) return;
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!sugg.hidden && act >= 0) {
          const li = sugg.children[act];
          close();
          onPick(li.dataset.code, li.dataset.variant || '');
        } else {
          close();
          onEnter();
        }
      }
    };
    return {
      show,
      close
    };
  }
  /** Lecture d'une saisie : { code } (désignateur sûr), { name } (rien ne correspond : appareil gardé sous son nom) ou
   *  { near } (plusieurs types possibles : le plus proche, à confirmer). */
  const readTyped = (search, text) => {
    const typed = String(text || '').trim();
    if (!typed) return null;
    const code = search.resolve(typed);
    if (code) return {
      code
    };
    const near = search.candidates(typed).filter(c => c.base >= 48)[0]?.code;
    return near ? {
      near,
      typed
    } : {
      name: typed.replace(/\s+/g, ' ')
    };
  };
  /** Message « plusieurs types possibles » (le plus proche repris dans le champ, « Ajouter » pour le confirmer). */
  const nearMsg = (typed, near) => tf([
    '« {s} » : plusieurs types possibles. Le plus proche : {c} ({n}), repris dans le champ — « Ajouter » pour le confirmer, ou choisissez dans la liste.',
    '“{s}”: several possible types. Closest: {c} ({n}), put in the field — “Add” to confirm, or pick from the list.',
    '„{s}“: mehrere mögliche Typen. Am nächsten: {c} ({n}), ins Feld übernommen — „Hinzufügen“ zum Bestätigen, oder aus der Liste wählen.',
    '«{s}»: varios tipos posibles. El más cercano: {c} ({n}), puesto en el campo; «Añadir» para confirmarlo, o elija en la lista.'
  ], {
    s: typed,
    c: near,
    n: typeName(near) || near
  });
  /** Texte d'aide commun sous le champ d'ajout. */
  const addHint = () => t([
    'Tapez un nom (« CL-415 », « Canadair 415 », « Caravelle ») : la suite propose les types de la flotte, de la base des types de ce poste et ses noms d’usage, de la liste OACI publiée. Le désignateur est trouvé pour vous ; sans correspondance, l’appareil est gardé sous son nom, « type OACI à confirmer ». La base de ce poste n’est complétée par le lanceur qu’au clic sur « Ajouter ».',
    'Type a name (“CL-415”, “Canadair 415”, “Caravelle”): the suite suggests the types of the fleet, of this computer’s type base and their common names, of the published ICAO list. The designator is found for you; with no match, the aircraft is kept under its name, “ICAO type to confirm”. This computer’s base is completed by the launcher only when you click “Add”.',
    'Einen Namen eingeben („CL-415“, „Canadair 415“, „Caravelle“): Die Suite schlägt die Typen der Flotte, der Typbasis dieses Rechners mit ihren gebräuchlichen Namen und der veröffentlichten ICAO-Liste vor. Die Kennung wird für Sie gefunden; ohne Treffer wird das Luftfahrzeug unter seinem Namen geführt, „ICAO-Typ zu bestätigen“. Die Basis dieses Rechners wird vom Starter nur beim Klick auf „Hinzufügen“ ergänzt.',
    'Escriba un nombre («CL-415», «Canadair 415», «Caravelle»): la suite propone los tipos de la flota, de la base de tipos de este equipo y sus nombres de uso, de la lista OACI publicada. El designador se encuentra por usted; sin coincidencia, la aeronave se guarda con su nombre, «tipo OACI por confirmar». La base de este equipo solo la completa el lanzador al hacer clic en «Añadir».'
  ]);

  /** Fenêtre « Ajouter un appareil » (Carburant) : le même champ que Paramètres (nom, suggestions, désignateur résolu
   *  ou appareil gardé sous son nom) ; l'appareil part dans « Mes appareils » (possédé) ; onAdded({ code, name }). */
  async function addDialog(tri, onAdded) {
    css();
    const M = A();
    tri = String(tri || M?.trigram?.() || '').toUpperCase();
    if (!M || !tri) {
      window.AppFramework?.notify?.(t(['Trigramme non réglé : le régler dans Paramètres › Mon profil › Identité et réseaux.',
        'Trigram not set: set it in Settings › My profile › Identity and networks.',
        'Kürzel nicht gesetzt: unter Einstellungen › Mein Profil › Identität und Netzwerke festlegen.',
        'Trigrama no definido: definirlo en Ajustes › Mi perfil › Identidad y redes.'
      ]), 'warn');
      return;
    }
    const offi = await officialCodes(),
      search = makeSearch({
        offi: () => offi
      }),
      fleet = new Set((M.fleetTypes?.() || []).map(x => x.type)),
      d = document.createElement('dialog');
    d.className = 'eq-dialog';
    d.innerHTML = `<h3>${esc(t(['Ajouter un appareil', 'Add an aircraft', 'Luftfahrzeug hinzufügen', 'Añadir una aeronave']))}</h3>
      <p class="small">${esc(t(['L’appareil part dans « Mes appareils » (Paramètres › Mon profil › Appareils et simulateurs) ; ses performances sont dans ce bloc.', 'The aircraft goes into “My aircraft” (Settings › My profile › Aircraft and simulators); its performance is in this block.', 'Das Luftfahrzeug kommt in „Meine Luftfahrzeuge“ (Einstellungen › Mein Profil › Luftfahrzeuge und Simulatoren); seine Leistungen stehen in diesem Block.', 'La aeronave pasa a «Mis aeronaves» (Ajustes › Mi perfil › Aeronaves y simuladores); su rendimiento está en este bloque.']))}</p>
      <div class="eq-add"><div class="eq-field"><input type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="eqDlgSugg" data-eq-add-input placeholder="${esc(t(['Nom ou type (ex. CL-415, Canadair 415, PC-12)', 'Name or type (e.g. CL-415, Canadair 415, PC-12)', 'Name oder Typ (z. B. CL-415, Canadair 415, PC-12)', 'Nombre o tipo (p. ej. CL-415, Canadair 415, PC-12)']))}" aria-label="${esc(t(['Appareil à ajouter', 'Aircraft to add', 'Hinzuzufügendes Luftfahrzeug', 'Aeronave que añadir']))}"><ul class="eq-sugg" id="eqDlgSugg" role="listbox" hidden></ul></div>
      <button type="button" class="primary" data-eq-add>${esc(t(['Ajouter', 'Add', 'Hinzufügen', 'Añadir']))}</button></div>
      <p class="sp-hint small">${esc(addHint())}</p>
      <footer><button type="button" class="secondary" data-eq-close>${esc(t(['Fermer', 'Close', 'Schließen', 'Cerrar']))}</button></footer>`;
    document.body.append(d);
    const input = d.querySelector('input'),
      sugg = d.querySelector('.eq-sugg'),
      origin = code => fleet.has(code) ? t(['flotte', 'fleet', 'Flotte', 'flota']) : dbInfo(code).model ? t(['base du poste',
        'this computer’s base', 'Basis dieses Rechners', 'base de este equipo'
      ]) : t(['liste OACI', 'ICAO list', 'ICAO-Liste', 'lista OACI']);
    /** Ajoute la saisie (ou le code choisi) aux appareils du pilote, puis ferme la fenêtre. */
    const add = async (picked, pickedVariant = '') => {
      const r = picked ? {
        code: picked
      } : readTyped(search, input.value);
      if (!r) return;
      if (r.near) {
        input.value = `${r.near}${typeName(r.near) ? ` — ${typeName(r.near)}` : ''}`;
        return window.AppFramework?.notify?.(nearMsg(r.typed, r.near), 'warn');
      }
      const key = r.code || r.name,
        av = await M.availability(tri).catch(() => null),
        variant = r.code ? pickedVariant || variantOf(r.code, input.value) : '',
        variants = {
          ...(av?.aircraft?.variants || {})
        };
      if (variant) variants[key] = [...new Set([...variantsIn(av?.aircraft?.variants, key), variant])];
      const saved = M.saveAircraft(tri, {
        owned: [...(av?.aircraft?.owned || []), key],
        mastered: av?.aircraft?.mastered || [],
        variants
      });
      const name = variant || myName(key, saved?.aircraft?.variants);
      if (r.code && !dbInfo(r.code).model && designator(r.code) && !tried.has(r.code)) completeType(r.code, () => onAdded?.({
        code: key,
        name
      }, true));
      clearTimeout(timer);
      timer = setTimeout(() => chain = chain.then(() => syncWeeks(tri)).catch(() => {}), 600);
      d.close();
      onAdded?.({
        code: key,
        name
      });
    };
    const sg = attachSuggest(input, sugg, search, origin, {
      onPick: (code, variant) => add(code, variant),
      onEnter: () => add(),
      onEscape: () => false
    });
    d.querySelector('[data-eq-add]').onclick = () => {
      sg.close();
      add();
    };
    d.querySelector('[data-eq-close]').onclick = () => d.close();
    d.addEventListener('close', () => d.remove());
    d.showModal();
    input.focus();
  }

  async function mount(host, tri) {
    css();
    tri = String(tri || '').toUpperCase();
    const M = A(),
      types = M.fleetTypes(),
      fleet = new Set(types.map(x => x.type)),
      decl = tri ? await M.availability(tri) : null;
    const ac = decl?.aircraft || {
      owned: [],
      mastered: []
    };
    const owned = new Set([...(ac.owned || []), ...(ac.mastered || [])]),
      mastered = new Set(ac.mastered || []);
    // variantes déclarées (désignateur → noms) ; l'ancien nom d'usage de ce navigateur reprend sa place de variante
    let variants = Object.fromEntries([...owned].map(c => [c, variantsIn(ac.variants, c)]).filter(([, v]) => v.length));
    let others = new Map(); // types hors flotte des autres pilotes (lus après le premier dessin)
    let offi = new Set(); // liste OACI publiée (lue après le premier dessin)
    let editing = ''; // appareil en cours de correction (clic sur sa ligne) : « Ajouter » devient « Remplacer »
    const shown = new Set([...owned].filter(ty => !fleet.has(ty))); // lignes de la carte « Autres appareils »
    const mine = new Set(decl?.sims || []),
      sims = [...new Set([...M.simulators(), ...mine])];
    const groups = CATEGORIES.map(c => types.filter(x => categoryOf(x.type) === c)).filter(g => g.length);
    const ICON = {
      helico: 'propeller',
      jet: 'plane',
      turboprop: 'propeller',
      piston: 'propeller',
      other: 'plane'
    };
    const search = makeSearch({
      offi: () => offi,
      extra: () => [...others.keys(), ...shown]
    });
    const summary = () => tf(['{m} type(s) maîtrisé(s), {o} possédé(s) sur {n} types de la flotte.',
      '{m} type(s) mastered, {o} owned out of {n} fleet types.', '{m} Typ(en) beherrscht, {o} besessen von {n} Flottentypen.',
      '{m} tipo(s) dominado(s), {o} poseído(s) de {n} tipos de la flota.'
    ], {
      m: [...mastered].filter(ty => fleet.has(ty)).length,
      o: [...owned].filter(ty => fleet.has(ty)).length,
      n: types.length
    });
    const PERF_TH = `<th>${esc(t(['Performances', 'Performance', 'Leistungen', 'Rendimiento']))}</th>`;
    /** Cellule « Performances » d'une ligne : profil ou « aucune », pour un appareil possédé ; « — » sinon. */
    const perfTd = code => `<td data-eq-perf="${esc(code)}">${owned.has(code) ? perfCell(code) : '—'}</td>`;
    /** Bouton « × » qui retire une variante déclarée (la ligne de son type reste). */
    const unvarBtn = (code, v) => ` <button type="button" class="secondary eq-unvar" data-eq-unvar="${esc(code)}" data-v="${esc(v)}" title="${esc(tf(['Retirer la variante {v}', 'Remove the variant {v}', 'Variante {v} entfernen', 'Quitar la variante {v}'], { v }))}">×</button>`;
    /** Lignes supplémentaires d'un type : une par variante déclarée après la première (nom, performances communes). */
    const varRows = (code, cols) => (owned.has(code) ? variants[code] || [] : []).slice(1).map(v => `<tr class="eq-var"><td>${nameCell({ code, name: v, common: true })}${unvarBtn(code, v)}</td>${'<td></td>'.repeat(cols)}${perfTd(code)}<td class="eq-c"></td><td class="eq-c"></td></tr>`).join('');
    /** Lignes de la carte « Autres appareils » : appareils hors flotte du pilote, puis ceux des autres pilotes. */
    const otherRows = () => {
      const list = [...new Set([...shown, ...others.keys()])].map(ty => ({
        type: ty,
        info: dbInfo(ty),
        by: others.get(ty) || []
      })).sort((a, b) => owned.has(b.type) - owned.has(a.type) || CATEGORIES.indexOf(categoryOf(a.type)) - CATEGORIES.indexOf(
        categoryOf(b.type)) || String(typeName(a.type) || a.type).localeCompare(String(typeName(b.type) || b.type), 'fr', {
        numeric: true
      }));
      if (!list.length) return `<p class="small">${esc(t(['Aucun appareil hors flotte déclaré.', 'No aircraft outside the fleet declared.', 'Kein Luftfahrzeug außerhalb der Flotte angegeben.', 'Ninguna aeronave fuera de la flota declarada.']))}</p>`;
      return `<table class="eq-table"><thead><tr><th>${esc(t(['Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave']))}</th><th>${esc(t(['Aussi déclaré par', 'Also declared by', 'Auch angegeben von', 'También declarado por']))}</th>${PERF_TH}<th class="eq-c">${esc(t(['Possédé', 'Owned', 'Besessen', 'Poseído']))}</th><th class="eq-c">${esc(t(['Maîtrisé', 'Mastered', 'Beherrscht', 'Dominado']))}</th></tr></thead><tbody>${list.map(x => {
        const vs = owned.has(x.type) ? variants[x.type] || [] : [],
          name = vs[0] || fullName(x.type) || x.type,
          named = !designator(x.type) && !x.info.model; // appareil gardé sous son nom
        const note = running.has(x.type) ? t(['complétion de la base en cours…', 'completing the type base…', 'Typbasis wird ergänzt…', 'completando la base de tipos…']) :
          named ? '' : (x.info.icao === false ? `${tf(['hors OACI : {f} dans un plan de vol', 'non-ICAO: {f} in a flight plan', 'nicht ICAO: {f} im Flugplan', 'no OACI: {f} en un plan de vuelo'], { f: x.info.fpl || 'ZZZZ' })}` : '') ||
          (x.info.model ? '' : tried.has(x.type) ? t(['introuvable (OACI, EUROCONTROL, Aviation Fanatic)', 'not found (ICAO, EUROCONTROL, Aviation Fanatic)', 'nicht gefunden (ICAO, EUROCONTROL, Aviation Fanatic)', 'no encontrado (OACI, EUROCONTROL, Aviation Fanatic)']) : offi.has(x.type) ? t(['absent de la base de ce poste', 'missing from this computer’s type base', 'fehlt in der Typbasis dieses Rechners', 'ausente de la base de este equipo']) :
            t(['type inconnu de la base OACI', 'type unknown to the ICAO base', 'Typ in der ICAO-Basis unbekannt', 'tipo desconocido en la base OACI']));
        const mineRow = owned.has(x.type) || shown.has(x.type);
        // désignateur sans fiche, jamais cherché sur cette page : recherche à la demande ; appareil gardé sous son nom :
        // « Chercher le type » ouvre son édition (le nom dans le champ, suggestions comprises)
        const ask = mineRow && named ? ` <button type="button" class="secondary" data-eq-fixbtn="${esc(x.type)}">${esc(t(['Chercher le type', 'Find the type', 'Typ suchen', 'Buscar el tipo']))}</button>` :
          mineRow && !x.info.model && designator(x.type) && !tried.has(x.type) && !running.has(x.type) ? ` <button type="button" class="secondary" data-eq-complete="${esc(x.type)}">${esc(t(['Chercher la fiche', 'Look up the record', 'Eintrag suchen', 'Buscar la ficha']))}</button>` : '';
        const fixAttr = mineRow ? ` data-eq-fix="${esc(x.type)}" tabindex="0" role="button" title="${esc(tf(['Cliquer pour corriger ou supprimer {m}', 'Click to correct or delete {m}', 'Klicken, um {m} zu korrigieren oder zu löschen', 'Hacer clic para corregir o eliminar {m}'], { m: name }))}"` : '';
        return `<tr${editing === x.type ? ' class="eq-fixing"' : ''}><td${fixAttr}>${nameCell({ code: x.type, name, common: !!vs.length })}${vs.length ? unvarBtn(x.type, vs[0]) : ''}${note ? `<small>${esc(note)}</small>` : ''}${ask}</td>
          <td>${esc(x.by.join(', ') || '—')}</td>${perfTd(x.type)}
          <td class="eq-c"><input type="checkbox" data-own="${esc(x.type)}"${owned.has(x.type) ? ' checked' : ''} aria-label="${esc(tf(['{m} possédé', '{m} owned', '{m} besessen', '{m} poseído'], { m: name }))}"></td>
          <td class="eq-c"><input type="checkbox" data-master="${esc(x.type)}"${mastered.has(x.type) ? ' checked' : ''} aria-label="${esc(tf(['{m} maîtrisé', '{m} mastered', '{m} beherrscht', '{m} dominado'], { m: name }))}"></td></tr>${varRows(x.type, 1)}`;
      }).join('')}</tbody></table>`;
    };
    /** Origine d'un type proposé : flotte, base du poste, liste OACI (fiche complétée à l'ajout), déclaré par d'autres. */
    const originOf = code => [fleet.has(code) ? t(['flotte', 'fleet', 'Flotte', 'flota']) : dbInfo(code).model ? t(['base du poste',
        'this computer’s base', 'Basis dieses Rechners', 'base de este equipo'
      ]) : offi.has(code) ? t(['liste OACI : fiche complétée à l’ajout', 'ICAO list: record completed when added',
        'ICAO-Liste: Eintrag wird beim Hinzufügen ergänzt', 'lista OACI: ficha completada al añadir'
      ]) : designator(code) ? t(['fiche cherchée à l’ajout', 'record looked up when added', 'Eintrag wird beim Hinzufügen gesucht',
        'ficha buscada al añadir'
      ]) : t(['hors base', 'not in the base', 'nicht in der Basis', 'fuera de la base']),
      others.get(code)?.length ? tf(['déclaré par {p}', 'declared by {p}', 'angegeben von {p}', 'declarado por {p}'], {
        p: others.get(code).join(', ')
      }) : ''
    ].filter(Boolean).join(' · ');
    const otherHtml = `<div class="sp-card" id="eqOther" data-no-i18n><h3>${esc(t(['Autres appareils (hors flotte)', 'Other aircraft (outside the fleet)', 'Andere Luftfahrzeuge (außerhalb der Flotte)', 'Otras aeronaves (fuera de la flota)']))}</h3><p class="sp-hint">${esc(t(['Appareils que vous possédez dans votre simulateur sans qu’ils soient dans la flotte : ajoutés ici, ils font partie de vos appareils et partent avec vos disponibilités déclarées — le Centre les voit pour les affectations et les autres pilotes les retrouvent dans cette carte.', 'Aircraft you own in your simulator that are not in the fleet: added here, they are part of your aircraft and go with your declared availability — the Centre sees them for assignments and other pilots find them in this card.', 'Luftfahrzeuge, die Sie in Ihrem Simulator besitzen, die aber nicht zur Flotte gehören: Hier hinzugefügt, gehören sie zu Ihren Luftfahrzeugen und gehen mit Ihren angegebenen Verfügbarkeiten mit — das Zentrum sieht sie für Zuweisungen, andere Piloten finden sie in dieser Karte.', 'Aeronaves que posee en su simulador sin que estén en la flota: añadidas aquí, forman parte de sus aeronaves y van con sus disponibilidades declaradas — el Centro las ve para las asignaciones y los demás pilotos las encuentran en esta tarjeta.']))}</p>
      <div data-eq-other>${otherRows()}</div>
      <div class="eq-add"><div class="eq-field"><input type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="eqSugg" data-eq-add-input placeholder="${esc(t(['Nom ou type (ex. CL-415, Canadair 415, PC-12)', 'Name or type (e.g. CL-415, Canadair 415, PC-12)', 'Name oder Typ (z. B. CL-415, Canadair 415, PC-12)', 'Nombre o tipo (p. ej. CL-415, Canadair 415, PC-12)']))}" aria-label="${esc(t(['Appareil à ajouter', 'Aircraft to add', 'Hinzuzufügendes Luftfahrzeug', 'Aeronave que añadir']))}"><ul class="eq-sugg" id="eqSugg" role="listbox" hidden data-eq-sugg></ul></div>
        <button type="button" class="secondary" data-eq-add>${esc(t(['Ajouter', 'Add', 'Hinzufügen', 'Añadir']))}</button><button type="button" class="secondary" data-eq-delete hidden>${esc(t(['Supprimer', 'Delete', 'Löschen', 'Eliminar']))}</button><button type="button" class="secondary" data-eq-cancel hidden>${esc(t(['Annuler', 'Cancel', 'Abbrechen', 'Cancelar']))}</button></div>
      <p class="small" data-eq-fixing hidden></p>
      <p class="sp-hint">${esc(addHint())}</p>
      <p class="sp-hint"><a href="https://www.aviationfanatic.com/ent_list.php?ent=4" target="_blank" rel="noopener">${esc(t(['Chercher soi-même un type compatible sur Aviation Fanatic ↗', 'Look up a compatible type yourself on Aviation Fanatic ↗', 'Selbst einen passenden Typ bei Aviation Fanatic suchen ↗', 'Buscar uno mismo un tipo compatible en Aviation Fanatic ↗']))}</a> — ${esc(t(['liste des types d’aéronefs avec leur désignateur, retirés compris (site externe, en anglais).', 'list of aircraft types with their designator, retired ones included (external site).', 'Liste der Luftfahrzeugtypen mit Kennung, auch ausgemusterte (externe Website, auf Englisch).', 'lista de tipos de aeronaves con su designador, incluidos los retirados (sitio externo, en inglés).']))}</p></div>`;
    const typesHtml = () => types.length ? `<p class="eq-sum" data-eq-sum>${esc(summary())}</p><div class="eq-cards">${groups.map(g => `<div class="repo-card" data-icon="${ICON[categoryOf(g[0].type)] || 'plane'}" data-subtitle="${esc(tf(['{n} type(s)', '{n} type(s)', '{n} Typ(en)', '{n} tipo(s)'], { n: g.length }))}"><h3>${esc(categoryLabel(categoryOf(g[0].type)))}</h3>
      <table class="eq-table"><thead><tr><th>${esc(t(['Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave']))}</th><th>${esc(t(['Variantes de la flotte', 'Fleet variants', 'Flottenvarianten', 'Variantes de la flota']))}</th><th>${esc(t(['Appareils', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves']))}</th>${PERF_TH}<th class="eq-c">${esc(t(['Possédé', 'Owned', 'Besessen', 'Poseído']))}</th><th class="eq-c">${esc(t(['Maîtrisé', 'Mastered', 'Beherrscht', 'Dominado']))}</th></tr></thead><tbody>${g.sort((a, b) => String(a.model).localeCompare(String(b.model), 'fr', { numeric: true })).map(x => `<tr>
        <td>${nameCell({ code: x.type, name: (owned.has(x.type) && variants[x.type]?.[0]) || fullName(x.type) || x.model, common: !!(owned.has(x.type) && variants[x.type]?.length) })}${owned.has(x.type) && variants[x.type]?.length ? unvarBtn(x.type, variants[x.type][0]) : ''}</td>
        <td>${esc(x.variants.join(', ') || '—')}</td>
        <td><b>${x.operational}</b>${x.operational < x.count ? `<small> / ${x.count}</small>` : ''}<br><small title="${esc(x.bases.join(', '))}">${esc(x.bases.slice(0, 3).join(', '))}${x.bases.length > 3 ? '…' : ''}</small></td>
        ${perfTd(x.type)}
        <td class="eq-c"><input type="checkbox" data-own="${esc(x.type)}"${owned.has(x.type) ? ' checked' : ''} aria-label="${esc(tf(['{m} possédé', '{m} owned', '{m} besessen', '{m} poseído'], { m: x.model }))}"></td>
        <td class="eq-c"><input type="checkbox" data-master="${esc(x.type)}"${mastered.has(x.type) ? ' checked' : ''} aria-label="${esc(tf(['{m} maîtrisé', '{m} mastered', '{m} beherrscht', '{m} dominado'], { m: x.model }))}"></td></tr>${varRows(x.type, 2)}`).join('')}</tbody></table></div>`).join('')}</div>` : `<p class="small">${esc(t(['Flotte non chargée.', 'Fleet not loaded.', 'Flotte nicht geladen.', 'Flota no cargada.']))}</p>`;
    host.innerHTML = `<div class="sp-card" id="eqTypes" data-no-i18n><h3>${esc(t(['Mes appareils', 'My aircraft', 'Meine Luftfahrzeuge', 'Mis aeronaves']))}</h3><p class="sp-hint">${esc(t(['Vos appareils, flotte comprise : ceux que vous possédez dans votre simulateur et ceux que vous maîtrisez — le Centre s’en sert pour vous affecter un appareil. Leurs performances sont dans le Carburant (bloc « Profils de performances », mêmes appareils) : colonne « Performances ».', 'Your aircraft, fleet included: those you own in your simulator and those you have mastered — the Centre uses them to assign you an aircraft. Their performance is in Fuel (“Performance profiles” block, same aircraft): “Performance” column.', 'Ihre Luftfahrzeuge, Flotte inbegriffen: die, die Sie in Ihrem Simulator besitzen, und die, die Sie beherrschen — das Zentrum nutzt sie, um Ihnen ein Luftfahrzeug zuzuweisen. Ihre Leistungen stehen unter Kraftstoff (Block „Leistungsprofile“, dieselben Luftfahrzeuge): Spalte „Leistungen“.', 'Sus aeronaves, flota incluida: las que posee en su simulador y las que domina — el Centro las usa para asignarle una aeronave. Su rendimiento está en Combustible (bloque «Perfiles de rendimiento», mismas aeronaves): columna «Rendimiento».']))}</p><div data-eq-types>${typesHtml()}</div></div>
      ${otherHtml}
      <div class="sp-card" id="eqSims" data-no-i18n><h3>${esc(t(['Simulateurs', 'Simulators', 'Simulatoren', 'Simuladores']))}</h3><p class="sp-hint">${esc(t(['Simulateurs et outils installés (colonnes de la feuille FLOTTE du classeur ODV) : le Centre s’en sert pour réunir des pilotes sur un simulateur commun.', 'Installed simulators and tools (columns of the FLOTTE sheet of the ODV workbook): the Centre uses them to gather pilots on a common simulator.', 'Installierte Simulatoren und Werkzeuge (Spalten des Blatts FLOTTE der ODV-Arbeitsmappe): Das Zentrum nutzt sie, um Piloten auf einem gemeinsamen Simulator zusammenzubringen.', 'Simuladores y herramientas instalados (columnas de la hoja FLOTTE del libro ODV): el Centro los usa para reunir a pilotos en un simulador común.']))}</p>
        <div class="eq-sims" data-eq-sims>${sims.map(s => `<label><input type="checkbox" data-sim="${esc(s)}"${mine.has(s) ? ' checked' : ''}> ${M.simChips([s])}${esc(s)}</label>`).join('')}</div></div>
      <p class="small" data-eq-msg>${esc(t(['Gardé dans ce navigateur et recopié dans vos semaines de disponibilités déclarées, à partir de la semaine en cours (pour le Centre).', 'Kept in this browser and copied into your declared availability weeks, from the current week on (for the Centre).', 'In diesem Browser gespeichert und in Ihre angegebenen Verfügbarkeitswochen ab der aktuellen Woche übernommen.', 'Guardado en este navegador y copiado en sus semanas de disponibilidad declaradas, a partir de la semana actual (para el Centro).']))}</p>`;
    // lien vers une carte (#eqTypes, #eqSims : boutons de Mes missions) : carte amenée à l'écran une fois dessinée
    if (/^#eq(Types|Other|Sims)$/.test(location.hash)) host.querySelector(location.hash)?.scrollIntoView({
      block: 'start'
    });
    const msg = host.querySelector('[data-eq-msg]');
    /** Recopie dans les semaines déclarées, après la dernière coche (plusieurs coches rapprochées : une passe). */
    const scheduleSync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        chain = chain.then(() => syncWeeks(tri)).then(n => {
          msg.textContent = n ? tf(['Gardé dans ce navigateur et recopié dans {n} semaine(s) de disponibilités déclarée(s).',
            'Kept in this browser and copied into {n} declared availability week(s).',
            'In diesem Browser gespeichert und in {n} angegebene Verfügbarkeitswoche(n) übernommen.',
            'Guardado en este navegador y copiado en {n} semana(s) de disponibilidad declarada(s).'
          ], {
            n
          }) : t(['Gardé dans ce navigateur ; recopié avec votre prochaine semaine de disponibilités déclarée.',
            'Kept in this browser; copied with your next declared availability week.',
            'In diesem Browser gespeichert; mit Ihrer nächsten angegebenen Verfügbarkeitswoche übernommen.',
            'Guardado en este navegador; copiado con su próxima semana de disponibilidad declarada.'
          ]);
        }, err => {
          msg.textContent = err?.message || String(err);
        });
      }, 600);
    };
    /** Cellules « Performances » remises à jour (coche, profil créé dans le Carburant d'un autre onglet). */
    const refreshPerf = () => host.querySelectorAll('[data-eq-perf]').forEach(td => {
      const html = owned.has(td.dataset.eqPerf) ? perfCell(td.dataset.eqPerf) : '—';
      if (td.innerHTML !== html) td.innerHTML = html;
    });
    /** Types cochés (flotte et hors flotte) enregistrés ; extra : appareil ajouté à la main, possédé. */
    const saveTypes = (extra = '') => {
      const d = M.saveAircraft(tri, {
        owned: [...host.querySelectorAll('[data-own]:checked')].map(i => i.dataset.own).concat(extra ? [extra] : []),
        mastered: [...host.querySelectorAll('[data-master]:checked')].map(i => i.dataset.master),
        variants
      });
      variants = {
        ...(d.aircraft.variants || {})
      };
      owned.clear();
      d.aircraft.owned.forEach(v => owned.add(v));
      mastered.clear();
      d.aircraft.mastered.forEach(v => mastered.add(v));
      const sum = host.querySelector('[data-eq-sum]');
      if (sum) sum.textContent = summary();
      refreshPerf();
    };
    /** Carte « Autres appareils » redessinée (après un ajout, une coche des autres pilotes, une passe du lanceur). */
    const redrawOther = () => {
      search.reset(); // sources changées (ajout, autres pilotes, passe du lanceur) : index refait à la prochaine frappe
      const el = host.querySelector('[data-eq-other]');
      if (el) el.innerHTML = otherRows();
    };
    /** Tout redessiné (silhouettes ou fiches SimBrief chargées après le premier dessin). */
    function redrawAll() {
      if (!host.isConnected) return;
      const el = host.querySelector('[data-eq-types]');
      if (el) el.innerHTML = typesHtml();
      redrawOther();
      window.AppFramework?.refresh?.();
    }
    // profil créé ou supprimé dans le Carburant (autre onglet) : colonne « Performances » à jour
    window.addEventListener('storage', e => {
      if (e.key === 'flightPerfState' && host.isConnected) refreshPerf();
    });
    host.onchange = e => {
      const x = e.target;
      if (!x.matches('[data-own], [data-master], [data-sim]')) return;
      if (x.dataset.master && x.checked) host.querySelector(`[data-own="${x.dataset.master}"]`).checked = true; // maîtrisé → possédé
      if (x.dataset.own && !x.checked) host.querySelector(`[data-master="${x.dataset.own}"]`).checked = false; // non possédé → non maîtrisé
      if (x.dataset.sim) M.saveSims(tri, [...host.querySelectorAll('[data-sim]:checked')].map(i => i.dataset.sim));
      else saveTypes();
      scheduleSync();
    };
    /** Ajout à la main : type de la flotte → sa case cochée ; autre type → ligne de « Autres appareils », possédé ;
     *  rien ne correspond → appareil gardé sous son nom (« type OACI à confirmer ») ; plusieurs types possibles → le plus
     *  proche repris dans le champ. */
    const addTyped = (picked, pickedVariant = '') => {
      const r = picked ? {
        code: picked
      } : readTyped(search, input.value);
      if (!r) return; // champ vide : rien
      if (r.near) {
        input.value = `${r.near}${typeName(r.near) ? ` — ${typeName(r.near)}` : ''}`;
        window.AppFramework?.notify?.(nearMsg(r.typed, r.near), 'warn');
        return;
      }
      const ty = r.code || r.name,
        variant = r.code ? pickedVariant || variantOf(r.code, input.value) : '';
      if (variant) variants[ty] = [...new Set([...(variants[ty] || []), variant])];
      input.value = '';
      // correction : l'ancien appareil retiré, « Maîtrisé » reporté sur le nouveau
      const old = editing,
        wasMastered = !!old && mastered.has(old);
      if (old) {
        endFix();
        if (old !== ty) dropType(old, false);
      }
      if (fleet.has(ty)) {
        const box = host.querySelector(`[data-own="${ty}"]`);
        if (box) box.checked = true;
        box?.closest('tr')?.scrollIntoView({
          block: 'center'
        });
        window.AppFramework?.notify?.(tf(['{t} fait partie de la flotte : coché dans la carte « Mes appareils ».',
          '{t} is in the fleet: ticked in the “My aircraft” card.',
          '{t} gehört zur Flotte: in der Karte „Meine Luftfahrzeuge“ angehakt.',
          '{t} forma parte de la flota: marcado en la tarjeta «Mis aeronaves».'
        ], {
          t: `${typeName(ty)} (${ty})`
        }), 'info');
        if (wasMastered) host.querySelector(`[data-master="${ty}"]`).checked = true;
        saveTypes();
        redrawAll(); // nom de la variante, lignes des variantes
      } else {
        shown.add(ty);
        saveTypes(ty);
        if (wasMastered) {
          redrawOther();
          host.querySelector(`[data-master="${ty}"]`).checked = true;
          saveTypes();
        }
        // désignateur absent de la base de ce poste : fiche cherchée par le lanceur (passe courte ou file : OACI,
        // EUROCONTROL, puis Aviation Fanatic pour un type retiré) ; appareil gardé sous son nom : rien à chercher
        if (!dbInfo(ty).model && designator(ty) && !tried.has(ty)) completeType(ty, redrawOther);
        if (r.name) window.AppFramework?.notify?.(tf([
          '« {n} » : aucun type ne correspond. Appareil gardé sous ce nom, « type OACI à confirmer » — « Chercher le type » sur sa ligne pour le rattacher plus tard.',
          '“{n}”: no type matches. Aircraft kept under this name, “ICAO type to confirm” — “Find the type” on its row to link it later.',
          '„{n}“: kein Typ passt. Luftfahrzeug unter diesem Namen geführt, „ICAO-Typ zu bestätigen“ — „Typ suchen“ in seiner Zeile, um es später zuzuordnen.',
          '«{n}»: ningún tipo coincide. Aeronave guardada con este nombre, «tipo OACI por confirmar»; «Buscar el tipo» en su fila para vincularla más tarde.'
        ], {
          n: ty
        }), 'info');
        redrawOther();
      }
      scheduleSync();
    };
    /** Retire un appareil (cases décochées, ligne ôtée sauf s'il est déclaré par d'autres) ; sync : recopie dans les
     *  semaines déclarées (non pendant une correction, qui la fait elle-même). */
    function dropType(code, sync = true) {
      host.querySelectorAll(`[data-own="${CSS.escape(code)}"], [data-master="${CSS.escape(code)}"]`).forEach(x => x.checked = false);
      shown.delete(code);
      saveTypes();
      redrawOther();
      if (sync) scheduleSync();
    }
    /** Fin de l'édition : « Ajouter » remis, « Supprimer », « Annuler » et la ligne d'aide cachés. */
    function endFix() {
      editing = '';
      host.querySelector('[data-eq-add]').textContent = t(['Ajouter', 'Add', 'Hinzufügen', 'Añadir']);
      host.querySelector('[data-eq-cancel]').hidden = true;
      host.querySelector('[data-eq-delete]').hidden = true;
      host.querySelector('[data-eq-fixing]').hidden = true;
      redrawOther();
    }
    /** Édition d'un appareil ajouté (clic sur sa ligne, « Chercher le type ») : son code ou son nom dans le champ
     *  (suggestions comprises), « Remplacer », « Supprimer » et « Annuler » à la place d'« Ajouter ». */
    function startFix(code) {
      editing = code;
      input.value = code;
      host.querySelector('[data-eq-add]').textContent = t(['Remplacer', 'Replace', 'Ersetzen', 'Sustituir']);
      host.querySelector('[data-eq-cancel]').hidden = false;
      host.querySelector('[data-eq-delete]').hidden = false;
      const line = host.querySelector('[data-eq-fixing]');
      line.textContent = tf([
        'Édition de {c} ({n}) : saisissez ou choisissez le bon type, puis « Remplacer » (« Maîtrisé » est reporté) ; ou « Supprimer ».',
        'Editing {c} ({n}): type or choose the right type, then “Replace” (“Mastered” is carried over); or “Delete”.',
        'Bearbeitung von {c} ({n}): den richtigen Typ eingeben oder wählen, dann „Ersetzen“ („Beherrscht“ wird übertragen); oder „Löschen“.',
        'Edición de {c} ({n}): escriba o elija el tipo correcto y luego «Sustituir» («Dominado» se traslada); o «Eliminar».'
      ], {
        c: code,
        n: typeName(code) || code
      });
      line.hidden = false;
      redrawOther();
      input.focus();
      input.select();
      sg.show();
    }
    /** Supprime l'appareil en cours d'édition (bouton « Supprimer » de l'édition). */
    const deleteEdited = () => {
      const code = editing;
      if (!code) return;
      input.value = '';
      sg.close();
      endFix();
      dropType(code);
      window.AppFramework?.notify?.(tf(['{c} retiré de vos appareils.', '{c} removed from your aircraft.',
        '{c} aus Ihren Luftfahrzeugen entfernt.',
        '{c} quitado de sus aeronaves.'
      ], {
        c: typeName(code) && typeName(code) !== code ? `${code} (${typeName(code)})` : code
      }), 'info');
    };
    host.onclick = e => {
      const unvar = e.target.closest('[data-eq-unvar]');
      if (unvar) {
        const c = unvar.dataset.eqUnvar;
        variants[c] = (variants[c] || []).filter(v => v !== unvar.dataset.v);
        if (!variants[c].length) delete variants[c];
        try { // l'ancien nom d'usage de ce navigateur ne revient pas
          const l = labels();
          if (l[c] === unvar.dataset.v) {
            delete l[c];
            localStorage.setItem(LABELS, JSON.stringify(l));
          }
        } catch {}
        saveTypes();
        redrawAll();
        return scheduleSync();
      }
      const look = e.target.closest('[data-eq-complete]'),
        find = !look && e.target.closest('[data-eq-fixbtn]'),
        fix = !look && !find && !e.target.closest('a, button') && e.target.closest('[data-eq-fix]');
      if (look) completeType(look.dataset.eqComplete, redrawOther);
      else if (find) startFix(find.dataset.eqFixbtn);
      else if (fix) startFix(fix.dataset.eqFix);
      else if (e.target.closest('[data-eq-delete]')) deleteEdited();
      else if (e.target.closest('[data-eq-cancel]')) {
        input.value = '';
        sg.close();
        endFix();
      }
    };
    // clavier : Entrée ou Espace sur la cellule d'un appareil ouvre son édition
    host.onkeydown = e => {
      const fix = (e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-eq-fix]') ? e.target : null;
      if (!fix) return;
      e.preventDefault();
      startFix(fix.dataset.eqFix);
    };
    const input = host.querySelector('[data-eq-add-input]'),
      sugg = host.querySelector('[data-eq-sugg]');
    const sg = attachSuggest(input, sugg, search, originOf, {
      onPick: (code, variant) => addTyped(code, variant),
      onEnter: () => addTyped(),
      onEscape: () => {
        if (!editing) return false;
        input.value = '';
        endFix();
        return true;
      }
    });
    host.querySelector('[data-eq-add]').onclick = () => {
      sg.close();
      addTyped();
    };
    // liste OACI publiée : suggestions et notes des lignes, après le premier dessin
    officialCodes().then(set => {
      offi = set;
      redrawOther();
      // passe du lanceur lancée avant l'ouverture de la page (ou file d'attente) pour un type de la carte : suivie
      resumeTypes([...shown].filter(c => !dbInfo(c).model && designator(c)), redrawOther);
    });
    // types hors flotte des autres pilotes : lus après le premier dessin (une déclaration par pilote de l'index)
    othersTypes(M, tri, fleet).then(map => {
      others = map;
      if (map.size && host.isConnected) redrawOther();
    }, () => {});
    // silhouettes et fiches SimBrief (« Créer depuis SimBrief ») : chargées à la demande sur une page qui ne les a pas
    if (!window.AircraftDBIcons) loadScript('aircraft_icons.js').then(redrawAll);
    if (!window.AIRCRAFT_PERF) loadScript('aircraft_perf.js').then(redrawAll);
    window.AppFramework?.refresh?.(); // en-têtes des sous-cartes (icône, titre, sous-titre)
  }

  window.EquipmentEditor = {
    mount,
    css,
    myAircraft,
    addDialog,
    perfOf,
    fuelUrl,
    nameCell,
    categoryOf,
    categoryLabel,
    simbriefKnows,
    typeName,
    makeSearch,
    myName,
    fullName,
    variantChoices,
    CATEGORIES
  };
})();
