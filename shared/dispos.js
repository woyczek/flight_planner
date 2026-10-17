(() => {
  'use strict';
  // Disponibilités en catégories configurables (docs/technique/DISPOS_ET_REORGANISATION.md § 1), chargé sur chaque page par
  // repository_nav.js.
  //   · configuration partagée data/config/disponibilites.json (synchronisée, datée, va) : groupes (affichés dans l'ODV :
  //     Disponible, Exercice SOG, Occupé, Indisponible), catégories (libellés [fr, en, de, es], couleur, thèmes ouverts,
  //     codes ODV, type : dispo | atc | occupe | indispo, retirée), domaines et leurs thèmes (familles de mission),
  //     alias de familles ; sans fichier : DEFAULT ci-dessous ;
  //   · thèmes ouverts d'une catégorie : « all » (tous), « domain:<d> » (ceux du domaine), « prefs:<d> » (ceux du
  //     domaine selon les préférences du pilote : liste blanche ou noire), « none », ou une liste explicite ;
  //   · déclaration : un fichier par pilote et par semaine ISO, data/disponibilites/<TRI>/<AAAA>-W<nn>.json, écrit au
  //     schema 3 du module de saisie (shared/dispos_timeline.js) : { schema: 3, va, pilot, week, tz: "UTC", ranges,
  //     background, updated_at, by, appareils, simulateurs } — ranges : la déclaration, à la minute, sans chevauchement ;
  //     background : le fond posé (commodité d'édition) ; lu aussi au schema 2 d'avant ({ schema: 2, pilote, semaine,
  //     dispos: { "AAAA-MM-JJ": [{ debut, fin, categorie }] } }, plus écrit) : pas de migration en masse, une semaine
  //     passe au schema 3 à sa première écriture ; les deux sont lus par shared/dispos_formats.js vers le même modèle,
  //     et readPilot rend pour chaque semaine le document normalisé : ranges, background, et la vue par jour dispos
  //     (plages à la minute, sans chevauchement, null = journée entière) que lisent l'ODV et les affectations ; index
  //     data/disponibilites/_index.json (pilotes → semaines) refait par le lanceur et à chaque écriture ;
  //   · le module de saisie et ses formats sont chargés ici (avant toute lecture), avec la configuration des catégories
  //     traduite pour lui (timelineConfig).
  // API (window.SuiteDispos) : DEFAULT, config(), load(fresh), save(config), groups(), categories({ all }),
  //   category(id), domains(), themes(), label(ligne), themeLabel(id), codeCategory(code ODV), themeOfFamily(famille),
  //   openThemes(catégorie, préférences), opens(thèmes, famille), prefsFromCodes(codes), weekId(ms), weekMonday(id),
  //   addWeek(id, n), readPilot(TRI, { weeks, fresh }), saveWeek(TRI, semaine, données, extra) (données : schema 3, ou
  //   plages par jour du schema 2), entriesAt(semaines, ms), cutsBetween(semaines, début, fin) (instants où la
  //   déclaration change), setDay(document, date, plages) → schema 3, normalize(document), timelineConfig(), ready()
  //   (module et formats chargés), affectable(catégorie) (éléments d'un ordre de vol ouverts par la catégorie : vol,
  //   controle, divers).
  if (window.SuiteDispos) return;
  const K = window.RepositoryKit;
  // module de saisie et formats (schema 2 ↔ 3), chargés à côté de ce script, dans l'ordre ; ready() : les deux prêts
  const here = document.currentScript?.src || '';
  const loadScript = name => window[name === 'dispos_timeline.js' ? 'DisposTimeline' : 'DisposFormats'] ? Promise.resolve() : new Promise(
    res => {
      const el = document.createElement('script');
      el.src = new URL(`${name}?v=0`, here || location.href).href;
      el.onload = el.onerror = () => res();
      document.head.append(el);
    });
  const modules = here ? loadScript('dispos_timeline.js').then(() => loadScript('dispos_formats.js')) : Promise.resolve();
  const ready = () => modules;
  const A = () => window.MissionAssignments;
  const CONFIG = 'config/disponibilites.json',
    CACHE = 'disposConfigCache:v1',
    INDEX = 'disponibilites/_index.json';
  const L4 = (fr, en, de, es) => [fr, en, de, es];
  const DEFAULT = {
    schema: 1,
    va: window.RepositoryNav?.va?.().short || 'SOG', // sigle de la compagnie réglée
    groupes: [{
      id: 'dispo',
      label: L4('Disponible', 'Available', 'Verfügbar', 'Disponible'),
      court: 'D',
      couleur: '#00B050'
    }, {
      id: 'exercice',
      label: L4('Exercice {SOG}', '{SOG} exercise', '{SOG}-Übung', 'Ejercicio {SOG}'),
      court: 'E',
      couleur: '#E03C31'
    }, {
      id: 'occupe',
      label: L4('Occupé', 'Busy', 'Beschäftigt', 'Ocupado'),
      court: 'O',
      couleur: '#FFD966'
    }, {
      id: 'indispo',
      label: L4('Indisponible', 'Unavailable', 'Nicht verfügbar', 'No disponible'),
      court: 'I',
      couleur: '#BFBFBF'
    }],
    domaines: [{
      id: 'secu',
      label: L4('Sécurité civile', 'Civil security', 'Zivilschutz', 'Seguridad civil'),
      themes: ['HEMS', 'SAR', 'FIRE', 'LE', 'HADR']
    }, {
      id: 'defense',
      label: L4('Défense', 'Defence', 'Verteidigung', 'Defensa'),
      themes: ['COMBAT', 'ISR', 'COMMAND', 'AAR', 'AIRLIFT', 'AIRBORNE', 'MARITIME', 'SPECIAL']
    }],
    themes: {
      HEMS: L4('Secours héliporté, medevac', 'Helicopter rescue, medevac', 'Hubschrauberrettung, Medevac',
        'Rescate en helicóptero, medevac'),
      SAR: L4('Recherche et sauvetage', 'Search and rescue', 'Suche und Rettung', 'Búsqueda y rescate'),
      FIRE: L4('Feux', 'Firefighting', 'Brandbekämpfung', 'Incendios'),
      LE: L4('Police, douane', 'Law enforcement, customs', 'Polizei, Zoll', 'Policía, aduanas'),
      HADR: L4('Aide humanitaire', 'Humanitarian aid', 'Humanitäre Hilfe', 'Ayuda humanitaria'),
      COMBAT: L4('Chasse', 'Fighter', 'Jagd', 'Caza'),
      ISR: L4('Renseignement, surveillance', 'Intelligence, surveillance', 'Aufklärung, Überwachung', 'Inteligencia, vigilancia'),
      COMMAND: L4('Commandement', 'Command', 'Führung', 'Mando'),
      AAR: L4('Ravitaillement en vol', 'Air-to-air refuelling', 'Luftbetankung', 'Reabastecimiento en vuelo'),
      AIRLIFT: L4('Transport', 'Airlift', 'Lufttransport', 'Transporte aéreo'),
      AIRBORNE: L4('Largage', 'Airdrop', 'Absetzen', 'Lanzamiento'),
      MARITIME: L4('Marine', 'Maritime', 'Marine', 'Marítimo'),
      SPECIAL: L4('Spécial', 'Special', 'Spezial', 'Especial'),
      EXERCICE: L4('Exercice {SOG}', '{SOG} exercise', '{SOG}-Übung', 'Ejercicio {SOG}'),
      CONTROLE: L4('Contrôleur d’exercice', 'Exercise controller', 'Übungslotse', 'Controlador de ejercicio')
    },
    // familles de mission sans thème propre → thème (TRAINING : ouvert à toute catégorie de type « dispo »)
    alias: {
      MEDEVAC: 'HEMS',
      SOF: 'SPECIAL',
      FLIGHTINSPECTION: 'SPECIAL',
      SURVEY: 'SPECIAL',
      TRAINING: '*'
    },
    categories: [{
      id: 'tout',
      groupe: 'dispo',
      type: 'dispo',
      label: L4('Disponible pour tout', 'Available for everything', 'Für alles verfügbar', 'Disponible para todo'),
      couleur: '#00B050',
      ouverts: 'all',
      odv: ['O']
    }, {
      id: 'secu',
      groupe: 'dispo',
      type: 'dispo',
      label: L4('Disponible sécurité civile', 'Available civil security', 'Verfügbar Zivilschutz', 'Disponible seguridad civil'),
      couleur: '#2F5597',
      ouverts: 'domain:secu',
      odv: ['SC']
    }, {
      id: 'defense',
      groupe: 'dispo',
      type: 'dispo',
      label: L4('Disponible défense', 'Available defence', 'Verfügbar Verteidigung', 'Disponible defensa'),
      couleur: '#0070C0',
      ouverts: 'domain:defense',
      odv: []
    }, {
      id: 'secu_perso',
      groupe: 'dispo',
      type: 'dispo',
      label: L4('Sécurité civile personnalisée', 'Custom civil security', 'Zivilschutz nach Wahl', 'Seguridad civil personalizada'),
      couleur: '#6C8EBF',
      ouverts: 'prefs:secu',
      odv: []
    }, {
      id: 'defense_perso',
      groupe: 'dispo',
      type: 'dispo',
      label: L4('Défense personnalisée', 'Custom defence', 'Verteidigung nach Wahl', 'Defensa personalizada'),
      couleur: '#8693A0',
      ouverts: 'prefs:defense',
      odv: ['C', 'T', 'N']
    }, {
      id: 'exercice_vol',
      groupe: 'exercice',
      type: 'dispo',
      label: L4('Vol en exercice {SOG}', '{SOG} exercise flight', 'Flug in {SOG}-Übung', 'Vuelo en ejercicio {SOG}'),
      couleur: '#FF0000',
      ouverts: ['EXERCICE'],
      odv: ['S']
    }, {
      id: 'exercice_ctrl',
      groupe: 'exercice',
      type: 'atc',
      label: L4('Contrôle {SOG}', '{SOG} control', '{SOG}-Lotsendienst', 'Control {SOG}'),
      couleur: '#C4BD97',
      ouverts: ['CONTROLE'],
      odv: ['AM']
    }, {
      id: 'vol_hors',
      groupe: 'occupe',
      type: 'occupe',
      label: L4('Vol hors {SOG} (IVAO / VATSIM)', 'Flight outside {SOG} (IVAO / VATSIM)', 'Flug außerhalb {SOG} (IVAO / VATSIM)',
        'Vuelo fuera de {SOG} (IVAO / VATSIM)'),
      couleur: '#FFD966',
      ouverts: 'none',
      odv: ['G']
    }, {
      id: 'dcs',
      groupe: 'occupe',
      type: 'occupe',
      label: L4('DCS', 'DCS', 'DCS', 'DCS'),
      couleur: '#002060',
      ouverts: 'none',
      odv: ['DC']
    }, {
      id: 'sol',
      groupe: 'occupe',
      type: 'occupe',
      label: L4('Disponible au sol seulement', 'Available on the ground only', 'Nur am Boden verfügbar',
        'Disponible solo en tierra'),
      couleur: '#A9D08E',
      ouverts: 'none',
      odv: [],
      affectable: ['divers']
    }, {
      id: 'ctrl_hors',
      groupe: 'occupe',
      type: 'atc',
      label: L4('Contrôle hors {SOG} (IVAO / VATSIM)', 'Control outside {SOG} (IVAO / VATSIM)',
        'Lotsendienst außerhalb {SOG} (IVAO / VATSIM)', 'Control fuera de {SOG} (IVAO / VATSIM)'),
      couleur: '#7030A0',
      ouverts: 'none',
      odv: ['AT']
    }, {
      id: 'indispo',
      groupe: 'indispo',
      type: 'indispo',
      label: L4('Indisponible', 'Unavailable', 'Nicht verfügbar', 'No disponible'),
      couleur: '#BFBFBF',
      ouverts: 'none',
      odv: ['IN']
    }, {
      id: 'conges',
      groupe: 'indispo',
      type: 'indispo',
      label: L4('Congés', 'Holidays', 'Urlaub', 'Vacaciones'),
      couleur: '#FFC000',
      ouverts: 'none',
      odv: ['V']
    }, {
      id: 'recup',
      groupe: 'indispo',
      type: 'indispo',
      label: L4('Récupération', 'Time off', 'Ausgleich', 'Descanso'),
      couleur: '#D9D9D9',
      ouverts: 'none',
      odv: ['Q']
    }, {
      id: 'irl',
      groupe: 'indispo',
      type: 'indispo',
      label: L4('Activité réelle', 'Real-life activity', 'Termin im echten Leben', 'Actividad real'),
      couleur: '#FFFF00',
      ouverts: 'none',
      odv: ['IR']
    }],
    // classeur ODV (import) : préférences par défaut d'un pilote qui n'en a pas, d'après ses codes (réunion des thèmes)
    import: {
      C: {
        defense: ['COMBAT', 'ISR', 'COMMAND', 'AAR']
      },
      T: {
        defense: ['AIRLIFT', 'AIRBORNE', 'AAR']
      },
      N: {
        defense: ['MARITIME'],
        secu: ['SAR']
      }
    }
  };

  // ---- configuration (fichier partagé, sinon défaut ; dernière lecture gardée : connue dès le chargement)
  /** Couleurs des catégories et des groupes réduites à de vraies couleurs : le fichier est partagé (dépôt de données),
   *  une « couleur » piégée sortait de l'attribut style des grilles (XSS, audit du 7 octobre 2026). */
  const clean = c => c && {
    ...c,
    ...(Array.isArray(c.categories) ? {
      categories: c.categories.map(x => x && typeof x === 'object' ? {
        ...x,
        couleur: K.cssColor(x.couleur, '#BFBFBF')
      } : x)
    } : {}),
    ...(Array.isArray(c.groupes) ? {
      groupes: c.groupes.map(x => x && typeof x === 'object' && 'couleur' in x ? {
        ...x,
        couleur: K.cssColor(x.couleur, '#BFBFBF')
      } : x)
    } : {})
  };
  let cfg = clean(K?.store?.json(CACHE, null)) || DEFAULT;
  const config = () => cfg;
  async function load(fresh = false) {
    const v = await A()?.readData?.(CONFIG, {
      fresh
    }).catch(() => null);
    cfg = v?.categories?.length ? clean({
      ...DEFAULT,
      ...v
    }) : DEFAULT;
    K?.store?.setJson(CACHE, cfg);
    window.dispatchEvent(new CustomEvent('suite-dispos-config', {
      detail: cfg
    }));
    return cfg;
  }
  /** Enregistre la configuration (datée, signée) ; retour de writeData. */
  async function save(next) {
    const doc = {
      ...next,
      schema: 1,
      va: window.RepositoryNav?.va?.().short || 'SOG',
      updated_at: new Date().toISOString(),
      by: window.SuiteUsers?.by?.() || A()?.trigram?.() || 'CPCO'
    };
    const r = await A().writeData(CONFIG, doc);
    cfg = doc;
    K?.store?.setJson(CACHE, cfg);
    window.dispatchEvent(new CustomEvent('suite-dispos-config', {
      detail: cfg
    }));
    return r;
  }
  // libellé dans la langue courante (traduction absente : le français)
  const label = row => Array.isArray(row) ? (K?.t ? K.t(row.map(x => x || row[0])) : row[0]) : String(row ?? '');
  const groups = () => cfg.groupes || DEFAULT.groupes;
  const categories = ({
    all = false
  } = {}) => (cfg.categories || []).filter(c => all || !c.retiree);
  const category = id => (cfg.categories || []).find(c => c.id === id) || null;
  const group = id => groups().find(g => g.id === id) || null;
  const domains = () => cfg.domaines || DEFAULT.domaines;
  const themes = () => ({
    ...DEFAULT.themes,
    ...(cfg.themes || {})
  });
  const themeLabel = id => label(themes()[id] || id);
  // Ordres de vols (docs/technique/ODV_ORDRES.md § 2) : éléments auxquels une catégorie rend un membre affectable — champ
  // affectable de la catégorie, sinon d'après son type ; groupe « occupe » (vol, contrôle hors SOG, DCS) : jamais.
  const AFFECTABLE = {
    dispo: ['vol', 'controle', 'divers'],
    atc: ['controle']
  };

  function affectable(id) {
    const c = category(id);
    if (!c) return [];
    if (Array.isArray(c.affectable)) return c.affectable;
    return c.groupe === 'occupe' ? [] : AFFECTABLE[c.type] || [];
  }
  /** Catégorie d'un code du classeur ODV (champ odv) ; null si aucune. */
  const codeCategory = code => code ? (cfg.categories || []).find(c => (c.odv || []).includes(code))?.id || null : null;
  /** Thème d'une famille de mission ('*' : toute catégorie disponible) ; null si inconnue. */
  function themeOfFamily(fam) {
    const f = String(fam || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (!f) return null;
    const alias = {
      ...DEFAULT.alias,
      ...(cfg.alias || {})
    };
    if (alias[f]) return alias[f];
    return themes()[f] ? f : null;
  }
  /** Thèmes ouverts par une catégorie pour un pilote (préférences : { <domaine>: { mode, liste } }) : Set ('*' : tous). */
  function openThemes(catId, prefs) {
    const c = typeof catId === 'object' ? catId : category(catId);
    const o = c?.ouverts;
    if (!c || !o || o === 'none') return new Set();
    if (o === 'all') return new Set(['*']);
    if (Array.isArray(o)) return new Set(o);
    const [kind, d] = String(o).split(':'),
      dom = domains().find(x => x.id === d);
    const list = dom?.themes || [];
    if (kind === 'domain') return new Set(list);
    if (kind === 'prefs') {
      const p = prefs?.[d];
      if (p?.mode === 'blanche') return new Set(list.filter(x => (p.liste || []).includes(x)));
      if (p?.mode === 'noire') return new Set(list.filter(x => !(p.liste || []).includes(x)));
      return new Set(list); // pas de préférence : tout le domaine
    }
    return new Set();
  }
  /** La famille de mission est-elle ouverte par ces thèmes ? (famille vide : oui si quelque chose est ouvert) */
  function opens(set, fam) {
    if (!set?.size) return false;
    if (set.has('*')) return true;
    const th = themeOfFamily(fam);
    if (!fam || th === '*') return [...set].some(x => x !== 'CONTROLE');
    return !!th && set.has(th);
  }
  /** Préférences par défaut d'après les codes du classeur (C, T, N…) : listes blanches, réunion des thèmes. */
  function prefsFromCodes(codes) {
    const map = cfg.import || DEFAULT.import,
      out = {};
    for (const code of new Set(codes))
      for (const [d, list] of Object.entries(map[code] || {})) out[d] = [...new Set([...(out[d] || []), ...list])];
    return Object.keys(out).length ? Object.fromEntries(Object.entries(out).map(([d, liste]) => [d, {
      mode: 'blanche',
      liste
    }])) : null;
  }

  // ---- semaines ISO (« 2026-W41 »)
  const mondayOf = ms => {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  };
  /** Semaine ISO d'un instant (UTC). */
  function weekId(ms) {
    const thu = new Date(mondayOf(ms) + 3 * 864e5),
      y = thu.getUTCFullYear(),
      jan4 = Date.UTC(y, 0, 4);
    const n = 1 + Math.round((thu.getTime() - 3 * 864e5 - mondayOf(jan4)) / 6048e5);
    return `${y}-W${String(n).padStart(2, '0')}`;
  }
  /** Lundi (ms, UTC) d'une semaine ISO. */
  function weekMonday(id) {
    const m = /^(\d{4})-W(\d{2})$/.exec(String(id || ''));
    if (!m) return NaN;
    return mondayOf(Date.UTC(+m[1], 0, 4)) + (+m[2] - 1) * 6048e5;
  }
  const addWeek = (id, n) => weekId(weekMonday(id) + n * 6048e5 + 864e5);

  // ---- déclarations d'un pilote (nouveau format)
  const fileOf = (tri, week) => `disponibilites/${String(tri).toUpperCase()}/${week}.json`;
  /** Semaines déclarées d'un pilote : { semaine → document } ; weeks : semaines voulues (sinon celles de l'index et de
   *  la boîte d'envoi, des 12 dernières semaines aux suivantes). */
  async function readPilot(tri, {
    weeks = null,
    fresh = false
  } = {}) {
    tri = String(tri || '').toUpperCase();
    if (!tri || !A()?.readData) return {};
    let ids = weeks;
    // index du dossier : semaines déclarées et signature de chaque fichier (at : semaine → updated_at) ; une semaine dont
    // la signature n'a pas changé est lue dans l'index du navigateur, sans requête (MissionAssignments.readIndexed)
    const idx = await A().readData(INDEX, {
      fresh
    }).catch(() => null);
    const e = idx?.pilots?.[tri],
      sigs = e && typeof e === 'object' ? e.at || {} : {};
    const pend = (A().pendingData?.() || []).map(p => new RegExp(`^disponibilites/${tri}/(\\d{4}-W\\d{2})\\.json$`).exec(p)?.[1]).filter(Boolean);
    if (!ids) {
      const from = addWeek(weekId(Date.now()), -12);
      let listed = Array.isArray(e?.weeks) ? e.weeks : null;
      // index d'un ancien lanceur (pilote → true) ou absent : semaines proches essayées (précédente, en cours, deux suivantes)
      if (!listed && (e === true || !idx?.pilots)) listed = [-1, 0, 1, 2].map(n => addWeek(weekId(Date.now()), n));
      ids = [...new Set([...(listed || []), ...pend])].filter(w => w >= from);
    } else if (idx?.pilots && e !== true) {
      // semaines demandées (ODV : la semaine affichée pour chaque pilote) : seules celles que l'index connaît pour ce
      // pilote, ou en attente d'écriture, sont lues — un pilote sans déclaration ne coûte plus une requête en 404
      const known = new Set([...(Array.isArray(e?.weeks) ? e.weeks : []), ...pend]);
      ids = ids.filter(w => known.has(w));
    }
    await modules;
    const out = {};
    await Promise.all(ids.map(async w => {
      const d = await (A().readIndexed ? A().readIndexed(fileOf(tri, w), sigs[w], {
        fresh
      }) : A().readData(fileOf(tri, w), {
        fresh
      })).catch(() => null);
      if (d?.dispos || d?.ranges) out[w] = normalize(d, w, tri);
    }));
    return out;
  }
  /** Enregistre une semaine au schema 3 : données schema 3 (ranges, background), ou plages par jour du schema 2 (anciens
   *  appelants) ; extra : appareils, simulateurs. Index des semaines tenu à jour ; doc rendu normalisé (normalize). */
  async function saveWeek(tri, week, data, extra = {}) {
    tri = String(tri || '').toUpperCase();
    await modules;
    const d3 = data?.ranges ? data : read3({
      schema: 2,
      semaine: week,
      pilote: tri,
      dispos: data || {}
    });
    const doc = {
      schema: 3,
      va: window.RepositoryNav?.va?.().short || 'SOG',
      pilot: tri,
      week,
      tz: 'UTC',
      ranges: (d3.ranges || []).map(r => ({
        start: r.start,
        end: r.end,
        cat: r.cat
      })),
      background: (d3.background || []).map(r => ({
        start: r.start,
        end: r.end,
        cat: r.cat
      })),
      updated_at: new Date().toISOString(),
      by: window.SuiteUsers?.by?.() || tri,
      appareils: extra.appareils || data?.appareils || {
        possedes: [],
        maitrises: []
      },
      simulateurs: extra.simulateurs || data?.simulateurs || []
    };
    const r = await A().writeData(fileOf(tri, week), doc);
    await A().dataStore.lock('data:disponibilites/_index', async () => {
      const idx = (await A().readData(INDEX, {
        fresh: true
      })) || {
        pilots: {}
      };
      idx.pilots ||= {};
      // copie de ce navigateur (boîte d'envoi) et fichier servi fusionnés, pilote par pilote et semaine par semaine :
      // readData rend la plus récente des deux, et une vieille copie locale (écrite sans dossier autorisé) faisait
      // perdre à l'index tous les pilotes ajoutés depuis par un autre poste ou par la conversion
      const served = await Promise.resolve(A().dataStore?.read?.(`data/${INDEX}`, {
        fresh: true
      })).catch(() => null);
      for (const [p, s] of Object.entries(served?.pilots || {})) {
        const mine = idx.pilots[p];
        if (!mine) idx.pilots[p] = s;
        else if (s && typeof s === 'object') idx.pilots[p] = {
          ...s,
          ...(typeof mine === 'object' ? mine : {}),
          weeks: [...new Set([...(Array.isArray(s.weeks) ? s.weeks : []), ...(Array.isArray(mine?.weeks) ? mine.weeks : [])])]
            .sort(),
          at: {
            ...(s.at || {}),
            ...(typeof mine === 'object' ? mine.at || {} : {})
          }
        };
      }
      const e = idx.pilots[tri];
      const weeks = new Set(Array.isArray(e?.weeks) ? e.weeks : []);
      weeks.add(week);
      idx.pilots[tri] = {
        ...(e && typeof e === 'object' ? e : e ? {
          legacy: true
        } : {}),
        weeks: [...weeks].sort(),
        at: {
          ...(e && typeof e === 'object' ? e.at || {} : {}),
          [week]: doc.updated_at // signature de la semaine écrite
        },
        updated_at: doc.updated_at
      };
      idx.updated_at = doc.updated_at;
      idx.schema = 2;
      await A().writeData(INDEX, idx);
    });
    return {
      ...r,
      doc: normalize(doc, week, tri)
    };
  }
  const hm = ms => new Date(ms).toISOString().slice(11, 16);
  /** Configuration des catégories pour le module de saisie (shared/dispos_timeline.js) : groupes dans l'ordre de la
   *  suite, couche de fond pour le groupe « indispo », lettre (code), couleur, libellé dans la langue courante ; le code
   *  du schema 2 (legacy) est l'identifiant de la catégorie. */
  function timelineConfig({
    all = true
  } = {}) {
    const layer = g => g === 'indispo' ? 'background' : 'foreground';
    return {
      schema: 1,
      groups: groups().map(g => ({
        id: g.id,
        label: label(g.label),
        layer: layer(g.id)
      })),
      categories: categories({
        all
      }).map(c => ({
        id: c.id,
        label: label(c.label),
        letter: layer(c.groupe) === 'background' ? '' : code(c),
        color: color(c),
        layer: layer(c.groupe),
        group: c.groupe,
        legacy: c.id,
        short: shortLabel(c)
      }))
    };
  }
  /** Schema 2 → schema 3 (lecteur de shared/dispos_formats.js, configuration de la suite). */
  const read3 = doc => window.DisposFormats ? window.DisposFormats.read(doc?.ranges ? 'schema3' : 'schema2', doc, {
    config: timelineConfig()
  }) : {
    schema: 3,
    week: doc?.week || doc?.semaine,
    ranges: [],
    background: []
  };
  /** Vue par jour d'une déclaration schema 3 : { "AAAA-MM-JJ": [{ debut, fin, categorie }] }, à la minute, sans
   *  chevauchement ; journée entière : debut et fin null ; fin de journée : « 24:00 ». */
  function dayView(d3) {
    const out = {};
    for (const r of d3?.ranges || []) {
      let a = Date.parse(`${r.start}:00Z`);
      const b = Date.parse(`${r.end}:00Z`);
      while (a < b) {
        const day0 = a - a % 864e5,
          e = Math.min(b, day0 + 864e5),
          s0 = (a - day0) / 6e4,
          e0 = (e - day0) / 6e4,
          whole = s0 === 0 && e0 === 1440,
          t = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        (out[new Date(day0).toISOString().slice(0, 10)] ||= []).push({
          debut: whole ? null : t(s0),
          fin: whole ? null : t(e0),
          categorie: r.cat
        });
        a = e;
      }
    }
    return out;
  }
  /** Document d'une semaine, lu au schema 2 ou 3, normalisé : champs du fichier (appareils, simulateurs, updated_at…),
   *  ranges et background (schema 3), vue par jour dispos (dayView), pilote et semaine sous leurs deux noms. */
  function normalize(doc, week = doc?.week || doc?.semaine, tri = doc?.pilot || doc?.pilote) {
    // formats absents (script non chargé) : un document au schema 2 garde ses plages telles quelles
    if (!window.DisposFormats && doc?.dispos) return {
      ...doc,
      week,
      semaine: week,
      pilot: tri || '',
      pilote: tri || ''
    };
    const d3 = read3({
      ...doc,
      week: doc?.week || week,
      semaine: doc?.semaine || week
    });
    return {
      ...doc,
      schema: doc?.schema || 2,
      pilot: tri || '',
      pilote: tri || '',
      week,
      semaine: week,
      ranges: d3.ranges,
      background: d3.background || [],
      dispos: dayView(d3)
    };
  }
  /** Remplace les plages d'un jour (plages du schema 2 : debut, fin, categorie ; à la minute) dans un document : données
   *  schema 3, le reste de la semaine gardé (fond posé compris). */
  function setDay(doc, date, plages) {
    const T = window.DisposTimeline,
      M = T?.model,
      cfg3 = timelineConfig(),
      week = doc?.week || doc?.semaine || weekId(Date.parse(`${date}T12:00:00Z`));
    if (!M) throw new Error('dispos_timeline.js not loaded');
    const bgCats = new Set(cfg3.categories.filter(c => c.layer === 'background').map(c => c.id)),
      m = v => v ? +v.slice(0, 2) * 60 + +v.slice(3, 5) : null,
      day = Math.round((Date.parse(`${date}T00:00:00Z`) - T.weekMonday(week)) / 6e4);
    let st = M.fromData(doc?.ranges ? doc : read3(doc), week, cfg3);
    st = {
      bg: M.tidy(M.cut(st.bg, day, day + M.DAY)),
      fg: M.tidy(M.cut(st.fg, day, day + M.DAY))
    };
    for (const x of plages || []) {
      const a = day + (m(x.debut) ?? 0),
        b = day + (x.fin ? m(x.fin) : M.DAY);
      if (b > a && x.categorie) st = bgCats.has(x.categorie) ? M.applyBg(st, a, b, x.categorie) : M.applyFg(st, a, b, x.categorie);
    }
    return M.toData({
      week,
      pilot: doc?.pilot || doc?.pilote || '',
      ...st
    });
  }
  /** Instants (ms) où la déclaration peut changer entre start et end (bornes comprises) : débuts et fins des plages des
   *  jours couverts ; une couverture se calcule ainsi à la minute, plage par plage, sans pas fixe. */
  function cutsBetween(weeks, start, end) {
    const out = new Set([start, end]);
    for (let d0 = start - start % 864e5; d0 < end; d0 += 864e5) {
      const day = new Date(d0).toISOString().slice(0, 10),
        doc = weeks?.[weekId(d0)];
      out.add(d0);
      for (const x of doc?.dispos?.[day] || [])
        for (const v of [x.debut, x.fin])
          if (v) out.add(d0 + (+v.slice(0, 2) * 60 + +v.slice(3, 5)) * 6e4);
    }
    return [...out].filter(t => t >= start && t <= end).sort((a, b) => a - b);
  }
  /** Plages déclarées qui couvrent l'instant ms (semaines : { semaine → document }) ; null si la semaine n'est pas
   *  déclarée (le reste de la semaine déclarée, sans plage : liste vide). Fin « 24:00 » : jusqu'à minuit. */
  function entriesAt(weeks, ms) {
    const doc = weeks?.[weekId(ms)];
    if (!doc) return null;
    const t = hm(ms),
      day = new Date(ms).toISOString().slice(0, 10);
    return (doc.dispos?.[day] || []).filter(x => (!x.debut || x.debut <= t) && (!x.fin || t < x.fin));
  }

  // ---- affichage d'une catégorie, commun à la grille de Mes missions (dispos_editor.js) et au Planning ODV
  // lettre : champ « lettre » de la configuration, sinon le code ODV de la catégorie s'il est unique, sinon un abrégé
  // (+ : tout le domaine ; − : personnalisée, thèmes choisis dans les préférences)
  const SHORT = {
    defense: 'D+',
    secu_perso: 'SC-',
    defense_perso: 'D-'
  };
  const code = c => c?.lettre || (c?.odv?.length === 1 ? c.odv[0] : SHORT[c?.id]) || c?.odv?.[0] || '';
  const color = c => {
    const v = K.cssColor(c?.couleur, '#BFBFBF');
    return window.RepositoryNav?.chartColor?.(v) || v;
  };
  /** Libellé court (palettes) : sans le nom du groupe en tête ni la précision entre parenthèses, mots longs abrégés. */
  function shortLabel(c) {
    const full = label(c.label),
      grp = label(group(c.groupe)?.label || '');
    let s = full.replace(/\s*\([^)]*\)\s*$/, '');
    if (grp && s.toLowerCase().startsWith(grp.toLowerCase() + ' ')) s = s.slice(grp.length + 1);
    if (!s) return full;
    s = s[0].toUpperCase() + s.slice(1);
    // « Sécurité civile personnalisée » → « Sécur. civile perso. »
    return s.length > 12 ? s.split(' ').map(w => w.length > 6 ? w.slice(0, 5) + '.' : w).join(' ') : s;
  }
  window.SuiteDispos = {
    DEFAULT,
    code,
    color,
    shortLabel,
    config,
    load,
    save,
    label,
    groups,
    group,
    categories,
    category,
    domains,
    themes,
    themeLabel,
    codeCategory,
    affectable,
    themeOfFamily,
    openThemes,
    opens,
    prefsFromCodes,
    weekId,
    weekMonday,
    addWeek,
    readPilot,
    saveWeek,
    entriesAt,
    cutsBetween,
    setDay,
    normalize,
    timelineConfig,
    ready,
    fileOf
  };
  // configuration partagée relue au chargement et à chaque écriture d'un onglet
  const waitA = () => A() ? Promise.resolve() : new Promise(r => {
    let n = 0;
    const i = setInterval(() => {
      if (A() || ++n > 100) {
        clearInterval(i);
        r();
      }
    }, 50);
  });
  waitA().then(() => load()).catch(() => {});
  window.addEventListener('defa-data-change', e => {
    if (!e.detail?.path || e.detail.path.endsWith(CONFIG)) load(true).catch(() => {});
  });
})();
