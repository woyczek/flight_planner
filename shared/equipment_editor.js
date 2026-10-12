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
.eq-table code{font-size:11px}.eq-table small{opacity:.75}
.eq-add{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0 0}.eq-add input{flex:1 1 16em;min-width:0}
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
  /** Désignateur d'un texte saisi : type de la flotte (ou de même fiche), désignateur ou alias de la base (« A400M » →
   *  A400, « PC-12 » → PC12), modèle de la base (« Pilatus PC-12 »), sinon le texte s'il a la forme d'un désignateur
   *  OACI (2 à 4 caractères) ; '' sinon. */
  function resolveType(text, fleet = new Set()) {
    const db = window.AIRCRAFT_DB || {},
      raw = String(text || '').trim().split(/\s+[—-]\s+/)[0].toUpperCase(),
      key = raw.replace(/[^A-Z0-9]/g, '');
    if (!key) return '';
    if (fleet.has(key)) return key;
    const r = resolveDb(db, key);
    // même fiche qu'un type de la flotte (A400M : alias A4M de la base, A400 dans la flotte) → le type de la flotte
    return [...fleet].find(f => r && dbInfo(f).model && dbInfo(f) === dbInfo(r)) || r;
  }
  /** Désignateur d'une clé (majuscules sans séparateur) d'après la base seule. */
  function resolveDb(db, key) {
    if (db[key] && key !== '__META') return key;
    if (db.__aliases?.[key]) return db.__aliases[key];
    const byModel = Object.entries(db).find(([k, v]) => !k.startsWith('__') && String(v?.model || '').toUpperCase().replace(/[^A-Z0-9]/g,
      '') === key);
    if (byModel) return byModel[0];
    return /^[A-Z][A-Z0-9]{1,3}$/.test(key) ? key : '';
  }
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
  /** Désignateur le plus proche d'un texte refusé : un mot (ou deux mots accolés) qui est un désignateur, un alias ou une
   *  partie d'un nom de modèle ; codes : désignateurs connus (base, liste OACI). '' si rien n'approche. */
  function closest(text, codes) {
    const db = window.AIRCRAFT_DB || {},
      words = String(text || '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean),
      tries = [...words.map((w, i) => i ? words[i - 1] + w : '').filter(Boolean), ...words];
    for (const w of tries) {
      if (codes.has(w) || (db[w] && !w.startsWith('__'))) return w;
      if (db.__aliases?.[w]) return db.__aliases[w];
    }
    for (const w of words.filter(x => x.length >= 4)) {
      const hit = Object.entries(db).find(([k, v]) => !k.startsWith('__') && String(v?.model || '').toUpperCase().replace(/[^A-Z0-9]/g,
          '')
        .includes(w)) || Object.entries(db.__aliases || {}).find(([k]) => k.includes(w));
      if (hit) return typeof hit[1] === 'string' ? hit[1] : hit[0];
    }
    return '';
  }
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
  // complétion : une seule boucle par page, jamais pendant la frappe (seulement après « Ajouter ») ; une passe du lanceur
  // à la fois — si une passe tourne (Maintenance, autre onglet), on attend sa fin ; les codes ajoutés entre-temps partent
  // ensemble dans la passe suivante
  const pending = new Set(),
    running = new Set(),
    tried = new Set(); // codes passés au lanceur et toujours absents (type retiré de l'OACI, source muette)
  let looping = false;
  /** Fait compléter par le lanceur les codes en attente ; redraw() après chaque passe terminée. */
  async function completeTypes(redraw) {
    if (looping) return;
    looping = true;
    try {
      while (pending.size) {
        let s = await acApi();
        if (!s) { // pas de lanceur : le code reste tel quel
          pending.clear();
          break;
        }
        while (s?.state === 'running') {
          await sleep(4000);
          s = await acApi();
        }
        const codes = [...pending];
        s = await acApi({
          codes,
          quick: true
        });
        if (!s?.started) { // une autre passe vient de partir : attendre la sienne
          await sleep(4000);
          continue;
        }
        codes.forEach(c => {
          pending.delete(c);
          running.add(c);
        });
        redraw();
        do {
          await sleep(4000);
          s = await acApi();
        } while (s?.state === 'running');
        await reloadDb();
        codes.forEach(c => {
          running.delete(c);
          if (!dbInfo(c).model) tried.add(c);
        });
        redraw();
      }
    } finally {
      looping = false;
    }
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
        const note = pending.has(x.type) || running.has(x.type) ? t(['complétion de la base en cours…', 'completing the type base…', 'Typbasis wird ergänzt…', 'completando la base de tipos…']) :
          x.info.description || (x.info.model ? '' : tried.has(x.type) ? t(['introuvable dans les sources officielles (OACI, EUROCONTROL) : type retiré ?', 'not found in the official sources (ICAO, EUROCONTROL): retired type?', 'in den offiziellen Quellen (ICAO, EUROCONTROL) nicht gefunden: ausgemusterter Typ?', 'no encontrado en las fuentes oficiales (OACI, EUROCONTROL): ¿tipo retirado?']) : offi.has(x.type) ? t(['absent de la base de ce poste', 'missing from this computer’s type base', 'fehlt in der Typbasis dieses Rechners', 'ausente de la base de este equipo']) :
            t(['type inconnu de la base OACI', 'type unknown to the ICAO base', 'Typ in der ICAO-Basis unbekannt', 'tipo desconocido en la base OACI']));
        return `<tr><td><b>${esc(name)}</b><br><code>${esc(x.type)}</code>${note ? ` <small>${esc(note)}</small>` : ''}</td>
          <td>${esc(x.by.join(', ') || '—')}</td>
          <td class="eq-c"><input type="checkbox" data-own="${esc(x.type)}"${owned.has(x.type) ? ' checked' : ''} aria-label="${esc(tf(['{m} possédé', '{m} owned', '{m} besessen', '{m} poseído'], { m: name }))}"></td>
          <td class="eq-c"><input type="checkbox" data-master="${esc(x.type)}"${mastered.has(x.type) ? ' checked' : ''} aria-label="${esc(tf(['{m} maîtrisé', '{m} mastered', '{m} beherrscht', '{m} dominado'], { m: name }))}"></td></tr>`;
      }).join('')}</tbody></table>`;
    };
    /** Options de la liste : types de la base du poste et de la liste OACI publiée, hors flotte (et hors fiches de la
     *  flotte : A4M = A400), avec leur nom (modèle, sinon nom d'usage des alias : « S210 — Caravelle »). */
    const listHtml = () => {
      const db = window.AIRCRAFT_DB || {},
        codes = [...new Set([...Object.keys(db).filter(k => !k.startsWith('__') && db[k]?.model), ...offi])].filter(k => !fleet.has(
          k) && ![
          ...fleet
        ].some(f => dbInfo(f).model && dbInfo(f) === dbInfo(k))).sort();
      return codes.map(k => `<option value="${esc(k)}${typeName(k) ? ` — ${esc(typeName(k))}` : ''}"></option>`).join('');
    };
    const otherHtml = `<div class="sp-card" id="eqOther" data-no-i18n><h3>${esc(t(['Autres appareils (hors flotte)', 'Other aircraft (outside the fleet)', 'Andere Luftfahrzeuge (außerhalb der Flotte)', 'Otras aeronaves (fuera de la flota)']))}</h3><p class="sp-hint">${esc(t(['Types que vous possédez dans votre simulateur sans qu’ils soient dans la flotte : ajoutés ici, ils partent avec vos disponibilités déclarées — le Centre les voit pour les affectations et les autres pilotes les retrouvent dans cette carte.', 'Types you own in your simulator that are not in the fleet: added here, they go with your declared availability — the Centre sees them for assignments and other pilots find them in this card.', 'Typen, die Sie in Ihrem Simulator besitzen, die aber nicht zur Flotte gehören: Hier hinzugefügt, gehen sie mit Ihren angegebenen Verfügbarkeiten mit — das Zentrum sieht sie für Zuweisungen, andere Piloten finden sie in dieser Karte.', 'Tipos que posee en su simulador sin que estén en la flota: añadidos aquí, van con sus disponibilidades declaradas — el Centro los ve para las asignaciones y los demás pilotos los encuentran en esta tarjeta.']))}</p>
      <div data-eq-other>${otherRows()}</div>
      <p class="eq-add"><input type="text" list="eqTypeList" data-eq-add-input placeholder="${esc(t(['Désignateur OACI ou modèle (ex. A400M, PC-12)', 'ICAO designator or model (e.g. A400M, PC-12)', 'ICAO-Kennung oder Modell (z. B. A400M, PC-12)', 'Designador OACI o modelo (p. ej. A400M, PC-12)']))}" aria-label="${esc(t(['Appareil à ajouter', 'Aircraft to add', 'Hinzuzufügendes Luftfahrzeug', 'Aeronave que añadir']))}">
        <button type="button" class="secondary" data-eq-add>${esc(t(['Ajouter', 'Add', 'Hinzufügen', 'Añadir']))}</button></p>
      <datalist id="eqTypeList">${listHtml()}</datalist></div>`;
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
      const input = host.querySelector('[data-eq-add-input]'),
        ty = resolveType(input.value, fleet);
      if (!input.value.trim()) return; // champ vide : rien
      if (!ty) {
        // refus : ce qui a été lu, et le désignateur le plus proche repris dans le champ (« Ajouter » pour le confirmer)
        const typed = input.value.trim(),
          near = closest(typed, new Set([...offi, ...Object.keys(window.AIRCRAFT_DB || {})]));
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
        saveTypes();
      } else {
        shown.add(ty);
        saveTypes(ty);
        // type de la liste OACI absent de la base de ce poste : complété par le lanceur (une passe courte, à la suite)
        if (!dbInfo(ty).model && offi.has(ty) && !tried.has(ty)) {
          pending.add(ty);
          completeTypes(redrawOther);
        }
        redrawOther();
      }
      scheduleSync();
    };
    host.querySelector('[data-eq-add]').onclick = addTyped;
    host.querySelector('[data-eq-add-input]').onkeydown = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTyped();
      }
    };
    // liste OACI publiée : options de la liste et notes des lignes, après le premier dessin
    officialCodes().then(set => {
      offi = set;
      const dl = host.querySelector('#eqTypeList');
      if (dl) dl.innerHTML = listHtml();
      redrawOther();
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
