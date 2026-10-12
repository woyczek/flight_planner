(() => {
  'use strict';
  // Appareils et simulateurs du pilote (Paramètres › Mon profil › Appareils et simulateurs ; avant : blocs « Mes appareils »
  // et « Mes simulateurs » de Mes missions).
  //   · appareils : types de la flotte possédés (dans son simulateur) / maîtrisés — une sous-carte par catégorie
  //     (hélicoptères, réacteurs, turbopropulseurs, pistons), tableau : type (désignateur et modèle), variantes de la
  //     flotte, appareils et bases, cases Possédé / Maîtrisé (maîtrisé implique possédé) ;
  //   · autres appareils (hors flotte) : types ajoutés à la main (désignateur OACI ou modèle, base des types
  //     AIRCRAFT_DB et ses alias ; type inconnu de la base accepté tel quel), mêmes cases Possédé / Maîtrisé ; partagés
  //     par les déclarations (le Centre les lit comme les types de la flotte) et proposés aux autres pilotes : la carte
  //     liste aussi les types hors flotte déclarés par les autres (« Aussi déclaré par »), à cocher d'un clic ;
  //   · simulateurs : liste de la feuille FLOTTE du classeur ODV (MissionAssignments.simulators) ;
  //   · enregistrés dans ce navigateur (MissionAssignments.saveAircraft / saveSims), puis recopiés dans les semaines
  //     déclarées du pilote à partir de la semaine en cours (le Centre lit les appareils dans ces fichiers).
  // API (window.EquipmentEditor) : mount(hôte, TRI) → Promise.
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
.eq-add{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0 0}.eq-add .eq-field{position:relative;flex:1 1 16em;min-width:0;display:flex}.eq-add input{flex:1 1 auto;min-width:0}
.eq-sugg{position:absolute;z-index:30;left:0;right:0;top:100%;margin:2px 0 0;padding:2px 0;list-style:none;max-height:16em;overflow:auto;background:var(--repo-card-bg,Canvas);color:inherit;border:1px solid color-mix(in srgb,currentColor 25%,transparent);box-shadow:0 4px 14px rgba(0,0,0,.18)}
.eq-sugg li{padding:4px 8px;cursor:pointer;font-size:12.5px}.eq-sugg li small{opacity:.7;margin-left:6px}.eq-sugg li[aria-selected=true],.eq-sugg li:hover{background:color-mix(in srgb,currentColor 12%,transparent)}
.eq-sims{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px 14px}.eq-sims label{display:inline-flex;align-items:center;gap:6px;margin:0}.eq-sims input{margin:0}`;
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
        maitrises: av?.aircraft?.mastered || []
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
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  /** Mots d'un texte (majuscules sans accents) : « Sud Aviation SE 210 » → [SUD, AVIATION, SE, 210]. */
  const wordsOf = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
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
  /** Nom affiché d'un type : modèle de la base, sinon son premier nom d'usage (« Caravelle »), sinon ''. */
  const typeName = code => {
    const m = dbInfo(code).model;
    if (m) return modelName(m);
    const a = aliasNames(code)[0];
    return a && !/\d/.test(a) ? a.charAt(0) + a.slice(1).toLowerCase() : a || '';
  };
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
  /** Base des types relue après une passe du lanceur (AIRCRAFT_DB remplacée par le fichier réécrit). */
  const reloadDb = () => new Promise(res => {
    const s = document.createElement('script');
    s.src = new URL(`../AircraftDB/aircraft_db.js?t=${Date.now()}`, HERE).href;
    s.onload = s.onerror = () => {
      s.remove();
      res();
    };
    document.head.append(s);
  });
  // complétion : demandée au lanceur au clic sur « Ajouter » seulement (jamais pendant la frappe) ; le lanceur fait une
  // passe à la fois et met en file les codes demandés pendant une passe (lancés à sa fin, même si la page est fermée).
  // La page ne fait que suivre : codes de la passe en cours et de la file (« complétion en cours… »), base relue à la fin ;
  // à l'ouverture, elle reprend le suivi d'une passe en cours.
  const running = new Set(), // codes suivis : dans la passe en cours ou en file
    tried = new Set(); // codes passés au lanceur et toujours absents (type retiré de l'OACI, source muette)
  let watching = false;
  /** Codes de la passe en cours et de la file d'attente d'après l'état du lanceur. */
  const busyCodes = s => new Set([...(s?.state === 'running' ? s.codes || [] : []), ...(s?.queue || [])]);
  /** Suit les codes suivis jusqu'à la fin de leur passe : base relue, redraw() à chaque changement. */
  async function watchTypes(redraw) {
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
        redraw();
      }
    } finally {
      watching = false;
    }
  }
  /** Demande au lanceur de compléter un code (passe courte, ou file d'attente si une passe tourne), puis le suit. */
  async function completeType(code, redraw) {
    running.add(code);
    redraw();
    const s = await acApi({
      codes: [code],
      quick: true
    });
    if (!s || !(s.started || busyCodes(s).has(code))) running.delete(code); // pas de lanceur : le code reste tel quel
    redraw();
    watchTypes(redraw);
  }
  /** À l'ouverture : passe en cours ou file d'attente qui concernent ces codes → suivies ; dernière passe terminée
   *  sans fiche pour un code → « introuvable ». */
  async function resumeTypes(codes, redraw) {
    const s = await acApi();
    if (!s) return;
    const busy = busyCodes(s);
    codes.forEach(c => {
      if (busy.has(c)) running.add(c);
      else if (s.state !== 'running' && (s.codes || []).includes(c) && !dbInfo(c).model) tried.add(c);
    });
    redraw();
    if (running.size) watchTypes(redraw);
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
    let others = new Map(); // types hors flotte des autres pilotes (lus après le premier dessin)
    let offi = new Set(); // liste OACI publiée (lue après le premier dessin)
    let editing = ''; // type en cours de correction (« Corriger ») : « Ajouter » devient « Remplacer »
    const shown = new Set([...owned].filter(ty => !fleet.has(ty))); // lignes de la carte « Autres appareils »
    const mine = new Set(decl?.sims || []),
      sims = [...new Set([...M.simulators(), ...mine])];
    const groups = [...new Set(types.map(x => x.category))].map(c => types.filter(x => x.category === c));
    const ICON = {
      helico: 'propeller',
      jet: 'plane',
      turboprop: 'propeller',
      piston: 'propeller',
      other: 'plane'
    };
    const summary = () => tf(['{m} type(s) maîtrisé(s), {o} possédé(s) sur {n} types de la flotte.',
      '{m} type(s) mastered, {o} owned out of {n} fleet types.', '{m} Typ(en) beherrscht, {o} besessen von {n} Flottentypen.',
      '{m} tipo(s) dominado(s), {o} poseído(s) de {n} tipos de la flota.'
    ], {
      m: [...mastered].filter(ty => fleet.has(ty)).length,
      o: [...owned].filter(ty => fleet.has(ty)).length,
      n: types.length
    });
    /** Lignes de la carte « Autres appareils » : types hors flotte du pilote, puis ceux des autres pilotes. */
    const otherRows = () => {
      const list = [...new Set([...shown, ...others.keys()])].map(ty => ({
        type: ty,
        info: dbInfo(ty),
        by: others.get(ty) || []
      })).sort((a, b) => owned.has(b.type) - owned.has(a.type) || String(a.info.model || a.type).localeCompare(String(b.info
        .model || b
        .type)));
      if (!list.length) return `<p class="small">${esc(t(['Aucun appareil hors flotte déclaré.', 'No aircraft outside the fleet declared.', 'Kein Luftfahrzeug außerhalb der Flotte angegeben.', 'Ninguna aeronave fuera de la flota declarada.']))}</p>`;
      return `<table class="eq-table"><thead><tr><th>${esc(t(['Type', 'Type', 'Typ', 'Tipo']))}</th><th>${esc(t(['Aussi déclaré par', 'Also declared by', 'Auch angegeben von', 'También declarado por']))}</th><th class="eq-c">${esc(t(['Possédé', 'Owned', 'Besessen', 'Poseído']))}</th><th class="eq-c">${esc(t(['Maîtrisé', 'Mastered', 'Beherrscht', 'Dominado']))}</th></tr></thead><tbody>${list.map(x => {
        const name = typeName(x.type) || x.type;
        const note = running.has(x.type) ? t(['complétion de la base en cours…', 'completing the type base…', 'Typbasis wird ergänzt…', 'completando la base de tipos…']) :
          x.info.description || (x.info.model ? '' : tried.has(x.type) ? t(['introuvable (OACI, EUROCONTROL, Aviation Fanatic)', 'not found (ICAO, EUROCONTROL, Aviation Fanatic)', 'nicht gefunden (ICAO, EUROCONTROL, Aviation Fanatic)', 'no encontrado (OACI, EUROCONTROL, Aviation Fanatic)']) : offi.has(x.type) ? t(['absent de la base de ce poste', 'missing from this computer’s type base', 'fehlt in der Typbasis dieses Rechners', 'ausente de la base de este equipo']) :
            t(['type inconnu de la base OACI', 'type unknown to the ICAO base', 'Typ in der ICAO-Basis unbekannt', 'tipo desconocido en la base OACI']));
        const mineRow = owned.has(x.type) || shown.has(x.type);
        const fixAttr = mineRow ? ` data-eq-fix="${esc(x.type)}" tabindex="0" role="button" title="${esc(tf(['Cliquer pour corriger ou supprimer {m}', 'Click to correct or delete {m}', 'Klicken, um {m} zu korrigieren oder zu löschen', 'Hacer clic para corregir o eliminar {m}'], { m: name }))}"` : '';
        return `<tr${editing === x.type ? ' class="eq-fixing"' : ''}><td${fixAttr}><b>${esc(name)}</b><br><code>${esc(x.type)}</code>${note ? ` <small>${esc(note)}</small>` : ''}</td>
          <td>${esc(x.by.join(', ') || '—')}</td>
          <td class="eq-c"><input type="checkbox" data-own="${esc(x.type)}"${owned.has(x.type) ? ' checked' : ''} aria-label="${esc(tf(['{m} possédé', '{m} owned', '{m} besessen', '{m} poseído'], { m: name }))}"></td>
          <td class="eq-c"><input type="checkbox" data-master="${esc(x.type)}"${mastered.has(x.type) ? ' checked' : ''} aria-label="${esc(tf(['{m} maîtrisé', '{m} mastered', '{m} beherrscht', '{m} dominado'], { m: name }))}"></td></tr>`;
      }).join('')}</tbody></table>`;
    };
    const fleetModel = new Map(types.map(x => [x.type, x.model]));
    /** Type de la flotte de même fiche (A4M de la base = A400 de la flotte), sinon le code lui-même. */
    const twin = code => fleet.has(code) ? code : [...fleet].find(f => dbInfo(f).model && dbInfo(f) === dbInfo(code)) || code;
    let index = null; // index des types connus, refait après chaque source chargée (liste OACI, autres pilotes, passe)
    /** Types connus, Map code → { code, keys } : flotte (modèle), base du poste (modèle), alias (noms d'usage), liste OACI
     *  publiée, types déclarés (autres pilotes, lignes de la carte) ; keys : clés comparables (code, modèle, alias). */
    const typeIndex = () => {
      if (index) return index;
      const db = window.AIRCRAFT_DB || {},
        map = new Map();
      /** Ajoute le nom name (modèle, alias) au type code (rangé sous son jumeau de la flotte). */
      const add = (code, name = '') => {
        code = twin(code);
        const e = map.get(code) || map.set(code, {
          code,
          keys: new Set([code])
        }).get(code);
        if (norm(name)) e.keys.add(norm(name));
      };
      fleet.forEach(f => add(f, fleetModel.get(f)));
      Object.keys(db).filter(k => !k.startsWith('__')).forEach(k => add(k, db[k]?.model));
      Object.entries(db.__aliases || {}).forEach(([a, c]) => add(c, a));
      offi.forEach(c => add(c));
      [...others.keys(), ...shown].forEach(c => add(c));
      return index = map;
    };
    /** Types qui répondent à un texte, du plus sûr au moins sûr : [{ code, base, score }] ; base : 100 code exact, 95 nom
     *  exact (modèle, alias), 85 un mot ou deux mots accolés exacts (« SE 210 Caravelle » → SE210, CARAVELLE), 72 début
     *  de code, 68 début de nom, 55 nom qui contient le texte, 48 tous les mots dans les noms ; score : base + flotte (4)
     *  ou fiche dans la base du poste (2). */
    const candidates = text => {
      const K = norm(text),
        W = wordsOf(text),
        tries = new Set([...W, ...W.slice(1).map((w, i) => W[i] + w)]);
      if (!K) return [];
      const out = [];
      for (const e of typeIndex().values()) {
        const keys = [...e.keys];
        const base = e.keys.has(K) ? (e.code === K ? 100 : 95) : [...tries].some(w => e.keys.has(w)) ? 85 : K.length >= 2 && e.code
          .startsWith(K) ? 72 : K.length >= 3 && keys.some(k => k.startsWith(K)) ? 68 : K.length >= 3 && keys.some(k => k.includes(
            K)) ?
          55 : W.some(w => w.length >= 3) && W.every(w => w.length < 2 || keys.some(k => k.includes(w))) ? 48 : 0;
        if (base) out.push({
          code: e.code,
          base,
          score: base + (fleet.has(e.code) ? 4 : dbInfo(e.code).model ? 2 : 0)
        });
      }
      return out.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
    };
    /** Désignateur d'un texte saisi : le candidat sûr (mot exact et plus), ou le seul candidat (nom qui contient le
     *  texte) ; sinon un texte en forme de désignateur OACI (2 à 4 caractères) que rien n'approche, gardé tel quel ; ''
     *  sinon (refus : le plus proche est proposé). */
    const resolveType = text => {
      const c = candidates(text),
        [a, b] = c;
      if (a && (a.base >= 85 || (a.base >= 55 && !b))) return a.code;
      const raw = norm(String(text || '').split(/\s+[—-]\s+/)[0]);
      return /^[A-Z][A-Z0-9]{1,3}$/.test(raw) && !(a && a.base >= 55) ? raw : '';
    };
    /** Origine d'un type proposé : flotte, base du poste, liste OACI (fiche complétée à l'ajout), déclaré par d'autres. */
    const originOf = code => [fleet.has(code) ? t(['flotte', 'fleet', 'Flotte', 'flota']) : dbInfo(code).model ? t(['base du poste',
        'this computer’s base', 'Basis dieses Rechners', 'base de este equipo'
      ]) : offi.has(code) ? t(['liste OACI : fiche complétée à l’ajout', 'ICAO list: record completed when added',
        'ICAO-Liste: Eintrag wird beim Hinzufügen ergänzt', 'lista OACI: ficha completada al añadir'
      ]) : t(['hors base', 'not in the base', 'nicht in der Basis', 'fuera de la base']),
      others.get(code)?.length ? tf(['déclaré par {p}', 'declared by {p}', 'angegeben von {p}', 'declarado por {p}'], {
        p: others.get(code).join(', ')
      }) : ''
    ].filter(Boolean).join(' · ');
    const otherHtml = `<div class="sp-card" id="eqOther" data-no-i18n><h3>${esc(t(['Autres appareils (hors flotte)', 'Other aircraft (outside the fleet)', 'Andere Luftfahrzeuge (außerhalb der Flotte)', 'Otras aeronaves (fuera de la flota)']))}</h3><p class="sp-hint">${esc(t(['Types que vous possédez dans votre simulateur sans qu’ils soient dans la flotte : ajoutés ici, ils partent avec vos disponibilités déclarées — le Centre les voit pour les affectations et les autres pilotes les retrouvent dans cette carte.', 'Types you own in your simulator that are not in the fleet: added here, they go with your declared availability — the Centre sees them for assignments and other pilots find them in this card.', 'Typen, die Sie in Ihrem Simulator besitzen, die aber nicht zur Flotte gehören: Hier hinzugefügt, gehen sie mit Ihren angegebenen Verfügbarkeiten mit — das Zentrum sieht sie für Zuweisungen, andere Piloten finden sie in dieser Karte.', 'Tipos que posee en su simulador sin que estén en la flota: añadidos aquí, van con sus disponibilidades declaradas — el Centro los ve para las asignaciones y los demás pilotos los encuentran en esta tarjeta.']))}</p>
      <div data-eq-other>${otherRows()}</div>
      <div class="eq-add"><div class="eq-field"><input type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="eqSugg" data-eq-add-input placeholder="${esc(t(['Désignateur OACI ou modèle (ex. A400M, PC-12)', 'ICAO designator or model (e.g. A400M, PC-12)', 'ICAO-Kennung oder Modell (z. B. A400M, PC-12)', 'Designador OACI o modelo (p. ej. A400M, PC-12)']))}" aria-label="${esc(t(['Appareil à ajouter', 'Aircraft to add', 'Hinzuzufügendes Luftfahrzeug', 'Aeronave que añadir']))}"><ul class="eq-sugg" id="eqSugg" role="listbox" hidden data-eq-sugg></ul></div>
        <button type="button" class="secondary" data-eq-add>${esc(t(['Ajouter', 'Add', 'Hinzufügen', 'Añadir']))}</button><button type="button" class="secondary" data-eq-delete hidden>${esc(t(['Supprimer', 'Delete', 'Löschen', 'Eliminar']))}</button><button type="button" class="secondary" data-eq-cancel hidden>${esc(t(['Annuler', 'Cancel', 'Abbrechen', 'Cancelar']))}</button></div>
      <p class="small" data-eq-fixing hidden></p>
      <p class="sp-hint">${esc(t(['En tapant, la suite propose les types de la flotte, de la base des types de ce poste, de la liste OACI publiée et leurs noms d’usage (« Caravelle », « Rafale ») — calcul local, sans réseau. La base de ce poste n’est complétée par le lanceur qu’au clic sur « Ajouter », pour le type ajouté s’il lui manque.', 'While you type, the suite suggests the types of the fleet, of this computer’s type base, of the published ICAO list and their common names (“Caravelle”, “Rafale”) — computed locally, no network. This computer’s base is completed by the launcher only when you click “Add”, for the added type if it is missing.', 'Beim Tippen schlägt die Suite die Typen der Flotte, der Typbasis dieses Rechners, der veröffentlichten ICAO-Liste und ihre gebräuchlichen Namen vor („Caravelle“, „Rafale“) — lokal berechnet, ohne Netz. Die Basis dieses Rechners wird vom Starter nur beim Klick auf „Hinzufügen“ ergänzt, für den hinzugefügten Typ, falls er fehlt.', 'Al escribir, la suite propone los tipos de la flota, de la base de tipos de este equipo, de la lista OACI publicada y sus nombres de uso («Caravelle», «Rafale»); cálculo local, sin red. La base de este equipo solo la completa el lanzador al hacer clic en «Añadir», para el tipo añadido si le falta.']))}</p></div>`;
    const typesHtml = types.length ? `<p class="eq-sum" data-eq-sum>${esc(summary())}</p><div class="eq-cards">${groups.map(g => `<div class="repo-card" data-icon="${ICON[g[0].category] || 'plane'}" data-subtitle="${esc(tf(['{n} type(s)', '{n} type(s)', '{n} Typ(en)', '{n} tipo(s)'], { n: g.length }))}"><h3>${esc(g[0].categoryLabel)}</h3>
      <table class="eq-table"><thead><tr><th>${esc(t(['Type', 'Type', 'Typ', 'Tipo']))}</th><th>${esc(t(['Variantes de la flotte', 'Fleet variants', 'Flottenvarianten', 'Variantes de la flota']))}</th><th>${esc(t(['Appareils', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves']))}</th><th class="eq-c">${esc(t(['Possédé', 'Owned', 'Besessen', 'Poseído']))}</th><th class="eq-c">${esc(t(['Maîtrisé', 'Mastered', 'Beherrscht', 'Dominado']))}</th></tr></thead><tbody>${g.map(x => `<tr>
        <td><b>${esc(x.model)}</b><br><code>${esc(x.type)}</code>${x.description ? ` <small title="${esc(t(['Description OACI (Doc 8643)', 'ICAO description (Doc 8643)', 'ICAO-Beschreibung (Doc 8643)', 'Descripción OACI (Doc 8643)']))}">${esc(x.description)}</small>` : ''}</td>
        <td>${esc(x.variants.join(', ') || '—')}</td>
        <td><b>${x.operational}</b>${x.operational < x.count ? `<small> / ${x.count}</small>` : ''}<br><small title="${esc(x.bases.join(', '))}">${esc(x.bases.slice(0, 3).join(', '))}${x.bases.length > 3 ? '…' : ''}</small></td>
        <td class="eq-c"><input type="checkbox" data-own="${esc(x.type)}"${owned.has(x.type) ? ' checked' : ''} aria-label="${esc(tf(['{m} possédé', '{m} owned', '{m} besessen', '{m} poseído'], { m: x.model }))}"></td>
        <td class="eq-c"><input type="checkbox" data-master="${esc(x.type)}"${mastered.has(x.type) ? ' checked' : ''} aria-label="${esc(tf(['{m} maîtrisé', '{m} mastered', '{m} beherrscht', '{m} dominado'], { m: x.model }))}"></td></tr>`).join('')}</tbody></table></div>`).join('')}</div>` : `<p class="small">${esc(t(['Flotte non chargée.', 'Fleet not loaded.', 'Flotte nicht geladen.', 'Flota no cargada.']))}</p>`;
    host.innerHTML = `<div class="sp-card" id="eqTypes" data-no-i18n><h3>${esc(t(['Appareils', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves']))}</h3><p class="sp-hint">${esc(t(['Types de la flotte que vous possédez dans votre simulateur et ceux que vous maîtrisez : le Centre s’en sert pour vous affecter un appareil.', 'Fleet types you own in your simulator and those you have mastered: the Centre uses them to assign you an aircraft.', 'Flottentypen, die Sie in Ihrem Simulator besitzen, und die, die Sie beherrschen: Das Zentrum nutzt sie, um Ihnen ein Luftfahrzeug zuzuweisen.', 'Tipos de la flota que posee en su simulador y los que domina: el Centro los usa para asignarle una aeronave.']))}</p><div data-eq-types>${typesHtml}</div></div>
      ${otherHtml}
      <div class="sp-card" id="eqSims" data-no-i18n><h3>${esc(t(['Simulateurs', 'Simulators', 'Simulatoren', 'Simuladores']))}</h3><p class="sp-hint">${esc(t(['Simulateurs et outils installés (colonnes de la feuille FLOTTE du classeur ODV) : le Centre s’en sert pour réunir des pilotes sur un simulateur commun.', 'Installed simulators and tools (columns of the FLOTTE sheet of the ODV workbook): the Centre uses them to gather pilots on a common simulator.', 'Installierte Simulatoren und Werkzeuge (Spalten des Blatts FLOTTE der ODV-Arbeitsmappe): Das Zentrum nutzt sie, um Piloten auf einem gemeinsamen Simulator zusammenzubringen.', 'Simuladores y herramientas instalados (columnas de la hoja FLOTTE del libro ODV): el Centro los usa para reunir a pilotos en un simulador común.']))}</p>
        <div class="eq-sims" data-eq-sims>${sims.map(s => `<label><input type="checkbox" data-sim="${esc(s)}"${mine.has(s) ? ' checked' : ''}> ${M.simChips([s])}${esc(s)}</label>`).join('')}</div></div>
      <p class="small" data-eq-msg>${esc(t(['Gardé dans ce navigateur et recopié dans vos semaines de disponibilités déclarées, à partir de la semaine en cours (pour le Centre).', 'Kept in this browser and copied into your declared availability weeks, from the current week on (for the Centre).', 'In diesem Browser gespeichert und in Ihre angegebenen Verfügbarkeitswochen ab der aktuellen Woche übernommen (für das Zentrum).', 'Guardado en este navegador y copiado en sus semanas de disponibilidad declaradas, a partir de la semana actual (para el Centro).']))}</p>`;
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
    /** Types cochés (flotte et hors flotte) enregistrés ; extra : type ajouté à la main, possédé. */
    const saveTypes = (extra = '') => {
      const d = M.saveAircraft(tri, {
        owned: [...host.querySelectorAll('[data-own]:checked')].map(i => i.dataset.own).concat(extra ? [extra] : []),
        mastered: [...host.querySelectorAll('[data-master]:checked')].map(i => i.dataset.master)
      });
      owned.clear();
      d.aircraft.owned.forEach(v => owned.add(v));
      mastered.clear();
      d.aircraft.mastered.forEach(v => mastered.add(v));
      const sum = host.querySelector('[data-eq-sum]');
      if (sum) sum.textContent = summary();
    };
    /** Carte « Autres appareils » redessinée (après un ajout, une coche des autres pilotes, une passe du lanceur). */
    const redrawOther = () => {
      index = null; // sources changées (ajout, autres pilotes, passe du lanceur) : index refait à la prochaine frappe
      const el = host.querySelector('[data-eq-other]');
      if (el) el.innerHTML = otherRows();
    };
    host.onchange = e => {
      const x = e.target;
      if (!x.matches('[data-own], [data-master], [data-sim]')) return;
      if (x.dataset.master && x.checked) host.querySelector(`[data-own="${x.dataset.master}"]`).checked = true; // maîtrisé → possédé
      if (x.dataset.own && !x.checked) host.querySelector(`[data-master="${x.dataset.own}"]`).checked = false; // non possédé → non maîtrisé
      if (x.dataset.sim) M.saveSims(tri, [...host.querySelectorAll('[data-sim]:checked')].map(i => i.dataset.sim));
      else saveTypes();
      scheduleSync();
    };
    /** Ajout à la main : type de la flotte → sa case cochée ; autre type → ligne de « Autres appareils », possédé. */
    const addTyped = () => {
      const ty = resolveType(input.value);
      if (!input.value.trim()) return; // champ vide : rien
      if (!ty) {
        // refus : ce qui a été lu, et le désignateur le plus proche repris dans le champ (« Ajouter » pour le confirmer)
        const typed = input.value.trim(),
          near = candidates(typed)[0]?.code || '';
        if (near) input.value = `${near}${typeName(near) ? ` — ${typeName(near)}` : ''}`;
        window.AppFramework?.notify?.(near ? tf([
          '« {s} » n’est ni un désignateur OACI ni un modèle connu. Le plus proche : {c} ({n}), repris dans le champ — « Ajouter » pour le confirmer.',
          '“{s}” is neither an ICAO designator nor a known model. Closest: {c} ({n}), put in the field — “Add” to confirm.',
          '„{s}“ ist weder eine ICAO-Kennung noch ein bekanntes Modell. Am nächsten: {c} ({n}), ins Feld übernommen — „Hinzufügen“ zum Bestätigen.',
          '«{s}» no es ni un designador OACI ni un modelo conocido. El más cercano: {c} ({n}), puesto en el campo; «Añadir» para confirmarlo.'
        ], {
          s: typed,
          c: near,
          n: typeName(near) || near
        }) : tf([
          '« {s} » n’est ni un désignateur OACI (2 à 4 caractères, ex. PC12) ni un modèle de la liste.',
          '“{s}” is neither an ICAO designator (2 to 4 characters, e.g. PC12) nor a model from the list.',
          '„{s}“ ist weder eine ICAO-Kennung (2 bis 4 Zeichen, z. B. PC12) noch ein Modell aus der Liste.',
          '«{s}» no es ni un designador OACI (2 a 4 caracteres, p. ej. PC12) ni un modelo de la lista.'
        ], {
          s: typed
        }), 'warn');
        return;
      }
      input.value = '';
      // correction : l'ancien type retiré, « Maîtrisé » reporté sur le nouveau
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
        window.AppFramework?.notify?.(tf(['{t} fait partie de la flotte : coché dans la carte « Appareils ».',
          '{t} is in the fleet: ticked in the “Aircraft” card.',
          '{t} gehört zur Flotte: in der Karte „Luftfahrzeuge“ angehakt.',
          '{t} forma parte de la flota: marcado en la tarjeta «Aeronaves».'
        ], {
          t: ty
        }), 'info');
        if (wasMastered) host.querySelector(`[data-master="${ty}"]`).checked = true;
        saveTypes();
      } else {
        shown.add(ty);
        saveTypes(ty);
        if (wasMastered) {
          redrawOther();
          host.querySelector(`[data-master="${ty}"]`).checked = true;
          saveTypes();
        }
        // type de la liste OACI absent de la base de ce poste : complété par le lanceur (une passe courte, à la suite)
        if (!dbInfo(ty).model && offi.has(ty) && !tried.has(ty)) completeType(ty, redrawOther);
        redrawOther();
      }
      scheduleSync();
    };
    /** Retire un type des appareils du pilote (cases décochées, ligne ôtée sauf s'il est déclaré par d'autres) ;
     *  sync : recopie dans les semaines déclarées (non pendant une correction, qui la fait elle-même). */
    function dropType(code, sync = true) {
      host.querySelectorAll(`[data-own="${code}"], [data-master="${code}"]`).forEach(x => x.checked = false);
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
    /** Édition d'un type ajouté (clic sur sa ligne) : son code dans le champ (suggestions comprises), « Remplacer »,
     *  « Supprimer » et « Annuler » à la place d'« Ajouter ». */
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
      showSugg();
    }
    /** Supprime le type en cours d'édition (bouton « Supprimer » de l'édition). */
    const deleteEdited = () => {
      const code = editing;
      if (!code) return;
      input.value = '';
      closeSugg();
      endFix();
      dropType(code);
      window.AppFramework?.notify?.(tf(['{c} retiré de vos appareils.', '{c} removed from your aircraft.',
        '{c} aus Ihren Luftfahrzeugen entfernt.',
        '{c} quitado de sus aeronaves.'
      ], {
        c: typeName(code) ? `${code} (${typeName(code)})` : code
      }), 'info');
    };
    host.onclick = e => {
      const fix = e.target.closest('[data-eq-fix]');
      if (fix) startFix(fix.dataset.eqFix);
      else if (e.target.closest('[data-eq-delete]')) deleteEdited();
      else if (e.target.closest('[data-eq-cancel]')) {
        input.value = '';
        closeSugg();
        endFix();
      }
    };
    // clavier : Entrée ou Espace sur la cellule d'un type ouvre son édition
    host.onkeydown = e => {
      const fix = (e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-eq-fix]') ? e.target : null;
      if (!fix) return;
      e.preventDefault();
      startFix(fix.dataset.eqFix);
    };
    host.querySelector('[data-eq-add]').onclick = () => {
      closeSugg();
      addTyped();
    };
    const input = host.querySelector('[data-eq-add-input]'),
      sugg = host.querySelector('[data-eq-sugg]');
    let active = -1;
    /** Liste des suggestions fermée. */
    const closeSugg = () => {
      sugg.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      active = -1;
    };
    /** Suggestions du texte saisi (8 au plus), recalculées à chaque frappe : index local, aucun appel au lanceur. */
    const showSugg = () => {
      const list = candidates(input.value).filter(c => c.base >= 48).slice(0, 8);
      active = -1;
      if (!list.length) return closeSugg();
      sugg.innerHTML = list.map((c, i) => `<li role="option" id="eqSugg${i}" data-code="${esc(c.code)}" aria-selected="false"><b>${esc(c.code)}</b>${typeName(c.code) ? ` — ${esc(typeName(c.code))}` : ''}<small>${esc(originOf(c.code))}</small></li>`).join('');
      sugg.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };
    /** Suggestion n mise en avant (flèches). */
    const mark = n => {
      const items = [...sugg.children];
      if (!items.length) return;
      active = (n + items.length) % items.length;
      items.forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
      input.setAttribute('aria-activedescendant', items[active].id);
      items[active].scrollIntoView({
        block: 'nearest'
      });
    };
    /** Suggestion choisie : son code dans le champ, puis ajout (comme « Ajouter »). */
    const pick = code => {
      input.value = code;
      closeSugg();
      addTyped();
    };
    input.oninput = showSugg;
    input.onblur = () => setTimeout(closeSugg, 150);
    sugg.onmousedown = e => {
      const li = e.target.closest('li[data-code]');
      if (!li) return;
      e.preventDefault();
      pick(li.dataset.code);
    };
    input.onkeydown = e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (sugg.hidden) showSugg();
        mark(active + (e.key === 'ArrowDown' ? 1 : -1));
        e.preventDefault();
      } else if (e.key === 'Escape' && (!sugg.hidden || editing)) {
        if (!sugg.hidden) closeSugg();
        else {
          input.value = '';
          endFix();
        }
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!sugg.hidden && active >= 0) pick(sugg.children[active].dataset.code);
        else {
          closeSugg();
          addTyped();
        }
      }
    };
    // liste OACI publiée : suggestions et notes des lignes, après le premier dessin
    officialCodes().then(set => {
      offi = set;
      redrawOther();
      // passe du lanceur lancée avant l'ouverture de la page (ou file d'attente) pour un type de la carte : suivie
      resumeTypes([...shown].filter(c => !dbInfo(c).model), redrawOther);
    });
    // types hors flotte des autres pilotes : lus après le premier dessin (une déclaration par pilote de l'index)
    othersTypes(M, tri, fleet).then(map => {
      others = map;
      if (map.size && host.isConnected) redrawOther();
    }, () => {});
    window.AppFramework?.refresh?.(); // en-têtes des sous-cartes (icône, titre, sous-titre)
  }

  window.EquipmentEditor = {
    mount
  };
})();
