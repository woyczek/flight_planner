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
  //   · déclaration : un fichier par pilote et par semaine ISO, data/disponibilites/<TRI>/<AAAA>-W<nn>.json
  //     { schema: 2, va, pilote, semaine, updated_at, by, dispos: { "AAAA-MM-JJ": [{ debut, fin, categorie }] },
  //     appareils, simulateurs } ; heures UTC au quart d'heure, null = journée entière, plages superposables ; index
  //     data/disponibilites/_index.json (pilotes → semaines) refait par le lanceur et à chaque écriture.
  // API (window.SuiteDispos) : DEFAULT, config(), load(fresh), save(config), groups(), categories({ all }),
  //   category(id), domains(), themes(), label(ligne), themeLabel(id), codeCategory(code ODV), themeOfFamily(famille),
  //   openThemes(catégorie, préférences), opens(thèmes, famille), prefsFromCodes(codes), weekId(ms), weekMonday(id),
  //   addWeek(id, n), readPilot(TRI, { weeks, fresh }), saveWeek(TRI, semaine, dispos, extra), entriesAt(semaines, ms),
  //   affectable(catégorie) (éléments d'un ordre de vol ouverts par la catégorie : vol, controle, divers).
  if (window.SuiteDispos) return;
  const K = window.RepositoryKit;
  const A = () => window.MissionAssignments;
  const CONFIG = 'config/disponibilites.json',
    CACHE = 'disposConfigCache:v1',
    INDEX = 'disponibilites/_index.json';
  const L4 = (fr, en, de, es) => [fr, en, de, es];
  const DEFAULT = {
    schema: 1,
    va: window.RepositoryNav?.va?.().short || 'SOG', // sigle de la compagnie réglée
    groupes: [
      { id: 'dispo', label: L4('Disponible', 'Available', 'Verfügbar', 'Disponible'), court: 'D', couleur: '#00B050' },
      { id: 'exercice', label: L4('Exercice SOG', 'SOG exercise', 'SOG-Übung', 'Ejercicio SOG'), court: 'E', couleur: '#E03C31' },
      { id: 'occupe', label: L4('Occupé', 'Busy', 'Beschäftigt', 'Ocupado'), court: 'O', couleur: '#FFD966' },
      { id: 'indispo', label: L4('Indisponible', 'Unavailable', 'Nicht verfügbar', 'No disponible'), court: 'I', couleur: '#BFBFBF' }
    ],
    domaines: [
      { id: 'secu', label: L4('Sécurité civile', 'Civil security', 'Zivilschutz', 'Seguridad civil'), themes: ['HEMS', 'SAR', 'FIRE', 'LE', 'HADR'] },
      { id: 'defense', label: L4('Défense', 'Defence', 'Verteidigung', 'Defensa'), themes: ['COMBAT', 'ISR', 'COMMAND', 'AAR', 'AIRLIFT', 'AIRBORNE', 'MARITIME', 'SPECIAL'] }
    ],
    themes: {
      HEMS: L4('Secours héliporté, medevac', 'Helicopter rescue, medevac', 'Hubschrauberrettung, Medevac', 'Rescate en helicóptero, medevac'),
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
      EXERCICE: L4('Exercice SOG', 'SOG exercise', 'SOG-Übung', 'Ejercicio SOG'),
      CONTROLE: L4('Contrôleur d’exercice', 'Exercise controller', 'Übungslotse', 'Controlador de ejercicio')
    },
    // familles de mission sans thème propre → thème (TRAINING : ouvert à toute catégorie de type « dispo »)
    alias: { MEDEVAC: 'HEMS', SOF: 'SPECIAL', FLIGHTINSPECTION: 'SPECIAL', SURVEY: 'SPECIAL', TRAINING: '*' },
    categories: [
      { id: 'tout', groupe: 'dispo', type: 'dispo', label: L4('Disponible pour tout', 'Available for everything', 'Für alles verfügbar', 'Disponible para todo'), couleur: '#00B050', ouverts: 'all', odv: ['O'] },
      { id: 'secu', groupe: 'dispo', type: 'dispo', label: L4('Disponible sécurité civile', 'Available civil security', 'Verfügbar Zivilschutz', 'Disponible seguridad civil'), couleur: '#2F5597', ouverts: 'domain:secu', odv: ['SC'] },
      { id: 'defense', groupe: 'dispo', type: 'dispo', label: L4('Disponible défense', 'Available defence', 'Verfügbar Verteidigung', 'Disponible defensa'), couleur: '#0070C0', ouverts: 'domain:defense', odv: [] },
      { id: 'secu_perso', groupe: 'dispo', type: 'dispo', label: L4('Sécurité civile personnalisée', 'Custom civil security', 'Zivilschutz nach Wahl', 'Seguridad civil personalizada'), couleur: '#6C8EBF', ouverts: 'prefs:secu', odv: [] },
      { id: 'defense_perso', groupe: 'dispo', type: 'dispo', label: L4('Défense personnalisée', 'Custom defence', 'Verteidigung nach Wahl', 'Defensa personalizada'), couleur: '#8693A0', ouverts: 'prefs:defense', odv: ['C', 'T', 'N'] },
      { id: 'exercice_vol', groupe: 'exercice', type: 'dispo', label: L4('Vol en exercice SOG', 'SOG exercise flight', 'Flug in SOG-Übung', 'Vuelo en ejercicio SOG'), couleur: '#FF0000', ouverts: ['EXERCICE'], odv: ['S'] },
      { id: 'exercice_ctrl', groupe: 'exercice', type: 'atc', label: L4('Contrôle SOG', 'SOG control', 'SOG-Lotsendienst', 'Control SOG'), couleur: '#C4BD97', ouverts: ['CONTROLE'], odv: ['AM'] },
      { id: 'vol_hors', groupe: 'occupe', type: 'occupe', label: L4('Vol hors SOG (IVAO / VATSIM)', 'Flight outside SOG (IVAO / VATSIM)', 'Flug außerhalb SOG (IVAO / VATSIM)', 'Vuelo fuera de SOG (IVAO / VATSIM)'), couleur: '#FFD966', ouverts: 'none', odv: ['G'] },
      { id: 'dcs', groupe: 'occupe', type: 'occupe', label: L4('DCS', 'DCS', 'DCS', 'DCS'), couleur: '#002060', ouverts: 'none', odv: ['DC'] },
      { id: 'sol', groupe: 'occupe', type: 'occupe', label: L4('Disponible au sol seulement', 'Available on the ground only', 'Nur am Boden verfügbar', 'Disponible solo en tierra'), couleur: '#A9D08E', ouverts: 'none', odv: [], affectable: ['divers'] },
      { id: 'ctrl_hors', groupe: 'occupe', type: 'atc', label: L4('Contrôle hors SOG (IVAO / VATSIM)', 'Control outside SOG (IVAO / VATSIM)', 'Lotsendienst außerhalb SOG (IVAO / VATSIM)', 'Control fuera de SOG (IVAO / VATSIM)'), couleur: '#7030A0', ouverts: 'none', odv: ['AT'] },
      { id: 'indispo', groupe: 'indispo', type: 'indispo', label: L4('Indisponible', 'Unavailable', 'Nicht verfügbar', 'No disponible'), couleur: '#BFBFBF', ouverts: 'none', odv: ['IN'] },
      { id: 'conges', groupe: 'indispo', type: 'indispo', label: L4('Congés', 'Holidays', 'Urlaub', 'Vacaciones'), couleur: '#FFC000', ouverts: 'none', odv: ['V'] },
      { id: 'recup', groupe: 'indispo', type: 'indispo', label: L4('Récupération', 'Time off', 'Ausgleich', 'Descanso'), couleur: '#D9D9D9', ouverts: 'none', odv: ['Q'] },
      { id: 'irl', groupe: 'indispo', type: 'indispo', label: L4('Activité réelle', 'Real-life activity', 'Termin im echten Leben', 'Actividad real'), couleur: '#FFFF00', ouverts: 'none', odv: ['IR'] }
    ],
    // classeur ODV (import) : préférences par défaut d'un pilote qui n'en a pas, d'après ses codes (réunion des thèmes)
    import: {
      C: { defense: ['COMBAT', 'ISR', 'COMMAND', 'AAR'] },
      T: { defense: ['AIRLIFT', 'AIRBORNE', 'AAR'] },
      N: { defense: ['MARITIME'], secu: ['SAR'] }
    }
  };

  // ---- configuration (fichier partagé, sinon défaut ; dernière lecture gardée : connue dès le chargement)
  let cfg = K?.store?.json(CACHE, null) || DEFAULT;
  const config = () => cfg;
  async function load(fresh = false) {
    const v = await A()?.readData?.(CONFIG, {
      fresh
    }).catch(() => null);
    cfg = v?.categories?.length ? {
      ...DEFAULT,
      ...v
    } : DEFAULT;
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
    if (!ids) {
      const pend = (A().pendingData?.() || []).map(p => new RegExp(`^disponibilites/${tri}/(\\d{4}-W\\d{2})\\.json$`).exec(p)?.[1]).filter(Boolean);
      const from = addWeek(weekId(Date.now()), -12);
      let listed = Array.isArray(e?.weeks) ? e.weeks : null;
      // index d'un ancien lanceur (pilote → true) ou absent : semaines proches essayées (précédente, en cours, deux suivantes)
      if (!listed && (e === true || !idx?.pilots)) listed = [-1, 0, 1, 2].map(n => addWeek(weekId(Date.now()), n));
      ids = [...new Set([...(listed || []), ...pend])].filter(w => w >= from);
    }
    const out = {};
    await Promise.all(ids.map(async w => {
      const d = await (A().readIndexed ? A().readIndexed(fileOf(tri, w), sigs[w], {
        fresh
      }) : A().readData(fileOf(tri, w), {
        fresh
      })).catch(() => null);
      if (d?.dispos) out[w] = d;
    }));
    return out;
  }
  /** Enregistre une semaine (plages par jour) ; extra : appareils, simulateurs. Index des semaines tenu à jour. */
  async function saveWeek(tri, week, dispos, extra = {}) {
    tri = String(tri || '').toUpperCase();
    const clean = Object.fromEntries(Object.entries(dispos || {}).map(([d, list]) => [d, (list || []).filter(x => x?.categorie).map(x => ({
      debut: x.debut || null,
      fin: x.fin || null,
      categorie: x.categorie
    })).sort((a, b) => String(a.debut ?? '').localeCompare(String(b.debut ?? '')))]).filter(([, l]) => l.length).sort(([a], [b]) => a.localeCompare(b)));
    const doc = {
      schema: 2,
      va: window.RepositoryNav?.va?.().short || 'SOG',
      pilote: tri,
      semaine: week,
      updated_at: new Date().toISOString(),
      by: window.SuiteUsers?.by?.() || tri,
      dispos: clean,
      appareils: extra.appareils || {
        possedes: [],
        maitrises: []
      },
      simulateurs: extra.simulateurs || []
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
          weeks: [...new Set([...(Array.isArray(s.weeks) ? s.weeks : []), ...(Array.isArray(mine?.weeks) ? mine.weeks : [])])].sort(),
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
      doc
    };
  }
  const hm = ms => new Date(ms).toISOString().slice(11, 16);
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
  const color = c => window.RepositoryNav?.chartColor?.(c?.couleur || '#BFBFBF') || c?.couleur || '#BFBFBF';
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
