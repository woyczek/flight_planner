(() => {
  'use strict';
  // Disponibilités en catégories configurables (docs/DISPOS_ET_REORGANISATION.md § 1), chargé sur chaque page par
  // repository_nav.js.
  //   · configuration partagée data/config/disponibilites.json (synchronisée, datée, va) : groupes (affichés dans l'ODV :
  //     Disponible, Exercice DEFA, Occupé, Indisponible), catégories (libellés [fr, en, de, es], couleur, thèmes ouverts,
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
  //   addWeek(id, n), readPilot(TRI, { weeks, fresh }), saveWeek(TRI, semaine, dispos, extra), entriesAt(semaines, ms).
  if (window.SuiteDispos) return;
  const K = window.RepositoryKit;
  const A = () => window.MissionAssignments;
  const CONFIG = 'config/disponibilites.json',
    CACHE = 'disposConfigCache:v1',
    INDEX = 'disponibilites/_index.json';
  const L4 = (fr, en, de, es) => [fr, en, de, es];
  const DEFAULT = {
    schema: 1,
    va: 'DEFA',
    groupes: [
      { id: 'dispo', label: L4('Disponible', 'Available', 'Verfügbar', 'Disponible'), court: 'D', couleur: '#00B050' },
      { id: 'exercice', label: L4('Exercice DEFA', 'DEFA exercise', 'DEFA-Übung', 'Ejercicio DEFA'), court: 'E', couleur: '#E03C31' },
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
      EXERCICE: L4('Exercice DEFA', 'DEFA exercise', 'DEFA-Übung', 'Ejercicio DEFA'),
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
      { id: 'exercice_vol', groupe: 'exercice', type: 'dispo', label: L4('Vol en exercice DEFA', 'DEFA exercise flight', 'Flug in DEFA-Übung', 'Vuelo en ejercicio DEFA'), couleur: '#FF0000', ouverts: ['EXERCICE'], odv: ['S'] },
      { id: 'exercice_ctrl', groupe: 'exercice', type: 'atc', label: L4('Contrôle DEFA', 'DEFA control', 'DEFA-Lotsendienst', 'Control DEFA'), couleur: '#C4BD97', ouverts: ['CONTROLE'], odv: ['AM'] },
      { id: 'vol_hors', groupe: 'occupe', type: 'occupe', label: L4('Vol hors DEFA (IVAO / VATSIM)', 'Flight outside DEFA (IVAO / VATSIM)', 'Flug außerhalb DEFA (IVAO / VATSIM)', 'Vuelo fuera de DEFA (IVAO / VATSIM)'), couleur: '#FFD966', ouverts: 'none', odv: ['G'] },
      { id: 'dcs', groupe: 'occupe', type: 'occupe', label: L4('DCS', 'DCS', 'DCS', 'DCS'), couleur: '#002060', ouverts: 'none', odv: ['DC'] },
      { id: 'ctrl_hors', groupe: 'occupe', type: 'atc', label: L4('Contrôle hors DEFA (IVAO / VATSIM)', 'Control outside DEFA (IVAO / VATSIM)', 'Lotsendienst außerhalb DEFA (IVAO / VATSIM)', 'Control fuera de DEFA (IVAO / VATSIM)'), couleur: '#7030A0', ouverts: 'none', odv: ['AT'] },
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
      va: window.RepositoryNav?.va?.().short || 'DEFA',
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
    if (!ids) {
      const idx = await A().readData(INDEX, {
        fresh
      }).catch(() => null);
      const e = idx?.pilots?.[tri];
      const pend = (A().pendingData?.() || []).map(p => new RegExp(`^disponibilites/${tri}/(\\d{4}-W\\d{2})\\.json$`).exec(p)?.[1]).filter(Boolean);
      const from = addWeek(weekId(Date.now()), -12);
      let listed = Array.isArray(e?.weeks) ? e.weeks : null;
      // index d'un ancien lanceur (pilote → true) ou absent : semaines proches essayées (précédente, en cours, deux suivantes)
      if (!listed && (e === true || !idx?.pilots)) listed = [-1, 0, 1, 2].map(n => addWeek(weekId(Date.now()), n));
      ids = [...new Set([...(listed || []), ...pend])].filter(w => w >= from);
    }
    const out = {};
    await Promise.all(ids.map(async w => {
      const d = await A().readData(fileOf(tri, w), {
        fresh
      }).catch(() => null);
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
      va: window.RepositoryNav?.va?.().short || 'DEFA',
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
      const e = idx.pilots[tri];
      const weeks = new Set(Array.isArray(e?.weeks) ? e.weeks : []);
      weeks.add(week);
      idx.pilots[tri] = {
        ...(e && typeof e === 'object' ? e : e ? {
          legacy: true
        } : {}),
        weeks: [...weeks].sort(),
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

  window.SuiteDispos = {
    DEFAULT,
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
