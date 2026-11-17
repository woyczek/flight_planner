// V3 fuel — SOG-0402 : le message de plan de vol OACI (Doc 4444, appendice 2) prêt à coller dans la validation d'Eurocontrol, en
// calcul pur (ni page, ni stockage, ni réseau : le pilote colle lui-même). Le texte sert à contrôler la ROUTE : identifiant neutre
// par défaut, équipement supposé (le jeu le plus court qui passe : standard, DME, GNSS, PBN, RVSM, 8,33 ; transpondeur mode S ;
// PBN/ en case 18), sans liaison de données ni adresse inventée ; jamais de SID ni de STAR inventée.
//
// API :
//   NEUTRAL_ID, EQUIPMENT, PBN : les valeurs supposées (constantes nommées).
//   coordWord(lat, lon) : « 54N050W » en degrés entiers, sinon « 5430N05000W ».
//   speedLevel(kt, ft) : « N0450F350 ».
//   item15(text, { dep, arr, speedKt, levelFt }) → { route, oceanic, sid, star } : la case 15 depuis le texte de la route du vol
//     (départ et arrivée retirés, « DCT » entre deux points hors voie, coordonnées OACI, groupe vitesse-niveau en tête et à chaque
//     changement de niveau) ; oceanic : la route passe par une route NAT, une voie nord-américaine ou des coordonnées de
//     l'Atlantique Nord (non contrôlées par Eurocontrol) ; sid / star : un nom de procédure écrit contre le départ / l'arrivée.
//   eobtOf(plannedAt, now) → { at: Date, now: bool } : l'heure du vol, sinon l'heure présente arrondie aux cinq minutes suivantes.
//   message(o) → { text, errors: [codes], notes: { oceanic, sid, star, now, wake } } : le message « (FPL-…) », une case par ligne.

import {
  tokenize
} from '../../frame/lib/route_text.js';

/** L'identifiant par défaut : neutre, jamais l'immatriculation (rien de personnel ne part sans le geste du pilote). */
export const NEUTRAL_ID = 'CHECK01';
/** L'équipement supposé (case 10) : S (VHF, VOR, ILS), D (DME), G (GNSS), R (PBN), W (RVSM), Y (8,33 kHz) ; transpondeur mode S. */
export const EQUIPMENT = 'SDGRWY/S';
/** La mention PBN de la case 18 qui accompagne R : RNAV 5 et RNAV 1 par GNSS. */
export const PBN = 'B2D2';

const pad = (n, w) => String(Math.max(0, Math.round(n))).padStart(w, '0');
/** Une voie nord-américaine composée (« N71B-N90B ») ou une route NAT (« NATV ») : hors du contrôle d'Eurocontrol. */
const OCEANIC = /^(?:NAT[A-Z]{1,2}|[A-Z]{1,2}\d{1,4}[A-Z]?(?:-[A-Z]{1,2}\d{1,4}[A-Z]?)+)$/;
/** Un nom de procédure (SID, STAR) : finit par un chiffre et une lettre (« OPAL2E »). */
const PROC = /\d[A-Z]$/;
/** L'alphabet du message (majuscules, chiffres, espace, « / - ( ) », retour à la ligne). */
const ALPHABET = /^[A-Z0-9 /()\-\n]*$/;

/** « 54N050W » quand les deux sont en degrés entiers, sinon degrés et minutes « 5430N05000W ». */
export function coordWord(lat, lon) {
  const la = Math.abs(lat),
    lo = Math.abs(lon),
    ns = lat < 0 ? 'S' : 'N',
    ew = lon < 0 ? 'W' : 'E',
    dm = v => {
      const d = Math.floor(v + 1e-9),
        m = Math.round((v - d) * 60);
      return m === 60 ? [d + 1, 0] : [d, m];
    },
    [ld, lm] = dm(la),
    [od, om] = dm(lo);
  return lm === 0 && om === 0 ? `${pad(ld, 2)}${ns}${pad(od, 3)}${ew}` : `${pad(ld, 2)}${pad(lm, 2)}${ns}${pad(od, 3)}${pad(om, 2)}${ew}`;
}

/** Le groupe vitesse-niveau : « N » et la vitesse vraie en nœuds sur quatre chiffres, « F » et le niveau en centaines de pieds. */
export const speedLevel = (kt, ft) => `N${pad(kt, 4)}F${pad(ft / 100, 3)}`;

/** La case 15 depuis le texte de la route du vol (voir l'en-tête). */
export function item15(text, {
  dep = '',
  arr = '',
  speedKt = 0,
  levelFt = 0
} = {}) {
  const toks = tokenize(text).filter(t => t.kind !== 'group'),
    D = String(dep || '').toUpperCase(),
    A = String(arr || '').toUpperCase();
  if (toks.length && toks[0].kind === 'name' && toks[0].id === D) toks.shift();
  if (toks.length && toks.at(-1).kind === 'name' && toks.at(-1).id === A) toks.pop();
  // un mot de route (voie, procédure, route NAT, voie composée) ou un point
  const isWay = t => t.kind === 'word' || (t.kind === 'name' && (t.airway || OCEANIC.test(t.id)));
  const out = [];
  let oceanic = false;
  toks.forEach((t, i) => {
    const prev = toks[i - 1];
    if (prev && !isWay(prev) && !isWay(t)) out.push('DCT');
    // une coordonnée de l'Atlantique Nord (route libre créée, point « 54/50 ») : hors du contrôle d'Eurocontrol, comme une route NAT
    if (t.kind === 'coord' && t.lat >= 40 && t.lat <= 75 && t.lon >= -70 && t.lon <= -10) oceanic = true;
    if (isWay(t)) {
      if (OCEANIC.test(t.id)) oceanic = true;
      out.push(t.id);
      return;
    }
    const word = t.kind === 'coord' ? coordWord(t.lat, t.lon) : t.id;
    out.push(t.alt_ft > 0 ? `${word}/${speedLevel(speedKt, t.alt_ft)}` : word);
  });
  const first = toks[0],
    last = toks.at(-1);
  return {
    route: [speedLevel(speedKt, levelFt), ...out].join(' '),
    oceanic,
    sid: !!(first && first.kind === 'name' && first.airway && PROC.test(first.id)),
    star: !!(last && last.kind === 'name' && last.airway && PROC.test(last.id))
  };
}

/** L'heure de départ du message : celle du vol (`plannedAt`, ISO), sinon l'heure présente arrondie aux cinq minutes suivantes. */
export function eobtOf(plannedAt, now = Date.now()) {
  const t = Date.parse(plannedAt || '');
  if (Number.isFinite(t)) return {
    at: new Date(t),
    now: false
  };
  const step = 5 * 60000;
  return {
    at: new Date(Math.ceil(now / step) * step),
    now: true
  };
}

const hhmm = d => `${pad(d.getUTCHours(), 2)}${pad(d.getUTCMinutes(), 2)}`;
const yymmdd = d => `${pad(d.getUTCFullYear() % 100, 2)}${pad(d.getUTCMonth() + 1, 2)}${pad(d.getUTCDate(), 2)}`;

/** Le message de plan de vol (voir l'en-tête) ; les règles de forme vérifiées, dites par leurs codes : id, type, wake, dep, arr, altn,
 *  speed, level, route, eet, alphabet ; une catégorie de sillage inconnue est supposée « M » et dite (notes.wake). o : { id, type, wake, dep, arr, altn, eobt: { at, now }, speedKt, levelFt, routeText, eetMin }. */
export function message(o = {}) {
  const up = v => String(v ?? '').toUpperCase().trim(),
    id = up(o.id) || NEUTRAL_ID,
    type = up(o.type),
    wake = up(o.wake).slice(0, 1),
    dep = up(o.dep),
    arr = up(o.arr),
    altn = up(o.altn),
    speed = Math.round(+o.speedKt || 0),
    level = Math.round((+o.levelFt || 0) / 100),
    eet = Math.round(+o.eetMin || 0),
    at = o.eobt?.at instanceof Date ? o.eobt.at : new Date(),
    r = item15(o.routeText, {
      dep,
      arr,
      speedKt: speed,
      levelFt: level * 100
    }),
    errors = [];
  if (!/^[A-Z][A-Z0-9]{0,6}$/.test(id)) errors.push('id');
  if (!/^[A-Z][A-Z0-9]{1,3}$/.test(type)) errors.push('type');
  if (!/^[A-Z]{4}$/.test(dep)) errors.push('dep');
  if (!/^[A-Z]{4}$/.test(arr)) errors.push('arr');
  if (altn && !/^[A-Z]{4}$/.test(altn)) errors.push('altn');
  if (!(speed >= 40 && speed <= 9999)) errors.push('speed');
  if (!(level >= 10 && level <= 660)) errors.push('level');
  if (r.route.split(' ').length < 2) errors.push('route');
  if (!(eet > 0 && eet < 100 * 60)) errors.push('eet');
  const text = ['(FPL-' + id + '-IG', `-${type || 'ZZZZ'}/${wake || 'M'}-${EQUIPMENT}`, `-${dep}${hhmm(at)}`, `-${r.route}`,
    `-${arr}${pad(Math.floor(eet / 60), 2)}${pad(eet % 60, 2)}${altn ? ` ${altn}` : ''}`, `-PBN/${PBN} DOF/${yymmdd(at)})`
  ].join('\n');
  if (!ALPHABET.test(text)) errors.push('alphabet');
  return {
    text,
    errors,
    notes: {
      oceanic: r.oceanic,
      sid: r.sid,
      star: r.star,
      now: !!o.eobt?.now,
      wake: !/^[LMHJ]$/.test(wake)
    }
  };
}
