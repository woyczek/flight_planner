(() => {
  'use strict';
  // Planning ODV — lecture du classeur hebdomadaire ODV de l'escadrille (.xlsx) et règles de planification des vols
  // communs. Traitement 100 % local : le fichier est décompressé dans le navigateur (ZipStore.read, shared/zip_store.js :
  // en-têtes zip + DecompressionStream) et son XML lu par DOMParser ; rien n'est envoyé, rien n'est gardé hors de la
  // mémoire de la page. Aucune donnée nominative n'est écrite dans ce fichier (trigrammes fictifs dans les exemples).
  //
  // Structure attendue du classeur (voir docs/ODV_PLANNING.md) :
  //   · feuille ODV : n° de semaine à droite du « S » (ligne 1), jours LUNDI…DIMANCHE (fusions de 3 colonnes : matin,
  //     après-midi, soir), lignes de groupe (IVAO FR, IVAO SO, DEFA : événements portés par la couleur de fond),
  //     trigrammes des pilotes en ZONES DE TEXTE (formes) sur les colonnes A:C, une par ligne, codes de disponibilité
  //     dans la grille ; légende « Code couleur » à droite ; frise horaire (blocs de jours « VOLS », 4 colonnes par heure,
  //     vols = formes « DEP-ARR | type immat | objet », équipage = trigramme posé à gauche) ;
  //   · feuille FLOTTE : trigrammes en zones de texte (colonne A), avions disponibles (colonne B, texte enrichi vert /
  //     orange / rouge, commentaire en fil par rubriques TRANSPORT : … / CHASSE : …), simulateurs (croix).
  // Repérage par libellés plutôt que par adresses fixes ; ce qui ne se trouve pas est signalé (anomalies), jamais fatal.
  //
  // API (window.OdvCore) :
  //   openWorkbook(fichier | ArrayBuffer) → classeur { sheets, sheet(nom), props } ;
  //   extract(classeur, réglages, nomDuFichier) → données normalisées { semaine, lundi, pilotes, records, evenements,
  //     vols, frise, zones, flotte, anomalies… } ;
  //   plan(données, réglages) → créneaux { pilotes, atc, missions probables (règles expliquées), vols… } ;
  //   DEFAULTS (réglages), LEGEND, FAMILIES, ROLES, CATEGORIES, DAYS, SLOTS, toCsv(données), recap(données, créneaux).

  // ------------------------------------------------------------------ constantes
  const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const SLOTS = ['matin', 'après-midi', 'soir'];
  const SLOT_LABELS = ['Matin', 'Après-midi', 'Soir'];

  // Réglages par défaut (réponses aux questions ouvertes de l'analyse ; tous réglables dans la page).
  const DEFAULTS = {
    hours: [
      [8, 12],
      [12, 18],
      [18, 23]
    ], // créneaux en heures z (aucune heure dans le fichier)
    dateSource: 'iso', // 'iso' : lundi de la semaine ISO ; 'frise' : date saisie sur la frise
    emptyAs: 'inconnu', // case vide : 'inconnu' (non renseigné) ou 'indispo'
    flotteLevel: 'noRed', // types FLOTTE retenus : 'all', 'noRed' (sans les rouges), 'green' (verts seuls)
    strictCodes: true, // un code restreint (SC, C, T, N) limite les rôles à son domaine
    ignoreRecurring: true, // ligne de groupe colorée sur les 7 jours d'un même créneau : habillage probable
    minPilots: 2, // créneaux communs : au moins N pilotes
    sim: '', // simulateur commun exigé ('' : indifférent)
    top: 3, // missions probables montrées par créneau
    playWeight: 0.5, // missions probables : malus d'une famille déjà jouée, playWeight × log2(1 + nombre de CR) (négatif : bonus)
    plays: {}, // CR par famille ({ FIRE: 7, … } : registre des CR, fourni par la page)
    preference: ['AAR', 'AIRBORNE', 'ISR', 'SPECIAL', 'SAR', 'MARITIME', 'FIRE', 'AIRLIFT', 'HEMS', 'TRAINING']
  };

  // Catégories de disponibilité (le texte du code fait foi, jamais la couleur).
  const CATEGORIES = {
    dispo: 'Disponible',
    atc: 'Contrôleur',
    occupe: 'Occupé ailleurs',
    indispo: 'Indisponible',
    suivi: 'Marque de suivi',
    inconnu: 'Non renseigné',
    hors_legende: 'Code hors légende'
  };

  // Légende par défaut : code → [sens, catégorie, rôle imposé, couleur]. Complétée par la légende lue dans le fichier
  // (« Code couleur ») et par les couleurs de la mise en forme conditionnelle de la grille.
  const LEGEND = {
    O: ['DISPO (Tout)', 'dispo', null, '00B050'],
    SC: ['DISPO sécu civile', 'dispo', 'SECU', '2F5597'],
    C: ['DISPO Chasse FAF', 'dispo', 'CHASSE', '0070C0'],
    T: ['DISPO Transport FAF', 'dispo', 'TRANSPORT', 'F4B183'],
    S: ['Exercice IVAO SO', 'dispo', 'EXERCICE', 'FF0000'],
    N: ['DISPO FNY', 'dispo', 'FNY', '8693A0'],
    AT: ['Contrôle IVAO civil', 'atc', 'ATC', '7030A0'],
    AM: ['Contrôle IVAO SO', 'atc', 'ATC', 'C4BD97'],
    G: ['Vol IVAO hors SO', 'occupe', null, 'FFD966'],
    DC: ['Mission DCS', 'occupe', null, '002060'],
    IR: ['MANIP IRL', 'indispo', null, 'FFFF00'],
    IN: ['INDISPO', 'indispo', null, 'BFBFBF'],
    V: ['VACANCES', 'indispo', null, 'FFC000'],
    Q: ['RÉCUP', 'indispo', null, 'C0C0C0'],
    // seconde légende (marques de suivi a posteriori) : seules, elles ne comptent pas comme disponibilité
    I: ['VOL (marque de suivi)', 'suivi', null, null],
    A: ['CONTRÔLE (marque de suivi)', 'suivi', null, null]
  };

  // Rôles (libellés affichés).
  const ROLES = {
    CHASSE: 'Chasse',
    TANKER: 'Ravitailleur',
    TRANSPORT: 'Transport',
    PARA: 'Largage (A400M, C130)',
    DETECTION: 'Détection',
    HELICO: 'Hélicoptère',
    SECU_AVION: 'Avion sécu civile',
    ECOLE: 'École',
    SECU: 'Sécu civile (code SC)',
    FNY: 'FNY (code N)',
    MARITIME: 'Maritime',
    EXERCICE: 'Exercice IVAO SO',
    TOUT: 'Tout rôle (code O)'
  };

  // Types d'aéronefs → rôles (mot-clé contenu dans la liste déclarée dans FLOTTE ou dans le texte d'un vol).
  const TYPES = [
    [/RFAL|RAFALE|RAF [BCM]\b|M2K|M2000|MIR2|MIRAGE|M2D/, 'CHASSE'],
    [/MRTT/, 'TANKER'],
    [/A400|C-?130|C160|CN-?35|CN235|A33\d|A332|TBM|DHC6|EMB121|E121|XINGU/, 'TRANSPORT'],
    [/A400|C-?130|C160/, 'PARA'],
    [/E3|AWACS|E2[CD]|MQ9|REAPER|B350|B300|B200|BE20|FA50/, 'DETECTION'],
    [/H1[2-6]\d|EC1[34]5|EC35|EC45|EC25|EC725|AS5\d|AS65|AS365|AS565|PANTHER|DAUPHIN|GAZL|NH90|PUMA|SA330|TIGR|ECUREUIL|ECUREIL|FENNEC|AS530|SA342|H160|H225|CHINOOK|CH47/, 'HELICO'],
    [/CL2T|CL415|CL 415|DH8D|DH8Q|DASHQ8|DASH 8|PELICAN|AT802/, 'SECU_AVION'],
    [/PC21|CAP10|CP10|AJET|SR2[02]|PC6/, 'ECOLE']
  ];
  // Rubriques du commentaire en fil de FLOTTE → rôle.
  const RUBRICS = {
    TRANSPORT: 'TRANSPORT',
    DETECTION: 'DETECTION',
    CHASSE: 'CHASSE',
    ECOLE: 'ECOLE',
    HELICOPTERES: 'HELICO',
    HELICOPTERE: 'HELICO',
    'SECURITE CIVILE': 'SECU_AVION',
    AUTRE: null
  };

  // Familles de missions : rôles requis tenus par des pilotes DISTINCTS ('*' : n'importe quel pilote disponible),
  // rôles pouvant rejoindre, règle en clair. TRAINING (ajoutée d'après la confrontation avec la frise S39) : un pilote
  // et au moins un contrôleur en ligne, ou un pilote déclarant un type École.
  const FAMILIES = {
    SAR: {
      needs: ['HELICO', 'HELICO'],
      joins: ['HELICO', 'SECU', 'SECU_AVION', 'DETECTION'],
      rule: '2 pilotes hélico distincts ; peuvent rejoindre : sécu civile, détection'
    },
    FIRE: {
      needs: ['SECU_AVION'],
      joins: ['SECU_AVION', 'SECU', 'HELICO'],
      rule: '1 pilote bombardier d’eau ou avion sécu (CL415, CL2T, DH8) ; peuvent rejoindre : sécu civile, hélico'
    },
    HEMS: {
      needs: ['HELICO'],
      joins: ['HELICO'],
      rule: '1 pilote hélico'
    },
    MARITIME: {
      needs: ['MARITIME'],
      joins: ['MARITIME', 'HELICO', 'DETECTION'],
      rule: '1 pilote FNY (code N) ; peuvent rejoindre : hélico, détection'
    },
    AAR: {
      needs: ['CHASSE', 'TANKER'],
      joins: ['CHASSE', 'TANKER', 'DETECTION'],
      rule: '1 chasse + 1 ravitailleur (MRTT) ; peuvent rejoindre : chasse, détection'
    },
    ISR: {
      needs: ['DETECTION', 'CHASSE'],
      joins: ['DETECTION', 'CHASSE'],
      rule: '1 détection (E-3, MQ-9, B350, FA50) + 1 chasse'
    },
    SPECIAL: {
      needs: ['CHASSE', 'CHASSE'],
      joins: ['CHASSE'],
      rule: 'patrouille de 2 chasseurs (RTBA)'
    },
    AIRBORNE: {
      needs: ['PARA', '*'],
      joins: ['PARA', 'TRANSPORT', 'CHASSE', 'HELICO'],
      rule: '1 A400M ou C130 + 1 autre pilote ; peuvent rejoindre : transport, chasse (escorte), hélico'
    },
    AIRLIFT: {
      needs: ['TRANSPORT'],
      joins: ['TRANSPORT', 'TANKER', 'PARA'],
      rule: '1 pilote transport'
    },
    TRAINING: {
      needs: ['ECOLE'],
      joins: ['ECOLE'],
      rule: 'entraînement : 1 pilote et au moins 1 contrôleur en ligne (approches, PAR, FI), ou 1 pilote déclarant un type École'
    }
  };
  // Domaine d'un code restreint : +2 au score par pilote employé dans son domaine.
  const DOMAIN = {
    SC: ['SAR', 'FIRE', 'HEMS'],
    N: ['MARITIME'],
    C: ['AAR', 'ISR', 'SPECIAL'],
    T: ['AIRLIFT', 'AIRBORNE', 'AAR']
  };

  // ------------------------------------------------------------------ outils
  /** Nom de colonne Excel (1 → A, 27 → AA). */
  const colName = n => {
    let s = '';
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };
  /** Numéro de colonne d'un nom (A → 1). */
  const colNum = s => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  /** Adresse A1 → { row, col }. */
  const parseRef = ref => {
    const m = /^([A-Z]+)(\d+)$/.exec(String(ref || '').replace(/\$/g, ''));
    return m ? {
      col: colNum(m[1]),
      row: +m[2]
    } : null;
  };
  const ref = (row, col) => colName(col) + row;
  /** Texte normalisé pour comparer des libellés (majuscules, sans accents ni espaces superflus). */
  const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  const pad = n => String(n).padStart(2, '0');
  const isoDate = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
  /** Date d'un numéro de série Excel (système 1900). */
  const serialDate = v => new Date(Date.UTC(1899, 11, 30) + Math.round(+v) * 864e5);
  /** Lundi (UTC) de la semaine ISO week de l'année ISO year. */
  function isoMonday(year, week) {
    const jan4 = new Date(Date.UTC(year, 0, 4)),
      dow = (jan4.getUTCDay() + 6) % 7;
    return addDays(jan4, -dow + (week - 1) * 7);
  }
  /** Heure décimale → « hh:mm » arrondi au quart d'heure (la frise est lue à ±15 min). */
  const hhmm = h => {
    if (h == null || !isFinite(h)) return '';
    let q = Math.round(h * 4) / 4;
    const hh = Math.floor(q),
      mm = Math.round((q - hh) * 60);
    return `${pad(((hh % 24) + 24) % 24)}:${pad(mm)}`;
  };
  const parseXml = text => {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('XML illisible dans le classeur');
    return doc;
  };
  /** Enfants directs d'un élément par nom local (sans se soucier des espaces de noms). */
  const kids = (el, name) => el ? [...el.children].filter(c => c.localName === name) : [];
  const kid = (el, name) => kids(el, name)[0] || null;
  /** Descendants par nom local. */
  const all = (el, name) => el ? [...el.getElementsByTagNameNS('*', name)] : [];
  const textOf = el => el ? all(el, 't').map(t => t.textContent).join('') : '';

  // Couleurs : ARGB → RGB, thème + teinte, classement vert / orange / rouge du texte enrichi de FLOTTE.
  const rgbOf = argb => {
    const s = String(argb || '').toUpperCase();
    return /^[0-9A-F]{8}$/.test(s) ? s.slice(2) : /^[0-9A-F]{6}$/.test(s) ? s : null;
  };

  function hexToHsl(hex) {
    const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0,
      h = !d ? 0 : (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
    return [h, s, l];
  }

  function hslToHex(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  /** Teinte Excel (tint ∈ [-1, 1]) appliquée à une couleur. */
  const tinted = (hex, tint) => {
    if (!hex || !tint) return hex;
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(h, s, tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint);
  };
  /** Niveau de maîtrise d'un type d'après la couleur du texte : vert (maîtrisé), orange (à qualifier), rouge (non). */
  function levelOfColor(hex) {
    if (!hex) return null;
    const [h, s, l] = hexToHsl(hex);
    if (s < .25 || l < .12 || l > .92) return null;
    if (h >= 70 && h <= 170) return 'vert';
    if (h > 12 && h < 60) return 'orange';
    if (h <= 12 || h >= 330) return 'rouge';
    return null;
  }

  // ------------------------------------------------------------------ lecture du classeur
  /** Ouvre un classeur .xlsx (Blob, File, ArrayBuffer) : feuilles, textes partagés, styles, formes, commentaires. */
  async function openWorkbook(input) {
    if (!window.ZipStore) throw new Error('Lecteur ZIP absent (shared/zip_store.js).');
    let entries;
    try {
      entries = await window.ZipStore.read(input);
    } catch (e) {
      throw new Error(`Ce fichier n’est pas un classeur .xlsx lisible (${e.message}).`);
    }
    const files = new Map(entries.map(e => [e.name.replace(/^\/+/, ''), e]));
    const cache = new Map();
    /** Document XML d'une partie du paquet (null si absente). */
    const xml = async path => {
      if (!files.has(path)) return null;
      if (!cache.has(path)) cache.set(path, parseXml(await files.get(path).text()));
      return cache.get(path);
    };
    /** Chemin résolu d'une cible de relation, relative à la partie source. */
    const resolve = (from, target) => {
      if (target.startsWith('/')) return target.slice(1);
      const parts = from.split('/').slice(0, -1);
      for (const p of target.split('/')) {
        if (p === '..') parts.pop();
        else if (p && p !== '.') parts.push(p);
      }
      return parts.join('/');
    };
    /** Relations d'une partie : [{ id, type, target (chemin résolu) }]. */
    const rels = async path => {
      const dir = path.split('/').slice(0, -1).join('/'),
        name = path.split('/').pop();
      const doc = await xml(`${dir ? dir + '/' : ''}_rels/${name}.rels`);
      return doc ? all(doc, 'Relationship').filter(r => r.getAttribute('TargetMode') !== 'External')
        .map(r => ({
          id: r.getAttribute('Id'),
          type: r.getAttribute('Type') || '',
          target: resolve(path, r.getAttribute('Target') || '')
        })) : [];
    };
    const wb = await xml('xl/workbook.xml');
    if (!wb) throw new Error('Ce fichier n’est pas un classeur Excel (.xlsx) : xl/workbook.xml absent.');
    const wbRels = await rels('xl/workbook.xml');

    // textes partagés, avec les passages en couleur (texte enrichi)
    const ssPath = wbRels.find(r => /\/sharedStrings$/.test(r.type))?.target || 'xl/sharedStrings.xml';
    const ssDoc = await xml(ssPath);
    const shared = ssDoc ? kids(ssDoc.documentElement, 'si').map(si => {
      const runs = kids(si, 'r').map(r => ({
        text: textOf(r),
        color: rgbOf(kid(kid(r, 'rPr'), 'color')?.getAttribute('rgb'))
      }));
      return {
        text: runs.length ? runs.map(r => r.text).join('') : kids(si, 't').map(t => t.textContent).join(''),
        runs
      };
    }) : [];

    // thème (couleurs de base) et styles (remplissages des cellules, formats différentiels de la mise en forme conditionnelle)
    const themeDoc = await xml(wbRels.find(r => /\/theme$/.test(r.type))?.target || 'xl/theme/theme1.xml');
    const scheme = themeDoc ? all(themeDoc, 'clrScheme')[0] : null;
    const schemeColors = scheme ? [...scheme.children].map(c => {
      const x = c.firstElementChild;
      return x ? rgbOf(x.getAttribute('lastClr') || x.getAttribute('val')) : null;
    }) : [];
    // index de thème Excel : 0 lt1, 1 dk1, 2 lt2, 3 dk2, 4-9 accent1-6 (le schéma liste dk1, lt1, dk2, lt2…)
    const themeColor = i => schemeColors[[1, 0, 3, 2][i] ?? i] || null;
    const colorOf = el => {
      if (!el) return null;
      const t = el.getAttribute('tint') ? +el.getAttribute('tint') : 0;
      if (el.getAttribute('rgb')) return tinted(rgbOf(el.getAttribute('rgb')), t);
      if (el.getAttribute('theme') != null) return tinted(themeColor(+el.getAttribute('theme')), t);
      return null;
    };
    const stDoc = await xml(wbRels.find(r => /\/styles$/.test(r.type))?.target || 'xl/styles.xml');
    const fills = stDoc ? kids(all(stDoc, 'fills')[0], 'fill').map(f => {
      const p = kid(f, 'patternFill');
      const type = p?.getAttribute('patternType');
      if (!p || !type || type === 'none') return null;
      return colorOf(kid(p, 'fgColor')) || colorOf(kid(p, 'bgColor')) || 'motif';
    }) : [];
    const xfFill = stDoc ? kids(all(stDoc, 'cellXfs')[0], 'xf').map(x => fills[+(x.getAttribute('fillId') || 0)] || null) : [];
    const dxfs = stDoc ? kids(all(stDoc, 'dxfs')[0], 'dxf').map(d => {
      const f = kid(d, 'fill'),
        p = kid(f, 'patternFill');
      return colorOf(kid(p, 'bgColor')) || colorOf(kid(p, 'fgColor'));
    }) : [];

    // propriétés du document (date de modification : année de repli)
    const core = await xml('docProps/core.xml');
    const modified = core ? all(core, 'modified')[0]?.textContent || '' : '';

    const sheets = all(wb, 'sheet').map(s => {
      const rid = s.getAttribute('r:id') || [...s.attributes].find(a => a.localName === 'id')?.value;
      return {
        name: s.getAttribute('name') || '',
        path: wbRels.find(r => r.id === rid)?.target || ''
      };
    });
    const loaded = new Map();
    /** Feuille par nom (ou par test) : cellules, fusions, hauteurs, formes, commentaires. */
    async function sheet(test) {
      const info = sheets.find(s => typeof test === 'function' ? test(s.name) : s.name === test);
      if (!info || !info.path) return null;
      if (!loaded.has(info.path)) loaded.set(info.path, await loadSheet(info));
      return loaded.get(info.path);
    }
    async function loadSheet(info) {
      const doc = await xml(info.path);
      if (!doc) return null;
      const root = doc.documentElement;
      const cells = new Map();
      for (const c of all(root, 'c')) {
        const p = parseRef(c.getAttribute('r'));
        if (!p) continue;
        const t = c.getAttribute('t'),
          v = kid(c, 'v'),
          s = +(c.getAttribute('s') || 0);
        let value = null,
          rich = null;
        if (t === 's' && v) {
          const x = shared[+v.textContent];
          value = x ? x.text : '';
          rich = x && x.runs.length ? x.runs : null;
        } else if (t === 'inlineStr') value = textOf(kid(c, 'is'));
        else if (v) value = t === 'str' || t === 'e' ? v.textContent : t === 'b' ? v.textContent === '1' : (isFinite(+v.textContent) ? +v.textContent : v.textContent);
        cells.set(`${p.row},${p.col}`, {
          value,
          rich,
          fill: xfFill[s] || null,
          style: s
        });
      }
      const merges = all(root, 'mergeCell').map(m => {
        const [a, b] = (m.getAttribute('ref') || '').split(':').map(parseRef);
        return a ? {
          r0: a.row,
          c0: a.col,
          r1: (b || a).row,
          c1: (b || a).col
        } : null;
      }).filter(Boolean);
      // géométrie : hauteurs de lignes (points) et largeurs de colonnes (caractères) → EMU
      const fmt = kid(root, 'sheetFormatPr');
      const defRow = +(fmt?.getAttribute('defaultRowHeight') || 15),
        defCol = +(fmt?.getAttribute('defaultColWidth') || fmt?.getAttribute('baseColWidth') || 8.43);
      const rowHt = new Map(all(root, 'row').filter(r => r.getAttribute('ht')).map(r => [+r.getAttribute('r'), +r.getAttribute('ht')]));
      const cols = all(root, 'col').map(c => ({
        min: +c.getAttribute('min'),
        max: +c.getAttribute('max'),
        width: +(c.getAttribute('width') || defCol)
      }));
      const tops = [0];
      /** Haut de la ligne (0-based) en EMU. */
      const rowTop = r => {
        while (tops.length <= r) {
          const i = tops.length - 1;
          tops.push(tops[i] + (rowHt.get(i + 1) ?? defRow) * 12700);
        }
        return tops[r];
      };
      /** Largeur de la colonne (0-based) en EMU (largeur Excel → pixels, police de 7 px). */
      const colEmu = c => {
        const w = cols.find(x => c + 1 >= x.min && c + 1 <= x.max)?.width ?? defCol;
        return Math.max(1, Math.trunc((256 * w + Math.trunc(128 / 7)) / 256 * 7)) * 9525;
      };
      // mise en forme conditionnelle : texte du code → couleur (formats différentiels)
      const cf = all(root, 'conditionalFormatting').map(f => ({
        sqref: f.getAttribute('sqref') || kid(f, 'sqref')?.textContent || '',
        rules: all(f, 'cfRule').map(r => ({
          type: r.getAttribute('type'),
          text: r.getAttribute('text'),
          priority: +(r.getAttribute('priority') || 0),
          color: r.getAttribute('dxfId') != null ? dxfs[+r.getAttribute('dxfId')] : null
        }))
      }));
      const sRels = await rels(info.path);
      // formes du dessin (zones de texte : trigrammes, vols, indicatifs…)
      const shapes = [];
      for (const rel of sRels.filter(r => /\/drawing$/.test(r.type))) {
        const d = await xml(rel.target);
        if (!d) continue;
        for (const anc of [...d.documentElement.children]) {
          if (!/Anchor$/.test(anc.localName) || anc.localName === 'absoluteAnchor') continue;
          const pos = e => e && {
            col: +(kid(e, 'col')?.textContent || 0),
            colOff: +(kid(e, 'colOff')?.textContent || 0),
            row: +(kid(e, 'row')?.textContent || 0),
            rowOff: +(kid(e, 'rowOff')?.textContent || 0)
          };
          const from = pos(kid(anc, 'from'));
          if (!from) continue;
          let to = pos(kid(anc, 'to'));
          const ext = kid(anc, 'ext');
          const paras = [...anc.getElementsByTagNameNS(NS_A, 'p')].map(p => [...p.getElementsByTagNameNS(NS_A, 't')].map(t => t.textContent).join('').trim());
          const spPr = all(anc, 'spPr')[0],
            solid = spPr && kid(spPr, 'solidFill');
          const clr = (solid || anc).getElementsByTagNameNS(NS_A, 'srgbClr')[0];
          shapes.push({
            from,
            to,
            ext: ext ? {
              cx: +ext.getAttribute('cx'),
              cy: +ext.getAttribute('cy')
            } : null,
            paras: paras.filter(Boolean),
            text: paras.filter(Boolean).join(' | '),
            fill: clr ? rgbOf(clr.getAttribute('val')) : null
          });
        }
      }
      // commentaires (classiques et en fil) : auteur retiré du texte (le pilote est celui de la ligne)
      const comments = new Map();
      for (const rel of sRels.filter(r => /\/comments$/.test(r.type))) {
        const d = await xml(rel.target);
        if (!d) continue;
        const authors = all(d, 'author').map(a => a.textContent || '');
        for (const c of all(d, 'comment')) {
          const body = kid(c, 'text'),
            runs = kids(body, 'r');
          // Excel pose le nom de l'auteur en tête, en gras et suivi de « : » : retiré
          const first = runs[0],
            lead = first && kid(kid(first, 'rPr'), 'b') && /:\s*$/.test(textOf(first)) ? runs.slice(1) : runs;
          let text = (runs.length ? lead.map(textOf).join('') : textOf(body)).replace(/\r\n?/g, '\n').trim();
          const author = authors[+(c.getAttribute('authorId') || 0)] || '';
          if (author && !author.startsWith('tc=') && text.startsWith(author + ':')) text = text.slice(author.length + 1).trim();
          if (/^\[Threaded comment\]/i.test(text)) continue; // copie d'un commentaire en fil (lu ci-dessous)
          comments.set(c.getAttribute('ref'), text);
        }
      }
      for (const rel of sRels.filter(r => /threadedComment$/i.test(r.type))) {
        const d = await xml(rel.target);
        if (!d) continue;
        const byId = new Map();
        for (const c of all(d, 'threadedComment')) {
          const text = (kid(c, 'text')?.textContent || '').replace(/\r\n?/g, '\n').trim(),
            parent = c.getAttribute('parentId');
          if (parent && byId.has(parent)) {
            const root0 = byId.get(parent);
            comments.set(root0, `${comments.get(root0)}\n— ${text}`);
            continue;
          }
          byId.set(c.getAttribute('id'), c.getAttribute('ref'));
          comments.set(c.getAttribute('ref'), text);
        }
      }
      const get = (row, col) => cells.get(`${row},${col}`) || null;
      return {
        name: info.name,
        cells,
        merges,
        shapes,
        comments,
        cf,
        rowTop,
        colEmu,
        get,
        /** Valeur d'une cellule (null si vide). */
        value: (row, col) => get(row, col)?.value ?? null,
        /** Texte d'une cellule (chaîne, '' si vide). */
        text: (row, col) => {
          const v = get(row, col)?.value;
          return v == null ? '' : String(v);
        },
        /** Ligne (1-based) qui contient le centre vertical d'une forme. */
        centerRow(sh) {
          const y0 = rowTop(sh.from.row) + sh.from.rowOff;
          const y1 = sh.to ? rowTop(sh.to.row) + sh.to.rowOff : y0 + (sh.ext?.cy || 0);
          const cy = (y0 + y1) / 2;
          let r = sh.from.row;
          while (rowTop(r + 1) <= cy) r++;
          return r + 1;
        }
      };
    }
    return {
      sheets,
      sheet,
      modified,
      files: [...files.keys()]
    };
  }

  // ------------------------------------------------------------------ extraction
  /** Normalisation d'un code de la grille : sans espaces, en majuscules ; null si vide. */
  const normCode = v => {
    if (v == null) return null;
    const s = String(v).replace(/\s+/g, '').toUpperCase();
    return s || null;
  };

  /** Légende effective : défauts + légende lue dans la feuille (« Code couleur ») + couleurs de la mise en forme conditionnelle. */
  function readLegend(sh, notes) {
    const legend = Object.fromEntries(Object.entries(LEGEND).map(([k, v]) => [k, {
      code: k,
      sens: v[0],
      categorie: v[1],
      role: v[2],
      couleur: v[3],
      source: 'défaut'
    }]));
    let anchor = null;
    for (const [k, c] of sh.cells)
      if (typeof c.value === 'string' && fold(c.value) === 'CODE COULEUR') {
        const [row, col] = k.split(',').map(Number);
        anchor = {
          row,
          col
        };
        break;
      }
    if (anchor) {
      let gap = 0;
      for (let r = anchor.row + 1; r <= anchor.row + 30 && gap < 3; r++) {
        const code = normCode(sh.value(r, anchor.col));
        if (!code || code.length > 3) {
          gap++;
          continue;
        }
        gap = 0;
        let sens = '';
        for (let c = anchor.col + 1; c <= anchor.col + 5 && !sens; c++) sens = sh.text(r, c).trim();
        if (legend[code]) {
          if (sens) legend[code].sens = sens;
          legend[code].source = 'fichier';
          continue;
        }
        const f = fold(sens);
        const cat = /INDISPO|VACANCE|RECUP|IRL|ABSENT/.test(f) ? 'indispo' : /^DISPO/.test(f) ? 'dispo' : /CONTROLE/.test(f) ? 'atc' : 'occupe';
        legend[code] = {
          code,
          sens: sens || code,
          categorie: cat,
          role: cat === 'atc' ? 'ATC' : null,
          couleur: null,
          source: 'fichier'
        };
        notes.push({
          niveau: 'info',
          texte: `Légende : code « ${code} » (${sens || 'sans libellé'}) ajouté au fichier, lu comme « ${CATEGORIES[cat]} ».`
        });
      }
    } else notes.push({
      niveau: 'warn',
      texte: 'Légende « Code couleur » introuvable : légende par défaut appliquée.'
    });
    // couleurs réelles de la grille : règles « commence par » / « contient » de la mise en forme conditionnelle
    for (const f of sh.cf)
      for (const r of f.rules) {
        const code = normCode(r.text);
        if (code && r.color && legend[code]) legend[code].couleur = r.color;
      }
    return legend;
  }

  /** Code d'une case → { code, marque, sens, categorie, role }. Une marque de suivi I / A / Q accolée (« OI ») est acceptée. */
  function resolveCode(raw, legend, settings) {
    const code = normCode(raw);
    if (!code) return {
      code: null,
      marque: null,
      sens: null,
      categorie: settings.emptyAs === 'indispo' ? 'indispo' : 'inconnu',
      role: null,
      vide: true
    };
    let e = legend[code],
      marque = null;
    if (!e && code.length > 1 && /[IAQ]$/.test(code) && legend[code.slice(0, -1)] && legend[code.slice(0, -1)].categorie !== 'suivi') {
      e = legend[code.slice(0, -1)];
      marque = code.slice(-1);
    }
    if (!e) return {
      code,
      marque: null,
      sens: null,
      categorie: 'hors_legende',
      role: null
    };
    return {
      code: e.code,
      marque,
      sens: e.sens,
      categorie: e.categorie,
      role: e.role
    };
  }

  /** Rôles d'un texte de types d'aéronefs (mots-clés). */
  function rolesOfTypes(text) {
    const up = fold(text),
      out = new Set();
    for (const [re, role] of TYPES)
      if (re.test(up)) out.add(role);
    return out;
  }

  /** Lecture de la feuille FLOTTE : profils par trigramme (types, niveaux, rôles, simulateurs). */
  function readFlotte(sh, settings, notes) {
    const profiles = {};
    if (!sh) {
      notes.push({
        niveau: 'warn',
        texte: 'Feuille FLOTTE absente : rôles et simulateurs inconnus (seuls les codes de la grille comptent).'
      });
      return profiles;
    }
    // en-tête : « Individu » / « Avions disponibles » puis les simulateurs
    let head = null;
    for (const [k, c] of sh.cells)
      if (typeof c.value === 'string' && /AVIONS/.test(fold(c.value))) {
        const [row, col] = k.split(',').map(Number);
        if (!head || row < head.row) head = {
          row,
          col
        };
      }
    if (!head) {
      notes.push({
        niveau: 'warn',
        texte: 'FLOTTE : en-tête « Avions disponibles » introuvable, feuille ignorée.'
      });
      return profiles;
    }
    const sims = [];
    for (let c = head.col + 1, gap = 0; c <= head.col + 20 && gap < 2; c++) {
      const t = sh.text(head.row, c).trim();
      if (!t) {
        gap++;
        continue;
      }
      gap = 0;
      sims.push({
        col: c,
        name: t
      });
    }
    // fin du tableau : cellule « Légende » sous l'en-tête (sinon 200 lignes)
    let end = head.row + 200;
    for (const [k, c] of sh.cells) {
      const [row, col] = k.split(',').map(Number);
      if (col < head.col && row > head.row && typeof c.value === 'string' && fold(c.value) === 'LEGENDE') end = Math.min(end, row - 1);
    }
    const rows = new Map();
    for (const s of sh.shapes) {
      if (s.from.col >= head.col - 1 || !/^[A-Z]{3}$/.test(s.text)) continue;
      const row = sh.centerRow(s);
      if (row <= head.row || row > end) continue;
      if (rows.has(row)) notes.push({
        niveau: 'warn',
        texte: `FLOTTE ligne ${row} : deux trigrammes (${rows.get(row)}, ${s.text}) ; le premier est gardé.`
      });
      else rows.set(row, s.text);
    }
    for (let row = head.row + 1; row <= end; row++) {
      const tri = rows.get(row),
        cell = sh.get(row, head.col),
        text = cell ? String(cell.value ?? '') : '';
      if (!tri) {
        if (text.trim() && text.trim() !== '///') notes.push({
          niveau: 'info',
          texte: `FLOTTE ligne ${row} : types déclarés sans trigramme (${ref(row, head.col)}), ligne ignorée.`
        });
        continue;
      }
      if (profiles[tri]) {
        notes.push({
          niveau: 'warn',
          texte: `FLOTTE : trigramme ${tri} en double (lignes ${profiles[tri].ligne} et ${row}) ; la première ligne est gardée.`
        });
        continue;
      }
      // niveaux par type d'après les passages colorés du texte enrichi
      const levels = {};
      for (const run of cell?.rich || []) {
        const lvl = levelOfColor(run.color);
        for (const tok of run.text.split(/[\/,;+\n]+/).map(fold).filter(t => t.length > 1))
          if (lvl) levels[tok] = lvl;
      }
      const comment = sh.comments.get(ref(row, head.col)) || '';
      // rubriques du commentaire en fil : « TRANSPORT : A400M / C130 »
      const rubrics = {};
      for (const line of comment.split('\n')) {
        const m = /^\s*([A-Za-zÀ-ÿ ]+?)\s*:\s*(.*)$/.exec(line);
        if (!m) continue;
        const key = fold(m[1]);
        if (key in RUBRICS) rubrics[key] = m[2].split(/[\/,;+]+/).map(fold).filter(Boolean);
      }
      const keep = tok => {
        const l = levels[tok];
        return settings.flotteLevel === 'all' ? true : settings.flotteLevel === 'green' ? !l || l === 'vert' : l !== 'rouge';
      };
      const tokens = [...new Set([...text.split(/[\/,;+\n]+/).map(fold), ...Object.values(rubrics).flat()].filter(t => t && t !== '///' && t.length > 1))];
      const kept = tokens.filter(keep);
      const roles = rolesOfTypes(kept.join(' / '));
      for (const [key, list] of Object.entries(rubrics))
        if (RUBRICS[key] && list.some(keep)) roles.add(RUBRICS[key]);
      const simList = [],
        simNotes = [];
      for (const s of sims) {
        const v = sh.text(row, s.col).trim();
        if (/^x/i.test(v)) simList.push(s.name);
        else if (v) simNotes.push(`${s.name} : ${v}`);
      }
      profiles[tri] = {
        trigramme: tri,
        ligne: row,
        types: tokens.map(t => ({
          type: t,
          niveau: levels[t] || null,
          retenu: keep(t)
        })),
        roles: [...roles].sort(),
        sims: simList,
        simNotes,
        rubriques: Object.keys(rubrics).length > 0,
        vide: !tokens.length
      };
      if (!tokens.length) notes.push({
        niveau: 'info',
        texte: `FLOTTE : ${tri} n’a déclaré aucun type (rôles inconnus).`
      });
    }
    return profiles;
  }

  /** Extraction complète du classeur (feuille ODV + FLOTTE) selon les réglages. */
  async function extract(book, settings = {}, fileName = '') {
    settings = {
      ...DEFAULTS,
      ...settings
    };
    const notes = [];
    const odv = await book.sheet(n => /^ODV/i.test(n.trim())) || await book.sheet(book.sheets[0]?.name);
    if (!odv) throw new Error('Feuille ODV introuvable dans le classeur.');
    const flotte = await book.sheet(n => /FLOTTE/i.test(n));
    const legend = readLegend(odv, notes);

    // jours : libellés LUNDI…DIMANCHE sur une même ligne, dans la partie gauche de la feuille
    const dayCols = {};
    let dayRow = null;
    for (let r = 1; r <= 12 && dayRow == null; r++) {
      const found = {};
      for (let c = 1; c <= 60; c++) {
        const i = DAYS.map(fold).indexOf(fold(odv.text(r, c)));
        if (i >= 0 && !(i in found)) found[i] = c;
      }
      if (Object.keys(found).length >= 5) {
        dayRow = r;
        Object.assign(dayCols, found);
      }
    }
    if (dayRow == null) {
      dayRow = 4;
      notes.push({
        niveau: 'warn',
        texte: 'Ligne des jours (LUNDI…DIMANCHE) introuvable : grille supposée en D4:X (3 colonnes par jour).'
      });
    }
    const dayStart = DAYS.map((_, j) => dayCols[j] ?? (dayCols[0] ? dayCols[0] + 3 * j : 4 + 3 * j));
    const firstGridCol = dayStart[0];

    // semaine : nombre à droite du « S » de la ligne 1 (sinon D1, sinon le nom du fichier)
    let week = null;
    for (let r = 1; r < dayRow && week == null; r++)
      for (let c = 1; c <= 6; c++)
        if (fold(odv.text(r, c)) === 'S') {
          for (let c2 = c + 1; c2 <= c + 8; c2++) {
            const v = odv.value(r, c2);
            if (typeof v === 'number' && v >= 1 && v <= 53) {
              week = v;
              break;
            }
          }
          break;
        }
    if (week == null && typeof odv.value(1, 4) === 'number') week = odv.value(1, 4);
    if (week == null) {
      const m = /S(\d{1,2})(?!\d)/i.exec(fileName);
      if (m) {
        week = +m[1];
        notes.push({
          niveau: 'warn',
          texte: `N° de semaine absent de la feuille : S${week} pris dans le nom du fichier.`
        });
      }
    }
    if (week == null) notes.push({
      niveau: 'warn',
      texte: 'N° de semaine introuvable : dates non calculées.'
    });

    // frise horaire : blocs « VOLS » (un par jour), heures en ligne sous-jacente
    const frise = readFriseLayout(odv, firstGridCol + 21);
    // date saisie sur la frise (1er bloc) → année et contrôle du décalage
    let friseDate = null;
    if (frise)
      for (let r = 1; r <= frise.hourRow && !friseDate; r++)
        for (let c = frise.start; c < frise.start + frise.blockW; c++) {
          const v = odv.value(r, c);
          if (typeof v === 'number' && v > 20000 && v < 80000) {
            friseDate = serialDate(v);
            break;
          }
        }
    const modified = book.modified ? new Date(book.modified) : null;
    const refDate = friseDate || (modified && !isNaN(modified) ? modified : new Date());
    let monday = null,
      offset = 0;
    if (week != null && !friseDate) notes.push({
      niveau: 'info',
      texte: `Pas de date sur la frise : année de la semaine S${week} déduite ${modified && !isNaN(modified) ? 'de la date d’enregistrement du fichier' : 'de la date du jour'} (semaine la plus proche).`
    });
    if (week != null) {
      const y = refDate.getUTCFullYear();
      monday = [y - 1, y, y + 1].map(yy => isoMonday(yy, week)).sort((a, b) => Math.abs(a - refDate) - Math.abs(b - refDate))[0];
      if (friseDate) {
        offset = Math.round((friseDate - monday) / 864e5);
        if (offset) {
          const fr = friseDate.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC'
          });
          notes.push({
            niveau: 'warn',
            decalage: true,
            texte: `Date décalée : la frise indique « LUNDI » au ${fr}, alors que la semaine ISO ${week} commence le ${monday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })} (écart de ${offset > 0 ? '+' : ''}${offset} j). Dates retenues : ${settings.dateSource === 'frise' ? 'celles de la frise' : 'semaine ISO'} (réglable).`
          });
        }
      }
    }
    const lundi = monday ? (settings.dateSource === 'frise' && friseDate ? friseDate : monday) : null;
    const dateOf = j => lundi ? isoDate(addDays(lundi, j)) : '';

    // pilotes : zones de texte de trois lettres sur les colonnes avant la grille, rattachées à la ligne de leur centre
    let maxRow = dayRow + 80;
    for (const f of odv.cf)
      for (const part of f.sqref.split(/\s+/)) {
        const [a, b] = part.split(':').map(parseRef);
        if (a && b && a.col <= firstGridCol && b.col >= firstGridCol + 20) maxRow = Math.min(maxRow, b.row);
      }
    const byRow = new Map();
    for (const s of odv.shapes) {
      if (s.from.col >= firstGridCol - 1 || !/^[A-Z]{3}$/.test(s.text)) continue;
      const row = odv.centerRow(s);
      if (row <= dayRow || row > maxRow) continue;
      if (byRow.has(row)) {
        notes.push({
          niveau: 'warn',
          texte: `Ligne ${row} : deux trigrammes superposés (${byRow.get(row).trigramme}, ${s.text}) ; le premier est gardé.`
        });
        continue;
      }
      byRow.set(row, {
        trigramme: s.text,
        couleur: s.fill,
        ligne: row
      });
    }
    const seen = new Map();
    const pilots = [...byRow.values()].sort((a, b) => a.ligne - b.ligne).filter(p => {
      if (seen.has(p.trigramme)) {
        notes.push({
          niveau: 'warn',
          texte: `Trigramme ${p.trigramme} en double (lignes ${seen.get(p.trigramme)} et ${p.ligne}) : seule la première ligne est lue.`
        });
        return false;
      }
      seen.set(p.trigramme, p.ligne);
      return true;
    });
    if (!pilots.length) notes.push({
      niveau: 'warn',
      texte: 'Aucun trigramme trouvé (zones de texte des colonnes A:C) : le fichier a peut-être perdu ses formes (enregistrement LibreOffice ou Google Sheets).'
    });
    const firstPilotRow = pilots.length ? pilots[0].ligne : dayRow + 5,
      lastShapeRow = Math.max(dayRow, ...byRow.keys());
    // lignes de la grille remplies sans trigramme (jusqu'à 5 lignes sous le dernier trigramme)
    for (let r = firstPilotRow; r <= Math.min(maxRow, lastShapeRow + 5); r++) {
      if (byRow.has(r)) continue;
      const any = DAYS.some((_, j) => [0, 1, 2].some(k => normCode(odv.value(r, dayStart[j] + k))));
      if (any) notes.push({
        niveau: 'warn',
        texte: `Ligne ${r} : codes saisis sans trigramme, ligne ignorée.`
      });
    }

    // grille : un enregistrement par pilote, jour et créneau
    const records = [];
    for (const p of pilots) {
      let filled = 0;
      for (let j = 0; j < 7; j++)
        for (let k = 0; k < 3; k++) {
          const col = dayStart[j] + k,
            raw = odv.value(p.ligne, col),
            a = ref(p.ligne, col);
          const r = resolveCode(raw, legend, settings);
          if (raw != null && String(raw).length && r.vide) notes.push({
            niveau: 'info',
            texte: `${p.trigramme} ${a} : case qui paraît vide mais contient ${JSON.stringify(String(raw))} (lue comme vide).`
          });
          if (r.categorie === 'hors_legende') notes.push({
            niveau: 'warn',
            texte: `${p.trigramme} ${a} : code hors légende « ${raw} ».`
          });
          if (!r.vide) filled++;
          records.push({
            semaine: week,
            date: dateOf(j),
            jourIndex: j,
            jour: DAYS[j],
            creneauIndex: k,
            creneau: SLOTS[k],
            pilote: p.trigramme,
            couleur_pilote: p.couleur,
            code_brut: raw == null ? null : String(raw),
            code: r.code,
            marque: r.marque,
            sens: r.sens,
            categorie: r.categorie,
            role_impose: r.role,
            commentaire: odv.comments.get(a) || null,
            source: `ODV!${a}`
          });
        }
      p.rempli = filled > 0;
      p.cases = filled;
    }

    // lignes de groupe (IVAO FR, IVAO SO, DEFA…) : événements portés par la couleur de fond
    const events = [];
    for (let r = dayRow + 1; r < firstPilotRow; r++) {
      let label = '';
      for (let c = 1; c < firstGridCol && !label; c++) label = odv.text(r, c).trim();
      if (!label) continue;
      const row = [];
      for (let j = 0; j < 7; j++)
        for (let k = 0; k < 3; k++) {
          const col = dayStart[j] + k,
            cell = odv.get(r, col),
            a = ref(r, col),
            comment = odv.comments.get(a) || null;
          if (cell?.fill || comment) row.push({
            groupe: label,
            jourIndex: j,
            jour: DAYS[j],
            date: dateOf(j),
            creneauIndex: k,
            creneau: SLOTS[k],
            couleur: cell?.fill && cell.fill !== 'motif' ? cell.fill : null,
            commentaire: comment,
            source: `ODV!${a}`,
            recurrent: false
          });
        }
      // même créneau coloré les 7 jours, sans commentaire : habillage probable
      for (let k = 0; k < 3; k++) {
        const same = row.filter(e => e.creneauIndex === k && !e.commentaire);
        if (same.length === 7) same.forEach(e => {
          e.recurrent = true;
        });
      }
      events.push(...row);
    }

    // officier de permanence (zone de texte de trois lettres en haut de la feuille) et thème de la semaine
    const duty = odv.shapes.find(s => /^[A-Z]{3}$/.test(s.text) && s.from.row < dayRow - 1 && s.from.col >= firstGridCol - 1 && s.from.col < firstGridCol + 21)?.text || null;
    const themeShape = odv.shapes.find(s => /^TH[EÈ]ME/i.test(fold(s.text)));
    const theme = themeShape ? themeShape.paras.join('\n') : null;

    // frise horaire : vols, contrôles et divers, zones à activer
    const timeline = frise ? readTimeline(odv, frise, dateOf) : {
      vols: [],
      autres: [],
      zones: []
    };
    if (!frise) notes.push({
      niveau: 'info',
      texte: 'Frise horaire (blocs « VOLS ») introuvable : pas de vols planifiés.'
    });

    // FLOTTE : profils, puis concordance des trigrammes
    const profiles = readFlotte(flotte, settings, notes);
    if (flotte) {
      const odvSet = new Set(pilots.map(p => p.trigramme));
      const onlyOdv = pilots.filter(p => !profiles[p.trigramme]).map(p => p.trigramme),
        onlyFl = Object.keys(profiles).filter(t => !odvSet.has(t));
      if (onlyOdv.length) notes.push({
        niveau: 'info',
        texte: `Présents dans ODV mais pas dans FLOTTE : ${onlyOdv.join(', ')}.`
      });
      if (onlyFl.length) notes.push({
        niveau: 'info',
        texte: `Présents dans FLOTTE mais pas dans ODV : ${onlyFl.join(', ')}.`
      });
    }
    for (const p of pilots) p.profil = profiles[p.trigramme] || null;

    return {
      fichier: fileName,
      semaine: week,
      annee: monday ? isoYear(monday) : null,
      lundiIso: monday ? isoDate(monday) : null,
      friseLundi: friseDate ? isoDate(friseDate) : null,
      decalageJours: offset,
      lundi: lundi ? isoDate(lundi) : null,
      dateSource: settings.dateSource,
      dates: DAYS.map((_, j) => dateOf(j)),
      duty,
      theme,
      legende: legend,
      pilotes: pilots,
      records,
      evenements: events,
      vols: timeline.vols,
      frise: timeline.autres,
      zones: timeline.zones,
      flotte: profiles,
      anomalies: notes,
      lecture: {
        feuilleOdv: odv.name,
        feuilleFlotte: flotte?.name || null,
        ligneJours: dayRow,
        colonnesJours: dayStart.map(colName),
        grille: `${colName(dayStart[0])}:${colName(dayStart[6] + 2)}`,
        frise: frise ? {
          debut: colName(frise.start),
          largeurJour: frise.blockW,
          colonnesParHeure: frise.perHour
        } : null
      }
    };
  }
  const isoYear = d => addDays(d, 3).getUTCFullYear();

  /** Disposition de la frise : 1re colonne, largeur d'un jour, colonne de l'heure 0, colonnes par heure, couloirs. */
  function readFriseLayout(sh, fromCol) {
    const vols = [];
    for (const [k, c] of sh.cells) {
      const [row, col] = k.split(',').map(Number);
      if (col >= fromCol && row <= 12 && typeof c.value === 'string' && fold(c.value) === 'VOLS') vols.push({
        row,
        col
      });
    }
    if (!vols.length) return null;
    const row = Math.min(...vols.map(v => v.row)),
      starts = vols.filter(v => v.row === row).map(v => v.col).sort((a, b) => a - b);
    const start = starts[0],
      blockW = starts.length > 1 ? starts[1] - starts[0] : 96;
    let h0 = null,
      h1 = null;
    for (let c = start; c < start + blockW; c++) {
      const v = sh.value(row, c);
      if (v === 0 && h0 == null) h0 = c;
      else if (v === 1 && h0 != null) {
        h1 = c;
        break;
      }
    }
    const perHour = h0 != null && h1 != null ? h1 - h0 : 4;
    // couloirs : libellés de la colonne de titre (VOLS, CONTRÔLE, DIVERS) et leurs fusions
    const lanes = [];
    for (const m of sh.merges)
      if (m.c0 === start && m.r0 >= row) lanes.push({
        r0: m.r0,
        r1: m.r1,
        label: sh.text(m.r0, m.c0).trim() || 'VOLS'
      });
    if (!lanes.length) lanes.push({
      r0: row,
      r1: row + 200,
      label: 'VOLS'
    });
    lanes.sort((a, b) => a.r0 - b.r0);
    return {
      start,
      blockW,
      hour0: h0 ?? start + 3,
      perHour,
      hourRow: row,
      lanes
    };
  }

  /** Vols (formes « DEP-ARR | appareil | objet »), autres éléments (contrôles, sessions ATC), zones, avec l'équipage posé à côté. */
  function readTimeline(sh, f, dateOf) {
    const items = [];
    for (const s of sh.shapes) {
      if (s.from.col + 1 < f.start || !s.text || !s.to) continue;
      const rel0 = s.from.col + 1 - f.start,
        day = Math.floor(rel0 / f.blockW);
      if (day > 6) continue;
      const base = f.hour0 - f.start;
      const h0 = ((rel0 % f.blockW) - base + s.from.colOff / sh.colEmu(s.from.col)) / f.perHour;
      const rel1 = s.to.col + 1 - f.start;
      const h1 = ((rel1 % f.blockW) - base + s.to.colOff / sh.colEmu(s.to.col)) / f.perHour + (Math.floor(rel1 / f.blockW) - day) * 24;
      items.push({
        jourIndex: day,
        h0,
        h1,
        r0: s.from.row + 1,
        r1: s.to.row + 1,
        text: s.text,
        paras: s.paras,
        fill: s.fill
      });
    }
    const isTag = t => /^[A-Z]{3}$/.test(t.text),
      isCallsign = t => /^[A-Z][A-Z-]*\s*\d{2,4}$/.test(t.text);
    const tags = items.filter(isTag),
      calls = items.filter(isCallsign);
    const laneOf = r => f.lanes.find(l => r >= l.r0 && r <= l.r1)?.label || '';
    const crewOf = it => [...new Set(tags.filter(t => t.jourIndex === it.jourIndex && t.r0 >= it.r0 - 1 && t.r0 <= it.r1 && t.h0 >= it.h0 - 1.5 && t.h0 <= it.h1).map(t => t.text))].sort();
    const vols = [],
      autres = [];
    for (const it of items) {
      if (isTag(it) || isCallsign(it)) continue;
      const lane = laneOf(it.r0);
      if (it.text.includes('|') && /^[A-Za-z]{4}\s*-/.test(it.text)) {
        const parts = it.text.split('|').map(s => s.trim()).filter(Boolean);
        const [dep, arr] = parts[0].split('-').map(s => s.trim().toUpperCase());
        const indicatif = calls.filter(c => c.jourIndex === it.jourIndex && c.r0 >= it.r0 - 1 && c.r0 <= it.r1 + 2 && c.h0 >= it.h0 - 1 && c.h0 <= it.h1 + 1.5).map(c => c.text.replace(/\s+/g, ' '));
        vols.push({
          jourIndex: it.jourIndex,
          jour: DAYS[it.jourIndex],
          date: dateOf(it.jourIndex),
          h_debut: it.h0,
          h_fin: it.h1,
          debut: hhmm(it.h0),
          fin: hhmm(it.h1),
          dep: dep || '',
          arr: arr || '',
          appareil: parts[1] || '',
          objet: parts.slice(2).join(' | '),
          indicatif: [...new Set(indicatif)].join(', '),
          equipage: crewOf(it),
          roles_type: [...rolesOfTypes(parts[1] || '')],
          texte: it.text,
          couloir: lane,
          lignes: `${it.r0}-${it.r1}`
        });
      } else if (lane && fold(lane) !== 'VOLS' && !/^DISPO/i.test(it.text)) {
        autres.push({
          jourIndex: it.jourIndex,
          jour: DAYS[it.jourIndex],
          date: dateOf(it.jourIndex),
          h_debut: it.h0,
          h_fin: it.h1,
          debut: hhmm(it.h0),
          fin: hhmm(it.h1),
          texte: it.paras.join(' — '),
          couloir: lane,
          equipage: crewOf(it)
        });
      }
    }
    // zones à activer : cellules de texte juste sous la ligne des heures
    const zones = [];
    for (const [k, c] of sh.cells) {
      const [row, col] = k.split(',').map(Number);
      if (col < f.start || row <= f.hourRow || row > f.hourRow + 5 || typeof c.value !== 'string' || !c.value.trim()) continue;
      const rel = col - f.start,
        day = Math.floor(rel / f.blockW),
        h = ((rel % f.blockW) - (f.hour0 - f.start)) / f.perHour;
      if (day > 6 || h < 0) continue;
      zones.push({
        jourIndex: day,
        jour: DAYS[day],
        date: dateOf(day),
        heure: hhmm(h),
        h,
        texte: c.value.trim()
      });
    }
    zones.sort((a, b) => a.jourIndex - b.jourIndex || a.h - b.h);
    vols.sort((a, b) => a.jourIndex - b.jourIndex || a.h_debut - b.h_debut);
    autres.sort((a, b) => a.jourIndex - b.jourIndex || a.h_debut - b.h_debut);
    return {
      vols,
      autres,
      zones
    };
  }

  // ------------------------------------------------------------------ planification
  /** Créneau (0, 1, 2) d'une heure z selon les plages réglées ; hors plages : le plus proche. */
  function slotOfHour(h, hours) {
    const i = hours.findIndex(([a, b]) => h >= a && h < b);
    if (i >= 0) return i;
    let best = 0,
      d = Infinity;
    hours.forEach(([a, b], k) => {
      const x = h < a ? a - h : h - b;
      if (x < d) {
        d = x;
        best = k;
      }
    });
    return best;
  }
  /** Créneaux recouverts par un vol [h0, h1] (au moins celui de son heure de début). */
  function slotsOfSpan(h0, h1, hours) {
    const out = hours.map(([a, b], k) => (h0 < b && h1 > a ? k : -1)).filter(k => k >= 0);
    return out.length ? out : [slotOfHour(h0, hours)];
  }

  /** Rôles qu'un pilote peut tenir dans un créneau : rôle imposé par le code, sinon ses capacités FLOTTE. */
  function eligible(rec, profile, settings) {
    if (rec.categorie !== 'dispo') return new Set();
    const known = new Set(profile?.roles || []),
      r = rec.role_impose,
      strict = settings.strictCodes;
    const pick = list => new Set(list.filter(x => known.has(x)));
    if (!strict && r && r !== 'EXERCICE') return new Set([...known, r === 'FNY' ? 'MARITIME' : r, ...(r === 'FNY' ? ['FNY'] : [])]);
    if (r === 'CHASSE') return new Set(['CHASSE']);
    if (r === 'TRANSPORT') return new Set(['TRANSPORT', ...pick(['TANKER', 'PARA'])]);
    if (r === 'SECU') return new Set(['SECU', ...pick(['HELICO', 'SECU_AVION'])]);
    if (r === 'FNY') return new Set(['FNY', 'MARITIME']);
    if (r === 'EXERCICE') return new Set(['EXERCICE', ...known]);
    return new Set([...known, 'TOUT']); // code O
  }

  /** Affectation des rôles requis à des pilotes distincts (recherche avec retour arrière ; effectifs petits). */
  function assign(needs, pilots) {
    if (!needs.length) return [];
    const [role, ...rest] = needs;
    for (const p of pilots) {
      if (role !== '*' && !p.roles.has(role)) continue;
      const sub = assign(rest, pilots.filter(x => x !== p));
      if (sub) return [{
        role,
        pilote: p.trigramme
      }, ...sub];
    }
    return null;
  }

  /** Créneaux de la semaine : pilotes disponibles et leurs rôles, contrôleurs, événements, vols, missions probables. */
  function plan(data, settings = {}) {
    settings = {
      ...DEFAULTS,
      ...settings
    };
    const pref = [...settings.preference.filter(f => FAMILIES[f]), ...Object.keys(FAMILIES).filter(f => !settings.preference.includes(f))];
    const profile = t => data.flotte[t] || null;
    const hasSim = t => !settings.sim || (profile(t)?.sims || []).includes(settings.sim);
    const order = new Map(data.pilotes.map((p, i) => [p.trigramme, i]));
    const themeText = fold(data.theme || '');
    const slots = [];
    for (let j = 0; j < 7; j++)
      for (let k = 0; k < 3; k++) {
        const recs = data.records.filter(r => r.jourIndex === j && r.creneauIndex === k);
        const dispo = recs.filter(r => r.categorie === 'dispo' && hasSim(r.pilote))
          // pilotes à code restreint en tête : affectés en priorité à leur domaine
          .sort((a, b) => (a.code === 'O') - (b.code === 'O') || order.get(a.pilote) - order.get(b.pilote))
          .map(r => ({
            trigramme: r.pilote,
            code: r.code,
            roles: eligible(r, profile(r.pilote), settings),
            commentaire: r.commentaire
          }));
        const atc = recs.filter(r => r.categorie === 'atc').map(r => ({
          trigramme: r.pilote,
          code: r.code,
          commentaire: r.commentaire
        }));
        const horsSim = settings.sim ? recs.filter(r => r.categorie === 'dispo' && !hasSim(r.pilote)).map(r => r.pilote) : [];
        const events = data.evenements.filter(e => e.jourIndex === j && e.creneauIndex === k && !(settings.ignoreRecurring && e.recurrent));
        const vols = data.vols.filter(v => v.jourIndex === j && slotsOfSpan(v.h_debut, v.h_fin, settings.hours).includes(k));
        const autres = data.frise.filter(v => v.jourIndex === j && slotsOfSpan(v.h_debut, v.h_fin, settings.hours).includes(k));
        // missions probables
        const cands = [];
        for (const [fam, def] of Object.entries(FAMILIES)) {
          let needs = def.needs,
            joins = def.joins,
            rule = def.rule;
          if (fam === 'TRAINING' && atc.length) {
            needs = ['*'];
            joins = ['*'];
          }
          const a = dispo.length ? assign(needs, dispo) : null;
          if (!a) continue;
          const taken = new Set(a.map(x => x.pilote));
          const part = dispo.filter(p => taken.has(p.trigramme) || joins.includes('*') || joins.some(r => p.roles.has(r))).map(p => p.trigramme);
          const inDomain = part.filter(t => (DOMAIN[dispo.find(p => p.trigramme === t).code] || []).includes(fam));
          const ctrl = fam === 'TRAINING' ? Math.min(2, atc.length) : 0;
          // famille déjà jouée (CR) : léger recul, pour varier ; log : chaque CR de plus pèse moins
          const played = +settings.plays?.[fam] || 0,
            malus = played ? Math.round(settings.playWeight * Math.log2(1 + played) * 10) / 10 : 0;
          const score = Math.round((part.length + 2 * inDomain.length + ctrl - malus) * 10) / 10;
          const why = [`${part.length} participant${part.length > 1 ? 's' : ''}`];
          if (inDomain.length) why.push(`+2 × ${inDomain.length} (code restreint dans son domaine : ${inDomain.map(t => `${t} ${dispo.find(p => p.trigramme === t).code}`).join(', ')})`);
          if (ctrl) why.push(`+${ctrl} (contrôleur${ctrl > 1 ? 's' : ''} en ligne : ${atc.map(x => x.trigramme).join(', ')})`);
          if (malus) why.push(`${malus > 0 ? '−' : '+'} ${String(Math.abs(malus)).replace('.', ',')} (déjà jouée : ${played} CR)`);
          cands.push({
            famille: fam,
            affectation: a,
            participants: part,
            renforts: part.filter(t => !taken.has(t)),
            score,
            calcul: `score ${String(score).replace('.', ',')} = ${why.join(' ')}`,
            regle: rule
          });
        }
        cands.sort((x, y) => y.score - x.score || pref.indexOf(x.famille) - pref.indexOf(y.famille));
        // sessions ATC du créneau (couloirs DIVERS de la frise, commentaires des contrôleurs) : « EXAMEN LFMN_TWR »,
        // « Training LFBO_APP » → pas de mission dans la CTR du terrain, et si possible hors de ses TMA
        const eviter = [];
        for (const src of [...autres.map(v => v.texte), ...atc.map(x => x.commentaire)]) {
          const t = String(src || '');
          const kind = /EXAM/i.test(t) ? 'examen' : /TRAIN|FORMATION|CHECK/i.test(t) ? 'training' : '';
          if (!kind) continue;
          for (const m of t.matchAll(/\b([A-Z]{4})_(DEL|GND|TWR|APP|DEP|FSS|CTR)\b/gi)) {
            const icao = m[1].toUpperCase(),
              pos = `${icao}_${m[2].toUpperCase()}`;
            if (!eviter.some(e => e.position === pos)) eviter.push({
              icao,
              position: pos,
              type: kind,
              texte: t.replace(/\s+/g, ' ').trim()
            });
          }
        }
        // contexte (affichage seulement) : contrôleurs, événements, thème de la semaine
        const contexte = [];
        for (const e of eviter) contexte.push(`${e.type} ${e.position} : pas de mission dans la CTR de ${e.icao}, et si possible hors de ses TMA`);
        if (atc.length) contexte.push(`contrôleur${atc.length > 1 ? 's' : ''} en ligne (${atc.map(x => `${x.trigramme} ${x.code}`).join(', ')}) : vol « avec contrôle » possible (approches, PAR, FI)`);
        for (const e of events) contexte.push(`événement ${e.groupe}${e.commentaire ? ` : ${e.commentaire}` : ''}`);
        if (/PARA|LARGAGE/.test(themeText) && cands.some(c => c.famille === 'AIRBORNE')) contexte.push('thème de la semaine : activité para → AIRBORNE');
        if (/OPEX/.test(themeText) && cands.some(c => c.famille === 'AIRLIFT' || c.famille === 'AIRBORNE')) contexte.push('thème de la semaine : OPEX → AIRLIFT / AIRBORNE');
        // simulateurs communs à tous les pilotes disponibles (profils FLOTTE connus)
        const withProfile = dispo.filter(p => profile(p.trigramme)?.sims?.length);
        const common = withProfile.length ? withProfile.map(p => profile(p.trigramme).sims).reduce((a, b) => a.filter(x => b.includes(x))) : [];
        slots.push({
          jourIndex: j,
          jour: DAYS[j],
          date: data.dates[j],
          creneauIndex: k,
          creneau: SLOTS[k],
          heures: `${pad(settings.hours[k][0])}-${pad(settings.hours[k][1])}z`,
          n: dispo.length,
          pilotes: dispo.map(p => ({
            ...p,
            roles: [...p.roles].sort()
          })),
          atc,
          horsSim,
          indispo: recs.filter(r => r.categorie === 'indispo' || r.categorie === 'occupe').length,
          inconnus: recs.filter(r => r.categorie === 'inconnu').length,
          roles: [...new Set(dispo.flatMap(p => [...p.roles]))].sort(),
          simsCommuns: common,
          evenements: events,
          vols,
          autres,
          eviter,
          missions: cands.slice(0, settings.top),
          toutesMissions: cands,
          contexte
        });
      }
    return slots;
  }

  /** Contrôle des vols de la frise contre les disponibilités : équipier codé indisponible, rôle hors de son code. */
  function checkFlights(data, settings = {}) {
    settings = {
      ...DEFAULTS,
      ...settings
    };
    const CODE_ROLES = {
      SC: ['HELICO', 'SECU_AVION'],
      C: ['CHASSE'],
      T: ['TRANSPORT', 'TANKER', 'PARA'],
      N: ['DETECTION', 'HELICO']
    };
    return data.vols.map(v => {
      // un vol à cheval sur deux créneaux est couvert si l'équipier est disponible dans l'un d'eux
      const ks = slotsOfSpan(v.h_debut, v.h_fin, settings.hours),
        k = ks[0],
        alerts = [],
        when = ks.map(x => SLOTS[x]).join(' / ');
      for (const t of v.equipage) {
        const recs = ks.map(x => data.records.find(r => r.pilote === t && r.jourIndex === v.jourIndex && r.creneauIndex === x)).filter(Boolean);
        if (!recs.length) {
          alerts.push(`${t} : absent de la grille`);
          continue;
        }
        const r = recs.find(x => x.categorie === 'dispo') || recs.find(x => x.categorie === 'atc') || recs.find(x => x.categorie !== 'inconnu') || recs[0];
        if (r.categorie === 'inconnu') alerts.push(`${t} : grille non renseignée (${when})`);
        else if (r.categorie !== 'dispo') alerts.push(`${t} : codé ${recs.map(x => x.code || '·').join(' / ')} (${r.sens || CATEGORIES[r.categorie]}) — ${when}`);
        else if (CODE_ROLES[r.code] && v.roles_type.length && !v.roles_type.some(x => CODE_ROLES[r.code].includes(x))) alerts.push(`${t} : code ${r.code} (${r.sens}) mais appareil ${v.appareil} (${v.roles_type.map(x => ROLES[x] || x).join(', ')})`);
      }
      return {
        ...v,
        creneauIndex: k,
        creneau: when,
        alertes: alerts
      };
    });
  }

  // ------------------------------------------------------------------ exports
  const csvCell = v => {
    const s = v == null ? '' : Array.isArray(v) ? v.join(' ') : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  /** CSV (séparateur « ; », UTF-8 avec BOM pour Excel) du schéma normalisé : une ligne par pilote, jour et créneau. */
  function toCsv(data) {
    const cols = ['semaine', 'date', 'jour', 'creneau', 'pilote', 'couleur_pilote', 'code_brut', 'code', 'marque', 'sens', 'categorie', 'role_impose', 'commentaire', 'source'];
    return '﻿' + [cols.join(';'), ...data.records.map(r => cols.map(c => csvCell(r[c])).join(';'))].join('\r\n') + '\r\n';
  }
  /** Récapitulatif texte « DISPO MATIN / APREM / SOIR » par jour (remplace la saisie manuelle des encadrés de la frise). */
  function recap(data, slots) {
    const short = ['MATIN', 'APREM', 'SOIR'],
      lines = [`ODV S${data.semaine ?? '?'}${data.lundi ? ` (${data.dates[0]} → ${data.dates[6]})` : ''} — disponibilités`];
    for (let j = 0; j < 7; j++) {
      lines.push('', `**${DAYS[j].toUpperCase()}${data.dates[j] ? ' ' + data.dates[j].slice(8, 10) + '/' + data.dates[j].slice(5, 7) : ''}**`);
      for (let k = 0; k < 3; k++) {
        const s = slots.find(x => x.jourIndex === j && x.creneauIndex === k);
        const p = s.pilotes.map(x => x.code === 'O' ? x.trigramme : `${x.trigramme} (${x.code})`).join(', ');
        const a = s.atc.map(x => `${x.trigramme} (${x.code})`).join(', ');
        lines.push(`${short[k]} : ${p || '—'}${a ? ` · contrôle : ${a}` : ''}`);
      }
    }
    return lines.join('\n');
  }

  window.OdvCore = {
    openWorkbook,
    extract,
    plan,
    checkFlights,
    slotOfHour,
    slotsOfSpan,
    eligible,
    rolesOfTypes,
    toCsv,
    recap,
    hhmm,
    colName,
    fold,
    DEFAULTS,
    LEGEND,
    CATEGORIES,
    ROLES,
    FAMILIES,
    DOMAIN,
    DAYS,
    SLOTS,
    SLOT_LABELS
  };
})();
