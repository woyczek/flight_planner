// V3 missions — la ligne de choix d'une mission (SOG-0455) : « durée estimée · aéronefs · théâtre », sous le titre du Brief, de la ligne
// du registre et de la mission tirée. Calcul pur : ni page, ni stockage, ni réseau ; les deux services (classe d'un type, État d'un terrain)
// sont donnés par l'appelant (module.js, par aerodb).
//
// Règle (l'ergonome, 18 nov. 2026) : on montre ce que le fichier dit ; une durée absente est calculée de la route fournie et d'une
// vitesse — celle du fichier, sinon la vitesse type de la CLASSE de l'aéronef, lue dans une donnée du type (sa description OACI, par
// aerodb.aircraft().classify), jamais dans une liste de types écrite ici —, arrondie à cinq minutes et marquée « ≈ » ; le théâtre est
// celui du fichier (mission.theatre, sinon le pays mission.country), sinon l'État du terrain de départ lu dans aerodb (un fait : sans
// « ≈ ») ; ce qui n'est pas connu n'est pas montré.
//
// API :
//   CLASS_KT : la vitesse type d'une classe (kt) — hélicoptère, avion à pistons, à turbopropulseurs, à réaction.
//   durationOf(mission, classify) → { min, est: '' | 'file' | 'class' } | null : '' la durée écrite, 'file' calculée à la vitesse du
//     fichier, 'class' à la vitesse type de la classe.
//   aircraftOf(mission) → le nombre d'aéronefs (0 : rien à dire).
//   depIcao(mission) → le code du terrain de départ ('' sinon) : quatre signes, ou le code de liste d'une hélistation (« LF418 » : isCode
//     du champ de terrain commun, le motif d'AeroDB).
//   theatreOf(mission, { region, adState }) → le théâtre ('' sinon) ; region(code ISO) : le nom d'un pays, adState : l'État du terrain.
//   hm(min) → « 45 min », « 1 h », « 1 h 20 ».

import * as MS from '../../frame/lib/mission.js';
import {
  isCode
} from '../../frame/lib/ad_field.js'; // un code de terrain complet, la règle du champ commun (hélistations comprises)

/** Vitesse type d'une classe d'aéronef (kt) ; une classe absente d'ici (« other », inconnue) : pas de durée. */
export const CLASS_KT = Object.freeze({
  helico: 120,
  piston: 130,
  turboprop: 250,
  jet: 420
});
const TEXT_MAX = 40,
  MIN_MAX = 6000; // cent heures : au-delà, une route ou une vitesse fausse — rien plutôt qu'une durée absurde

const num = v => typeof v === 'number' && Number.isFinite(v) ? v : null;
/** Un texte du fichier pour l'œil : sans caractère de contrôle, espaces repliées, borné (le fichier est écrit par n'importe quel pilote). */
const clean = v => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX) : '';

/** La durée de la ligne de choix (voir l'en-tête). */
export function durationOf(m, classify) {
  if (!m || typeof m !== 'object') return null;
  const w = [num(m.estimate?.flightMin), num(m.estimate?.blockMin)].find(v => v !== null && v > 0 && v < MIN_MAX);
  if (w !== undefined) return {
    min: Math.round(w),
    est: ''
  };
  let nm = null;
  try {
    nm = num(MS.routeNm(m));
  } catch {
    nm = null;
  }
  if (!(nm > 0)) return null;
  let kt = num(m.cruiseSpeedKt),
    est = 'file';
  if (!(kt > 0 && kt < 2000)) {
    // le type tel que le fichier l'écrit (« Caracal », « AS350B3 » : la base des types connaît ses alias), puis son premier désignateur
    const full = String(m.aircraft?.[0]?.type || '').trim().slice(0, TEXT_MAX),
      token = full.toUpperCase().match(/\b[A-Z][A-Z0-9]{1,3}\b/)?.[0] || '';
    let cat = '';
    for (const t of [full, token].filter(Boolean)) {
      try {
        cat = typeof classify === 'function' ? String(classify(t)?.category || '') : '';
      } catch {
        cat = '';
      }
      if (Object.hasOwn(CLASS_KT, cat)) break;
    }
    kt = Object.hasOwn(CLASS_KT, cat) ? CLASS_KT[cat] : 0;
    est = 'class';
  }
  if (!kt) return null;
  const min = nm / kt * 60;
  return min > 0 && min < MIN_MAX ? {
    min: Math.max(5, Math.round(min / 5) * 5),
    est
  } : null;
}

/** Le nombre d'aéronefs de la mission (les entrées que le lecteur a gardées), borné. */
export const aircraftOf = m => Math.min(99, Array.isArray(m?.aircraft) ? m.aircraft.length : 0);

/** Le code OACI du terrain de départ : celui que le lecteur a tiré de son nom (« … (XTST) ») ; '' sinon. */
export const depIcao = m => isCode(String(m?.origin?.icao || '')) ? m.origin.icao : '';

/** Le théâtre (voir l'en-tête). */
export function theatreOf(m, {
  region,
  adState
} = {}) {
  const t = clean(m?.theatre);
  if (t) return t;
  const c = String(m?.country || '').toUpperCase();
  if (/^[A-Z]{2}$/.test(c)) {
    let name = '';
    try {
      name = typeof region === 'function' ? clean(region(c)) : '';
    } catch {
      name = '';
    }
    if (name) return name;
  }
  return clean(adState);
}

/** Une durée en minutes pour l'œil : « 45 min », « 1 h », « 1 h 20 ». */
export function hm(min) {
  const v = Math.max(0, Math.round(+min || 0)),
    h = Math.floor(v / 60),
    m = v % 60;
  return h ? m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h` : `${m} min`;
}
