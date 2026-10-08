(() => {
  'use strict';
  // Registre des missions générées (apps/cpco/mission_registry.html) : inventaire des séries du dossier « Missions »
  // (missionNN.yaml, summaryNN.md, schéma helo-xp-mission) et des missions commandées, avec choix par type, sous-type,
  // rendez-vous, nombre et types d'équipes, ravitaillement, théâtre, statut ; tirage au sort ; ouverture dans le
  // générateur, le studio ou un nouveau CR ; commande d'une nouvelle mission (prompt ChatGPT réglé).
  // Données : index IndexedDB « defaIndex » (MissionIndex, shared/data_index.js ; sauvegardé avec les données locales) et fichier
  // Missions/mission_registry.yaml (dossier autorisé __missions). Statut « CR fait » repris du registre des CR
  // (missionCoreLedger:v2 : metadata.missionNumber = identifiant de la mission).
  const host = document.getElementById('missionRegistry'); // page du registre ; ailleurs : noyau seul (MissionRegistryCore)
  const KEY = 'missionRegistry:v1',
    FILE = 'mission_registry.yaml',
    FILTERS = 'missionRegistryFilters:v1';
  const LANGS = ['fr', 'en', 'de', 'es'];
  /** Rang de la langue de la page dans LANGS (français à défaut). */
  const li = () => Math.max(0, LANGS.indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'));
  /** Traduction d'une ligne [fr, en, de, es] (anglais puis français à défaut) avec ses variables {x}. */
  const t = (row, vars = {}) => (Array.isArray(row) ? (row[li()] || row[1] || row[0]) : String(row ?? '')).replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] ?? '');
  const esc = window.RepositoryKit.esc; // échappement HTML commun (shared/kit.js)
  /** Message d'erreur lisible : ce qui a échoué (contexte, traduit) et quoi faire (AppFramework.explain) ; repli : contexte
   *  et message. */
  const explain = (e, context = '') => window.AppFramework?.explain?.(e, context) || `${context ? context + ' : ' : ''}${e?.message || e}`;
  // dossier des missions non autorisé (ouverture d'une mission ou d'une opération) : ce qu'il faut faire
  const NO_DIR = ['dossier des missions non autorisé : l’autoriser avec « Relire le dossier », puis réessayer',
    'missions folder not authorised: allow it with “Re-read folder”, then try again',
    'Missionsordner nicht freigegeben: mit „Ordner neu lesen“ freigeben und es erneut versuchen',
    'carpeta de misiones no autorizada: autorizarla con «Releer la carpeta» y volver a intentarlo'
  ];
  /** Valeur JSON du stockage du navigateur ; d si absente ou illisible. */
  const readJson = (k, d = null) => {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null') ?? d;
    } catch {
      return d;
    }
  };
  /** Écrit une valeur JSON dans le stockage du navigateur (quota dépassé : ignoré). */
  const writeJson = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* quota */
    }
  };
  /** Attend qu'un module global window[name] soit chargé (essai toutes les 60 ms) ; null au bout de ms. */
  const waitFor = (name, ms = 6000) => new Promise(resolve => {
    const t0 = Date.now();
    (function poll() {
      if (window[name]) return resolve(window[name]);
      if (Date.now() - t0 > ms) return resolve(null);
      setTimeout(poll, 60);
    })();
  });
  /** Date courte dans la langue de la page ; la valeur telle quelle si ce n'est pas une date. */
  const fmtDate = v => {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d) ? String(v) : d.toLocaleDateString(['fr-FR', 'en-GB', 'de-DE', 'es-ES'][li()]);
  };

  const STATUS = {
    ordered: ['commandée', 'ordered', 'bestellt', 'encargada'],
    generated: ['générée', 'generated', 'erzeugt', 'generada'],
    planned: ['planifiée', 'planned', 'geplant', 'planificada'],
    flown: ['volée', 'flown', 'geflogen', 'volada'],
    reported: ['CR fait', 'report done', 'Bericht erstellt', 'informe hecho'],
    cancelled: ['abandonnée', 'dropped', 'verworfen', 'abandonada']
  };
  const THEATRES = [
    ['Corse', 41.3, 43.1, 8.5, 9.7],
    ['métropole', 41, 51.6, -5.8, 10],
    ['Antilles', 14, 18.6, -63.6, -60.4],
    ['Guyane', 1.8, 6.2, -55, -51],
    ['Réunion', -21.5, -20.8, 55.1, 55.9],
    ['Mayotte', -13.1, -12.5, 44.9, 45.4],
    ['Nouvelle-Calédonie', -23.2, -19, 162.5, 168.6],
    ['Polynésie', -28, -7, -155, -134],
    ['Saint-Pierre-et-Miquelon', 46.7, 47.2, -56.5, -56]
  ];
  /** Théâtre hors de France : « étranger — Japon » d'après mission.country (code ISO), sinon « étranger » pour une
   *  mission qui a des coordonnées ; '' sinon. */
  function foreignTheatre(meta, pt) {
    const c = String(meta?.country || '').trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(c) && c !== 'FR') {
      let name = c;
      try {
        name = new Intl.DisplayNames(['fr'], {
          type: 'region'
        }).of(c) || c;
      } catch {
        /* navigateur ancien */
      }
      return `étranger — ${name}`;
    }
    return /étranger|foreign/i.test(String(meta?.theatre || '')) || (Number.isFinite(+pt?.lat) && Number.isFinite(+pt?.lon)) ?
      'étranger' : '';
  }
  /** Théâtre français d'un point (lat, lon) d'après les cadres de THEATRES ; '' hors de ces cadres. */
  /** Théâtre d'un point (lat, lon) ; '' hors des théâtres connus. */
  const theatreOf = (lat, lon) => (Number.isFinite(+lat) && Number.isFinite(+lon) && THEATRES.find(([, s, n, w, e]) => lat >= s && lat <=
    n && lon >= w && lon <= e)?.[0]) || '';

  // ---- familles et sous-types : § 2 du prompt de génération (source unique : docs/technique/PROMPT_GENERATEUR_MISSIONS.md)
  /** Familles et sous-types (§ 2 du prompt) : MissionOrder.families (shared/mission_order.js). */
  const families = () => window.MissionOrder?.families?.() || [];

  // ---- registre
  const empty = () => ({
    schema: 'mission-registry',
    version: 1,
    updatedAt: '',
    missions: []
  });
  // registre gardé dans l'index IndexedDB (MissionIndex, shared/data_index.js) : plus de limite du stockage du
  // navigateur ; ancienne copie localStorage seulement sans IndexedDB
  const IDX = window.MissionIndex;
  /** Registre { schema, version, updatedAt, missions } lu dans MissionIndex, sinon dans « missionRegistry:v1 ». */
  const loadReg = () => IDX ? {
    ...empty(),
    updatedAt: IDX.updatedAt(),
    missions: IDX.all()
  } : readJson(KEY, null) || empty();
  let reg = loadReg();
  /** Clé d'une entrée du registre : « dossier|identifiant » (titre à défaut d'identifiant). */
  const keyOf = m => `${m.folder || ''}|${m.id || m.title || ''}`;

  /** Enregistre le registre (MissionIndex, échec notifié ; « missionRegistry:v1 » sans IndexedDB) et réécrit
   *  Missions/mission_registry.yaml si le dossier est déjà autorisé. */
  function persist() {
    reg.updatedAt = new Date().toISOString();
    if (IDX) IDX.save(reg.missions, reg.updatedAt).catch(e => window.AppFramework?.notify?.(t([
      'Registre des missions non enregistré dans le navigateur : {e}', 'Mission registry not saved in the browser: {e}',
      'Missionsregister im Browser nicht gespeichert: {e}', 'Registro de misiones no guardado en el navegador: {e}'
    ], {
      e: e?.message || e
    }), 'err'));
    else writeJson(KEY, reg);
    writeFile().catch(() => {});
  }
  // ---- suivi du Centre (statut, notes, date de vol) : suivi.yaml dans le dossier de chaque mission
  // (docs/technique/INDEX_DONNEES.md § 6) : partagé avec les autres postes et la synchronisation, relu par la relecture du
  // dossier ; écrit à chaque changement, sous verrou, fusionné champ par champ si un autre poste l'a modifié entre-temps
  const SUIVI = 'suivi.yaml',
    SUIVI_FIELDS = ['status', 'statusAt', 'notes', 'flownAt'];
  const suiviBase = new Map(); // id → suivi tel que lu ou écrit en dernier par cette page (base de la fusion)
  /** Analyse le texte d'un suivi.yaml ; null s'il est vide, illisible ou n'est pas un objet. */
  const readSuivi = text => {
    try {
      const y = window.jsyaml?.load(String(text || '')) || null;
      return y && typeof y === 'object' ? y : null;
    } catch {
      return null;
    }
  };
  /** Trigramme du profil pilote (missionReportingConfig:v1) : signature (by) des suivis écrits. */
  const me = () => {
    try {
      return JSON.parse(localStorage.getItem('missionReportingConfig:v1') || '{}').trigram || '';
    } catch {
      return '';
    }
  };
  /** Écrit le suivi d'une mission rangée (dossier autorisé, sans demande) ; false sinon. */
  async function writeSuivi(m) {
    if (!m?.id || !m.folder || !window.jsyaml) return false;
    const dir = await missionsDir(false);
    if (!dir) return false;
    /** Fusionne champ par champ avec le suivi.yaml du disque (base : dernier suivi connu de la page) puis l'écrit ;
     *  retour : champs changés des deux côtés (la saisie de cette page l'emporte). */
    const run = async () => {
      let h = dir;
      for (const part of m.folder.split('/').filter(Boolean)) h = await h.getDirectoryHandle(part);
      let theirs = null;
      try {
        theirs = readSuivi(await (await (await h.getFileHandle(SUIVI)).getFile()).text());
      } catch {
        theirs = null;
      }
      const base = suiviBase.get(m.id) || null,
        out = {},
        clash = [];
      for (const k of SUIVI_FIELDS) {
        const mine = m[k] ?? '',
          th = theirs?.[k] ?? '',
          b = base?.[k] ?? '';
        // changé ailleurs depuis la base et pas ici → le leur ; changé des deux côtés → le mien, signalé
        if (theirs && String(th) !== String(b) && String(mine) === String(b)) out[k] = th;
        else {
          if (theirs && base && String(th) !== String(b) && String(mine) !== String(th)) clash.push(k);
          out[k] = mine;
        }
      }
      const now = new Date().toISOString();
      const doc = {
        mission: m.id,
        ...out,
        updated_at: now,
        by: me()
      };
      const w = await (await h.getFileHandle(SUIVI, {
        create: true
      })).createWritable();
      await w.write(`# Suivi de la mission par le Centre — XPlane Web Suite (registre des missions)\n` + window.jsyaml.dump(doc, {
        lineWidth: -1
      }));
      await w.close();
      Object.assign(m, out, {
        suiviAt: now
      });
      suiviBase.set(m.id, doc);
      return clash;
    };
    try {
      const clash = await (navigator.locks?.request ? navigator.locks.request(`defa:suivi:${m.id}`, run) : run());
      if (clash.length) window.AppFramework?.notify?.(t([
        '{id} : suivi modifié en même temps sur un autre poste ({k}) ; votre saisie est gardée.',
        '{id}: tracking changed at the same time on another computer ({k}); your entry is kept.',
        '{id}: Verfolgung gleichzeitig auf einem anderen Rechner geändert ({k}); Ihre Eingabe bleibt.',
        '{id}: seguimiento modificado a la vez en otro equipo ({k}); se conserva su entrada.'
      ], {
        id: m.id,
        k: clash.join(', ')
      }), 'warn');
      persist();
      return true;
    } catch (e) {
      console.warn('suivi.yaml non écrit :', m.id, e);
      return false;
    }
  }
  /** Écrit Missions/mission_registry.yaml (dossier autorisé, sans demande). */
  async function writeFile(request = false) {
    const dir = await missionsDir(request);
    if (!dir || !window.jsyaml) return false;
    const text = `# Registre des missions générées — XPlane Web Suite (apps/cpco/mission_registry.html)\n# ${reg.updatedAt}\n` + window.jsyaml.dump(reg, {
      lineWidth: -1,
      noRefs: true
    });
    const w = await (await dir.getFileHandle(FILE, {
      create: true
    })).createWritable();
    await w.write(text);
    await w.close();
    return true;
  }
  /** Dossier des missions autorisé (FileAccess « __missions »). request (geste de l'utilisateur) : réautorise ou fait
   *  choisir le dossier, erreur explicite en cas d'échec ; sans request : null s'il n'est pas déjà autorisé. */
  async function missionsDir(request = false) {
    const FA = await waitFor('FileAccess');
    if (!FA) {
      if (request) throw new Error(t([
        'Dossier des missions : module d’accès aux dossiers (shared/file_access.js) non chargé dans cette page.',
        'Missions folder: folder access module (shared/file_access.js) not loaded in this page.'
      ]));
      return null;
    }
    const st = await FA.status('__missions');
    if (st.handle && st.permission === 'granted') return st.handle;
    if (!request) return null;
    // geste de l'utilisateur : réautoriser le dossier mémorisé ; à défaut (aucun dossier, autorisation refusée,
    // dossier devenu inaccessible), le choisir : sélecteur de dossier (data/missions). Échec : erreur explicite (cause,
    // dossier, nom de l'erreur), aussi écrite dans la console
    const fail = (fr, en, e) => {
      const err = new Error(t([fr, en], {
        d: st.name || t(['aucun', 'none']),
        e: e ? `${e.name || 'Error'} : ${e.message || ''}` : ''
      }));
      console.error('[registre des missions] dossier des missions', {
        dossier: st.name,
        autorisation: st.permission,
        origine: location.origin,
        contexteSecurise: window.isSecureContext,
        selecteur: !!window.showDirectoryPicker
      }, e || err);
      return err;
    };
    let why = null;
    if (st.handle) {
      try {
        const p = await st.handle.requestPermission({
          mode: 'readwrite'
        });
        if (p === 'granted') return st.handle;
        why = new Error(`autorisation ${p}`);
      } catch (e) {
        why = e; // dossier déplacé ou supprimé
      }
    }
    if (!window.showDirectoryPicker) throw fail(`Dossier des missions « {d} » non autorisé, et ce navigateur ne permet pas d’en choisir un (Chrome ou Edge, page servie en https ou depuis localhost ; ici ${location.origin}).`, `Missions folder “{d}” not authorised, and this browser cannot choose one (Chrome or Edge, page served over https or from localhost; here ${location.origin}).`, why);
    try {
      return await FA.pickFolder('__missions');
    } catch (e) {
      if (e?.name === 'AbortError') throw fail('Dossier des missions « {d} » non autorisé : choix du dossier annulé.',
        'Missions folder “{d}” not authorised: folder choice cancelled.', why || e);
      throw fail('Dossier des missions « {d} » non autorisé ({e}).', 'Missions folder “{d}” not authorised ({e}).', e);
    }
  }

  // ---- lecture d'une mission (document { yaml, narrative }) → entrée du registre
  /** Identifiant normalisé (M-016 → M-016) : SiaMission.parseId. */
  const normMissionId = v => (window.SiaMission?.parseId ? window.SiaMission.parseId(v).id : String(v || '').toUpperCase());

  /** Entrée du registre d'une mission lue ({ yaml }) : identifiant, type et famille, équipes, aéronefs, rendez-vous,
   *  ravitaillement, théâtre, opération, exercice, estimation, état des cartes (images : PNG présents). */
  function entryOf(doc, {
    folder = '',
    files = [],
    generatedAt = '',
    images = null
  } = {}) {
    const y = doc.yaml || {},
      meta = y.mission || {};
    const teams = (Array.isArray(y.teams) ? y.teams : []).filter(x => x && typeof x === 'object');
    const aircraft = (Array.isArray(y.aircraft) ? y.aircraft : y.aircraft ? [y.aircraft] : []).filter(Boolean);
    const rdv = Array.isArray(y.rendezvous) ? y.rendezvous : [];
    const flying = teams.filter(tm =>
      /\b(A\d{3}|H\d{3}|EC|AS|NH|E-?3|Rafale|Mirage|Falcon|Atlantique|DH8|CL-?415|Dash|TBM|BE20|King|C-?130|C-?160|A400|Caracal|Puma|Dauphin|Panther|Tigre|Cougar|avion|hélico|drone|patrouille|aéronef|MRTT|Phénix|Hawkeye|Reaper)/i
      .test(`${tm.type || ''} ${tm.role || ''}`));
    const pt = y.origin || y.target || {};
    const opMissions = Array.isArray(y.operation?.missions) ? y.operation.missions : [];
    const ex = y.exercise && typeof y.exercise === 'object' ? y.exercise : null,
      arr = v => Array.isArray(v) ? v : [];
    return {
      id: normMissionId(String(meta.id ?? meta.number ?? '').trim() || (/([A-Z]?-?\d+[A-Z]?)(?=\.\w+$)/i.exec(files[0] || '')?.[1] ||
        '')),
      formerId: String(meta.former_id ?? '').trim().toUpperCase(), // identifiant d'avant renumérotation (tools/renumber_missions.py)
      series: meta.series ?? '',
      number: meta.number ?? '',
      type: String(meta.type || '').toUpperCase(),
      family: window.MissionVocab?.familyForType?.(meta.type) || '',
      subtype: String(meta.subtype || ''),
      title: String(y.title || '').trim(),
      operation: y.operation ? {
        id: String(y.operation.id || ''),
        name: String(y.operation.name || ''),
        missions: opMissions.length,
        organisation: String(y.operation.organisation || '')
      } : null,
      organisation: !!ex || /organi/i.test(String(meta.role || '')) || /\d[A-Z]?Z$/i.test(String(meta.id || '')
        .trim()), // mission d'organisation d'un exercice (…Z)
      exercise: ex ? {
        participants: arr(ex.participants).length,
        tracks: arr(ex.tracks).length,
        played: arr(ex.tracks).filter(k => k && k.played).length,
        events: arr(ex.events).length,
        plis: arr(ex.events).filter(e => /pli/i.test(e?.kind || '')).length
      } : null,
      teams: teams.map(tm => ({
        name: String(tm.name || ''),
        type: String(tm.type || ''),
        service: String(tm.service || ''),
        role: String(tm.role || '')
      })),
      teamCount: teams.length,
      airTeams: Math.max(aircraft.length, flying.length ? 1 : 0, opMissions.length || 0) || aircraft.length,
      teamTypes: [...new Set(teams.map(tm => String(tm.type || '').trim()).filter(Boolean))],
      aircraftTypes: [...new Set(aircraft.map(a => String(a.type || '').trim()).filter(Boolean))],
      callsigns: [...new Set(aircraft.map(a => String(a.callsign || '').trim()).filter(Boolean))],
      rdv: rdv.length,
      aar: !!(y.air_refueling?.planned || /AAR/i.test(meta.type || '')),
      aarRole: String(y.air_refueling?.role || '').toLowerCase(), // tanker | receiver (missions d'une opération : même axe)
      aarTrack: String(y.air_refueling?.track || '').toUpperCase(),
      theatre: theatreOf(+pt.lat, +pt.lon) || theatreOf(+y.destination?.lat, +y.destination?.lon) || foreignTheatre(meta, pt),
      origin: String(y.origin?.name || ''),
      destination: String(y.destination?.name || ''),
      maps: Array.isArray(y.maps) ? y.maps.length : 0,
      folder,
      files,
      generatedAt,
      estimate: window.MissionEstimate?.summary?.(y) || null, // durée estimée et route probable (shared/mission_estimate.js)
      hasYaml: files.some(f => /\.ya?ml$/i.test(f)),
      hasMd: files.some(f => /\.md$/i.test(f)),
      ...mapsState(y, images),
      receivedAt: String(y.meta?.received_at || ''),
      modifiedAt: String(y.meta?.modified_at || ''),
      versions: +y.meta?.versions || 0,
      tracks: ex ? arr(ex.tracks).length : arr(y.tracks).length,
      injects: ex ? arr(ex.events).length : arr(y.injects).length
    };
  }
  /** État des cartes : maps du YAML ↔ PNG présents (dossier de la mission et cartes/). complete : toutes là ;
   *  partial : une partie ; none : aucune (régénérables depuis le YAML : définitions maps + coordonnées). */
  function mapsState(y, images) {
    const want = (Array.isArray(y.maps) ? y.maps : []).map(m => String(m?.filename || m?.file || '')).filter(Boolean);
    if (!images) return {
      mapsWanted: want.length,
      mapsFound: null,
      mapsState: ''
    };
    const have = new Set(images.map(n => n.toLowerCase())),
      found = want.filter(f => have.has(f.toLowerCase()));
    return {
      mapsWanted: want.length,
      mapsFound: found.length,
      images,
      mapsState: !want.length ? 'complete' : found.length === want.length ? 'complete' : found.length ? 'partial' : 'none'
    };
  }
  /** Fusion d'une entrée lue avec l'entrée existante (champs de l'utilisateur conservés : statut, dates, notes, commande). */
  function upsert(e, source) {
    let i = reg.missions.findIndex(m => keyOf(m) === keyOf(e));
    // même mission reçue dans le générateur (sans dossier) puis relue dans le dossier, ou l'inverse
    if (i < 0 && e.id) i = reg.missions.findIndex(m => m.id === e.id && m.status !== 'ordered' && (!m.folder || !e.folder));
    // mission commandée : même série et même identifiant (ou même numéro d'opération) → la commande devient la mission
    const j = i < 0 ? reg.missions.findIndex(m => m.status === 'ordered' && m.request && String(m.request.serie) === String(e.series) && (
      !m.id || String(e.id).startsWith(String(m.id)))) : -1;
    const prev = i >= 0 ? reg.missions[i] : j >= 0 ? reg.missions[j] : null;
    const merged = {
      ...prev,
      ...e,
      source,
      status: prev && prev.status !== 'ordered' ? prev.status : 'generated',
      statusAt: prev?.statusAt || new Date().toISOString(),
      notes: prev?.notes || '',
      flownAt: prev?.flownAt || '',
      request: prev?.request || null,
      addedAt: prev?.addedAt || new Date().toISOString()
    };
    // suivi.yaml du dossier plus récent que ce que ce navigateur en connaît : il fait foi (autre poste, synchronisation)
    if (e.suivi) {
      if (String(e.suivi.updated_at || '') > String(prev?.suiviAt || '')) {
        for (const k of SUIVI_FIELDS)
          if (e.suivi[k] !== undefined) merged[k] = e.suivi[k];
        merged.suiviAt = e.suivi.updated_at || '';
      }
      suiviBase.set(merged.id, e.suivi);
      delete merged.suivi;
    }
    if (i >= 0) reg.missions[i] = merged;
    else if (j >= 0) reg.missions[j] = merged;
    else reg.missions.push(merged);
    return merged;
  }
  // ---- noyau partagé (générateur de brief, studio) : dossier d'une mission
  //   data/missions/<lettre>_<FAMILLE>/<identifiant>/
  //     mission<ID>.yaml   source de vérité : données reçues, réglages du studio (maps[].profile / view / trace,
  //                        vertical_profile), meta (received_at, modified_at, maps_generated_at, versions, history)
  //     summary<ID>.md     Markdown pour les humains
  //     cartes/            PNG générés par le studio (régénérables depuis le YAML)
  //     recu/              chaque texte reçu (collage ChatGPT, fichiers), horodaté, tel quel
  //     versions/          YAML remplacés par une nouvelle version
  // Pas de PDF stocké : produit à la demande par le générateur.
  const SUB = {
    maps: 'cartes',
    received: 'recu',
    versions: 'versions'
  };
  /** Horodatage des noms de fichiers rangés (AAAA-MM-JJTHH-MM-SS, sans « : »). */
  const stamp = () => new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  /** Données comparables d'un YAML (sans meta ni réglages du studio), clés triées. */
  const canon = y => JSON.stringify(y, (k, v) => ['meta', 'profile', 'view', 'trace', 'generated_at'].includes(k) ? undefined : v &&
    typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(x => [x, v[x]])) : v);
  /** Différences lisibles entre deux YAML : clés de premier niveau changées (nombre d'éléments pour les listes). */
  function diffOf(a, b) {
    const out = [],
      keys = [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].filter(k => k !== 'meta');
    for (const k of keys) {
      if (canon(a?.[k]) === canon(b?.[k])) continue;
      const n = v => Array.isArray(v) ? v.length : null;
      out.push(a?.[k] === undefined ? `+ ${k}` : b?.[k] === undefined ? `− ${k}` : n(a[k]) != null && n(b[k]) != null && n(a[k]) !== n(
        b[k]) ? `${k} (${n(a[k])} → ${n(b[k])})` : k);
    }
    return out;
  }
  /** Dossier de famille existant pour une lettre (M_MEDEVAC…), sinon « <lettre>_<TYPE> ». */
  async function familyDir(dir, letter, type) {
    for await (const [name, h] of dir.entries()) if (h.kind === 'directory' && name.startsWith(`${letter}_`)) return name;
    return `${letter}_${String(type || 'MISSION').toUpperCase().replace(/[^A-Z0-9-]+/g, '')}`;
  }
  /** Texte d'un fichier d'un dossier (handle) ; null s'il est absent. */
  const readText = async (h, name) => {
    try {
      return await (await (await h.getFileHandle(name)).getFile()).text();
    } catch {
      return null;
    }
  };
  /** Écrit (crée ou remplace) un fichier texte dans un dossier (handle). */
  const writeText = async (h, name, text) => {
    const w = await (await h.getFileHandle(name, {
      create: true
    })).createWritable();
    await w.write(text);
    await w.close();
  };
  /** Dossier d'une mission (handle) d'après son identifiant ; create : le crée. null si le dossier des missions n'est pas autorisé. */
  async function missionHandle(id, type, {
    request = false,
    create = false,
    folder = ''
  } = {}) {
    const dir = await missionsDir(request),
      p = window.SiaMission?.parseId?.(id);
    if (!dir) return null;
    try {
      if (folder) {
        let h = dir;
        for (const part of folder.split('/').filter(Boolean)) h = await h.getDirectoryHandle(part, {
          create
        });
        return {
          h,
          folder
        };
      }
      if (!p?.letter) return null;
      const fam = await familyDir(dir, p.letter, type);
      const h = await (await dir.getDirectoryHandle(fam, {
        create
      })).getDirectoryHandle(p.id, {
        create
      });
      return {
        h,
        folder: `${fam}/${p.id}`
      };
    } catch (e) {
      // lecture : dossier absent → null ; écriture : dossier autorisé mais inaccessible (fichiers en ligne seulement,
      // client de synchronisation arrêté, droits du système…) → erreur explicite, et non « non autorisé »
      if (!create) return null;
      throw new Error(t([
        'Dossier des missions autorisé mais inaccessible en écriture ({m}) : vérifier que le client de synchronisation tourne et que data/ est gardé sur cet appareil.',
        'Missions folder authorised but not writable ({m}): check the sync client is running and data/ is kept on this device.'
      ], {
        m: e?.message || e?.name || '?'
      }));
    }
  }
  /** YAML d'une mission précédé d'une ligne de commentaire : identifiant, action, date. */
  const dumpYaml = (y, id, what) => `# Mission ${id} — ${what} — ${new Date().toLocaleString('fr-FR')}\n` + window.jsyaml.dump(y, {
    lineWidth: -1,
    noRefs: true
  });
  /** Identifiant rangeable (lettre de la famille + numéro : « A-001A ») ; sinon identifiant proposé d'après la famille
   *  (« BFM-001A » en COMBAT → « A-001A ») : request (clic) → confirmation, l'ancien gardé dans mission.former_id ;
   *  sans confirmation → erreur explicite (et non « dossier non autorisé »). */
  function checkMissionId(y, request) {
    const raw = String(y?.mission?.id ?? '').trim().toUpperCase(),
      SM = window.SiaMission;
    if (SM?.parseId?.(raw)?.letter) return;
    const type = String(y?.mission?.type || '').toUpperCase(),
      L = SM?.FAMILY_LETTERS || {},
      letter = L[type] || L[window.MissionVocab?.familyForType?.(type)] || '',
      m = /(\d{1,3})([A-Z]?)$/.exec(raw),
      guess = letter && m ? `${letter}-${m[1].padStart(3, '0')}${m[2]}` : '';
    if (guess && request && confirm(t([
        'Identifiant « {r} » hors format (lettre de la famille + numéro). Enregistrer la mission sous « {g} » ? (l’ancien identifiant est gardé dans mission.former_id)',
        'ID “{r}” is not in the expected format (family letter + number). Save the mission as “{g}”? (the old ID is kept in mission.former_id)'
      ], {
        r: raw || '—',
        g: guess
      }))) {
      y.mission.former_id = y.mission.former_id || raw;
      y.mission.id = guess;
      return;
    }
    throw new Error(t([
      'Identifiant de mission « {r} » hors format : lettre de la famille + numéro sur 3 chiffres (+ lettre d’équipe), ex. « {g} ». Corriger mission.id.',
      'Mission ID “{r}” not in the expected format: family letter + 3-digit number (+ team letter), e.g. “{g}”. Fix mission.id.'
    ], {
      r: raw || '—',
      g: guess || 'M-016A'
    }));
  }
  /** Range une mission reçue : trace des textes reçus (recu/), comparaison avec la version en place (identique → rien
   *  n'est remplacé ; différente → ancienne dans versions/, réglages du studio repris), meta mise à jour, Markdown.
   *  Sortie : { folder, status: 'new' | 'same' | 'version', diff } ; folder vide si le dossier n'est pas autorisé. */
  async function storeMission(doc, {
    md = '',
    raw = [],
    request = false,
    source = 'collage'
  } = {}) {
    checkMissionId(doc.yaml, request);
    const id = normMissionId(doc.yaml?.mission?.id || ''),
      at = new Date().toISOString(),
      st = stamp();
    const m = await missionHandle(id, doc.yaml?.mission?.type, {
      request,
      create: true
    });
    if (!m) return {
      folder: '',
      status: '',
      diff: []
    };
    const name = `mission${id}.yaml`;
    if (raw.length) {
      const rh = await m.h.getDirectoryHandle(SUB.received, {
        create: true
      });
      for (const [i, r] of raw.entries()) await writeText(rh, `${st}_${i + 1}_${String(r.name || 'texte').replace(/[^\w.-]+/g, '_')}.txt`, r.text);
    }
    const oldText = await readText(m.h, name);
    let old = null;
    try {
      old = oldText ? window.jsyaml.load(oldText.replace(/^#.*\n/, '')) : null;
    } catch {
      old = null;
    }
    const y = structuredClone(doc.yaml);
    let status = 'new',
      diff = [];
    if (old && canon(old) === canon(y)) status = 'same';
    else if (old) {
      status = 'version';
      diff = diffOf(old, y);
      const vh = await m.h.getDirectoryHandle(SUB.versions, {
        create: true
      });
      await writeText(vh, `mission${id}_${st}.yaml`, oldText);
      // réglages du studio repris sur les cartes de même nom ; profil vertical gardé s'il n'est pas redonné
      for (const mp of Array.isArray(y.maps) ? y.maps : []) {
        const o = (old.maps || []).find(x => x?.filename && x.filename === mp?.filename);
        if (o)
          for (const k of ['profile', 'view', 'trace', 'generated_at'])
            if (o[k] !== undefined && mp[k] === undefined) mp[k] = o[k];
      }
      if (!y.vertical_profile && old.vertical_profile) y.vertical_profile = old.vertical_profile;
    }
    const om = old?.meta || {};
    y.meta = {
      ...om,
      ...(y.meta || {}),
      received_at: om.received_at || at,
      modified_at: status === 'same' ? (om.modified_at || at) : at,
      source: om.source || source,
      versions: (+om.versions || 0) + (status === 'version' ? 1 : 0),
      history: [...(Array.isArray(om.history) ? om.history : []), {
        at,
        action: {
          new: 'reçue',
          same: 'reçue à l’identique',
          version: 'nouvelle version'
        } [status],
        source,
        ...(diff.length ? {
          diff
        } : {})
      }].slice(-30)
    };
    await writeText(m.h, name, dumpYaml(y, id, status === 'new' ? 'reçue' : 'mise à jour'));
    if (md && (status !== 'same' || !(await readText(m.h, `summary${id}.md`)))) await writeText(m.h, `summary${id}.md`, md);
    doc.yaml = y;
    return {
      folder: m.folder,
      status,
      diff
    };
  }
  /** Enregistre le YAML modifié d'une mission (générateur, studio) : meta.modified_at, trace dans l'historique. */
  async function saveYaml(y, {
    action = 'modifiée',
    request = false
  } = {}) {
    checkMissionId(y, request);
    const id = normMissionId(y?.mission?.id || ''),
      m = await missionHandle(id, y?.mission?.type, {
        request,
        create: true
      });
    if (!m) return '';
    const at = new Date().toISOString();
    y.meta = {
      ...(y.meta || {}),
      received_at: y.meta?.received_at || at,
      modified_at: at,
      history: [...(Array.isArray(y.meta?.history) ? y.meta.history : []), {
        at,
        action
      }].slice(-30)
    };
    await writeText(m.h, `mission${id}.yaml`, dumpYaml(y, id, action));
    return m.folder;
  }
  /** Écrit des cartes (PNG : { name, blob }) dans cartes/ ; meta.maps_generated_at. */
  async function saveMaps(y, maps, {
    request = false
  } = {}) {
    checkMissionId(y, request);
    const id = normMissionId(y?.mission?.id || ''),
      m = await missionHandle(id, y?.mission?.type, {
        request,
        create: true
      });
    if (!m) return '';
    const ch = await m.h.getDirectoryHandle(SUB.maps, {
      create: true
    });
    for (const f of maps) {
      const w = await (await ch.getFileHandle(f.name, {
        create: true
      })).createWritable();
      await w.write(f.blob);
      await w.close();
    }
    y.meta = {
      ...(y.meta || {}),
      maps_generated_at: new Date().toISOString()
    };
    await saveYaml(y, {
      action: `${maps.length} carte(s) générée(s)`
    });
    return m.folder;
  }
  /** Mission reçue : rangée (storeMission) puis inscrite au registre (commande rapprochée). */
  async function record(doc, {
    md = '',
    raw = [],
    source = 'collage',
    request = false
  } = {}) {
    let res = {
      folder: '',
      status: '',
      diff: []
    };
    try {
      res = await storeMission(doc, {
        md,
        raw,
        request,
        source
      });
    } catch (e) {
      res.error = e.message;
    }
    await IDX?.ready;
    reg = loadReg();
    const e = entryOf(doc, {
      folder: res.folder,
      files: res.folder ? [`mission${normMissionId(doc.yaml?.mission?.id)}.yaml`, ...(md ? [`summary${normMissionId(doc.yaml?.mission?.id)}.md`] : [])] : [],
      generatedAt: new Date().toISOString()
    });
    const entry = upsert(e, res.folder ? 'dossier' : 'générateur');
    persist();
    return {
      entry,
      ...res
    };
  }
  // ---- place occupée par une mission, cartes surnuméraires, purge des cartes générées (régénérables depuis le YAML)
  /** Taille lisible : « 850 ko », « 3,4 Mo ». */
  const fmtBytes = b => b >= 1e6 ? `${(b / 1e6).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(b / 1e3))} ko`;
  /** Cartes attendues d'une mission : maps[] du YAML, carte d'assemblage et profil vertical (produits par le studio). */
  const wantedMaps = y => new Set([...(Array.isArray(y?.maps) ? y.maps : []).map(mp => String(typeof mp === 'object' ? mp?.filename || mp
    ?.file || '' : mp).toLowerCase()), 'carte_assemblage.png', 'profil_vertical.png'].filter(Boolean));
  /** Fichiers d'un dossier de mission avec leur taille et leur catégorie : data (YAML, Markdown…), maps (cartes), pdf,
   *  versions, recu ; cartes surnuméraires (absentes du YAML). { files, sizes: { data, maps, versions, recu, total },
   *  surplus: [fichiers] }. y : YAML de la mission (lu dans le dossier si absent). */
  async function missionUsage(mh, y) {
    if (!y) {
      try {
        const txt = await readText(mh.h, `mission${normMissionId(String(mh.folder || '').split('/').pop())}.yaml`) || '';
        y = txt ? window.jsyaml.load(txt.replace(/^#.*\n/, '')) : null;
      } catch {
        y = null;
      }
    }
    const want = wantedMaps(y),
      files = [];
    /** Ajoute à files les fichiers du sous-dossier sub (racine si vide) avec leur taille ; dossier absent : ignoré. */
    const walk = async (dir, sub) => {
      try {
        const d = sub ? await dir.getDirectoryHandle(sub) : dir;
        for await (const [n, x] of d.entries()) if (x.kind === 'file') {
          const f = await x.getFile();
          files.push({
            name: n,
            sub,
            size: f.size,
            dir: d
          });
        }
      } catch {
        /* absent */
      }
    };
    await walk(mh.h, '');
    for (const s of [SUB.maps, SUB.versions, SUB.received]) await walk(mh.h, s);
    /** Nom de fichier image (cartes : PNG, JPEG, WebP). */
    const img = n => /\.(png|jpe?g|webp)$/i.test(n);
    for (const f of files) f.kind = f.sub === SUB.maps || (!f.sub && img(f.name)) ? 'maps' : f.sub === SUB.versions ? 'versions' : f
      .sub === SUB.received ? 'recu' : /\.pdf$/i.test(f.name) ? 'pdf' : 'data';
    const surplus = y ? files.filter(f => f.kind === 'maps' && !want.has(f.name.toLowerCase())) : [];
    const sizes = {
      data: 0,
      maps: 0,
      pdf: 0,
      versions: 0,
      recu: 0,
      total: 0
    };
    for (const f of files) {
      sizes[f.kind] += f.size;
      sizes.total += f.size;
    }
    return {
      files,
      sizes,
      surplus,
      surplusSize: surplus.reduce((a, f) => a + f.size, 0)
    };
  }
  /** Supprime des fichiers listés par missionUsage (cartes surnuméraires, cartes générées) ; nombre supprimé. */
  async function removeFiles(list) {
    let n = 0;
    for (const f of list) {
      try {
        await f.dir.removeEntry(f.name);
        n++;
      } catch {
        /* déjà absent, ou refusé */
      }
    }
    return n;
  }
  window.MissionRegistryCore = {
    record,
    entryOf,
    missionsDir,
    missionHandle,
    saveYaml,
    saveMaps,
    readText,
    SUB,
    diffOf,
    missionUsage,
    removeFiles,
    fmtBytes
  };
  if (!host) return;

  // ---- nettoyage : entrées dont le fichier n'existe plus (missions renumérotées, déplacées ou supprimées)
  const USER_FIELDS = ['status', 'statusAt', 'notes', 'flownAt', 'request', 'report', 'addedAt'];
  /** Mission lue qui remplace une entrée disparue : même ancien identifiant (former_id), sinon même titre et même type. */
  function successorOf(old, live) {
    const id = String(old.id || '').toUpperCase(),
      title = String(old.title || '').trim().toLowerCase();
    const team = v => /\d([A-Z])$/.exec(String(v || '').toUpperCase())?.[1] || ''; // lettre d'équipe (M-016B → B)
    return live.find(m => id && (m.formerId === id || m.id === id)) ||
      (title && live.find(m => String(m.title || '').trim().toLowerCase() === title && (!old.type || !m.type || m.type === old.type) &&
        team(m.id) === team(old.id))) ||
      null;
  }
  /** Retire les entrées « fichier absent » ; statut, notes, date de vol, commande et CR passent à la mission qui les remplace
   *  quand elle n'en a pas (statut « générée »). Les commandes en attente (sans fichier) sont gardées. Sortie : { removed, moved }. */
  function cleanup() {
    const gone = reg.missions.filter(m => m.missingFile),
      live = reg.missions.filter(m => !m.missingFile);
    let moved = 0;
    for (const old of gone) {
      const next = successorOf(old, live);
      if (!next) continue;
      const userSet = old.status && !['generated', 'ordered'].includes(old.status) || old.notes || old.flownAt;
      if (userSet && (!next.status || next.status === 'generated') && !next.notes && !next.flownAt) {
        for (const k of USER_FIELDS)
          if (old[k] != null && old[k] !== '') next[k] = old[k];
        moved++;
      }
    }
    reg.missions = live;
    linkReports();
    persist();
    return {
      removed: gone.length,
      moved
    };
  }
  /** Parcourt le dossier des missions (sous-dossiers de séries) : YAML et Markdown groupés par mission. */
  async function scan(request = true) {
    const dir = await missionsDir(request);
    if (!dir) throw new Error(t(['Dossier des missions non choisi : choisir le dossier « Missions » du dépôt (bouton ci-dessus).',
      'Missions folder not chosen: choose the repository “Missions” folder (button above).',
      'Missionsordner nicht gewählt: den Ordner „Missions“ des Repositorys wählen (Schaltfläche oben).',
      'Carpeta de misiones no elegida: elegir la carpeta «Missions» del repositorio (botón de arriba).'
    ]));
    await waitFor('SiaMission');
    const found = [],
      problems = [];
    // relecture incrémentale : un dossier dont les fichiers (nom, date, taille) et les cartes n'ont pas changé depuis la
    // dernière lecture reprend ses entrées du registre, sans relire ni réanalyser ses fichiers (missionRegistryScan:v1)
    const SCAN = 'missionRegistryScan:v1',
      seenSig = readJson(SCAN, {}),
      nextSig = {},
      before = JSON.stringify(reg.missions);
    let reused = 0;
    // barre indéterminée (nombre de dossiers inconnu d'avance) : dossier en cours et missions trouvées
    const job = window.AppFramework?.task?.(t(['Lecture du dossier des missions', 'Reading the missions folder',
      'Missionsordner wird gelesen', 'Leyendo la carpeta de misiones'
    ]), {
      // « Arrêter » : lecture interrompue entre deux dossiers ; le registre n'est pas touché (relecture incomplète écartée)
      cancel: () => {}
    });
    /** Parcourt un dossier (3 niveaux au plus, dossiers « _… » et « .… » ignorés) : missions lues, ou reprises du
     *  registre si la signature du dossier (fichiers, cartes, suivi.yaml) n'a pas changé depuis la dernière lecture. */
    async function walk(h, path, depth) {
      if (job?.cancelled) throw new DOMException('Arrêt demandé', 'AbortError');
      job?.set(0, 0, `${path || dir.name} — ${found.length}`);
      const files = [],
        subs = [],
        images = [];
      let suiviFile = null; // suivi.yaml : statut, notes, date de vol (Centre), hors fichiers de la mission
      for await (const [name, x] of h.entries()) {
        if (x.kind === 'directory') {
          if (SUB[name]) {
            if (name === SUB.maps)
              for await (const [n2, y2] of x.entries()) if (y2.kind === 'file' && /\.(png|jpe?g|webp)$/i.test(n2)) images.push(n2);
          } else if (depth < 3 && !/^(_|\.)/.test(name)) subs.push([name, x]);
        } else if (/\.(png|jpe?g|webp)$/i.test(name)) images.push(name);
        else if (name === SUIVI) suiviFile = x;
        else if (/\.(ya?ml|md)$/i.test(name) && name !== FILE && !
          /^(maps_manifest|AAR_TRACKS_REFERENCE|OSM_WORK_PROMPT|README|VALIDATION)/i.test(name)) files.push(x);
      }
      if (files.length) {
        const got = await Promise.all(files.map(fh => fh.getFile()));
        const sf = suiviFile ? await suiviFile.getFile() : null;
        const sig = [...got.map(f => `${f.name}:${f.lastModified}:${f.size}`), ...images, ...(sf ? [`${SUIVI}:${sf.lastModified}:${sf.size}`] : [])].sort().join('|');
        nextSig[path] = sig;
        const known = reg.missions.filter(m => m.source === 'dossier' && m.folder === path);
        if (seenSig[path] === sig && known.length) {
          found.push(...known); // inchangé : entrées reprises telles quelles
          reused++;
          for (const [name, x] of subs) await walk(x, path ? `${path}/${name}` : name, depth + 1);
          return;
        }
        const texts = [];
        let newest = 0;
        for (const f of got) {
          newest = Math.max(newest, f.lastModified);
          texts.push({
            name: f.name,
            text: await f.text()
          });
        }
        try {
          const {
            docs
          } = window.SiaMission.fromTextsBatch(texts);
          const suivi = sf ? readSuivi(await sf.text()) : null;
          for (const d of docs) {
            const names = d.sourceNames || [];
            const e = entryOf(d, {
              folder: path,
              files: names,
              generatedAt: new Date(newest).toISOString(),
              images
            });
            if (suivi && (!suivi.mission || suivi.mission === e.id)) e.suivi = suivi;
            found.push(e);
          }
        } catch (e) {
          problems.push(explain(e, path || '.'));
        }
      }
      for (const [name, x] of subs) await walk(x, path ? `${path}/${name}` : name, depth + 1);
    }
    try {
      await walk(dir, '', 0);
    } finally {
      job?.end();
    }
    for (const e of found) upsert(e, 'dossier');
    const seen = new Set(found.map(keyOf));
    reg.missions.forEach(m => {
      m.missingFile = m.source === 'dossier' && !seen.has(keyOf(m));
    });
    linkReports();
    writeJson(SCAN, nextSig);
    // registre réécrit (navigateur et mission_registry.yaml) seulement s'il a changé : plus de fichier modifié à chaque
    // ouverture de la page
    if (JSON.stringify(reg.missions) !== before) persist();
    return {
      found: found.length,
      reused,
      problems
    };
  }
  /** Ajoute des fichiers choisis (File) : groupés par dossier (webkitRelativePath) puis par mission. Retourne le nombre de missions. */
  async function addFiles(list) {
    await waitFor('SiaMission');
    const groups = new Map();
    for (const f of list) {
      if (!/\.(ya?ml|md)$/i.test(f.name) || /^(maps_manifest|AAR_TRACKS_REFERENCE|OSM_WORK_PROMPT|README|VALIDATION)/i.test(f.name) || f
        .name === FILE) continue;
      const folder = (f.webkitRelativePath || '').split('/').slice(0, -1).join('/') || f.folder || '';
      if (!groups.has(folder)) groups.set(folder, []);
      groups.get(folder).push(f);
    }
    let n = 0;
    for (const [folder, files] of groups) {
      const texts = await Promise.all(files.map(async f => ({
        name: f.name,
        text: await f.text()
      })));
      const newest = Math.max(...files.map(f => f.lastModified || 0));
      const {
        docs
      } = window.SiaMission.fromTextsBatch(texts);
      for (const d of docs) {
        upsert(entryOf(d, {
          folder,
          files: d.sourceNames || [],
          generatedAt: newest ? new Date(newest).toISOString() : ''
        }), 'import');
        n++;
      }
    }
    linkReports();
    persist();
    return n;
  }
  // CR du registre des CR : copie indexée (ReportIndex, shared/data_index.js), lue à l'ouverture et quand un CR est
  // enregistré ; sans index : ancienne copie texte du navigateur (analyse YAML)
  let crList = null;
  /** Lit les CR (ReportIndex, sinon copie « missionCoreLedger:v2 » analysée) dans crList ; retour : cette liste. */
  async function loadReports() {
    const i = await window.ReportIndex?.load?.();
    if (i) crList = i.missions;
    else try {
      crList = window.jsyaml?.load(readJson('missionCoreLedger:v2', null)?.text || '')?.missions || [];
    } catch {
      crList = [];
    }
    return crList;
  }
  /** CR de chaque mission (registre des CR, missionCoreLedger:v2) : n° de CR CR<mission>-<vol> (ou metadata.missionNumber).
   *  m.reports = [{ missionId, family, date, index }] du plus récent au plus ancien (index : rang dans la famille, lien
   *  ?edit= de la page de CR) ; m.report = le dernier ; statut « CR fait » dès le premier. Une mission récurrente (ravitaillement
   *  sur SIMONE, dix fois par mois) garde tous ses vols : CRR-001-1, CRR-001-2… */
  function linkReports() {
    // CR pas encore lus : liaison faite dès qu'ils le sont (jamais avec une liste vide, qui effacerait les liens)
    if (!crList) return void loadReports().then(() => {
      linkReports();
      if (host) render();
    });
    const crs = crList;
    const rank = {},
      all = crs.map(r => ({
        r,
        index: (rank[r.family] = (rank[r.family] ?? -1) + 1)
      }));
    /** Identifiant de mission d'un CR : tiré du n° de CR (metadata.missionId), sinon de metadata.missionNumber. */
    const crMission = r => window.MissionVocab?.parseCrId?.(r?.metadata?.missionId)?.mission || normMissionId(r?.metadata
      ?.missionNumber || '');
    for (const m of reg.missions) {
      const mine = m.id ? all.filter(({
        r
      }) => crMission(r) === String(m.id)) : [];
      /** Durées d'un CR en minutes (vol, bloc, transits, temps sur zone) : MissionModel.computeStatistics. */
      const stats = r => {
        const s = window.MissionModel?.computeStatistics?.(r) || {};
        return {
          flight: s.flightMinutes,
          block: s.blockMinutes,
          transitOut: s.transitOutMinutes,
          onStation: s.timeOnStationMinutes,
          transitIn: s.transitInMinutes
        };
      };
      m.reports = mine.map(({
          r,
          index
        }) => ({
          missionId: r.metadata?.missionId || '',
          family: r.family,
          date: r.metadata?.date || '',
          index,
          ...stats(r)
        }))
        .sort((a, b) => b.date.localeCompare(a.date) || b.missionId.localeCompare(a.missionId, 'fr', {
          numeric: true
        }));
      m.report = m.reports[0] || null;
      if (m.report && m.status !== 'cancelled') m.status = 'reported';
    }
  }
  /** Page de CR d'un CR du registre (modification ?edit=rang&id=n°). */
  const crUrl = rep => {
    const fam = window.MissionVocab?.families?.find(f => f.id === rep.family);
    return fam ? new URL(`apps/cr/${fam.cr}?edit=${rep.index}&id=${encodeURIComponent(rep.missionId)}`, window.RepositoryNav.root).href : '';
  };

  // ---- filtres et choix
  const DEFAULT_FILTERS = {
    type: '',
    subtype: '',
    rdv: '',
    teamsMin: '',
    teamsMax: '',
    teamType: '',
    aar: '',
    theatre: '',
    status: '',
    q: ''
  };
  let filters = {
    ...DEFAULT_FILTERS,
    ...readJson(FILTERS, {})
  };
  /** Mission retenue par les filtres de la page : type ou famille, sous-type, rendez-vous, nombre et types d'équipes,
   *  ravitaillement, théâtre, statut, recherche libre. */
  const matches = m => (!filters.type || m.type === filters.type || m.family === filters.type) &&
    (!filters.subtype || m.subtype === filters.subtype) &&
    (!filters.rdv || (filters.rdv === 'with' ? m.rdv > 0 : m.rdv === 0)) &&
    (filters.teamsMin === '' || m.teamCount >= +filters.teamsMin) &&
    (filters.teamsMax === '' || m.teamCount <= +filters.teamsMax) &&
    (!filters.teamType || [...m.teamTypes, ...m.aircraftTypes].some(x => x.toLowerCase().includes(filters.teamType.toLowerCase()))) &&
    (!filters.aar || (filters.aar === 'yes') === !!m.aar) &&
    (!filters.theatre || m.theatre === filters.theatre) &&
    (!filters.status || m.status === filters.status) &&
    (!filters.q || JSON.stringify([m.id, m.title, m.origin, m.destination, m.callsigns, m.operation?.name, m.notes]).toLowerCase()
      .includes(filters.q.toLowerCase()));
  /** Valeurs distinctes non vides, triées (ordre français, numérique). */
  const uniq = arr => [...new Set(arr.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'fr', {
    numeric: true
  }));

  // ---- rendu
  // mission affichée : mémorisée (retour depuis le générateur, le studio ou un CR) ; ?mission=M-016 la choisit
  const SEL_KEY = 'missionRegistrySelected:v1';
  const TABLE_H = 'missionRegistryTableHeight:v1';
  let table = null,
    selected = readJson(SEL_KEY, null),
    msg = '';
  /** Choisit la mission affichée (clé keyOf, null : aucune), mémorisée dans « missionRegistrySelected:v1 ». */
  const select = k => {
    selected = k;
    writeJson(SEL_KEY, k);
  };
  // v2 : filtres secondaires dans « Plus de filtres » (sous-type, rendez-vous, équipes, type d'équipe, ravitaillement) ;
  // état du repli choisi par l'utilisateur (null : pas encore touché), gardé quand la page est redessinée
  let moreFilters = null;
  /** Repli « Plus de filtres » ouvert : choix de l'utilisateur, sinon niveau Expert ou l'un de ses filtres actif. */
  const moreFiltersOpen = () => moreFilters ?? ((window.RepositoryNav?.levels?.get?.() || 4) >= 4 || ['subtype', 'rdv', 'teamsMin',
    'teamsMax', 'teamType', 'aar'
  ].some(k => filters[k] !== '' && filters[k] != null));
  /** Pastille de statut ou de message (classe rg-<niveau>). */
  const pill = (level, text) => `<span class="rg-pill rg-${esc(String(level ?? '').replace(/[^\w-]/g, ''))}">${esc(text)}</span>`;

  /** Construit la page : source (dossier, relecture, ajout, écriture du YAML, nettoyage), filtres et tirage au sort,
   *  tableau, fiche de la mission choisie, bloc de commande ; branche les boutons. */
  function render() {
    const fam = families(),
      rows = reg.missions.filter(matches);
    const types = uniq([...reg.missions.map(m => m.type), ...fam.map(f => f.id)]);
    const subtypes = uniq([...reg.missions.filter(m => !filters.type || m.type === filters.type).map(m => m.subtype), ...(fam.find(f => f
      .id === filters.type)?.subtypes || [])]);
    const teamTypes = uniq(reg.missions.flatMap(m => [...m.teamTypes, ...m.aircraftTypes]));
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
    const counts = Object.keys(STATUS).map(k => [k, reg.missions.filter(m => m.status === k).length]).filter(([, n]) => n);
    host.innerHTML = `
      <section data-block-id="source" data-icon="folder" data-subtitle="${esc(t(['Séries générées du dossier « Missions » et missions commandées', 'Generated series of the “Missions” folder and ordered missions']))}">
        <h2>${esc(t(['Missions du registre', 'Registry missions', 'Missionen des Registers', 'Misiones del registro']))}</h2>
        <p class="row" id="rgFolder"></p>
        <p>${esc(t(['{n} mission(s)', '{n} mission(s)'], { n: reg.missions.length }))} · ${counts.map(([k, n]) => `${pill(k, t(STATUS[k]))} ${n}`).join(' ')} ${reg.updatedAt ? `<span class="rg-small">— ${esc(t(['mis à jour le {d}', 'updated {d}'], { d: fmtDate(reg.updatedAt) }))}</span>` : ''}</p>
        <div id="rgMsg">${msg}</div>
      </section>
      <section data-block-id="choose" data-icon="search" data-subtitle="${esc(t(['Type, sous-type, rendez-vous, équipes, ravitaillement, théâtre, statut — puis tirer au sort ou ouvrir', 'Type, subtype, rendezvous, teams, refuelling, theatre, status — then draw or open']))}">
        <h2>${esc(t(['Choisir une mission', 'Choose a mission', 'Mission wählen', 'Elegir una misión']))}</h2>
        <div class="rg-filters">
          <label>${esc(t(['Type', 'Type', 'Typ', 'Tipo']))}<select data-f="type">${opt('', t(['tous', 'all', 'alle', 'todos']), filters.type)}${types.map(x => opt(x, x, filters.type)).join('')}</select></label>
          <label>${esc(t(['Statut', 'Status', 'Status', 'Estado']))}<select data-f="status">${opt('', t(['tous', 'all']), filters.status)}${Object.keys(STATUS).map(k => opt(k, t(STATUS[k]), filters.status)).join('')}</select></label>
          <label>${esc(t(['Théâtre', 'Theatre', 'Schauplatz', 'Teatro']))}<select data-f="theatre">${opt('', t(['tous', 'all']), filters.theatre)}${uniq(reg.missions.map(m => m.theatre)).map(x => opt(x, x, filters.theatre)).join('')}</select></label>
          <label>${esc(t(['Recherche', 'Search', 'Suche', 'Buscar']))}<input type="search" data-f="q" value="${esc(filters.q)}"></label>
        </div>
        <details class="rg-more" data-rg-more ${moreFiltersOpen() ? 'open' : ''} style="margin:-6px 0 8px"><summary style="cursor:pointer;font-size:12px;font-weight:600;color:var(--muted)">${esc(t(['Plus de filtres', 'More filters', 'Weitere Filter', 'Más filtros']))}</summary>
        <div class="rg-filters">
          <label>${esc(t(['Sous-type', 'Subtype', 'Untertyp', 'Subtipo']))}<select data-f="subtype">${opt('', t(['tous', 'all', 'alle', 'todos']), filters.subtype)}${subtypes.map(x => opt(x, x, filters.subtype)).join('')}</select></label>
          <label>${esc(t(['Rendez-vous', 'Rendezvous', 'Treffpunkt', 'Encuentro']))}<select data-f="rdv">${opt('', t(['indifférent', 'any', 'egal', 'indiferente']), filters.rdv)}${opt('with', t(['avec', 'with', 'mit', 'con']), filters.rdv)}${opt('without', t(['sans', 'without', 'ohne', 'sin']), filters.rdv)}</select></label>
          <label>${esc(t(['Équipes engagées', 'Teams engaged', 'Beteiligte Teams', 'Equipos']))}<span class="rg-range"><input type="number" min="0" max="20" data-f="teamsMin" value="${esc(filters.teamsMin)}" placeholder="min"> – <input type="number" min="0" max="20" data-f="teamsMax" value="${esc(filters.teamsMax)}" placeholder="max"></span></label>
          <label>${esc(t(['Type d’équipe / d’aéronef', 'Team / aircraft type', 'Team- / Luftfahrzeugtyp', 'Tipo de equipo / aeronave']))}<input list="rgTeamTypes" data-f="teamType" value="${esc(filters.teamType)}"><datalist id="rgTeamTypes">${teamTypes.map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>
          <label>${esc(t(['Ravitaillement en vol', 'Air refuelling', 'Luftbetankung', 'Reabastecimiento']))}<select data-f="aar">${opt('', t(['indifférent', 'any']), filters.aar)}${opt('yes', t(['oui', 'yes', 'ja', 'sí']), filters.aar)}${opt('no', t(['non', 'no', 'nein', 'no']), filters.aar)}</select></label>
        </div>
        </details>
        <p class="row"><button type="button" class="primary" id="rgDraw" data-icon="sparkles" ${rows.length ? '' : 'disabled'}>${esc(t(['Tirer au sort ({n})', 'Draw at random ({n})', 'Zufällig wählen ({n})', 'Sortear ({n})'], { n: rows.length }))}</button><button type="button" class="secondary" id="rgReset">${esc(t(['Effacer les filtres', 'Clear filters', 'Filter löschen', 'Borrar filtros']))}</button><button type="button" class="secondary" id="rgCsv" data-icon="download">CSV</button></p>
        <div id="rgTable"></div>
        <div class="rg-resize" role="separator" aria-orientation="horizontal" title="${esc(t(['Glisser pour agrandir ou réduire le tableau (double-clic : hauteur par défaut)', 'Drag to enlarge or shrink the table (double-click: default height)', 'Ziehen, um die Tabelle zu vergrößern oder zu verkleinern (Doppelklick: Standardhöhe)', 'Arrastrar para ampliar o reducir la tabla (doble clic: altura por defecto)']))}"><span></span></div>
        <div id="rgDetail"></div>
      </section>
      <section data-block-id="order" data-icon="sparkles" data-subtitle="${esc(t(['Nouvelle mission à générer : paramètres choisis, prompt ChatGPT réglé, entrée « commandée » rapprochée ensuite du fichier généré', 'New mission to generate: chosen parameters, tuned ChatGPT prompt, “ordered” entry matched later with the generated file']))}">
        <h2>${esc(t(['Commander une mission', 'Order a mission', 'Mission bestellen', 'Encargar una misión']))}</h2>
        <div id="rgOrderHost"></div>
      </section>`;
    // dossier
    const fb = host.querySelector('#rgFolder');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'secondary';
    b.dataset.icon = 'folder';
    b.dataset.minLevel = '4'; // v2 : choix du dossier au niveau Expert (« Relire le dossier » le demande s'il manque)
    b.onclick = async () => {
      try {
        await window.FileAccess.pickFolder('__missions');
        await doScan();
      } catch (e) {
        if (e?.name !== 'AbortError' && e?.message !== 'Dossier refusé') window.AppFramework?.notify?.(explain(e, t([
          'Dossier des missions non choisi', 'Missions folder not chosen', 'Missionsordner nicht gewählt',
          'Carpeta de misiones no elegida'
        ])), 'err');
      }
    };
    waitFor('FileAccess').then(FA => FA?.decorate(b, '__missions'));
    const sb = document.createElement('button');
    sb.type = 'button';
    sb.className = 'secondary'; // action principale : « Générer une mission »
    sb.dataset.icon = 'refresh';
    sb.textContent = t(['Relire le dossier', 'Re-read folder', 'Ordner neu lesen', 'Releer la carpeta']);
    sb.onclick = doScan;
    // ajout de fichiers (tout navigateur) : sélection de missionNN.yaml / summaryNN.md, ou d'un dossier de série
    const ab = document.createElement('label');
    ab.className = 'rg-file';
    ab.textContent = t(['Ajouter des fichiers…', 'Add files…', 'Dateien hinzufügen…', 'Añadir archivos…']);
    ab.innerHTML += '<input type="file" multiple accept=".yaml,.yml,.md" hidden data-picker-folder="__missions">';
    ab.querySelector('input').onchange = async e => {
      const list = [...e.target.files];
      e.target.value = '';
      try {
        const n = await addFiles(list);
        msg = pill('generated', t(['{n} mission(s) ajoutée(s)', '{n} mission(s) added'], {
          n
        }));
      } catch (err) {
        msg = pill('cancelled', explain(err, t(['Fichiers non ajoutés', 'Files not added', 'Dateien nicht hinzugefügt',
          'Archivos no añadidos'
        ])));
      }
      render();
    };
    fb.append(ab);
    // v2 : Missions s'ouvre sur le registre ; « Générer une mission » mène au générateur (mission vierge), en tête de barre
    const gb = document.createElement('button');
    gb.type = 'button';
    gb.className = 'primary';
    gb.dataset.icon = 'plus';
    gb.textContent = t(['Générer une mission', 'Generate a mission', 'Eine Mission erzeugen', 'Generar una misión']);
    gb.onclick = () => {
      location.href = new URL('mission_editor.html', location.href).href;
    };
    fb.prepend(gb);
    const wb = document.createElement('button');
    wb.type = 'button';
    wb.className = 'secondary';
    wb.dataset.icon = 'save';
    wb.dataset.minLevel = '4'; // v2 : niveau Expert
    wb.textContent = t(['Écrire mission_registry.yaml', 'Write mission_registry.yaml']);
    wb.onclick = async () => {
      try {
        msg = (await writeFile(true)) ? pill('generated', t(['mission_registry.yaml écrit', 'mission_registry.yaml written'])) : pill(
          'ordered', t(['dossier non autorisé', 'folder not authorised']));
      } catch (e) {
        msg = pill('cancelled', explain(e, t(['mission_registry.yaml non écrit', 'mission_registry.yaml not written',
          'mission_registry.yaml nicht geschrieben', 'mission_registry.yaml no escrito'
        ])));
      }
      render();
    };
    const missing = reg.missions.filter(m => m.missingFile).length;
    const cb = document.createElement('button');
    cb.type = 'button';
    cb.className = 'secondary';
    cb.dataset.icon = 'trash';
    cb.dataset.minLevel = '4'; // v2 : niveau Expert
    cb.textContent = t(['Nettoyer le registre ({n})', 'Clean up the registry ({n})', 'Register bereinigen ({n})',
      'Limpiar el registro ({n})'
    ], {
      n: missing
    });
    cb.title = t([
      'Retirer les missions « fichier absent » (après renumérotation ou suppression) ; statut, notes et date de vol passent à la mission renumérotée. Relire le dossier avant.',
      'Remove “missing file” missions (after renumbering or deletion); status, notes and flight date move to the renumbered mission. Re-read the folder first.'
    ]);
    cb.disabled = !missing;
    cb.onclick = async () => {
      if (!await doScan()) return; // état « fichier absent » à jour avant de retirer quoi que ce soit
      const n = reg.missions.filter(m => m.missingFile).length;
      if (!n) {
        msg = pill('generated', t(['Rien à nettoyer : toutes les missions ont leur fichier.',
          'Nothing to clean up: every mission has its file.'
        ]));
        render();
        return;
      }
      if (!confirm(t(['Retirer {n} mission(s) dont le fichier n’existe plus du registre ?',
          'Remove {n} mission(s) whose file no longer exists from the registry?'
        ], {
          n
        }))) return;
      const r = cleanup();
      msg = pill('generated', t(['{r} entrée(s) retirée(s) ; statut ou notes reportés sur {m} mission(s) renumérotée(s).',
        '{r} entry(ies) removed; status or notes carried over to {m} renumbered mission(s).'
      ], {
        r: r.removed,
        m: r.moved
      }));
      render();
    };
    fb.append(b, sb, wb, cb);
    // filtres
    host.querySelector('[data-rg-more]').addEventListener('toggle', e => {
      moreFilters = e.target.open;
    });
    host.querySelectorAll('[data-f]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      filters[el.dataset.f] = el.value;
      if (el.dataset.f === 'type') filters.subtype = '';
      writeJson(FILTERS, filters);
      if (el.tagName === 'SELECT') render();
      else {
        refreshTable();
      }
    }));
    host.querySelector('#rgReset').onclick = () => {
      filters = {
        ...DEFAULT_FILTERS
      };
      writeJson(FILTERS, filters);
      render();
    };
    host.querySelector('#rgDraw').onclick = () => {
      const r = reg.missions.filter(matches);
      if (r.length) {
        select(keyOf(r[Math.floor(Math.random() * r.length)]));
        renderDetail();
        document.getElementById('rgDetail')?.scrollIntoView({
          block: 'nearest'
        });
      }
    };
    host.querySelector('#rgCsv').onclick = exportCsv;
    window.MissionOrder?.mount(host.querySelector('#rgOrderHost'), {
      onOrdered: () => render()
    });
    refreshTable();
    renderDetail();
    window.AppFramework?.refresh?.();
  }
  /** Texte coupé à la largeur de la colonne, complet au survol (title). */
  const cut = (v, cls) => `<span class="rg-cut ${cls}" title="${esc(v || '')}">${esc(v || '')}</span>`;
  /** Colonnes du tableau des missions (SortedTable), libellés dans la langue de la page ; v2 : colonnes minLevel 4
   *  (équipes, RDV, AAR, théâtre) au niveau Expert seulement, retirées à la source (SortedTable ne pose pas d'attribut
   *  par colonne) : sept colonnes aux niveaux inférieurs. */
  const COLUMNS = () => [{
      key: 'id',
      label: t(['Mission', 'Mission', 'Mission', 'Misión']),
      sortValue: m => `${String(m.series).padStart(3, '0')}${String(m.id).padStart(6, '0')}`
    },
    // tableau compact : type et sous-type dans une colonne, équipes et types dans une autre, textes longs coupés (complets au survol)
    {
      key: 'type',
      label: t(['Type', 'Type', 'Typ', 'Tipo']),
      html: (v, m) => `<b>${esc(v || '')}</b>${m.subtype ? ` ${cut(m.subtype, 'rg-cut-s')}` : ''}`,
      sortValue: m => `${m.type || ''} ${m.subtype || ''}`
    }, {
      key: 'title',
      label: t(['Titre', 'Title', 'Titel', 'Título']),
      html: (v, m) => `${m.organisation ? `<span class="rg-pill rg-planned">${esc(t(['organisation', 'organisation', 'Leitung', 'organización']))}</span> ` : ''}${cut(v, 'rg-cut-l')}${m.missingFile ? ' <span class="rg-pill rg-cancelled">fichier absent</span>' : ''}`
    }, {
      key: 'teamCount',
      minLevel: 4,
      label: t(['Équipes', 'Teams', 'Teams', 'Equipos']),
      html: (v, m) => {
        const k = [...(m.aircraftTypes || []), ...(m.teamTypes || [])].filter((x, i, a) => a.indexOf(x) === i).join(', ');
        return `${v || 0}${k ? ` · ${cut(k, 'rg-cut-s')}` : ''}`;
      },
      sortValue: m => m.teamCount || 0
    }, {
      key: 'rdv',
      minLevel: 4,
      label: 'RDV',
      type: 'number'
    }, {
      key: 'aar',
      minLevel: 4,
      label: 'AAR',
      format: v => v ? '✓' : ''
    }, {
      key: 'theatre',
      minLevel: 4,
      label: t(['Théâtre', 'Theatre', 'Schauplatz', 'Teatro'])
    }, {
      key: 'status',
      label: t(['Statut', 'Status', 'Status', 'Estado']),
      html: v => pill(v, t(STATUS[v] || [v]))
    }, {
      key: 'estimate',
      label: t(['Durée est.', 'Est. time', 'Gesch. Dauer', 'Duración est.']),
      format: v => v ? window.MissionEstimate.hm(v.flight) + (v.options?.length ? '+' : '') : '',
      sortValue: m => m.estimate?.flight || 0
    }, {
      key: 'reports',
      label: 'CR',
      title: t(['Nombre de vols (CR) de la mission', 'Number of flights (reports) of the mission']),
      format: v => (v?.length || '') + '',
      sortValue: m => m.reports?.length || 0
    }, {
      key: 'generatedAt',
      label: t(['Généré', 'Generated', 'Erzeugt', 'Generada']),
      format: v => fmtDate(v),
      sortValue: m => m.generatedAt || m.addedAt || ''
    }
  ].filter(c => !c.minLevel || (window.RepositoryNav?.levels?.get?.() || 4) >= c.minLevel);

  /** Tableau des missions filtrées (SortedTable) : hauteur réglable (missionRegistryTableHeight:v1), clic : fiche,
   *  ✕ : retrait du registre (fichiers gardés) ; met à jour le bouton de tirage au sort. */
  function refreshTable() {
    for (const x of reg.missions)
      if (x.organisation == null) x.organisation = /\d[A-Z]?Z$/i.test(String(x.id || '')); // entrées d'avant le champ
    const rows = reg.missions.filter(matches);
    const box = host.querySelector('#rgTable');
    if (!box) return;
    // hauteur du tableau : barre sous le tableau à glisser (double-clic : hauteur par défaut) ; seule une hauteur
    // choisie à la main est mémorisée (sinon défaut selon l'écran, plus bas sur un petit écran)
    if (!box.dataset.sized) {
      box.dataset.sized = '1';
      const h = +readJson(TABLE_H, 0),
        bar = box.nextElementSibling?.classList.contains('rg-resize') ? box.nextElementSibling : null;
      if (h >= 120) box.style.height = `${Math.min(h, innerHeight - 120)}px`;
      if (bar) {
        bar.onpointerdown = e => {
          e.preventDefault();
          const y0 = e.clientY,
            h0 = box.offsetHeight;
          try {
            bar.setPointerCapture(e.pointerId);
          } catch {
            /* pointeur relâché */
          }
          /** Hauteur du tableau qui suit le pointeur (120 px au moins). */
          const move = ev => {
            box.style.height = `${Math.max(120, h0 + ev.clientY - y0)}px`;
          };
          /** Fin du glisser : hauteur choisie mémorisée. */
          const up = () => {
            bar.removeEventListener('pointermove', move);
            bar.removeEventListener('pointerup', up);
            writeJson(TABLE_H, box.offsetHeight);
          };
          bar.addEventListener('pointermove', move);
          bar.addEventListener('pointerup', up);
        };
        bar.ondblclick = () => {
          box.style.height = '';
          try {
            localStorage.removeItem(TABLE_H);
          } catch {
            /* stockage indisponible */
          }
        };
      }
    }
    if (!window.SortedTable) {
      box.textContent = 'mission_table.js';
      return;
    }
    table = window.SortedTable.render(box, {
      rows,
      columns: COLUMNS(),
      defaultSortKey: 'id',
      defaultDir: 1,
      emptyText: reg.missions.length ? t(['Aucune mission ne correspond aux filtres.', 'No mission matches the filters.']) : t([
        'Registre vide : choisir le dossier « Missions » puis « Relire le dossier ».',
        'Empty registry: choose the “Missions” folder then “Re-read folder”.'
      ]),
      onRowClick: m => {
        select(keyOf(m));
        renderDetail();
        revealDetail();
      },
      onDelete: m => {
        reg.missions = reg.missions.filter(x => keyOf(x) !== keyOf(m));
        if (selected === keyOf(m)) select(null);
        persist();
        render();
        return true;
      },
      deleteLabel: '✕',
      deleteMessage: m => t(['Retirer « {m} » du registre ? (les fichiers ne sont pas supprimés)',
        'Remove “{m}” from the registry? (files are not deleted)'
      ], {
        m: `${m.id} ${m.title}`
      })
    });
    const draw = host.querySelector('#rgDraw');
    if (draw) {
      draw.disabled = !rows.length;
      draw.textContent = t(['Tirer au sort ({n})', 'Draw at random ({n})', 'Zufällig wählen ({n})', 'Sortear ({n})'], {
        n: rows.length
      });
    }
  }
  /** Fiche de la mission choisie hors de vue (petit écran, tableau haut) : la page défile jusqu'à elle. */
  function revealDetail() {
    const d = host.querySelector('#rgDetail');
    if (!d?.firstElementChild) return;
    const r = d.getBoundingClientRect();
    if (r.top > innerHeight - 80 || r.top < 0) d.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  /** Fiche de la mission choisie : statut et CR, opération, équipes, fichiers, estimation, commande ; statut, date de
   *  vol et notes modifiables (registre et suivi.yaml écrits) ; boutons d'ouverture (go). */
  function renderDetail() {
    const box = host.querySelector('#rgDetail');
    const m = reg.missions.find(x => keyOf(x) === selected);
    if (!box) return;
    if (!m) {
      box.innerHTML = '';
      return;
    }
    const teams = m.teams.map(tm => `<li><b>${esc(tm.name)}</b> — ${esc(tm.type)}${tm.service ? `, ${esc(tm.service)}` : ''}${tm.role ? ` <span class="rg-small">(${esc(tm.role)})</span>` : ''}</li>`).join('');
    box.innerHTML = `<div class="repo-card rg-detail" data-icon="target" data-subtitle="${esc(`${m.type}${m.subtype ? ' / ' + m.subtype : ''} — ${m.folder || t(['commande', 'order'])}`)}">
      <h3>${esc(m.id)} — ${esc(m.title || t(['(à générer)', '(to generate)']))}</h3>
      <p>${pill(m.status, t(STATUS[m.status] || [m.status]))} ${m.report ? pill('reported', t(['{n} vol(s) — dernier CR {c} du {d}', '{n} flight(s) — last report {c} on {d}'], { n: m.reports.length, c: m.report.missionId, d: fmtDate(m.report.date) })) : ''}</p>
      ${m.reports?.length ? `<details class="rg-reports" ${m.reports.length <= 5 ? 'open' : ''}><summary><b>${esc(t(['Comptes rendus de la mission ({n})', 'Mission reports ({n})', 'Berichte des Einsatzes ({n})', 'Informes de la misión ({n})'], { n: m.reports.length }))}</b></summary><ul>${m.reports.map(r => { const u = crUrl(r); return `<li>${u ? `<a href="${esc(u)}">${esc(r.missionId)}</a>` : esc(r.missionId)} — ${esc(fmtDate(r.date))}</li>`; }).join('')}</ul></details>` : ''}
      ${operationHtml(m)}
      ${m.organisation ? '' : `<p>${esc(m.origin)}${m.destination ? ' → ' + esc(m.destination) : ''} · ${esc(t(['{n} rendez-vous', '{n} rendezvous'], { n: m.rdv }))} · ${m.aar ? 'AAR · ' : ''}${esc(m.theatre || '')} · ${esc(t(['{n} carte(s)', '{n} map(s)'], { n: m.maps || 0 }))}${m.tracks || m.injects ? ` · ${esc(t(['exercice : {p} piste(s), {i} événement(s)', 'exercise: {p} track(s), {i} event(s)'], { p: m.tracks || 0, i: m.injects || 0 }))}` : ''}</p>`}
      ${m.callsigns?.length ? `<p>${esc(t(['Indicatifs', 'Callsigns']))} : ${esc(m.callsigns.join(', '))} · ${esc(m.aircraftTypes.join(', '))}</p>` : ''}
      ${teams ? `<ul class="rg-teams">${teams}</ul>` : ''}
      <details class="rg-files" open><summary><b>${esc(t(['Fichiers de la mission', 'Mission files', 'Einsatzdateien', 'Archivos de la misión']))}</b> ${m.mapsState ? pill(m.mapsState === 'complete' ? 'generated' : m.mapsState === 'partial' ? 'planned' : 'ordered', t(MAPSTATE[m.mapsState])) : ''}</summary><div id="rgFiles" class="rg-small">…</div></details>
      <details class="rg-estimate" open><summary><b>${esc(t(['Durée estimée', 'Estimated time', 'Geschätzte Dauer', 'Duración estimada']))}</b>${m.estimate ? ` — ${esc(window.MissionEstimate.hm(m.estimate.flight))}` : ''}</summary><div id="rgEstimate"></div></details>
      ${m.request ? `<p class="rg-small">${esc(t(['Commande', 'Order']))} : ${esc(Object.entries(m.request).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k} = ${v}`).join(' · '))}</p>` : ''}
      <div class="rg-edit">
        <label>${esc(t(['Statut', 'Status']))}<select id="rgStatus">${Object.keys(STATUS).map(k => `<option value="${k}" ${m.status === k ? 'selected' : ''}>${esc(t(STATUS[k]))}</option>`).join('')}</select></label>
        <label>${esc(t(['Volée le', 'Flown on', 'Geflogen am', 'Volada el']))}<input type="date" id="rgFlown" value="${esc(m.flownAt || '')}"></label>
        <label class="rg-notes">${esc(t(['Notes', 'Notes', 'Notizen', 'Notas']))}<input id="rgNotes" value="${esc(m.notes || '')}"></label>
      </div>
      <p class="row">${m.files?.length ? `<button type="button" class="primary" data-go="editor" data-icon="edit">${esc(t(['Ouvrir dans le générateur', 'Open in generator', 'Im Generator öffnen', 'Abrir en el generador']))}</button><button type="button" class="secondary" data-go="studio" data-icon="map" data-min-level="4">${esc(t(['Ouvrir dans le studio', 'Open in map studio', 'Im Kartenstudio öffnen', 'Abrir en el estudio']))}</button>${/Z$/.test(m.id || '') ? '' : `<button type="button" class="secondary" data-go="assign" data-icon="users" title="${esc(t(['Affecter la mission à un ou plusieurs pilotes : heure, appareils, astreinte (docs/technique/AFFECTATION_MISSIONS.md)', 'Assign the mission to one or more pilots: time, aircraft, standby']))}">${esc(t(['Affecter…', 'Assign…', 'Zuweisen…', 'Asignar…']))}</button>`}<button type="button" class="secondary" data-go="cr" data-icon="clipboard" title="${esc(t(['Nouveau CR de cette mission : n° de vol suivant', 'New report for this mission: next flight number']))}">${esc(m.reports?.length ? t(['Nouveau CR (vol {n})', 'New report (flight {n})', 'Neuer Bericht (Flug {n})', 'Nuevo informe (vuelo {n})'], { n: m.reports.length + 1 }) : t(['Créer le CR', 'Create report', 'Bericht erstellen', 'Crear informe']))}</button>` : ''}${m.status === 'ordered' ? `<button type="button" class="secondary" data-go="prompt" data-icon="send" data-min-level="4">${esc(t(['Recopier le prompt', 'Copy prompt again']))}</button>` : ''}<span class="rg-small">${esc((m.files || []).join(', '))}</span></p>
      <p class="rg-small" id="rgGoMsg"></p></div>`;
    box.querySelector('#rgStatus').onchange = e => {
      m.status = e.target.value;
      m.statusAt = new Date().toISOString();
      if (m.status === 'flown' && !m.flownAt) m.flownAt = new Date().toISOString().slice(0, 10);
      persist();
      writeSuivi(m);
      render();
    };
    box.querySelector('#rgFlown').onchange = e => {
      m.flownAt = e.target.value;
      if (m.flownAt && ['generated', 'planned', 'ordered'].includes(m.status)) m.status = 'flown';
      persist();
      writeSuivi(m);
      render();
    };
    box.querySelector('#rgNotes').onchange = e => {
      m.notes = e.target.value;
      persist();
      writeSuivi(m);
    };
    box.querySelectorAll('[data-go]').forEach(x => x.onclick = () => go(m, x.dataset.go));
    box.querySelectorAll('[data-op-select]').forEach(x => x.onclick = () => {
      select(x.dataset.opSelect);
      refreshTable();
      renderDetail();
    });
    window.MissionEstimate?.panel(box.querySelector('#rgEstimate'), m.estimate, {
      reports: m.reports || []
    });
    renderFiles(m, box.querySelector('#rgFiles'));
    window.AppFramework?.refresh?.();
  }
  const MAPSTATE = {
    complete: ['complète', 'complete', 'vollständig', 'completa'],
    partial: ['partielle : cartes à compléter', 'partial: maps missing', 'teilweise', 'parcial'],
    none: ['partielle : cartes non générées (régénérables)', 'partial: maps not generated (can be regenerated)', 'ohne Karten',
      'sin mapas'
    ]
  };
  // ---- fichiers de la mission : YAML, Markdown (lisible), cartes, versions, textes reçus ; PDF à la demande (générateur)
  /** Vignette d'une image (320 px de large, JPEG) ; l'image elle-même si le navigateur ne sait pas la réduire. */
  async function thumbnail(file) {
    try {
      const bmp = await createImageBitmap(file, {
          resizeWidth: 320,
          resizeQuality: 'medium'
        }),
        c = document.createElement('canvas');
      c.width = bmp.width;
      c.height = bmp.height;
      c.getContext('2d').drawImage(bmp, 0, 0);
      bmp.close?.();
      return c.toDataURL('image/jpeg', .82);
    } catch {
      return URL.createObjectURL(file);
    }
  }

  /** Styles de la visionneuse et des vignettes de cartes (#rgViewerCss), injectés une fois (dès l'affichage des fichiers). */
  function viewerCss() {
    if (document.getElementById('rgViewerCss')) return;
    const css = document.createElement('style');
    css.id = 'rgViewerCss';
    css.textContent =
      '.rg-thumbs{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}.rg-thumbs figure{margin:0;width:160px}.rg-thumbs img{width:160px;height:100px;object-fit:cover;border-radius:6px;cursor:zoom-in;border:1px solid #ccd}.rg-thumbs figcaption{font-size:11px;word-break:break-all}.rg-thumbs .rg-surplus img{opacity:.55;outline:2px dashed #c0392b;outline-offset:-2px}.rg-thumbs figure{position:relative}.rg-thumbs .rg-del{position:absolute;top:4px;right:4px;border:0;background:#c0392b;color:#fff;border-radius:50%;width:22px;height:22px;line-height:20px;padding:0;cursor:pointer;font-size:15px;box-shadow:0 1px 4px #0006;opacity:.85}.rg-thumbs .rg-del:hover{opacity:1}';
    document.head.append(css);
  }

  /** Fichier de la mission à l'écran : visionneuse commune (kit.js) ; une carte s'ouvre en image (taille réelle au clic). */
  const view = (title, html) => {
    const img = /^<img src="([^"]+)"[^>]*>$/.exec(html);
    return img ? window.RepositoryKit.viewImage(img[1], title) : window.RepositoryKit.viewHtml(title, html);
  };
  /** Markdown → HTML (titres, paragraphes, listes, tableaux, gras, italique, code). */
  function mdHtml(md) {
    /** Mise en forme d'une ligne : gras, italique, code (texte échappé). */
    const inline = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\W)\*(.+?)\*(?=\W|$)/g, '$1<i>$2</i>').replace(
      /`(.+?)`/g, '<code>$1</code>');
    const out = [],
      lines = String(md || '').replace(/\r/g, '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/^#{1,6}\s/.test(l)) {
        const n = /^#+/.exec(l)[0].length;
        out.push(`<h${n + 1}>${inline(l.replace(/^#+\s*/, ''))}</h${n + 1}>`);
        continue;
      }
      if (/^\|/.test(l)) {
        const rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
        i--;
        /** Cellules d'une ligne de tableau Markdown. */
        const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        out.push(`<table>${rows.filter(r => !/^\|[\s:|-]+\|$/.test(r)).map((r, k) => `<tr>${cells(r).map(c => k ? `<td>${inline(c)}</td>` : `<th>${inline(c)}</th>`).join('')}</tr>`).join('')}</table>`);
        continue;
      }
      if (/^\s*[-*]\s/.test(l)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s/, ''));
        i--;
        out.push(`<ul>${items.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`);
        continue;
      }
      if (/^```/.test(l)) {
        const code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
        out.push(`<pre>${esc(code.join('\n'))}</pre>`);
        continue;
      }
      if (l.trim()) out.push(`<p>${inline(l)}</p>`);
    }
    return out.join('');
  }
  /** Bloc « Fichiers de la mission » : YAML, Markdown, cartes en vignettes (suppression, doublons, surnuméraires),
   *  place occupée, versions précédentes (différences) et textes reçus ; ouverture dans le générateur ou le studio. */
  async function renderFiles(m, host) {
    if (!host) return;
    const C = window.MissionRegistryCore,
      mh = m.folder ? await C.missionHandle(m.id, m.type, {
        folder: m.folder
      }) : null;
    if (!mh) {
      host.textContent = m.folder ? t(['Dossier des missions non autorisé : choisir le dossier ci-dessus.',
        'Missions folder not authorised: choose it above.'
      ]) : t(['Mission non rangée dans le dossier des missions (commande, ou reçue sans autorisation du dossier).',
        'Mission not stored in the missions folder.'
      ]);
      return;
    }
    /** Fichiers d'un dossier, ou de son sous-dossier sub (absent : liste vide), triés par nom décroissant. */
    const list = async (h, sub) => {
      const out = [];
      try {
        const d = sub ? await h.getDirectoryHandle(sub) : h;
        for await (const [n, x] of d.entries()) if (x.kind === 'file') out.push({
          name: n,
          h: x
        });
      } catch {
        /* absent */
      }
      return out.sort((a, b) => b.name.localeCompare(a.name));
    };
    const root = await list(mh.h),
      maps = [...await list(mh.h, C.SUB.maps), ...root.filter(f => /\.(png|jpe?g|webp)$/i.test(f.name))],
      vers = await list(mh.h, C.SUB.versions),
      recu = await list(mh.h, C.SUB.received);
    const yaml = root.find(f => /^mission.*\.ya?ml$/i.test(f.name)),
      md = root.find(f => /\.md$/i.test(f.name));
    /** Bouton d'un fichier de la mission (data-f : clé traitée par le gestionnaire de clics plus bas). */
    // v2 : studio cartographique au niveau Expert (minLevel 4), comme sa page
    const btn = (k, label, icon, minLevel) => `<button type="button" class="secondary" data-f="${k}" data-icon="${icon}"${minLevel ? ` data-min-level="${minLevel}"` : ''}>${esc(label)}</button>`;
    host.innerHTML = `<p class="row">${yaml ? btn('yaml', `YAML — ${yaml.name}`, 'file-text') : ''}${md ? btn('md', t(['Markdown (lisible)', 'Markdown (readable)']), 'book') : yaml ? btn('mdgen', t(['Markdown (généré depuis le YAML)', 'Markdown (generated from the YAML)', 'Markdown (aus dem YAML erzeugt)', 'Markdown (generado desde el YAML)']), 'book') : ''}${btn('pdf', t(['PDF (générateur)', 'PDF (generator)']), 'file')}${btn('edit', t(['Modifier (générateur)', 'Edit (generator)']), 'edit')}${btn('studio', t(['Cartes (studio)', 'Maps (studio)']), 'map', 4)}</p>
      <p>${esc(t(['Dossier', 'Folder']))} : <code>data/missions/${esc(mh.folder)}/</code>${m.receivedAt ? ` · ${esc(t(['reçue le', 'received']))} ${esc(fmtDate(m.receivedAt))}` : ''}${m.modifiedAt ? ` · ${esc(t(['modifiée le', 'modified']))} ${esc(fmtDate(m.modifiedAt))}` : ''}</p>
      <div class="rg-thumbs">${maps.length ? '' : `<span>${esc(m.mapsWanted ? t(['Aucune carte générée : ouvrir le studio (les définitions de cartes du YAML suffisent à les régénérer).', 'No map generated yet: open the studio.']) : t(['Pas de carte prévue.', 'No map planned.']))}</span>`}</div>
      ${vers.length ? `<p><b>${esc(t(['Versions précédentes', 'Previous versions']))}</b> : ${vers.map((f, i) => `<a href="#" data-v="${i}">${esc(f.name.replace(/^mission.*?_/, '').replace(/\.ya?ml$/, ''))}</a>`).join(' · ')}</p>` : ''}
      ${recu.length ? `<p><b>${esc(t(['Textes reçus', 'Received texts']))}</b> : ${recu.map((f, i) => `<a href="#" data-r="${i}">${esc(f.name)}</a>`).join(' · ')}</p>` : ''}`;
    const thumbs = host.querySelector('.rg-thumbs');
    viewerCss();
    // place occupée et cartes surnuméraires (générées mais absentes de la liste des cartes du YAML)
    let yObj = null;
    try {
      yObj = yaml ? window.jsyaml.load((await (await yaml.h.getFile()).text()).replace(/^#.*\n/, '')) : null;
    } catch {
      yObj = null;
    }
    const usage = await C.missionUsage(mh, yObj),
      surplus = new Set(usage.surplus.map(f => f.name.toLowerCase())),
      B = C.fmtBytes;
    // chaque carte supprimable (croix) ; emplacement affiché (cartes/ ou racine) ; doublon : même nom à la racine et dans cartes/
    const mapFiles = usage.files.filter(f => f.kind === 'maps'),
      inMaps = new Set(mapFiles.filter(f => f.sub).map(f => f.name.toLowerCase()));
    const dupRoot = mapFiles.filter(f => !f.sub && inMaps.has(f.name.toLowerCase()));
    /** Pastille ajoutée à la légende d'une vignette (racine, surnuméraire, doublon). */
    const pill2 = (cls, txt) => ` <span class="rg-pill ${cls}">${esc(txt)}</span>`;
    for (const f of mapFiles) {
      const file = await f.dir.getFileHandle(f.name).then(h => h.getFile()),
        fig = document.createElement('figure'),
        extra = f.sub && surplus.has(f.name.toLowerCase()) || !f.sub && !inMaps.has(f.name.toLowerCase()) && surplus.has(f.name
          .toLowerCase()),
        dup = !f.sub && inMaps.has(f.name.toLowerCase());
      fig.className = extra || dup ? 'rg-surplus' : '';
      fig.innerHTML = `<img alt="" loading="lazy"><figcaption>${esc(f.sub ? `${f.sub}/${f.name}` : f.name)}${f.sub ? '' : pill2('rg-planned', t(['racine', 'root', 'Wurzel', 'raíz']))}${dup ? pill2('rg-cancelled', t(['doublon', 'duplicate', 'Duplikat', 'duplicado'])) : extra ? pill2('rg-cancelled', t(['surnuméraire', 'surplus', 'überzählig', 'sobrante'])) : ''} · ${esc(B(f.size))} <button type="button" class="rg-del" title="${esc(t(['Supprimer cette carte du dossier de la mission', 'Delete this map from the mission folder', 'Diese Karte aus dem Missionsordner löschen', 'Borrar este mapa de la carpeta de la misión']))}">×</button></figcaption>`;
      fig.querySelector('img').src = await thumbnail(file);
      fig.querySelector('img').onclick = () => {
        const u = URL.createObjectURL(file);
        view(f.sub ? `${f.sub}/${f.name}` : f.name, `<img src="${u}" alt="">`);
      };
      fig.querySelector('.rg-del').addEventListener('click', async () => {
        const label = f.sub ? `${f.sub}/${f.name}` : f.name,
          why = dup ? t(['doublon : la même carte reste dans cartes/', 'duplicate: the same map stays in cartes/']) : extra ? t([
            'absente de la liste des cartes de la mission', 'not in the mission’s map list'
          ]) : t(['carte de la mission : le studio pourra la régénérer', 'mission map: the studio can regenerate it']);
        if (!confirm(t(['Supprimer « {f} » ({s}) du dossier de la mission ?\n{w}',
            'Delete “{f}” ({s}) from the mission folder?\n{w}'
          ], {
            f: label,
            s: B(f.size),
            w: why
          }))) return;
        const n = await C.removeFiles([f]);
        window.AppFramework?.notify?.(n ? t(['{f} supprimée.', '{f} deleted.'], {
          f: label
        }) : t(['{f} : suppression refusée.', '{f}: deletion refused.'], {
          f: label
        }), n ? 'ok' : 'err');
        renderFiles(m, host);
      });
      thumbs.append(fig);
    }
    if (dupRoot.length) {
      thumbs.insertAdjacentHTML('afterend', `<p class="rg-small">${esc(t(['{n} carte(s) en double à la racine du dossier (la même carte est dans cartes/).', '{n} duplicate map(s) at the folder root (same map in cartes/).'], { n: dupRoot.length }))} <button type="button" class="secondary" id="rgDelDup" data-icon="trash">${esc(t(['Supprimer les doublons à la racine ({n}, {s})', 'Delete root duplicates ({n}, {s})'], { n: dupRoot.length, s: B(dupRoot.reduce((a, f) => a + f.size, 0)) }))}</button></p>`);
      host.querySelector('#rgDelDup').addEventListener('click', async () => {
        if (!confirm(t(['Supprimer {n} carte(s) en double à la racine du dossier ? Les exemplaires de cartes/ sont gardés.',
            'Delete {n} duplicate map(s) at the folder root? The copies in cartes/ are kept.'
          ], {
            n: dupRoot.length
          }))) return;
        const n = await C.removeFiles(dupRoot);
        window.AppFramework?.notify?.(t(['{n} doublon(s) supprimé(s).', '{n} duplicate(s) deleted.'], {
          n
        }), 'ok');
        renderFiles(m, host);
      });
    }
    const sz = usage.sizes;
    thumbs.insertAdjacentHTML('afterend', `<p class="rg-small">${esc(t(['Place : {t} — données {d}, cartes {c}, versions {v}, textes reçus {r}.', 'Space: {t} — data {d}, maps {c}, versions {v}, received texts {r}.'], { t: B(sz.total), d: B(sz.data), c: B(sz.maps), v: B(sz.versions), r: B(sz.recu) }))}${sz.pdf ? esc(t([' PDF : {p}.', ' PDF: {p}.'], { p: B(sz.pdf) })) : ''}${usage.surplus.length ? ` <button type="button" class="secondary" id="rgDelSurplus" data-icon="trash">${esc(t(['Supprimer les cartes surnuméraires ({n}, {s})', 'Delete surplus maps ({n}, {s})'], { n: usage.surplus.length, s: B(usage.surplusSize) }))}</button>` : ''}</p>`);
    host.querySelector('#rgDelSurplus')?.addEventListener('click', async () => {
      if (!confirm(t([
          'Supprimer {n} carte(s) surnuméraire(s) ({s}) du dossier de la mission ? Elles ne figurent plus dans sa liste de cartes.',
          'Delete {n} surplus map(s) ({s}) from the mission folder?'
        ], {
          n: usage.surplus.length,
          s: B(usage.surplusSize)
        }))) return;
      const n = await C.removeFiles(usage.surplus);
      window.AppFramework?.notify?.(t(['{n} carte(s) surnuméraire(s) supprimée(s).', '{n} surplus map(s) deleted.'], {
        n
      }), 'ok');
      renderFiles(m, host);
    });
    /** Texte d'un fichier listé (entrée de list). */
    const text = async f => (await f.h.getFile()).text();
    /** Markdown produit à la demande depuis le YAML (SiaMission.markdownOf, même code que l'export du générateur) :
     *  affiché, pas écrit — le YAML reste la seule source. */
    async function showGeneratedMd() {
      const y = window.jsyaml.load((await text(yaml)).replace(/^#.*\n/, '')) || {},
        docs = [];
      for (const x of operationMembers(m).filter(x => keyOf(x) !== keyOf(m))) { // exercice : organisation de l'opération
        try {
          const h = await C.missionHandle(x.id, x.type, {
              folder: x.folder
            }),
            f = h && await readText(h.h, `mission${normMissionId(x.id)}.yaml`);
          if (f) docs.push(window.jsyaml.load(f.replace(/^#.*\n/, '')));
        } catch {
          /* illisible */
        }
      }
      view(`summary${normMissionId(m.id)}.md — ${t(['généré depuis le YAML', 'generated from the YAML', 'aus dem YAML erzeugt', 'generado desde el YAML'])}`, mdHtml(window.SiaMission.markdownOf(y, {
        docs
      })));
    }
    host.querySelectorAll('[data-f]').forEach(b => b.onclick = async () => {
      const k = b.dataset.f;
      if (k === 'yaml') return view(yaml.name, `<pre>${esc(await text(yaml))}</pre>`);
      if (k === 'md') return view(md.name, mdHtml(await text(md)));
      if (k === 'mdgen') return showGeneratedMd();
      if (k === 'pdf') {
        try {
          sessionStorage.setItem('siaAutoPdf:v1', m.id);
        } catch {
          /* */
        }
        return go(m, 'editor');
      }
      return go(m, k === 'studio' ? 'studio' : 'editor');
    });
    host.querySelectorAll('[data-v]').forEach(a => a.onclick = async e => {
      e.preventDefault();
      const f = vers[+a.dataset.v],
        old = window.jsyaml.load((await text(f)).replace(/^#.*\n/, '')) || {},
        cur = yaml ? window.jsyaml.load((await text(yaml)).replace(/^#.*\n/, '')) || {} : {};
      const d = C.diffOf(old, cur);
      view(f.name, `<p><b>${esc(t(['Différences avec la version actuelle', 'Differences with the current version']))}</b> : ${esc(d.join(', ') || t(['aucune', 'none']))}</p><pre>${esc(await text(f))}</pre>`);
    });
    host.querySelectorAll('[data-r]').forEach(a => a.onclick = async e => {
      e.preventDefault();
      const f = recu[+a.dataset.r];
      view(f.name, `<pre>${esc(await text(f))}</pre>`);
    });
    window.AppFramework?.refresh?.();
  }
  // ---- opération : missions des équipages (A, B, C…) et mission d'organisation de l'exercice (Z)
  /** Missions du registre de la même opération que m (triées, organisation en dernier). */
  const operationMembers = m => {
    const op = m.operation?.id;
    return op ? reg.missions.filter(x => x.operation?.id === op && x.files?.length).sort((a, b) => (a.organisation - b.organisation) ||
      String(a.id).localeCompare(String(b.id), 'fr', {
        numeric: true
      })) : [];
  };
  /** Bloc « Opération » de la fiche : membres (cliquables), résumé de l'exercice, ouverture de toute l'opération. */
  function operationHtml(m) {
    if (!m.operation?.id) return '';
    const members = operationMembers(m),
      z = members.find(x => x.organisation),
      ex = z?.exercise;
    const planned = m.operation.missions || 0,
      crews = members.filter(x => !x.organisation).length;
    const chips = members.map(x => `<button type="button" class="rg-chip${keyOf(x) === keyOf(m) ? ' rg-chip-on' : ''}" data-op-select="${esc(keyOf(x))}" title="${esc(x.title)}"><b>${esc(x.id)}</b> ${esc(x.organisation ? t(['organisation', 'organisation', 'Leitung', 'organización']) : x.callsigns?.[0] || x.aircraftTypes?.[0] || '')}</button>`).join('');
    return `<div class="rg-op"><p><b>${esc(t(['Opération', 'Operation', 'Operation', 'Operación']))} ${esc(m.operation.name || m.operation.id)}</b> <span class="rg-small">(${esc(m.operation.id)}) — ${esc(t(['{c} mission(s) d’équipage sur {p} prévue(s)', '{c} crew mission(s) of {p} planned', '{c} Besatzungseinsätze von {p} geplant', '{c} misión(es) de tripulación de {p} previstas'], { c: crews, p: planned || crews }))}${ex ? ` · ${esc(t(['exercice : {n} participant(s), {k} chiffon(s) dont {j} joué(s), {e} événement(s) dont {s} pli(s) scellé(s)', 'exercise: {n} participant(s), {k} track(s) of which {j} played, {e} event(s) of which {s} sealed envelope(s)'], { n: ex?.participants || 0, k: ex?.tracks || 0, j: ex?.played || 0, e: ex?.events || 0, s: ex?.plis || 0 }))}` : ''}</span></p>
      <div class="rg-chips">${chips}</div>
      ${members.length > 1 ? `<p class="rg-small">${esc(t(['« Ouvrir » charge toute l’opération (missions des équipages et organisation), sur cette mission.', '“Open” loads the whole operation (crew missions and organisation), on this mission.', '„Öffnen“ lädt die ganze Operation (Besatzungsmissionen und Leitung), auf dieser Mission.', '«Abrir» carga toda la operación (misiones de tripulación y organización), en esta misión.']))}</p>` : ''}</div>`;
  }
  /** Lit les fichiers d'une mission du registre dans son dossier. */
  async function missionFiles(dir, m) {
    let h = dir;
    for (const part of (m.folder || '').split('/').filter(Boolean)) h = await h.getDirectoryHandle(part);
    const files = [];
    const id = normMissionId(m.id),
      names = [...new Set([...(m.files || []), `mission${id}.yaml`, `summary${id}.md`])]; // noms du registre, sinon noms d'usage
    for (const name of names) {
      if (files.some(f => /\.ya?ml$/i.test(f.name)) && /\.ya?ml$/i.test(name) && !(m.files || []).includes(name)) continue;
      try {
        const f = await (await h.getFileHandle(name)).getFile();
        files.push({
          name,
          text: await f.text()
        });
      } catch {
        /* absent */
      }
    }
    return files;
  }
  /** Ouvre toute l'opération de m (missions des équipages et organisation) comme un lot, sur la mission m. */
  async function goOperation(m, where) {
    const out = document.getElementById('rgGoMsg');
    try {
      const dir = await missionsDir(true);
      if (!dir) throw new Error(t(NO_DIR));
      const files = [];
      for (const x of operationMembers(m)) files.push(...await missionFiles(dir, x));
      if (!files.length) throw new Error(t([
        'fichiers de l’opération introuvables dans son dossier : « Relire le dossier », puis réessayer',
        'operation files not found in its folder: “Re-read folder”, then try again',
        'Dateien der Operation nicht in ihrem Ordner gefunden: „Ordner neu lesen“ und es erneut versuchen',
        'archivos de la operación no encontrados en su carpeta: «Releer la carpeta» y volver a intentarlo'
      ]));
      try {
        sessionStorage.setItem('siaFromRegistry:v1', JSON.stringify({
          id: m.id,
          title: m.title,
          folder: m.folder,
          type: m.type
        }));
      } catch {
        /* stockage indisponible */
      }
      window.SiaMission.importTexts(files, 'registry');
      const b = window.SiaMission.loadBatch(),
        i = b ? b.docs.findIndex(d => String(d.yaml?.mission?.id || '').toUpperCase() === String(m.id).toUpperCase()) : -1;
      if (i >= 0) window.SiaMission.go(i, 'registry');
      location.href = new URL(where === 'studio' ? 'apps/cpco/map_parser.html' : 'apps/cpco/mission_editor.html', window.RepositoryNav
        .root).href;
    } catch (e) {
      const text = explain(e, t(['Mission {m} non ouverte', 'Mission {m} not opened', 'Mission {m} nicht geöffnet',
        'Misión {m} no abierta'
      ], {
        m: m.id
      }));
      if (window.AppFramework?.notify) window.AppFramework.notify(text, 'err');
      else if (out) out.textContent = text;
    }
  }
  /** Ouvre la mission : générateur / studio (mission partagée), CR (passerelle ?from=sia), prompt de commande. */
  async function go(m, where) {
    const out = document.getElementById('rgGoMsg');
    try {
      if (where === 'prompt') {
        await sendPrompt(m.request);
        return;
      }
      if ((where === 'editor' || where === 'studio') && operationMembers(m).length > 1) return goOperation(m,
        where); // mission d'opération : tout le lot
      select(keyOf(m));
      // lien « ← Registre » du générateur et du studio (même onglet) : SiaMission.mountNav
      try {
        sessionStorage.setItem('siaFromRegistry:v1', JSON.stringify({
          id: m.id,
          title: m.title,
          folder: m.folder,
          type: m.type
        }));
      } catch {
        /* stockage indisponible */
      }
      const dir = await missionsDir(true);
      if (!dir) throw new Error(t(NO_DIR));
      const files = await missionFiles(dir, m);
      if (!files.length) throw new Error(t([
        'fichiers de la mission introuvables dans son dossier : « Relire le dossier », puis réessayer',
        'mission files not found in its folder: “Re-read folder”, then try again',
        'Dateien der Mission nicht in ihrem Ordner gefunden: „Ordner neu lesen“ und es erneut versuchen',
        'archivos de la misión no encontrados en su carpeta: «Releer la carpeta» y volver a intentarlo'
      ]));
      if (where === 'assign') {
        // affectation aux pilotes (shared/assign_dialog.js) : yaml de la mission et cartes rangées (cartes/)
        const maps = [];
        try {
          let h = dir;
          for (const part of (m.folder || '').split('/').filter(Boolean)) h = await h.getDirectoryHandle(part);
          for await (const [n, x] of(await h.getDirectoryHandle(SUB.maps)).entries())
          if (x.kind === 'file' && /\.(png|jpe?g|webp)$/i.test(n)) maps.push(n);
        } catch {
          /* pas de cartes rangées */
        }
        window.AssignDialog?.open(m, window.SiaMission.fromTexts(files).yaml || {}, {
          maps: maps.sort()
        });
        return;
      }
      if (where === 'cr') {
        const doc = window.SiaMission.fromTexts(files);
        const family = window.MissionVocab.familyForType(doc.yaml?.mission?.type),
          target = window.MissionVocab.families.find(f => f.id === family);
        localStorage.setItem('siaMissionToCr:v1', JSON.stringify(doc.yaml));
        if (['generated', 'planned', 'flown'].includes(m.status)) {
          m.status = 'flown';
          m.flownAt = m.flownAt || new Date().toISOString().slice(0, 10);
          persist();
          await writeSuivi(m); // avant de quitter la page
        }
        location.href = new URL(`apps/cr/${target.cr}?from=sia`, window.RepositoryNav.root).href;
        return;
      }
      window.SiaMission.importTexts(files, 'registry');
      if (m.status === 'generated') {
        m.status = 'planned';
        m.statusAt = new Date().toISOString();
        persist();
        await writeSuivi(m); // avant de quitter la page
      }
      location.href = new URL(where === 'studio' ? 'apps/cpco/map_parser.html' : 'apps/cpco/mission_editor.html', window.RepositoryNav
        .root).href;
    } catch (e) {
      const text = explain(e, t(['Mission {m} non ouverte', 'Mission {m} not opened', 'Mission {m} nicht geöffnet',
        'Misión {m} no abierta'
      ], {
        m: m.id
      }));
      if (window.AppFramework?.notify) window.AppFramework.notify(text, 'err');
      else if (out) out.textContent = text;
    }
  }

  // ---- commande d'une mission : bloc commun MissionOrder (shared/mission_order.js), aussi dans le générateur de brief
  /** Inscrit une commande (statut « commandée ») ; appelé par MissionOrder. */
  function addOrder(entry) {
    reg.missions.push(entry);
    persist();
  }
  /** Prompt d'une commande existante renvoyé à ChatGPT (fiche de la mission). */
  const sendPrompt = r => window.MissionOrder?.sendPrompt(r, document.getElementById('rgGoMsg'));

  /** Exporte les missions filtrées en CSV (séparateur « ; », BOM UTF-8) : registre_missions.csv. */
  function exportCsv() {
    const cols = ['id', 'series', 'type', 'subtype', 'title', 'teamCount', 'teamTypes', 'aircraftTypes', 'callsigns', 'rdv', 'aar',
      'theatre', 'origin', 'destination', 'status', 'flownAt', 'folder', 'notes'
    ];
    /** Cellule CSV : listes jointes par « + », entre guillemets si nécessaire. */
    const cell = v => {
      const s = Array.isArray(v) ? v.join(' + ') : String(v ?? '');
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const text = '﻿' + [cols.join(';'), ...reg.missions.filter(matches).map(m => cols.map(c => cell(m[c])).join(';'))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], {
      type: 'text/csv;charset=utf-8'
    }));
    a.download = 'registre_missions.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  /** Relit le dossier des missions (scan, autorisation demandée) puis redessine la page ; false en cas d'échec. */
  async function doScan() {
    msg = t(['Lecture du dossier…', 'Reading folder…']);
    const box = host.querySelector('#rgMsg');
    if (box) box.textContent = msg;
    try {
      const r = await scan(true);
      msg = pill('generated', t(['{n} mission(s) lue(s)', '{n} mission(s) read'], {
        n: r.found
      })) + (r.problems.length ? `<br><span class="rg-small">${esc(r.problems.join(' · '))}</span>` : '');
    } catch (e) {
      // arrêt demandé : rien n'a changé ; autre échec : ce qui a échoué et quoi faire
      msg = pill('cancelled', e?.name === 'AbortError' ? t(['Lecture arrêtée : registre inchangé.',
        'Reading stopped: registry unchanged.',
        'Lesen abgebrochen: Register unverändert.', 'Lectura detenida: registro sin cambios.'
      ]) : explain(e, t(['Lecture du dossier des missions', 'Reading the missions folder', 'Lesen des Missionsordners',
        'Lectura de la carpeta de misiones'
      ])));
      render();
      return false;
    }
    render();
    return true;
  }

  window.addEventListener('repository-language-change', render);
  // routes de transit (voies aériennes, RTBA) : base SIA du navigateur, puis fiche recalculée (relecture du dossier : estimations routées)
  window.MissionRouting?.loadFromBase().then(ok => {
    if (ok) renderDetail();
  });
  // sauvegarde restaurée (ancienne copie du registre comprise : reprise si plus récente), registre enregistré par un
  // autre onglet : relu
  window.addEventListener('local-store-restored', async () => {
    await IDX?.ready; // reprise de la copie restaurée : MissionIndex (mission-index-change)
    if (!IDX) reg = loadReg();
    render();
  });
  window.addEventListener('mission-index-change', () => {
    reg = loadReg();
    render();
  });
  // CR enregistré dans un autre onglet (MissionLedger, message « defa-data ») : CR des missions relus
  if (typeof BroadcastChannel === 'function') new BroadcastChannel('defa-data').addEventListener('message', e => {
    if (e.data?.path === 'data/cr/missions.yaml') loadReports().then(() => {
      linkReports();
      render();
    });
  });
  if (!IDX) window.addEventListener('storage', e => {
    if (e.key === KEY) {
      reg = loadReg();
      render();
    }
  });
  window.MissionRegistry = {
    scan,
    writeSuivi,
    cleanup,
    addOrder,
    addFiles,
    entryOf,
    families,
    theatreOf,
    /** Registre en mémoire. */
    get: () => reg,
    sendPrompt,
    /** Mission retenue par les filtres courants. */
    matches: m => matches(m),
    /** Remplace les filtres (sans les mémoriser) et redessine la page. */
    setFilters: f => {
      filters = {
        ...DEFAULT_FILTERS,
        ...f
      };
      render();
    }
  };
  (async () => {
    await waitFor('jsyaml', 3000);
    await IDX?.ready; // registre lu dans l'index (ouverture de la page)
    reg = loadReg();
    await loadReports();
    linkReports();
    // ?mission=M-016 (retour du générateur, du studio ou d'un CR) : mission choisie et affichée
    const want = normMissionId(new URLSearchParams(location.search).get('mission') || '');
    const hit = want && reg.missions.find(m => m.id === want);
    if (hit) select(keyOf(hit));
    render();
    if (selected) setTimeout(() => document.getElementById('rgDetail')?.scrollIntoView({
      block: 'start'
    }), 300);
    // relecture silencieuse si le dossier est déjà autorisé
    if (await missionsDir(false)) doScan();
  })();
})();
