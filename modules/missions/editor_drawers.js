// V3 missions — les tiroirs dans l'atelier (SOG-0445, lot P3), le calcul pur : une partie du fichier (`phases`) lue en champs pour la
// fiche d'un tiroir, et réécrite. Ni page, ni stockage, ni réseau. Le fichier lu est une entrée non fiable (docs/technique/
// FORMAT_MISSION.md § 5) : textes bornés, nombres bornés jamais ramenés dans leurs bornes (un nombre hors bornes n'est pas écrit), un
// identifiant n'est jamais une clé d'objet. Règle des with… de editor.js (audit 182) : seul ce que l'auteur a changé est écrit ; une
// partie inchangée reste l'objet du fichier ; rien de changé, rien d'écrit — withDrawerRows rend alors une COPIE de contenu identique
// (un structuredClone), jamais l'objet reçu : la règle se juge au contenu (Sécurisation, relecture du 17 nov. 2026).
// Les caractères de format invisibles qui trompent l'œil (contrôles de sens d'écriture, espaces de largeur nulle, marque d'ordre) sont
// retirés de ce que l'atelier lit dans ses lignes et de ce qu'il écrit — par `visible` du lecteur (frame/lib/mission.js), la seule
// liste ; un texte du fichier que l'auteur ne touche pas reste tel quel.
//
// Le format (FORMAT_MISSION.md § 2, § 3 ; décision du 17 nov. 2026 sur Q-0095) : un tiroir CITE une zone ou un objet de la mission par
// son identifiant — l'atelier n'écrit jamais une zone ou un objet dans la partie. Les parties que le lecteur refuse (identifiant hors
// de B à M, doublon, valeur nue, au-delà de douze) ne sont pas des lignes : elles restent à leur place, telles quelles.
//
// API :
//   KEYS : les clés que l'atelier édite — hand (le geste du pilote seul), time (l'heure : un point et un délai), zone (une zone de
//     passage), object (un objet à trouver), arrival (l'arrivée au terrain) ; et les conditions de la version 1.1 (SOG-0500) : hover
//     (un stationnaire), landing (un poser), overflight (un survol) — HOLDS, une règle chacune (`rule` de la ligne), écrite dans
//     `trigger_condition` sous la forme exacte que le lecteur lit (holdRule de frame/lib/mission.js), avec SES bornes (MS.HOLD_BOUNDS) ;
//     sequence (une suite d'étapes : `steps` de la ligne, de une à MS.DRAWER_BOUNDS.steps, chacune { kind (une de HOLDS), …règle }) ;
//     event (`event` de la ligne : l'identifiant d'un message entre équipages, MS.EVENT_ID) ; refill (SOG-0521 : le ravitaillement en
//     retardant à une STATION, un objet de genre refill — `rule` de la ligne : object, duration (s), heading (°, facultatif), et ce
//     qu'un fichier écrit déjà de radiusM, gap, headTol, speed ; jamais un point ; les paramètres et leurs bornes : MS.REFILL_RULE).
//     CONDS : ces six conditions ; RULED : celles dont la ligne porte une règle (HOLDS et refill) ; ruleBounds(kind, f) : les bornes
//     d'un nombre d'une règle de cette sorte (celles du lecteur).
//   Le message qu'un tiroir envoie en s'ouvrant (`emit_event` { id, to }) : `emit` et `emitTo` de la ligne (l'identifiant ; les
//     destinataires, séparés par des virgules, seize au plus), pour toute clé.
//   blankRule() → une règle vide { point, object, label, radiusM, radiusNm, duration, gap, speed, tol, hMin, hMax, confirmation,
//     confirm } (des textes pour les champs ; confirm : un booléen) ; holdRow(kind, places) → la règle qu'une sorte devine (un objet
//     de la mission à suivre, sinon la cible, sinon l'arrivée ; un poser : l'arrivée ; les valeurs par défaut de l'atelier de
//     l'utilisateur : 60 s, 5 m…). RULE_USE : les champs qu'une sorte lit. ruleMissing(kind, rule) → les champs à compléter
//     (['at'] : ni point ni objet, ou les deux ; un nombre exigé absent ou hors bornes ; 'hOrder' : hauteur minimale au-dessus de la
//     maximale ; 'confirmation' : un mot qui n'en est pas un) — [] pour une règle que le lecteur lira.
//   TYPES : toutes les sortes que l'atelier écrit, [{ key, judged }] dans l'ordre de KEYS ; `judged` (SOG-0500 (c)) VIENT DU VOL, jamais
//     d'une liste écrite ici : judgedKind(key) — le geste et l'heure toujours (sans position) ; toute autre sorte, si `follows` de
//     drawers.js (Affectation) juge la clé que le LECTEUR lit d'un tiroir de cette sorte écrit par l'atelier lui-même (keyed : ses
//     valeurs par défaut, une règle complète). Quand Affectation fera juger une condition, elle sera proposée sans retouche ici.
//   judgedKind(key, judge = follows) → vrai si le vol juge cette sorte ; `judge` : la fonction du vol (un cas la remplace pour voir ce
//     que l'atelier proposerait).
//   offered(cur = '', judge = follows) → ce que le choix du type propose (SOG-0467 : « ＋ Tiroir » et la clé d'un tiroir, LE MÊME
//     choix ; sous « ＋ Tiroir », les briques du catalogue — catalog.js — s'y ajoutent, sous la même règle) : les sortes jugées, et la
//     clé en cours d'un tiroir (`cur`) même quand le vol ne la juge pas (l'écran dit « s'ouvre au geste ou à l'heure de repli »).
//   keyed(row, key, places) → la ligne avec la clé choisie et ce qu'une clé neuve devine : la première zone, le premier objet des
//     lieux, l'arrivée au terrain d'arrivée (1 NM, 30 kt, posé), l'heure après le décollage.
//   drawerRowsOf(doc) → [{ i (la place dans `phases`, -1 pour une ligne ajoutée), id (B à M, donné, jamais saisi), title, said (la clé
//     dite en clair, `trigger`), message, brief, key (une de KEYS, ou 'kept'), keptWhy, point, delay, zone, shown, object, arrPoint,
//     arrRadius, arrSpeed, arrGround, stops [identifiants], rule (la règle d'une condition HOLDS), steps (les étapes d'une suite),
//     event (le message attendu), emit, emitTo, fallback, route [identifiants] }] — les nombres en texte, pour les champs.
//   condMissing(row) → ce qui manque à la condition d'une ligne (ruleMissing ; une suite : 'steps' sans étape, `<n>.<champ>` pour
//     l'étape n ; un message attendu : 'event') — [] sinon.
//     key 'kept' : une clé que l'atelier n'édite pas encore, MONTRÉE et GARDÉE telle quelle — keptWhy : 'several' (plusieurs clés
//     écrites), 'inPart' (une zone ou un objet écrits dans la partie), 'actor' (une cible franchit la zone), 'condition' (une condition
//     de la version 1.1 de l'atelier), 'escort' (une arrivée après un suivi). Choisir une autre clé la remplace (withKey).
//   withKey(row, key) → la ligne avec une autre clé : les champs de l'ancienne vidés ; l'heure de repli tombe pour une clé qui ne
//     regarde pas l'avion (hand, time).
//   blankDrawer(rows, base) → une ligne neuve (son identifiant : nextDrawerId) ; null au-delà de douze.
//   nextDrawerId(rows, base) → la première lettre de B à M que ni les lignes ni le fichier ne portent (un tiroir retiré dans la séance
//     garde sa lettre jusqu'à l'enregistrement : les carnets des pilotes la citent) ; à défaut la première que les lignes ne portent pas.
//   withDrawerRows(doc, rows) → un NOUVEAU document : les parties gardées dans l'ordre du fichier (une ligne retirée : sa partie part ;
//     les rangs se resserrent, les identifiants restent), les lignes ajoutées à la fin ; douze tiroirs au plus.
//   drawersTodo(doc) → [{ key, name (le rang), what? }] : ce qu'un tiroir a « à compléter », jamais bloquant — noMessage, noBrief,
//     noFallback (une clé qui regarde l'avion sans heure de repli), condIncomplete (une condition dont la règle n'est pas complète :
//     `what`, les champs de ruleMissing — le lecteur la refuserait), keyUnread (une clé que le lecteur ne sait pas lire : le tiroir ne
//     s'ouvre qu'à la main), routeUnknown (sa suite de route cite un lieu absent), emitIncomplete (un message envoyé sans identifiant
//     ou sans destinataire : le lecteur ne le lit pas).
import * as MS from '../../frame/lib/mission.js';
import * as DW from './drawers.js'; // lu, jamais modifié : la période d'un relevé du vol (FIX_PERIOD_SEC, quand Affectation la publie)
import {
  cut
} from './editor.js'; // « un texte d'une ligne, sans caractère invisible, borné » : la définition unique est celle de l'atelier

const B = MS.DRAWER_BOUNDS,
  H = MS.HOLD_BOUNDS;
/** Les conditions de maintien et de survol (version 1.1) que l'atelier écrit : la liste du lecteur. */
export const HOLDS = MS.HOLD_KINDS;
/** Les conditions de la version 1.1 que l'atelier écrit : les règles, la suite d'étapes, le message attendu. */
export const CONDS = Object.freeze([...HOLDS, 'sequence', 'event', 'refill']);
/** Les conditions dont la ligne porte UNE règle (`rule`) : le maintien, le poser, le survol, et le ravitaillement (SOG-0521). Une étape
 *  d'une suite n'est jamais un ravitaillement (le lecteur la refuse) : les étapes restent dans HOLDS. */
export const RULED = Object.freeze([...HOLDS, 'refill']);
/** Les paramètres d'un ravitaillement en retardant : LA table du lecteur (MS.REFILL_RULE), jamais recopiée. */
const RF = MS.REFILL_RULE;
export const KEYS = Object.freeze(['hand', 'time', 'zone', 'object', 'arrival', ...CONDS]);
/** Les clés qui regardent l'avion : elles ont une heure de repli. */
const LIVE = new Set(['zone', 'object', 'arrival', 'kept', ...CONDS]);
/** Les nombres d'une règle : le champ de la ligne → [le champ du fichier, ses bornes — celles du lecteur] (exporté : le catalogue lit
 *  les réglages d'une brique avec les mêmes bornes). */
export const RULE_NUM = Object.freeze({
  radiusM: ['radius_m', H.radiusM],
  radiusNm: ['radius_nm', H.radiusNm],
  duration: ['duration_sec', H.durationSec],
  gap: ['max_gap_sec', H.maxGapSec],
  speed: ['speed_max_kt', H.landingSpeedKt],
  tol: ['speed_tolerance_kt', H.speedToleranceKt],
  hMin: ['height_min_ft', H.heightFt],
  hMax: ['height_max_ft', H.heightFt],
  // SOG-0521 : le cap d'accostage d'un ravitaillement et sa tolérance
  heading: ['heading_deg', RF.headingBoundsDeg],
  headTol: ['heading_tol_deg', RF.headingTolBoundsDeg]
});
/** Les bornes d'un nombre `f` d'une règle de la sorte `kind` : celles du lecteur (RULE_NUM) ; un ravitaillement a SES bornes de rayon
 *  (MS.REFILL_RULE) et un écart jamais sous la période d'un relevé (sa borne du lecteur : la même règle que les tenues). */
export function ruleBounds(kind, f) {
  if (kind === 'refill' && f === 'radiusM') return RF.radiusBoundsM;
  if (kind === 'refill' && f === 'gap') return [Math.max(landingGapMin(), H.maxGapSec[0]), H.maxGapSec[1]];
  return RULE_NUM[f] ? RULE_NUM[f][1] : null;
}
/** Les champs qu'une sorte de règle lit (holdRule du lecteur) ; le libellé et le mot de confirmation valent pour toutes. */
export const RULE_USE = Object.freeze({
  hover: Object.freeze(['point', 'object', 'radiusM', 'duration', 'gap', 'tol', 'hMin', 'hMax', 'label', 'confirmation']),
  // un poser n'a pas de mot de confirmation (Affectation, 18 nov. : le vol le jugera sans) — un mot déjà écrit reste tel quel
  // SOG-0507 : plus de rayon (m) : un poser se juge par paliers (un point), ou à 1 NM (un terrain) ; `radius_m` d'un fichier est gardé tel quel, jamais lu ni exigé
  landing: Object.freeze(['point', 'object', 'duration', 'gap', 'speed', 'label']),
  overflight: Object.freeze(['point', 'object', 'radiusNm', 'hMin', 'hMax', 'confirm', 'label', 'confirmation']),
  // SOG-0521 : une station (jamais un point), la durée, le cap ; le rayon, l'écart, la tolérance et la vitesse ne s'écrivent que s'ils
  // sont saisis (vides : le lecteur prend MS.REFILL_RULE) ; repartir (`require_departure`) s'écrit vrai pour une règle neuve
  refill: Object.freeze(['object', 'duration', 'heading', 'radiusM', 'gap', 'headTol', 'speed', 'label', 'depart'])
});
/** Les nombres qu'une sorte de règle exige : sans l'un d'eux, ou hors de ses bornes, le lecteur la refuse. */
const RULE_NEED = Object.freeze({
  hover: ['radiusM', 'duration', 'gap', 'tol', 'hMin', 'hMax'],
  // la vitesse d'un poser est écrite (le lecteur prend 3 kt sans elle ; Affectation veut une règle complète)
  landing: ['duration', 'gap', 'speed'],
  overflight: ['radiusNm', 'hMin', 'hMax'],
  refill: [] // tout nombre absent prend le paramètre du lecteur ; un nombre SAISI doit être dans ses bornes (ruleMissing)
});
/** Les champs du fichier qu'une règle porte (une règle neuve, ou d'une autre sorte, les perd tous avant d'écrire les siens). */
const RULE_FILE = ['point', 'object', 'label', 'radius_m', 'radius_nm', 'duration_sec', 'max_gap_sec', 'speed_max_kt',
  'speed_tolerance_kt', 'height_min_ft', 'height_max_ft', 'confirmation', 'require_confirmation', 'heading_deg', 'heading_tol_deg',
  'require_departure'
];
/** Les champs du fichier qui portent une clé. */
const KEY_FIELDS = ['trigger_zone', 'zone_shown', 'trigger_actor', 'trigger_object', 'trigger_condition', 'trigger_point',
  'trigger_delay_min'
];

/** Un texte de plusieurs lignes (le message, le briefing), comme le lecteur le lit : ses sauts de ligne gardés, borné. */
const lines = (v, n) => typeof v === 'string' || typeof v === 'number' ? MS.visible(v).replace(/\r\n?/g, '\n').replace(
    /[ \t]+\n/g, '\n').trim()
  .slice(0, n) : '';
/** Un objet du fichier (ni liste, ni valeur nue). */
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
/** Une valeur écrite (ni absente, ni vide). */
const has = v => v !== undefined && v !== null && v !== '';
/** Un identifiant ou un nombre écrit nu (jamais un objet). */
const scalar = v => typeof v === 'string' || typeof v === 'number';
/** Un nombre lu du fichier, en texte pour un champ ('' sinon ; un texte blanc n'est pas zéro). */
const numText = v => has(v) && scalar(v) && String(v).trim() !== '' && Number.isFinite(+v) ? String(+v) : '';
/** Un nombre saisi dans [lo, hi] ; null sinon (jamais ramené dans les bornes). */
const within = (v, lo, hi) => /^\s*-?\d+(\.\d+)?\s*$/.test(String(v ?? '')) && +v >= lo && +v <= hi ? +v : null;
/** Oui ou non écrit dans le fichier, comme le lecteur le lit. */
const yes = (v, dflt) => !has(v) ? dflt : !(v === false || v === 0 || /^(false|no|non|0)$/i.test(String(v).trim()));
/** Le mot d'une route : un identifiant nu, ou celui d'un objet { id } ; '' sinon. */
const token = x => scalar(x) ? cut(x, 60) : isObj(x) && scalar(x.id) ? cut(x.id, 60) : '';
/** Les mots d'une liste de route du fichier (bornée). */
const tokens = (v, max) => (Array.isArray(v) ? v : []).slice(0, max).map(token).filter(Boolean);
/** Les parties du fichier, comme le lecteur les lit : une liste, ou un objet seul. */
const phasesOf = d => Array.isArray(d.phases) ? d.phases : isObj(d.phases) ? [d.phases] : [];

/** Une règle vide (voir l'en-tête) : le survol demande la confirmation du pilote par défaut, comme le lecteur. */
export const blankRule = () => ({
  point: '',
  object: '',
  label: '',
  radiusM: '',
  radiusNm: '',
  duration: '',
  gap: '',
  speed: '',
  tol: '',
  hMin: '',
  hMax: '',
  heading: '',
  headTol: '',
  confirmation: '',
  confirm: true,
  depart: true // SOG-0521 : un ravitaillement repart une fois rempli (le défaut du lecteur)
});

/** Une règle du fichier en champs (une condition, ou une étape d'une suite) ; null quand son lieu n'est pas un identifiant nu (une
 *  position écrite dans la règle : la clé est gardée telle quelle). */
function ruleOf(c) {
  if (!isObj(c) || has(c.point) && !scalar(c.point) || has(c.object) && !scalar(c.object)) return null;
  const r = blankRule();
  r.point = has(c.point) ? cut(c.point, 40) : '';
  r.object = has(c.object) ? cut(c.object, 40) : '';
  r.label = cut(c.label, B.title);
  for (const [f, [k]] of Object.entries(RULE_NUM)) r[f] = numText(c[k]);
  r.confirmation = scalar(c.confirmation) ? cut(c.confirmation, 24) : '';
  r.confirm = yes(c.require_confirmation, true);
  r.depart = yes(c.require_departure, true);
  return r;
}

/** La règle qu'une sorte devine (voir l'en-tête) ; `places` : les lignes des Lieux de la séance. */
export function holdRow(kind, places = []) {
  const first = k => (Array.isArray(places) ? places : []).find(p => p && p.id && p.kind === k)?.id || '',
    obj = first('object');
  // SOG-0521 : un ravitaillement — la première STATION des lieux (un objet de genre refill), la durée minimale du lecteur ; rien d'autre
  if (kind === 'refill') return {
    ...blankRule(),
    object: (Array.isArray(places) ? places : []).find(p => p && p.id && p.kind === 'object' && p.okind === 'refill')?.id || '',
    duration: String(RF.durationSec)
  };
  const
    at = kind === 'landing' ? {
      point: 'DESTINATION'
    } : obj ? {
      object: obj
    } : {
      point: first('target') || 'DESTINATION'
    },
    nums = kind === 'hover' ? {
      radiusM: '5',
      duration: '60',
      gap: '10',
      tol: '2',
      hMin: '10',
      hMax: '100'
    } : kind === 'landing' ? {
      duration: '10', // Affectation, 18 nov. : dix secondes posé, un trou de dix secondes toléré
      gap: '10',
      speed: String(H.landingSpeedDefault)
    } : {
      radiusNm: '0.5',
      hMin: '100',
      hMax: '2000'
    };
  return {
    ...blankRule(),
    ...at,
    ...nums
  };
}

/** Le plus court trou de relevés qu'un poser ou un stationnaire tolère : la période d'un relevé du vol (DW.FIX_PERIOD_SEC, lue par l'espace de noms : son
 *  absence n'est pas une erreur), jamais sous la borne du lecteur. */
export function landingGapMin() {
  const p = DW.FIX_PERIOD_SEC;
  return Number.isFinite(p) ? Math.max(p, H.maxGapSec[0]) : H.maxGapSec[0];
}

/** De quoi un poser est jugé en vol (SOG-0507, les tolérances de l'utilisateur lues de drawers.js, jamais recopiées) : 'field' quand il vise
 *  un terrain de la route (ORIGIN, DESTINATION et leurs synonymes du lecteur : à AD_NM, sans palier), 'tiers' sinon (des paliers). */
export function landingJudge(rule) {
  const p = String(isObj(rule) && typeof rule.point === 'string' ? rule.point : '').trim().toUpperCase();
  return ['ORIGIN', 'DEPART', 'DEPARTURE', 'DESTINATION', 'ARRIVAL', 'ARRIVEE'].includes(p) ? 'field' : 'tiers';
}

/** Les paliers d'un posé de précision, du plus large au plus serré : [{ tier, nm }] (lus de PRECISION de drawers.js). */
export const precisionTiers = () => [...DW.PRECISION].reverse().map(x => ({
  tier: x.tier,
  nm: x.nm
}));

/** Les tolérances de distance d'un terrain et d'une escale, en milles marins : { field, transit } (lues de drawers.js). */
export const toleranceNm = () => ({
  field: DW.AD_NM,
  transit: DW.TRANSIT_NM
});

/** Ce qui manque à la condition d'une ligne (voir l'en-tête). */
export function condMissing(row) {
  const r = isObj(row) ? row : {};
  if (RULED.includes(r.key)) return ruleMissing(r.key, r.rule);
  if (r.key === 'sequence') {
    const steps = Array.isArray(r.steps) ? r.steps : [];
    if (!steps.length) return ['steps'];
    return steps.flatMap((st, n) => HOLDS.includes(st?.kind) ? ruleMissing(st.kind, st).map(f => `${n + 1}.${f}`) : [`${n + 1}.kind`]);
  }
  if (r.key === 'event') return MS.EVENT_ID.test(String(r.event ?? '').trim()) ? [] : ['event'];
  return [];
}

/** Les champs à compléter d'une règle (voir l'en-tête) : les bornes et les exigences du lecteur, jamais d'autres ; pour un poser, la
 *  période d'un relevé du vol aussi (landingGapMin). */
export function ruleMissing(kind, rule) {
  const r = isObj(rule) ? rule : {},
    out = [],
    blank = v => String(v ?? '').trim() === '',
    ok = f => within(r[f], ...ruleBounds(kind, f)) !== null;
  // SOG-0521 : un ravitaillement — une station et jamais un point ; chaque nombre saisi dans ses bornes (vide : le paramètre du lecteur)
  if (kind === 'refill') {
    if (blank(r.object) || !blank(r.point)) out.push('at');
    for (const f of ['duration', 'heading', 'radiusM', 'gap', 'headTol', 'speed'])
      if (!blank(r[f]) && !ok(f)) out.push(f);
    return out;
  }
  if (blank(r.point) === blank(r.object)) out.push('at');
  for (const f of RULE_NEED[kind] || [])
    if (!ok(f)) out.push(f);
  // un poser ou un stationnaire : le trou de relevés toléré n'est pas plus court que la période d'un relevé du vol (drawers.js, quand elle y est publiée ;
  // sans elle, la borne du lecteur seule)
  if ((kind === 'landing' || kind === 'hover') && ok('gap') && +r.gap < landingGapMin()) out.push('gap');
  if (kind !== 'landing' && ok('hMin') && ok('hMax') && +r.hMin > +r.hMax) out.push('hOrder');
  if (!blank(r.confirmation) && !MS.CONFIRM_WORD.test(String(r.confirmation).trim())) out.push('confirmation');
  return out;
}

/** La clé d'une partie, en champs (voir l'en-tête). */
function keyOf(p) {
  const f = {
      key: 'hand',
      keptWhy: '',
      point: '',
      delay: numText(p.trigger_delay_min),
      zone: '',
      shown: false, // SOG-0459 : une zone de passage est cachée au pilote sauf écrit autrement
      object: '',
      arrPoint: '',
      arrRadius: '',
      arrSpeed: '',
      arrGround: false,
      stops: [],
      rule: blankRule(),
      steps: [],
      event: ''
    },
    written = ['trigger_zone', 'trigger_object', 'trigger_condition', 'trigger_point'].filter(k => has(p[k])),
    kept = why => ({
      ...f,
      key: 'kept',
      keptWhy: why
    });
  if (written.length > 1) return kept('several');
  if (written[0] === 'trigger_zone') return !scalar(p.trigger_zone) ? kept('inPart') : has(p.trigger_actor) ? kept('actor') : {
    ...f,
    key: 'zone',
    zone: cut(p.trigger_zone, 40),
    shown: p.zone_shown === true // SOG-0459 : montrée seulement quand le fichier écrit le booléen
  };
  if (written[0] === 'trigger_object') return scalar(p.trigger_object) ? {
    ...f,
    key: 'object',
    object: cut(p.trigger_object, 40)
  } : kept('inPart');
  if (written[0] === 'trigger_condition') {
    const c = p.trigger_condition,
      kind = isObj(c) ? cut(c.kind, 24).toLowerCase() : '';
    // SOG-0500 : un stationnaire, un poser, un survol — leurs champs, la règle lue comme le lecteur la lit ; SOG-0521 : un ravitaillement
    if (RULED.includes(kind)) {
      const rule = ruleOf(c);
      return rule ? {
        ...f,
        key: kind,
        rule
      } : kept('condition');
    }
    // une suite : ses étapes, une règle chacune (une étape d'une autre sorte, une liste trop longue : la clé est gardée telle quelle)
    if (kind === 'sequence') {
      const all = Array.isArray(c.steps) ? c.steps : null,
        steps = all && all.length <= B.steps ? all.map(x => {
          const k = isObj(x) ? cut(x.kind, 24).toLowerCase() : '',
            rule = HOLDS.includes(k) ? ruleOf(x) : null;
          return rule ? {
            kind: k,
            ...rule
          } : null;
        }) : null;
      return steps && !steps.includes(null) ? {
        ...f,
        key: 'sequence',
        steps
      } : kept('condition');
    }
    // un message attendu : son identifiant, un mot nu
    if (kind === 'event') return !has(c.event) || scalar(c.event) ? {
      ...f,
      key: 'event',
      event: has(c.event) ? cut(c.event, 80) : ''
    } : kept('condition');
    if (!isObj(c) || kind !== 'arrival' || has(c.point) && !scalar(c.point)) return kept('condition');
    if (has(c.escort_min_sec) && +c.escort_min_sec !== 0) return kept('escort');
    return {
      ...f,
      key: 'arrival',
      arrPoint: cut(c.point, 40),
      arrRadius: numText(c.radius_nm),
      arrSpeed: numText(c.speed_max_kt),
      arrGround: yes(c.require_on_ground, false),
      stops: tokens(c.required_points, B.required)
    };
  }
  if (written[0] === 'trigger_point') return scalar(p.trigger_point) ? {
    ...f,
    key: 'time',
    point: cut(p.trigger_point, 40)
  } : kept('inPart');
  return f;
}

/** Les tiroirs d'une mission, en lignes (voir l'en-tête). */
export function drawerRowsOf(doc) {
  const d = isObj(doc) ? doc : {},
    all = phasesOf(d);
  return MS.drawerSlots(d).map(({
    i,
    id
  }) => {
    const p = all[i];
    return {
      i,
      id,
      title: cut(p.title, B.title),
      said: cut(p.trigger, B.trigger),
      message: lines(p.message, B.message),
      brief: lines(p.brief, B.brief),
      ...keyOf(p),
      ...emitOf(p.emit_event),
      fallback: numText(p.fallback_delay_min),
      route: tokens(p.route_order, B.route)
    };
  });
}

/** Le message qu'une partie envoie en s'ouvrant, en champs : { emit (l'identifiant), emitTo (les destinataires, séparés par des
 *  virgules) } — '' pour ce qui n'est pas un mot nu. */
function emitOf(v) {
  const e = isObj(v) ? v : {};
  return {
    emit: scalar(e.id) ? cut(e.id, 80) : '',
    emitTo: (Array.isArray(e.to) ? e.to : []).slice(0, 16).filter(scalar).map(x => cut(x, 80)).filter(Boolean).join(', ')
  };
}

/** Le destinataire que l'atelier écrit d'un message neuf : tous les équipages (`all` passe le motif EVENT_ID du lecteur). */
const ALL = 'all';

/** Les destinataires saisis (séparés par des virgules, des points-virgules ou des blancs) : seize mots au plus. */
const recipients = v => String(v ?? '').split(/[\s,;]+/).map(x => cut(x, 80)).filter(Boolean).slice(0, 16);

/** Le message envoyé à l'ouverture, écrit dans une partie : rien de saisi → la clé part ; sinon l'identifiant et les destinataires qui
 *  ont la forme du lecteur (MS.EVENT_ID) — un mot qui ne l'a pas n'est jamais écrit ; une autre clé de `emit_event` reste. Sans destinataire
 *  (l'écran n'en propose plus la saisie : l'ergonome tranche jeudi ce que contient `to`), l'atelier écrit `to: ['all']` ; les destinataires
 *  qu'un fichier porte déjà (la ligne les garde dans `emitTo`) restent tels quels. */
function putEmit(o, r) {
  const id = cut(r.emit, 80),
    to = recipients(r.emitTo);
  if (!id && !to.length) return void delete o.emit_event;
  const e = {
      ...(isObj(o.emit_event) ? o.emit_event : {})
    },
    ok = to.filter(x => MS.EVENT_ID.test(x));
  if (MS.EVENT_ID.test(id)) e.id = id;
  else delete e.id;
  if (ok.length) e.to = ok;
  else if (MS.EVENT_ID.test(id)) e.to = [ALL];
  else delete e.to;
  o.emit_event = e;
}

/** La ligne avec une autre clé (voir l'en-tête). */
export function withKey(row, key) {
  const r = isObj(row) ? row : {},
    k = KEYS.includes(key) ? key : 'hand';
  return {
    ...r,
    key: k,
    keptWhy: '',
    point: '',
    delay: '',
    zone: '',
    shown: false,
    object: '',
    arrPoint: '',
    arrRadius: '',
    arrSpeed: '',
    arrGround: false,
    stops: [],
    rule: blankRule(),
    steps: [],
    event: '',
    fallback: LIVE.has(k) ? String(r.fallback ?? '') : ''
  };
}

/** La ligne avec la clé choisie et ce qu'elle devine (voir l'en-tête) ; `places` : les lignes des Lieux de la séance. */
export function keyed(row, key, places = []) {
  const first = kind => (Array.isArray(places) ? places : []).find(p => p && p.id && p.kind === kind)?.id || '';
  return {
    ...withKey(row, key),
    ...(key === 'zone' ? {
      zone: first('zone')
    } : key === 'object' ? {
      object: first('object')
    } : key === 'arrival' ? {
      arrPoint: 'DESTINATION',
      arrRadius: '1',
      arrSpeed: '30',
      arrGround: true
    } : key === 'time' ? {
      point: 'ORIGIN'
    } : RULED.includes(key) ? {
      rule: holdRow(key, places)
    } : key === 'sequence' ? {
      steps: [{
        kind: 'hover',
        ...holdRow('hover', places)
      }]
    } : {})
  };
}

/** Un identifiant libre pour un tiroir neuf (voir l'en-tête) ; '' quand les douze sont pris. */
export function nextDrawerId(rows, base = null) {
  const mine = new Set((Array.isArray(rows) ? rows : []).map(r => String(r?.id ?? '').toUpperCase())),
    file = new Set(MS.drawerSlots(isObj(base) ? base : {}).map(x => x.id));
  return MS.DRAWER_IDS.find(x => !mine.has(x) && !file.has(x)) || MS.DRAWER_IDS.find(x => !mine.has(x)) || '';
}

/** Une ligne neuve : le geste du pilote seul, rien d'écrit ; null au-delà de douze tiroirs. */
export function blankDrawer(rows, base = null) {
  const id = nextDrawerId(rows, base);
  return id && (Array.isArray(rows) ? rows : []).length < MS.DRAWER_IDS.length ? withKey({
    i: -1,
    id,
    title: '',
    said: '',
    message: '',
    brief: '',
    fallback: '',
    route: []
  }, 'hand') : null;
}

/** Pose ou retire un texte borné dans une partie. */
function putText(o, k, v, n, multi = false) {
  const x = multi ? lines(v, n) : cut(v, n);
  if (x) o[k] = x;
  else delete o[k];
}

/** Pose un nombre saisi dans ses bornes, ou retire le champ (un nombre hors bornes n'est jamais écrit, ni ramené dans ses bornes). */
function putNumber(o, k, v, lo, hi, whole = false) {
  const n = within(v, lo, hi);
  if (n === null || whole && !Number.isInteger(n)) delete o[k];
  else o[k] = n;
}

/** Une liste de route réécrite depuis ses mots : un mot gardé reprend l'entrée du fichier (un objet { id, … } garde ses autres clés). */
function routeFrom(words, before, max) {
  const pool = (Array.isArray(before) ? before : []).map(x => ({
    x,
    t: token(x),
    used: false
  }));
  return (Array.isArray(words) ? words : []).map(w => cut(w, 60)).filter(Boolean).slice(0, max).map(w => {
    const hit = pool.find(e => !e.used && e.t === w);
    if (hit) hit.used = true;
    return hit ? hit.x : w;
  });
}

/** Une règle écrite dans une condition (ou une étape) `c`, sous la forme que le lecteur lit : `was` — la règle d'avant (seuls ses
 *  champs changés s'écrivent), ou null pour une règle neuve (les champs d'une autre sorte partent tous, ceux de la sienne s'écrivent).
 *  Un nombre hors des bornes du lecteur n'est jamais écrit ; un point et un objet ne sont jamais écrits ensemble. */
function putRule(c, kind, rule, was) {
  const r = isObj(rule) ? rule : blankRule(),
    w = isObj(was) ? was : null;
  if (!w)
    for (const k of RULE_FILE) delete c[k];
  for (const f of RULE_USE[kind] || []) {
    if (w && text(r[f]) === text(w[f])) continue;
    if (f === 'point' || f === 'object') {
      putText(c, f, scalar(r[f]) ? r[f] : '', 40); // un identifiant nu, jamais une liste ni un objet
      if (c[f]) delete c[f === 'point' ? 'object' : 'point'];
    } else if (f === 'label') putText(c, 'label', r.label, B.title);
    else if (f === 'confirmation') {
      const word = cut(r.confirmation, 24);
      if (MS.CONFIRM_WORD.test(word)) c.confirmation = word;
      else delete c.confirmation;
    } else if (f === 'confirm') c.require_confirmation = r.confirm !== false;
    else if (f === 'depart') c.require_departure = r.depart !== false;
    else putNumber(c, RULE_NUM[f][0], r[f], ...ruleBounds(kind, f));
  }
}

/** Les champs de la clé d'une ligne, écrits dans une partie : `diff` — les champs changés (tous pour une clé neuve) ; `was` — la ligne
 *  d'avant (null pour une clé neuve). */
function putKey(o, r, diff, was = null) {
  const ch = f => diff.includes(f);
  if (r.key === 'time') {
    if (ch('point')) putText(o, 'trigger_point', r.point, 40);
    if (ch('delay')) putNumber(o, 'trigger_delay_min', r.delay, 0, B.delayMin);
  } else if (r.key === 'zone') {
    if (ch('zone')) putText(o, 'trigger_zone', r.zone, 40);
    // SOG-0459 : cochée → `zone_shown: true` ; décochée → la clé n'est pas écrite (cachée, le défaut)
    if (ch('shown')) {
      if (r.shown === true) o.zone_shown = true;
      else delete o.zone_shown;
    }
  } else if (r.key === 'object') {
    if (ch('object')) putText(o, 'trigger_object', r.object, 40);
  } else if (r.key === 'arrival') {
    const c = {
      ...(isObj(o.trigger_condition) ? o.trigger_condition : {}),
      kind: 'arrival'
    };
    if (ch('arrPoint')) putText(c, 'point', r.arrPoint, 40);
    if (ch('arrRadius')) putNumber(c, 'radius_nm', r.arrRadius, Number.MIN_VALUE, B.rangeNm);
    if (ch('arrSpeed')) putNumber(c, 'speed_max_kt', r.arrSpeed, 0, B.speedKt);
    if (ch('arrGround')) c.require_on_ground = r.arrGround === true;
    if (ch('stops')) {
      const stops = routeFrom(r.stops, c.required_points, B.required);
      if (stops.length) c.required_points = stops;
      else delete c.required_points;
    }
    o.trigger_condition = c;
  } else if (RULED.includes(r.key) && ch('rule')) {
    // SOG-0500 : { kind, point | object, radius_m…, height_max_ft } — la forme de holdRule ; SOG-0521 : { kind: refill, object,
    // duration_sec, heading_deg… } — la forme de refillRule ; une autre clé de la condition reste
    const c = {
      ...(isObj(o.trigger_condition) ? o.trigger_condition : {}),
      kind: r.key
    };
    putRule(c, r.key, r.rule, was && was.key === r.key ? was.rule : null);
    o.trigger_condition = c;
  } else if (r.key === 'sequence' && ch('steps')) {
    // { kind: sequence, steps: [{ kind, point | object, … }] } : une étape de la même sorte qu'avant à son rang garde ses autres clés ;
    // une étape neuve, ou d'une autre sorte, s'écrit entière ; au-delà de la borne du lecteur, rien
    const c = {
        ...(isObj(o.trigger_condition) ? o.trigger_condition : {}),
        kind: 'sequence'
      },
      before = Array.isArray(c.steps) ? c.steps : [],
      prev = was && was.key === 'sequence' ? was.steps : [];
    c.steps = (Array.isArray(r.steps) ? r.steps : []).filter(st => HOLDS.includes(st?.kind)).slice(0, B.steps).map((st, n) => {
      const same = prev[n] && prev[n].kind === st.kind && isObj(before[n]),
        s = same ? {
          ...before[n]
        } : {};
      s.kind = st.kind;
      putRule(s, st.kind, st, same ? prev[n] : null);
      return s;
    });
    o.trigger_condition = c;
  } else if (r.key === 'event' && ch('event')) {
    const c = {
        ...(isObj(o.trigger_condition) ? o.trigger_condition : {}),
        kind: 'event'
      },
      word = cut(r.event, 80);
    if (MS.EVENT_ID.test(word)) c.event = word;
    else delete c.event;
    o.trigger_condition = c;
  }
}

/** Les champs d'une ligne qui se comparent (une liste par sa forme écrite). */
const FIELDS = ['title', 'said', 'message', 'brief', 'key', 'point', 'delay', 'zone', 'shown', 'object', 'arrPoint', 'arrRadius',
  'arrSpeed',
  'arrGround', 'stops', 'rule', 'steps', 'event', 'emit', 'emitTo', 'fallback', 'route'
];
const KEY_OF = ['point', 'delay', 'zone', 'shown', 'object', 'arrPoint', 'arrRadius', 'arrSpeed', 'arrGround', 'stops', 'rule', 'steps',
  'event'
];
/** La forme écrite d'un champ, pour comparer : une liste ou une règle par leur JSON, le reste en texte. */
function text(v) {
  return Array.isArray(v) ? JSON.stringify(v.map(x => isObj(x) ? x : String(x ?? ''))) : isObj(v) ? JSON.stringify(v) : String(v ?? '');
}

/** Le document avec ses tiroirs retouchés (voir l'en-tête). */
export function withDrawerRows(doc, rows) {
  const out = structuredClone(isObj(doc) ? doc : {}),
    prev = drawerRowsOf(doc),
    list = (Array.isArray(rows) ? rows : []).filter(isObj);
  // audit 182 : rien de changé, rien de réécrit
  if (JSON.stringify(list) === JSON.stringify(prev)) return out;
  const before = phasesOf(out),
    slots = new Set(prev.map(p => p.i)),
    byI = new Map(list.filter(r => Number.isInteger(r.i) && slots.has(r.i)).map(r => [r.i, r])),
    edit = (o, r, was) => {
      const diff = was ? FIELDS.filter(f => text(r[f]) !== text(was[f])) : FIELDS;
      if (!diff.length) return null;
      if (diff.includes('title')) putText(o, 'title', r.title, B.title);
      if (diff.includes('said')) putText(o, 'trigger', r.said, B.trigger);
      if (diff.includes('message')) putText(o, 'message', r.message, B.message, true);
      if (diff.includes('brief')) putText(o, 'brief', r.brief, B.brief, true);
      // une autre clé : les champs de l'ancienne partent tous, ceux de la nouvelle s'écrivent tous ; la même clé : ses champs changés
      if (diff.includes('key') && KEYS.includes(r.key)) {
        for (const k of KEY_FIELDS) delete o[k];
        putKey(o, r, KEY_OF);
      } else if (r.key !== 'kept') putKey(o, r, diff, was);
      // le message envoyé à l'ouverture : il ne dépend pas de la clé
      if (diff.includes('emit') || diff.includes('emitTo')) putEmit(o, r);
      // l'heure de repli saisie s'écrit quelle que soit la clé (withKey la vide pour une clé qui ne regarde pas l'avion)
      if (diff.includes('fallback')) putNumber(o, 'fallback_delay_min', r.fallback, 0, B.delayMin, true);
      if (diff.includes('route')) {
        const route = routeFrom(r.route, o.route_order, B.route);
        if (route.length) o.route_order = route;
        else delete o.route_order;
      }
      return o;
    },
    kept = [],
    posOf = new Map();
  let count = 0;
  before.forEach((p, i) => {
    // une partie que le lecteur refuse n'est pas un tiroir : elle reste à sa place
    if (!slots.has(i)) return kept.push(p);
    const r = byI.get(i);
    if (!r) return; // la ligne retirée : sa partie part
    count += 1;
    posOf.set(i, kept.length); // la place de cette partie dans le fichier écrit (SOG-0482, lot 3 : un tiroir se déplace)
    kept.push(edit({
      ...p
    }, r, prev.find(x => x.i === i)) || p);
  });
  // l'ORDRE des lignes est l'ordre d'ouverture : quand il n'est plus celui des parties lues, elles reprennent les places des parties lues dans l'ordre des lignes
  // (une partie que le lecteur refuse reste à sa place ; chaque partie garde son identifiant et sa suite de route)
  {
    const have = [...posOf.keys()],
      want = list.filter(r => Number.isInteger(r.i) && posOf.has(r.i)).map(r => r.i);
    if (want.length === have.length && want.some((x, k) => x !== have[k])) {
      const parts = new Map(have.map(i => [i, kept[posOf.get(i)]]));
      have.forEach((slot, k) => {
        kept[posOf.get(slot)] = parts.get(want[k]);
      });
    }
  }
  const taken = new Set(prev.filter(p => byI.has(p.i)).map(p => p.id));
  for (const r of list) {
    if (Number.isInteger(r.i) && slots.has(r.i)) continue;
    const id = String(r.id ?? '').toUpperCase();
    // une ligne neuve : son identifiant est une lettre libre de B à M ; au-delà de douze, rien
    if (count >= MS.DRAWER_IDS.length || !MS.DRAWER_IDS.includes(id) || taken.has(id)) continue;
    taken.add(id);
    count += 1;
    kept.push(edit({
      id
    }, r, null) || {
      id
    });
  }
  if (kept.length) out.phases = kept;
  else delete out.phases;
  return out;
}

/** Une mission d'essai, sur place : un point, une zone et un objet immobile, pour écrire un tiroir de chaque sorte. */
const SAMPLE_DOC = Object.freeze({
  mission: {
    id: 'X-000A',
    type: 'TEST'
  },
  origin: {
    name: 'Essai (XTST)',
    lat: 45,
    lon: 1
  },
  destination: {
    name: 'Essai (XTSU)',
    lat: 44,
    lon: 2
  },
  turning_points: [{
    id: 'PT1',
    lat: 44.8,
    lon: 1.2
  }],
  zones: [{
    id: 'ZONE-1',
    centre: {
      lat: 44.7,
      lon: 1.3
    },
    radius_km: 5
  }],
  objects: [{
    id: 'OBJ-1',
    kind: 'vehicle',
    lat: 44.6,
    lon: 1.4,
    detection_range_nm: 1
  }, {
    id: 'OBJ-2', // SOG-0521 : une station de retardant, pour écrire un ravitaillement
    kind: 'refill',
    lat: 44.65,
    lon: 1.35
  }]
});
let sampleKeys = null;

/** La clé que le LECTEUR lit d'un tiroir de chaque sorte écrit par l'atelier (keyed : ses valeurs par défaut ; un message attendu
 *  nommé), une fois : { key → la clé lue }. */
function samples() {
  if (sampleKeys) return sampleKeys;
  const places = [{
      id: 'PT1',
      kind: 'pt'
    }, {
      id: 'ZONE-1',
      kind: 'zone'
    }, {
      id: 'OBJ-1',
      kind: 'object'
    }, {
      id: 'OBJ-2',
      kind: 'object',
      okind: 'refill'
    }],
    rows = [];
  for (const key of KEYS) {
    const row = keyed(blankDrawer(rows, null), key, places);
    if (key === 'event') row.event = 'EV-1';
    row.fallback = '60';
    rows.push(row);
  }
  const read = MS.readMission(withDrawerRows(SAMPLE_DOC, rows))?.drawers || [];
  sampleKeys = Object.fromEntries(KEYS.map((key, n) => [key, read[n]?.key || null]));
  return sampleKeys;
}

/** Vrai si le vol juge cette sorte (voir l'en-tête) : le geste et l'heure toujours ; sinon la fonction du vol, sur la clé lue d'un
 *  tiroir de cette sorte (une sorte inconnue, une clé que le lecteur ne lit pas : faux). */
export function judgedKind(key, judge = DW.follows) {
  if (key === 'hand' || key === 'time') return true;
  const k = KEYS.includes(key) ? samples()[key] : null;
  return !!k && typeof judge === 'function' && judge(k) === true;
}

/** Ce que le choix du type propose (voir l'en-tête). */
export function offered(cur = '', judge = DW.follows) {
  return KEYS.map(key => ({
    key,
    judged: judgedKind(key, judge)
  })).filter(t => t.judged || t.key === cur);
}

/** Ce qu'un tiroir a « à compléter » (voir l'en-tête) : lu par le lecteur que l'écran du pilote emploie. */
export function drawersTodo(doc) {
  const d = isObj(doc) ? doc : {},
    out = [];
  let m = null;
  try {
    m = MS.readMission(d);
  } catch {
    return out; // un fichier que le lecteur ne lit pas : rien à dire ici (l'ouverture l'a déjà refusé)
  }
  const rows = drawerRowsOf(d);
  for (const x of m?.drawers || []) {
    const name = String(x.rank),
      add = key => out.push({
        key,
        name
      }),
      row = rows.find(r => r.id === x.id),
      miss = row ? condMissing(row) : [];
    // SOG-0500 : une règle incomplète dit CE qui manque (le lecteur la refuserait : le tiroir ne s'ouvrirait qu'à la main)
    if (miss.length) out.push({
      key: 'condIncomplete',
      name,
      what: miss
    });
    else if (x.keyWhy && x.keyWhy !== 'several') add('keyUnread');
    else if (['zone', 'object', 'arrival', 'condition'].includes(x.key.kind) && x.key.fallbackMin === null) add('noFallback');
    if (!x.message) add('noMessage');
    if (!x.brief) add('noBrief');
    if (x.routeUnknown) add('routeUnknown');
    if (row && (row.emit || row.emitTo) && !x.emits) add('emitIncomplete');
  }
  return out;
}

/** Les sortes de l'atelier et ce que le vol en juge (voir l'en-tête) — en fin de fichier : elles écrivent un tiroir de chaque sorte. */
export const TYPES = Object.freeze(KEYS.map(key => Object.freeze({
  key,
  judged: judgedKind(key)
})));
